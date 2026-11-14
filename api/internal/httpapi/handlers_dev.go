package httpapi

import (
	"log"
	"net/http"
	"strings"

	"komunifind/api/internal/auth"
)

type devLoginRequest struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

func (s *Server) handleDevLogin(w http.ResponseWriter, r *http.Request) {
	if !s.cfg.DevLogin {
		writeError(w, http.StatusNotFound, "not_found", "Dev login tidak aktif")
		return
	}
	if r.Header.Get("X-Internal-Secret") != s.cfg.InternalSecret {
		writeError(w, http.StatusForbidden, "forbidden", "Secret tidak valid")
		return
	}

	var req devLoginRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	email := strings.TrimSpace(strings.ToLower(req.Email))
	if email == "" || !strings.Contains(email, "@") {
		writeError(w, http.StatusBadRequest, "bad_request", "Email tidak valid")
		return
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = strings.Split(email, "@")[0]
	}

	user, err := s.store.UpsertGoogleUser(r.Context(), "dev:"+email, email, name, "")
	if err != nil {
		fail(w, err)
		return
	}
	token, err := auth.Issue(s.cfg.JWTSecret, s.cfg.JWTTTL, user.ID, user.Role, user.CommunityID)
	if err != nil {
		fail(w, err)
		return
	}
	log.Printf("api: dev login %s (%s)", email, user.Role)
	writeJSON(w, http.StatusOK, map[string]any{"token": token, "user": user})
}
