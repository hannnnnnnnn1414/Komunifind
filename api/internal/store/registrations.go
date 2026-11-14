package store

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

const registrationJoinCols = `r.id, r.event_id, r.user_id, r.status, r.decided_at, r.created_at,
	e.title, e.starts_at, c.slug, c.name, u.name, u.email`

func scanRegistrationJoined(row pgx.Row) (Registration, error) {
	var r Registration
	err := row.Scan(&r.ID, &r.EventID, &r.UserID, &r.Status, &r.DecidedAt, &r.CreatedAt,
		&r.EventTitle, &r.StartsAt, &r.CommunitySlug, &r.CommunityName, &r.UserName, &r.UserEmail)
	if errors.Is(err, pgx.ErrNoRows) {
		return Registration{}, ErrNotFound
	}
	return r, err
}

const registrationJoin = `FROM registrations r
	JOIN events e ON e.id = r.event_id
	JOIN communities c ON c.id = e.community_id
	JOIN users u ON u.id = r.user_id`

func (s *Store) CreateRegistration(ctx context.Context, eventID, userID int64) (Registration, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Registration{}, err
	}
	defer tx.Rollback(ctx)

	var capacity *int
	var eventStatus string
	var notStarted bool
	if err := tx.QueryRow(ctx,
		`SELECT status, starts_at > now(), capacity FROM events WHERE id = $1`,
		eventID).Scan(&eventStatus, &notStarted, &capacity); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Registration{}, ErrNotFound
		}
		return Registration{}, err
	}
	if eventStatus != "published" {
		return Registration{}, ErrInvalidState
	}
	if !notStarted {
		return Registration{}, ErrEventStarted
	}

	if capacity != nil {
		var approved int
		if err := tx.QueryRow(ctx,
			`SELECT count(*) FROM registrations WHERE event_id = $1 AND status = 'approved'`, eventID).Scan(&approved); err != nil {
			return Registration{}, err
		}
		if approved >= *capacity {
			return Registration{}, ErrQuotaFull
		}
	}

	var regID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO registrations (event_id, user_id, status)
		VALUES ($1, $2, 'pending')
		ON CONFLICT (event_id, user_id) DO UPDATE
		SET status = 'pending', decided_by = NULL, decided_at = NULL, updated_at = now()
		WHERE registrations.status IN ('cancelled', 'rejected')
		RETURNING id`, eventID, userID).Scan(&regID)
	if errors.Is(err, pgx.ErrNoRows) {
		return Registration{}, ErrConflict
	}
	if err != nil {
		return Registration{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Registration{}, err
	}
	return s.GetRegistration(ctx, regID)
}

func (s *Store) GetRegistration(ctx context.Context, id int64) (Registration, error) {
	return scanRegistrationJoined(s.pool.QueryRow(ctx,
		`SELECT `+registrationJoinCols+` `+registrationJoin+` WHERE r.id = $1`, id))
}

func (s *Store) ListRegistrationsByUser(ctx context.Context, userID int64) ([]Registration, error) {
	rows, err := s.pool.Query(ctx, `SELECT `+registrationJoinCols+` `+registrationJoin+`
		WHERE r.user_id = $1 ORDER BY e.starts_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Registration{}
	for rows.Next() {
		r, err := scanRegistrationJoined(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *Store) ListRegistrationsByEvent(ctx context.Context, eventID int64) ([]Registration, error) {
	rows, err := s.pool.Query(ctx, `SELECT `+registrationJoinCols+` `+registrationJoin+`
		WHERE r.event_id = $1
		ORDER BY CASE r.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, r.created_at ASC`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Registration{}
	for rows.Next() {
		r, err := scanRegistrationJoined(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *Store) ApproveRegistration(ctx context.Context, regID, actorID int64) (Registration, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Registration{}, err
	}
	defer tx.Rollback(ctx)

	var capacity *int
	if err := tx.QueryRow(ctx, `
		SELECT e.capacity FROM events e
		WHERE e.id = (SELECT event_id FROM registrations WHERE id = $1)
		FOR UPDATE OF e`, regID).Scan(&capacity); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Registration{}, ErrNotFound
		}
		return Registration{}, err
	}

	var eventID int64
	var status string
	var organizerID *int64
	if err := tx.QueryRow(ctx, `
		SELECT r.event_id, r.status, c.organizer_id
		FROM registrations r
		JOIN events e ON e.id = r.event_id
		JOIN communities c ON c.id = e.community_id
		WHERE r.id = $1
		FOR UPDATE OF r`, regID).Scan(&eventID, &status, &organizerID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Registration{}, ErrNotFound
		}
		return Registration{}, err
	}
	if organizerID == nil || *organizerID != actorID {
		return Registration{}, ErrForbidden
	}
	if status != "pending" {
		return Registration{}, ErrInvalidState
	}

	if capacity != nil {
		var approved int
		if err := tx.QueryRow(ctx,
			`SELECT count(*) FROM registrations WHERE event_id = $1 AND status = 'approved'`, eventID).Scan(&approved); err != nil {
			return Registration{}, err
		}
		if approved >= *capacity {
			return Registration{}, ErrQuotaFull
		}
	}

	if _, err := tx.Exec(ctx, `
		UPDATE registrations SET status = 'approved', decided_by = $2, decided_at = now(), updated_at = now()
		WHERE id = $1`, regID, actorID); err != nil {
		return Registration{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Registration{}, err
	}
	return s.GetRegistration(ctx, regID)
}

func (s *Store) RejectRegistration(ctx context.Context, regID, actorID int64) (Registration, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Registration{}, err
	}
	defer tx.Rollback(ctx)

	var status string
	var organizerID *int64
	if err := tx.QueryRow(ctx, `
		SELECT r.status, c.organizer_id
		FROM registrations r
		JOIN events e ON e.id = r.event_id
		JOIN communities c ON c.id = e.community_id
		WHERE r.id = $1
		FOR UPDATE OF r`, regID).Scan(&status, &organizerID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Registration{}, ErrNotFound
		}
		return Registration{}, err
	}
	if organizerID == nil || *organizerID != actorID {
		return Registration{}, ErrForbidden
	}
	if status != "pending" {
		return Registration{}, ErrInvalidState
	}

	if _, err := tx.Exec(ctx, `
		UPDATE registrations SET status = 'rejected', decided_by = $2, decided_at = now(), updated_at = now()
		WHERE id = $1`, regID, actorID); err != nil {
		return Registration{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Registration{}, err
	}
	return s.GetRegistration(ctx, regID)
}

