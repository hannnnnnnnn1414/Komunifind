package httpapi

import (
	"log"
	"net/http"

	"komunifind/api/internal/auth"
)

type googleAuthRequest struct {
	IDToken string `json:"idToken"`
}

func (s *Server) handleGoogleAuth(w http.ResponseWriter, r *http.Request) {
	var req googleAuthRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	if req.IDToken == "" {
		writeError(w, http.StatusBadRequest, "bad_request", "idToken wajib diisi")
		return
	}
	if s.verifier == nil {
		writeError(w, http.StatusServiceUnavailable, "auth_unavailable", "Login Google belum dikonfigurasi")
		return
	}

	identity, err := s.verifier.Verify(r.Context(), req.IDToken)
	if err != nil {
		log.Printf("auth: verify google token: %v", err)
		writeError(w, http.StatusUnauthorized, "invalid_google_token", "Token Google tidak valid")
		return
	}

	user, err := s.store.UpsertGoogleUser(r.Context(), identity.Sub, identity.Email, identity.Name, identity.Picture)
	if err != nil {
		fail(w, err)
		return
	}

	token, err := auth.Issue(s.cfg.JWTSecret, s.cfg.JWTTTL, user.ID, user.Role, user.CommunityID)
	if err != nil {
		fail(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"token": token, "user": user})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	user, ok := sessionUser(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Butuh login")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": user})
}

func (s *Server) handleMyRegistrations(w http.ResponseWriter, r *http.Request) {
	user, _ := sessionUser(r)
	items, err := s.store.ListRegistrationsByUser(r.Context(), user.ID)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (s *Server) eventOwnedByOrganizer(r *http.Request, eventID int64, organizerID int64) (bool, error) {
	ev, err := s.store.GetEvent(r.Context(), eventID)
	if err != nil {
		return false, err
	}
	community, err := s.store.GetCommunityByID(r.Context(), ev.CommunityID)
	if err != nil {
		return false, err
	}
	if community.OrganizerID == nil || *community.OrganizerID != organizerID {
		return false, nil
	}
	return true, nil
}
