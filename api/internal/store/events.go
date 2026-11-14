package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
)

const eventCols = `e.id, e.community_id, e.title, e.description, e.starts_at, e.ends_at,
	e.location_name, e.location_url, e.capacity, e.poster_key, e.external_url, e.external_label,
	e.status, e.price, e.currency, e.created_at,
	(SELECT count(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'approved')`

func scanEvent(row pgx.Row) (Event, error) {
	var ev Event
	err := row.Scan(&ev.ID, &ev.CommunityID, &ev.Title, &ev.Description, &ev.StartsAt, &ev.EndsAt,
		&ev.LocationName, &ev.LocationURL, &ev.Capacity, &ev.PosterKey, &ev.ExternalURL, &ev.ExternalLabel,
		&ev.Status, &ev.Price, &ev.Currency, &ev.CreatedAt, &ev.ApprovedCount)
	if errors.Is(err, pgx.ErrNoRows) {
		return Event{}, ErrNotFound
	}
	return ev, err
}

func scanEventWithCommunity(row pgx.Row) (Event, error) {
	var ev Event
	err := row.Scan(&ev.ID, &ev.CommunityID, &ev.Title, &ev.Description, &ev.StartsAt, &ev.EndsAt,
		&ev.LocationName, &ev.LocationURL, &ev.Capacity, &ev.PosterKey, &ev.ExternalURL, &ev.ExternalLabel,
		&ev.Status, &ev.Price, &ev.Currency, &ev.CreatedAt, &ev.ApprovedCount,
		&ev.CommunitySlug, &ev.CommunityName)
	if errors.Is(err, pgx.ErrNoRows) {
		return Event{}, ErrNotFound
	}
	return ev, err
}