func (s *Store) CancelRegistration(ctx context.Context, regID, userID int64) (Registration, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Registration{}, err
	}
	defer tx.Rollback(ctx)

	var ownerID int64
	var status string
	var notStarted bool
	if err := tx.QueryRow(ctx, `
		SELECT r.user_id, r.status, e.starts_at > now()
		FROM registrations r JOIN events e ON e.id = r.event_id
		WHERE r.id = $1
		FOR UPDATE OF r`, regID).Scan(&ownerID, &status, &notStarted); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Registration{}, ErrNotFound
		}
		return Registration{}, err
	}
	if ownerID != userID {
		return Registration{}, ErrForbidden
	}
	if status != "pending" && status != "approved" {
		return Registration{}, ErrInvalidState
	}
	if !notStarted {
		return Registration{}, ErrEventStarted
	}

	if _, err := tx.Exec(ctx, `
		UPDATE registrations SET status = 'cancelled', decided_by = $2, decided_at = now(), updated_at = now()
		WHERE id = $1`, regID, userID); err != nil {
		return Registration{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Registration{}, err
	}
	return s.GetRegistration(ctx, regID)
}

type CancelledParticipant struct {
	UserID    int64
	Email     string
	Name      string
	EventID   int64
	EventTitle string
}

func (s *Store) CancelRegistrationsForEvent(ctx context.Context, eventID int64) ([]CancelledParticipant, error) {
	rows, err := s.pool.Query(ctx, `
		UPDATE registrations AS r
		SET status = 'cancelled', decided_at = now(), updated_at = now()
		FROM users u, events e
		WHERE r.event_id = $1 AND r.status IN ('pending', 'approved')
			AND u.id = r.user_id AND e.id = r.event_id
		RETURNING r.user_id, u.email, u.name, r.event_id, e.title`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []CancelledParticipant{}
	for rows.Next() {
		var p CancelledParticipant
		if err := rows.Scan(&p.UserID, &p.Email, &p.Name, &p.EventID, &p.EventTitle); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}
