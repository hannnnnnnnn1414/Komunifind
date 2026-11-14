package store

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)

const communityCols = `id, slug, name, tagline, description, logo_key, banner_key,
	category, city, socials, organizer_id, status, created_at, updated_at`

func scanCommunity(row pgx.Row) (Community, error) {
	var c Community
	var socials []byte
	err := row.Scan(&c.ID, &c.Slug, &c.Name, &c.Tagline, &c.Description, &c.LogoKey, &c.BannerKey,
		&c.Category, &c.City, &socials, &c.OrganizerID, &c.Status, &c.CreatedAt, &c.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Community{}, ErrNotFound
	}
	if err != nil {
		return Community{}, err
	}
	c.Socials = decodeSocials(socials)
	return c, nil
}

func (s *Store) ListPublicCommunities(ctx context.Context, q, category, city string, page, perPage int) (ListResult[Community], error) {
	page, perPage = clampPagination(page, perPage)
	q = strings.TrimSpace(q)

	where := `WHERE status = 'published'
		AND ($1 = '' OR lower(name) LIKE '%' || lower($1) || '%' OR lower(tagline) LIKE '%' || lower($1) || '%')
		AND ($2 = '' OR category = $2)
		AND ($3 = '' OR city = $3)`

	var total int
	if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM communities `+where, q, category, city).Scan(&total); err != nil {
		return ListResult[Community]{}, err
	}

	rows, err := s.pool.Query(ctx, `SELECT `+communityCols+` FROM communities `+where+`
		ORDER BY name ASC LIMIT $4 OFFSET $5`, q, category, city, perPage, (page-1)*perPage)
	if err != nil {
		return ListResult[Community]{}, err
	}
	defer rows.Close()

	items := []Community{}
	for rows.Next() {
		c, err := scanCommunity(rows)
		if err != nil {
			return ListResult[Community]{}, err
		}
		items = append(items, c)
	}
	if err := rows.Err(); err != nil {
		return ListResult[Community]{}, err
	}
	return ListResult[Community]{Items: items, Total: total, Page: page, PerPage: perPage}, nil
}

func (s *Store) CommunityFacets(ctx context.Context) (categories []string, cities []string, err error) {
	rows, err := s.pool.Query(ctx, `
		SELECT DISTINCT category FROM communities WHERE status = 'published' AND category <> '' ORDER BY category`)
	if err != nil {
		return nil, nil, err
	}
	for rows.Next() {
		var v string
		if err := rows.Scan(&v); err != nil {
			rows.Close()
			return nil, nil, err
		}
		categories = append(categories, v)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, nil, err
	}

	rows, err = s.pool.Query(ctx, `
		SELECT DISTINCT city FROM communities WHERE status = 'published' AND city <> '' ORDER BY city`)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var v string
		if err := rows.Scan(&v); err != nil {
			return nil, nil, err
		}
		cities = append(cities, v)
	}
	return categories, cities, rows.Err()
}

func (s *Store) GetCommunityBySlug(ctx context.Context, slug string) (Community, error) {
	return scanCommunity(s.pool.QueryRow(ctx,
		`SELECT `+communityCols+` FROM communities WHERE slug = $1`, slug))
}

func (s *Store) GetCommunityByID(ctx context.Context, id int64) (Community, error) {
	return scanCommunity(s.pool.QueryRow(ctx,
		`SELECT `+communityCols+` FROM communities WHERE id = $1`, id))
}

func (s *Store) GetCommunityByOrganizer(ctx context.Context, organizerID int64) (Community, error) {
	return scanCommunity(s.pool.QueryRow(ctx,
		`SELECT `+communityCols+` FROM communities WHERE organizer_id = $1`, organizerID))
}

func (s *Store) CreateCommunity(ctx context.Context, in CommunityInput) (Community, error) {
	if in.Status == "" {
		in.Status = "published"
	}
	return scanCommunity(s.pool.QueryRow(ctx, `
		INSERT INTO communities (slug, name, tagline, description, logo_key, banner_key, category, city, socials, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		RETURNING `+communityCols,
		in.Slug, in.Name, in.Tagline, in.Description, in.LogoKey, in.BannerKey, in.Category, in.City, encodeSocials(in.Socials), in.Status))
}

func (s *Store) UpdateCommunity(ctx context.Context, id int64, p CommunityPatch) (Community, error) {
	c, err := s.GetCommunityByID(ctx, id)
	if err != nil {
		return Community{}, err
	}
	if p.Name != nil {
		c.Name = *p.Name
	}
	if p.Tagline != nil {
		c.Tagline = *p.Tagline
	}
	if p.Description != nil {
		c.Description = *p.Description
	}
	if p.LogoKey != nil {
		c.LogoKey = p.LogoKey
	}
	if p.BannerKey != nil {
		c.BannerKey = p.BannerKey
	}
	if p.Category != nil {
		c.Category = *p.Category
	}
	if p.City != nil {
		c.City = *p.City
	}
	if p.Socials != nil {
		c.Socials = *p.Socials
	}
	if p.Status != nil {
		c.Status = *p.Status
	}
	if c.LogoKey != nil && *c.LogoKey == "" {
		c.LogoKey = nil
	}
	if c.BannerKey != nil && *c.BannerKey == "" {
		c.BannerKey = nil
	}
	return scanCommunity(s.pool.QueryRow(ctx, `
		UPDATE communities SET name=$2, tagline=$3, description=$4, logo_key=$5, banner_key=$6,
			category=$7, city=$8, socials=$9, status=$10, updated_at=now()
		WHERE id=$1
		RETURNING `+communityCols,
		id, c.Name, c.Tagline, c.Description, c.LogoKey, c.BannerKey, c.Category, c.City, encodeSocials(c.Socials), c.Status))
}

func (s *Store) AssignOrganizer(ctx context.Context, communityID int64, email string) (Community, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	var userID int64
	err := s.pool.QueryRow(ctx, `SELECT id FROM users WHERE lower(email) = $1`, email).Scan(&userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return Community{}, fmt.Errorf("%w: user dengan email tersebut belum pernah login", ErrNotFound)
	}
	if err != nil {
		return Community{}, err
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Community{}, err
	}
	defer tx.Rollback(ctx)

	var current *int64
	if err := tx.QueryRow(ctx, `SELECT organizer_id FROM communities WHERE id=$1 FOR UPDATE`, communityID).Scan(&current); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Community{}, ErrNotFound
		}
		return Community{}, err
	}

	if _, err := tx.Exec(ctx, `UPDATE communities SET organizer_id = NULL, updated_at = now() WHERE organizer_id = $1 AND id <> $2`, userID, communityID); err != nil {
		return Community{}, err
	}
	if _, err := tx.Exec(ctx, `UPDATE communities SET organizer_id = $2, updated_at = now() WHERE id = $1`, communityID, userID); err != nil {
		return Community{}, err
	}
	if _, err := tx.Exec(ctx, `UPDATE users SET role = 'organizer', updated_at = now() WHERE id = $1 AND role = 'user'`, userID); err != nil {
		return Community{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Community{}, err
	}
	return s.GetCommunityByID(ctx, communityID)
}

func (s *Store) ListCategories(ctx context.Context) ([]string, error) {
	cats, _, err := s.CommunityFacets(ctx)
	return cats, err
}

func (s *Store) ListAllCommunities(ctx context.Context) ([]Community, error) {
	rows, err := s.pool.Query(ctx, `SELECT `+communityCols+` FROM communities ORDER BY name ASC LIMIT 200`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Community{}
	for rows.Next() {
		c, err := scanCommunity(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}