func (s *Store) ListPublicEventsByCommunity(ctx context.Context, communityID int64) ([]Event, error) {
	rows, err := s.pool.Query(ctx, `SELECT `+eventCols+` FROM events e
		WHERE e.community_id = $1 AND e.status = 'published' AND e.starts_at >= now()
		ORDER BY e.starts_at ASC`, communityID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Event{}
	for rows.Next() {
		ev, err := scanEvent(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, ev)
	}
	return out, rows.Err()
}

func (s *Store) ListPublishedEvents(ctx context.Context, limit int) ([]Event, error) {
	if limit < 1 || limit > 50 {
		limit = 6
	}
	rows, err := s.pool.Query(ctx, `SELECT `+eventCols+`, c.slug, c.name
		FROM events e JOIN communities c ON c.id = e.community_id
		WHERE e.status = 'published' AND c.status = 'published' AND e.starts_at >= now()
		ORDER BY e.starts_at ASC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Event{}
	for rows.Next() {
		ev, err := scanEventWithCommunity(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, ev)
	}
	return out, rows.Err()
}

func (s *Store) GetEventPublic(ctx context.Context, id int64) (Event, error) {
	return scanEventWithCommunity(s.pool.QueryRow(ctx, `
		SELECT `+eventCols+`, c.slug, c.name
		FROM events e JOIN communities c ON c.id = e.community_id
		WHERE e.id = $1 AND e.status = 'published' AND c.status = 'published'`, id))
}

func (s *Store) GetEvent(ctx context.Context, id int64) (Event, error) {
	return scanEventWithCommunity(s.pool.QueryRow(ctx, `
		SELECT `+eventCols+`, c.slug, c.name
		FROM events e JOIN communities c ON c.id = e.community_id
		WHERE e.id = $1`, id))
}

func (s *Store) ListEventsByCommunity(ctx context.Context, communityID int64) ([]Event, error) {
	rows, err := s.pool.Query(ctx, `SELECT `+eventCols+` FROM events e
		WHERE e.community_id = $1
		ORDER BY e.starts_at DESC`, communityID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Event{}
	for rows.Next() {
		ev, err := scanEvent(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, ev)
	}
	return out, rows.Err()
}

func (s *Store) CreateEvent(ctx context.Context, communityID int64, createdBy int64, in EventInput) (Event, error) {
	if in.ExternalLabel == "" {
		in.ExternalLabel = "Kunjungi Instagram"
	}
	return scanEvent(s.pool.QueryRow(ctx, `
		INSERT INTO events AS e (community_id, title, description, starts_at, ends_at, location_name,
			location_url, capacity, poster_key, external_url, external_label, created_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
		RETURNING `+eventCols,
		communityID, in.Title, in.Description, in.StartsAt, in.EndsAt, in.LocationName,
		in.LocationURL, in.Capacity, in.PosterKey, in.ExternalURL, in.ExternalLabel, createdBy))
}

var eventPatchFields = []string{
	"title", "description", "starts_at", "ends_at", "location_name",
	"location_url", "capacity", "poster_key", "external_url", "external_label",
}

func (s *Store) UpdateEvent(ctx context.Context, id int64, p EventPatch) (Event, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Event{}, err
	}
	defer tx.Rollback(ctx)

	var capacity *int
	if err := tx.QueryRow(ctx, `SELECT capacity FROM events WHERE id = $1 FOR UPDATE`, id).Scan(&capacity); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Event{}, ErrNotFound
		}
		return Event{}, err
	}

	if p.Capacity != nil {
		var approved int
		if err := tx.QueryRow(ctx,
			`SELECT count(*) FROM registrations WHERE event_id = $1 AND status = 'approved'`, id).Scan(&approved); err != nil {
			return Event{}, err
		}
		if *p.Capacity < approved {
			return Event{}, fmt.Errorf("%w: saat ini %d peserta sudah approved", ErrCapacityBelow, approved)
		}
	}

	set := []string{}
	args := []any{id}
	add := func(col string, val any) {
		args = append(args, val)
		set = append(set, fmt.Sprintf("%s = $%d", col, len(args)))
	}
	if p.Title != nil {
		add("title", *p.Title)
	}
	if p.Description != nil {
		add("description", *p.Description)
	}
	if p.StartsAt != nil {
		add("starts_at", *p.StartsAt)
	}
	if p.EndsAt != nil {
		add("ends_at", *p.EndsAt)
	}
	if p.LocationName != nil {
		add("location_name", *p.LocationName)
	}
	if p.LocationURL != nil {
		if *p.LocationURL == "" {
			add("location_url", nil)
		} else {
			add("location_url", *p.LocationURL)
		}
	}
	if p.Capacity != nil {
		add("capacity", *p.Capacity)
	}
	if p.PosterKey != nil {
		if *p.PosterKey == "" {
			add("poster_key", nil)
		} else {
			add("poster_key", *p.PosterKey)
		}
	}
	if p.ExternalURL != nil {
		if *p.ExternalURL == "" {
			add("external_url", nil)
		} else {
			add("external_url", *p.ExternalURL)
		}
	}
	if p.ExternalLabel != nil {
		add("external_label", *p.ExternalLabel)
	}
	if len(set) == 0 {
		if err := tx.Commit(ctx); err != nil {
			return Event{}, err
		}
		return s.GetEvent(ctx, id)
	}

	query := `UPDATE events AS e SET ` + joinComma(set) + `, updated_at = now() WHERE id = $1 RETURNING ` + eventCols
	ev, err := scanEvent(tx.QueryRow(ctx, query, args...))
	if err != nil {
		return Event{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Event{}, err
	}
	return ev, nil
}

func joinComma(parts []string) string {
	out := ""
	for i, p := range parts {
		if i > 0 {
			out += ", "
		}
		out += p
	}
	return out
}

func (s *Store) SetEventStatus(ctx context.Context, id int64, status string) (Event, error) {
	ev, err := scanEvent(s.pool.QueryRow(ctx,
		`UPDATE events SET status = $2, updated_at = now() WHERE id = $1 RETURNING `+eventCols, id, status))
	if err != nil {
		return Event{}, err
	}
	return ev, nil
}

func (s *Store) CountApproved(ctx context.Context, eventID int64) (int, error) {
	var n int
	err := s.pool.QueryRow(ctx,
		`SELECT count(*) FROM registrations WHERE event_id = $1 AND status = 'approved'`, eventID).Scan(&n)
	return n, err
}
