package store

import (
	"errors"
	"time"
)

var (
	ErrNotFound      = errors.New("not found")
	ErrConflict      = errors.New("conflict")
	ErrQuotaFull     = errors.New("quota full")
	ErrInvalidState  = errors.New("invalid state transition")
	ErrForbidden     = errors.New("forbidden")
	ErrEventStarted  = errors.New("event already started")
	ErrCapacityBelow = errors.New("capacity below approved count")
)

type User struct {
	ID        int64     `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	AvatarURL string    `json:"avatarUrl"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"createdAt"`
}

type SessionUser struct {
	User
	CommunityID *int64 `json:"communityId"`
}

type Community struct {
	ID          int64             `json:"id"`
	Slug        string            `json:"slug"`
	Name        string            `json:"name"`
	Tagline     string            `json:"tagline"`
	Description string            `json:"description"`
	LogoKey     *string           `json:"logoKey"`
	BannerKey   *string           `json:"bannerKey"`
	Category    string            `json:"category"`
	City        string            `json:"city"`
	Socials     map[string]string `json:"socials"`
	OrganizerID *int64            `json:"organizerId"`
	Status      string            `json:"status"`
	CreatedAt   time.Time         `json:"createdAt"`
	UpdatedAt   time.Time         `json:"updatedAt"`
}

type Event struct {
	ID            int64      `json:"id"`
	CommunityID   int64      `json:"communityId"`
	CommunitySlug string     `json:"communitySlug,omitempty"`
	CommunityName string     `json:"communityName,omitempty"`
	Title         string     `json:"title"`
	Description   string     `json:"description"`
	StartsAt      time.Time  `json:"startsAt"`
	EndsAt        *time.Time `json:"endsAt"`
	LocationName  string     `json:"locationName"`
	LocationURL   *string    `json:"locationUrl"`
	Capacity      *int       `json:"capacity"`
	PosterKey     *string    `json:"posterKey"`
	ExternalURL   *string    `json:"externalUrl"`
	ExternalLabel string     `json:"externalLabel"`
	Status        string     `json:"status"`
	Price         int        `json:"price"`
	Currency      string     `json:"currency"`
	CreatedAt     time.Time  `json:"createdAt"`
	ApprovedCount int        `json:"approvedCount"`
}

type Registration struct {
	ID           int64      `json:"id"`
	EventID      int64      `json:"eventId"`
	UserID       int64      `json:"userId"`
	Status       string     `json:"status"`
	DecidedAt    *time.Time `json:"decidedAt"`
	CreatedAt    time.Time  `json:"createdAt"`
	EventTitle   string     `json:"eventTitle,omitempty"`
	StartsAt     time.Time  `json:"startsAt,omitempty"`
	CommunitySlug string    `json:"communitySlug,omitempty"`
	CommunityName string    `json:"communityName,omitempty"`
	UserName     string     `json:"userName,omitempty"`
	UserEmail    string     `json:"userEmail,omitempty"`
}

type ListResult[T any] struct {
	Items []T `json:"items"`
	Total int `json:"total"`
	Page  int `json:"page"`
	PerPage int `json:"perPage"`
}

type CommunityInput struct {
	Slug        string            `json:"slug"`
	Name        string            `json:"name"`
	Tagline     string            `json:"tagline"`
	Description string            `json:"description"`
	LogoKey     *string           `json:"logoKey"`
	BannerKey   *string           `json:"bannerKey"`
	Category    string            `json:"category"`
	City        string            `json:"city"`
	Socials     map[string]string `json:"socials"`
	Status      string            `json:"status"`
}

type CommunityPatch struct {
	Name        *string            `json:"name"`
	Tagline     *string            `json:"tagline"`
	Description *string            `json:"description"`
	LogoKey     *string            `json:"logoKey"`
	BannerKey   *string            `json:"bannerKey"`
	Category    *string            `json:"category"`
	City        *string            `json:"city"`
	Socials     *map[string]string `json:"socials"`
	Status      *string            `json:"status"`
}

type EventInput struct {
	Title         string     `json:"title"`
	Description   string     `json:"description"`
	StartsAt      time.Time  `json:"startsAt"`
	EndsAt        *time.Time `json:"endsAt"`
	LocationName  string     `json:"locationName"`
	LocationURL   *string    `json:"locationUrl"`
	Capacity      *int       `json:"capacity"`
	PosterKey     *string    `json:"posterKey"`
	ExternalURL   *string    `json:"externalUrl"`
	ExternalLabel string     `json:"externalLabel"`
}

type EventPatch struct {
	Title         *string    `json:"title"`
	Description   *string    `json:"description"`
	StartsAt      *time.Time `json:"startsAt"`
	EndsAt        *time.Time `json:"endsAt"`
	LocationName  *string    `json:"locationName"`
	LocationURL   *string    `json:"locationUrl"`
	Capacity      *int       `json:"capacity"`
	PosterKey     *string    `json:"posterKey"`
	ExternalURL   *string    `json:"externalUrl"`
	ExternalLabel *string    `json:"externalLabel"`
}
