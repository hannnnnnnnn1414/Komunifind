package store

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

const userCols = `id, email, name, avatar_url, role, created_at`

func (s *Store) UpsertGoogleUser(ctx context.Context, sub, email, name, avatar string) (SessionUser, error) {
	var u SessionUser
	err := s.pool.QueryRow(ctx, `
		INSERT INTO users (google_sub, email, name, avatar_url)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (google_sub) DO UPDATE
		SET email = EXCLUDED.email,
		    name = CASE WHEN EXCLUDED.name = '' THEN users.name ELSE EXCLUDED.name END,
		    avatar_url = CASE WHEN EXCLUDED.avatar_url = '' THEN users.avatar_url ELSE EXCLUDED.avatar_url END,
		    updated_at = now()
		RETURNING id, email, name, avatar_url, role, created_at
	`, sub, email, name, avatar).Scan(&u.ID, &u.Email, &u.Name, &u.AvatarURL, &u.Role, &u.CreatedAt)
	if err != nil {
		return SessionUser{}, err
	}
	if err := s.pool.QueryRow(ctx,
		`SELECT id FROM communities WHERE organizer_id = $1 LIMIT 1`, u.ID,
	).Scan(&u.CommunityID); err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return SessionUser{}, err
	}
	return u, nil
}

func (s *Store) GetSessionUser(ctx context.Context, id int64) (SessionUser, error) {
	var u SessionUser
	err := s.pool.QueryRow(ctx,
		`SELECT `+userCols+` FROM users WHERE id = $1`, id,
	).Scan(&u.ID, &u.Email, &u.Name, &u.AvatarURL, &u.Role, &u.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return SessionUser{}, ErrNotFound
	}
	if err != nil {
		return SessionUser{}, err
	}
	if err := s.pool.QueryRow(ctx,
		`SELECT id FROM communities WHERE organizer_id = $1 LIMIT 1`, id,
	).Scan(&u.CommunityID); err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return SessionUser{}, err
	}
	return u, nil
}

func (s *Store) ListUsers(ctx context.Context, role string) ([]User, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT `+userCols+` FROM users
		WHERE ($1 = '' OR role = $1)
		ORDER BY created_at DESC
		LIMIT 200
	`, role)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []User{}
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.AvatarURL, &u.Role, &u.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}
