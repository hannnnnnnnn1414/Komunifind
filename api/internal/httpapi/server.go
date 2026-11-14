package httpapi

import (
	"net/http"
	"regexp"
	"strings"

	"komunifind/api/internal/auth"
	"komunifind/api/internal/config"
	"komunifind/api/internal/store"
)

type Server struct {
	cfg      config.Config
	store    *store.Store
	verifier *auth.Verifier
}

func New(cfg config.Config, st *store.Store, verifier *auth.Verifier) *Server {
	return &Server{cfg: cfg, store: st, verifier: verifier}
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /healthz", s.handleHealth)

	mux.HandleFunc("GET /api/v1/communities", s.handleListCommunities)
	mux.HandleFunc("GET /api/v1/communities/facets", s.handleCommunityFacets)
	mux.HandleFunc("GET /api/v1/communities/{slug}", s.handleCommunityDetail)
	mux.HandleFunc("GET /api/v1/communities/{slug}/events", s.handleCommunityEvents)
	mux.HandleFunc("GET /api/v1/events", s.handleListEvents)
	mux.HandleFunc("GET /api/v1/events/{id}", s.handleEventDetail)

	mux.HandleFunc("POST /api/v1/auth/google", s.handleGoogleAuth)
	mux.HandleFunc("GET /api/v1/me", s.requireAuth(s.handleMe))
	mux.HandleFunc("GET /api/v1/me/registrations", s.requireAuth(s.handleMyRegistrations))
	mux.HandleFunc("POST /api/v1/events/{id}/registrations", s.requireAuth(s.handleCreateRegistration))
	mux.HandleFunc("POST /api/v1/registrations/{id}/cancel", s.requireAuth(s.handleCancelRegistration))

	mux.HandleFunc("GET /api/v1/organizer/community", s.requireRole("organizer", s.handleOrganizerCommunity))
	mux.HandleFunc("PATCH /api/v1/organizer/community", s.requireRole("organizer", s.handleUpdateOrganizerCommunity))
	mux.HandleFunc("GET /api/v1/organizer/events", s.requireRole("organizer", s.handleOrganizerEvents))
	mux.HandleFunc("POST /api/v1/organizer/events", s.requireRole("organizer", s.handleCreateEvent))
	mux.HandleFunc("GET /api/v1/organizer/events/{id}", s.requireRole("organizer", s.handleOrganizerEvent))
	mux.HandleFunc("PATCH /api/v1/organizer/events/{id}", s.requireRole("organizer", s.handleUpdateEvent))
	mux.HandleFunc("POST /api/v1/organizer/events/{id}/publish", s.requireRole("organizer", s.handlePublishEvent))
	mux.HandleFunc("POST /api/v1/organizer/events/{id}/cancel", s.requireRole("organizer", s.handleCancelEvent))
	mux.HandleFunc("GET /api/v1/organizer/events/{id}/registrations", s.requireRole("organizer", s.handleEventRegistrations))
	mux.HandleFunc("POST /api/v1/registrations/{id}/approve", s.requireRole("organizer", s.handleApproveRegistration))
	mux.HandleFunc("POST /api/v1/registrations/{id}/reject", s.requireRole("organizer", s.handleRejectRegistration))

	mux.HandleFunc("GET /api/v1/admin/communities", s.requireRole("admin", s.handleAdminCommunities))
	mux.HandleFunc("GET /api/v1/admin/communities/{id}", s.requireRole("admin", s.handleAdminCommunity))
	mux.HandleFunc("POST /api/v1/admin/communities", s.requireRole("admin", s.handleCreateCommunity))
	mux.HandleFunc("PATCH /api/v1/admin/communities/{id}", s.requireRole("admin", s.handleAdminUpdateCommunity))
	mux.HandleFunc("GET /api/v1/admin/users", s.requireRole("admin", s.handleAdminUsers))

		mux.HandleFunc("POST /api/v1/internal/email-logs", s.handleInternalEmailLog)

	if s.cfg.DevLogin {
		mux.HandleFunc("POST /api/v1/dev/login", s.handleDevLogin)
	}

	return withRecover(withLogging(mux))
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

var slugInvalid = regexp.MustCompile(`[^a-z0-9]+`)

func normalizeSlug(in string) string {
	slug := slugInvalid.ReplaceAllString(strings.ToLower(strings.TrimSpace(in)), "-")
	return strings.Trim(slug, "-")
}
