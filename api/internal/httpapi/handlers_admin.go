package httpapi

import (
	"net/http"
	"strings"

	"komunifind/api/internal/store"
)

type adminCommunityPatch struct {
	store.CommunityPatch
	OrganizerEmail *string `json:"organizerEmail"`
}

func (s *Server) handleAdminCommunities(w http.ResponseWriter, r *http.Request) {
	items, err := s.store.ListAllCommunities(r.Context())
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (s *Server) handleCreateCommunity(w http.ResponseWriter, r *http.Request) {
	var in store.CommunityInput
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	if strings.TrimSpace(in.Name) == "" {
		writeError(w, http.StatusBadRequest, "bad_request", "Nama komunitas wajib diisi")
		return
	}
	if strings.TrimSpace(in.Slug) == "" {
		in.Slug = normalizeSlug(in.Name)
	} else {
		in.Slug = normalizeSlug(in.Slug)
	}
	if in.Slug == "" {
		writeError(w, http.StatusBadRequest, "bad_request", "Slug tidak valid")
		return
	}
	community, err := s.store.CreateCommunity(r.Context(), in)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"community": community})
}

func (s *Server) handleAdminCommunity(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "ID tidak valid")
		return
	}
	community, err := s.store.GetCommunityByID(r.Context(), id)
	if err != nil {
		fail(w, err)
		return
	}
	events, err := s.store.ListEventsByCommunity(r.Context(), community.ID)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"community": community, "events": events})
}

func (s *Server) handleAdminUpdateCommunity(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "ID tidak valid")
		return
	}
	var patch adminCommunityPatch
	if err := decodeJSON(r, &patch); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}

	community, err := s.store.UpdateCommunity(r.Context(), id, patch.CommunityPatch)
	if err != nil {
		fail(w, err)
		return
	}
	if patch.OrganizerEmail != nil && strings.TrimSpace(*patch.OrganizerEmail) != "" {
		community, err = s.store.AssignOrganizer(r.Context(), id, *patch.OrganizerEmail)
		if err != nil {
			fail(w, err)
			return
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"community": community})
}

func (s *Server) handleAdminUsers(w http.ResponseWriter, r *http.Request) {
	users, err := s.store.ListUsers(r.Context(), r.URL.Query().Get("role"))
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": users})
}

func (s *Server) handleInternalEmailLog(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("X-Internal-Secret") != s.cfg.InternalSecret {
		writeError(w, http.StatusForbidden, "forbidden", "Secret tidak valid")
		return
	}
	var in store.EmailLog
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	if in.Template == "" {
		writeError(w, http.StatusBadRequest, "bad_request", "template wajib diisi")
		return
	}
	if err := s.store.InsertEmailLog(r.Context(), in); err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
