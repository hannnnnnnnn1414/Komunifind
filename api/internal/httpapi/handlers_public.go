package httpapi

import (
	"net/http"

	"komunifind/api/internal/store"
)

func (s *Server) handleListCommunities(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	category := r.URL.Query().Get("category")
	city := r.URL.Query().Get("city")
	page := queryInt(r, "page", 1)
	perPage := queryInt(r, "perPage", 12)

	res, err := s.store.ListPublicCommunities(r.Context(), q, category, city, page, perPage)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (s *Server) handleCommunityFacets(w http.ResponseWriter, r *http.Request) {
	categories, cities, err := s.store.CommunityFacets(r.Context())
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"categories": categories, "cities": cities})
}

func (s *Server) handleCommunityDetail(w http.ResponseWriter, r *http.Request) {
	community, err := s.store.GetCommunityBySlug(r.Context(), r.PathValue("slug"))
	if err != nil {
		fail(w, err)
		return
	}
	if community.Status != "published" {
		writeError(w, http.StatusNotFound, "not_found", "Komunitas tidak ditemukan")
		return
	}
	events, err := s.store.ListPublicEventsByCommunity(r.Context(), community.ID)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"community": community, "events": events})
}

func (s *Server) handleCommunityEvents(w http.ResponseWriter, r *http.Request) {
	community, err := s.store.GetCommunityBySlug(r.Context(), r.PathValue("slug"))
	if err != nil {
		fail(w, err)
		return
	}
	events, err := s.store.ListPublicEventsByCommunity(r.Context(), community.ID)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": events})
}

func (s *Server) handleListEvents(w http.ResponseWriter, r *http.Request) {
	limit := queryInt(r, "limit", 6)
	events, err := s.store.ListPublishedEvents(r.Context(), limit)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": events})
}

func (s *Server) handleEventDetail(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "ID tidak valid")
		return
	}
	ev, err := s.store.GetEventPublic(r.Context(), id)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"event": ev})
}

func (s *Server) handleCreateRegistration(w http.ResponseWriter, r *http.Request) {
	user, _ := sessionUser(r)
	id, err := pathID(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "ID tidak valid")
		return
	}
	reg, err := s.store.CreateRegistration(r.Context(), id, user.ID)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"registration": reg})
}

func (s *Server) handleCancelRegistration(w http.ResponseWriter, r *http.Request) {
	user, _ := sessionUser(r)
	id, err := pathID(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "ID tidak valid")
		return
	}
	reg, err := s.store.CancelRegistration(r.Context(), id, user.ID)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"registration": reg})
}

func (s *Server) handleOrganizerCommunity(w http.ResponseWriter, r *http.Request) {
	user, _ := sessionUser(r)
	community, err := s.store.GetCommunityByOrganizer(r.Context(), user.ID)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"community": community})
}

func (s *Server) handleUpdateOrganizerCommunity(w http.ResponseWriter, r *http.Request) {
	user, _ := sessionUser(r)
	community, err := s.store.GetCommunityByOrganizer(r.Context(), user.ID)
	if err != nil {
		fail(w, err)
		return
	}
	var patch store.CommunityPatch
	if err := decodeJSON(r, &patch); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	patch.Status = nil
	updated, err := s.store.UpdateCommunity(r.Context(), community.ID, patch)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"community": updated})
}

func (s *Server) handleOrganizerEvents(w http.ResponseWriter, r *http.Request) {
	user, _ := sessionUser(r)
	community, err := s.store.GetCommunityByOrganizer(r.Context(), user.ID)
	if err != nil {
		fail(w, err)
		return
	}
	events, err := s.store.ListEventsByCommunity(r.Context(), community.ID)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": events})
}

func (s *Server) handleOrganizerEvent(w http.ResponseWriter, r *http.Request) {
	user, _ := sessionUser(r)
	id, err := pathID(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "ID tidak valid")
		return
	}
	owned, err := s.eventOwnedByOrganizer(r, id, user.ID)
	if err != nil {
		fail(w, err)
		return
	}
	if !owned {
		writeError(w, http.StatusForbidden, "forbidden", "Event bukan milik komunitasmu")
		return
	}
	ev, err := s.store.GetEvent(r.Context(), id)
	if err != nil {
		fail(w, err)
		return
	}
	regs, err := s.store.ListRegistrationsByEvent(r.Context(), id)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"event": ev, "registrations": regs})
}

func (s *Server) handleCreateEvent(w http.ResponseWriter, r *http.Request) {
	user, _ := sessionUser(r)
	community, err := s.store.GetCommunityByOrganizer(r.Context(), user.ID)
	if err != nil {
		fail(w, err)
		return
	}
	var in store.EventInput
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	if in.Title == "" || in.StartsAt.IsZero() {
		writeError(w, http.StatusBadRequest, "bad_request", "Judul dan tanggal mulai wajib diisi")
		return
	}
	ev, err := s.store.CreateEvent(r.Context(), community.ID, user.ID, in)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"event": ev})
}

func (s *Server) handleUpdateEvent(w http.ResponseWriter, r *http.Request) {
	user, _ := sessionUser(r)
	id, err := pathID(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "ID tidak valid")
		return
	}
	owned, err := s.eventOwnedByOrganizer(r, id, user.ID)
	if err != nil {
		fail(w, err)
		return
	}
	if !owned {
		writeError(w, http.StatusForbidden, "forbidden", "Event bukan milik komunitasmu")
		return
	}
	var patch store.EventPatch
	if err := decodeJSON(r, &patch); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	ev, err := s.store.UpdateEvent(r.Context(), id, patch)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"event": ev})
}

func (s *Server) handlePublishEvent(w http.ResponseWriter, r *http.Request) {
	user, _ := sessionUser(r)
	id, err := pathID(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "ID tidak valid")
		return
	}
	owned, err := s.eventOwnedByOrganizer(r, id, user.ID)
	if err != nil {
		fail(w, err)
		return
	}
	if !owned {
		writeError(w, http.StatusForbidden, "forbidden", "Event bukan milik komunitasmu")
		return
	}
	ev, err := s.store.SetEventStatus(r.Context(), id, "published")
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"event": ev})
}

func (s *Server) handleCancelEvent(w http.ResponseWriter, r *http.Request) {
	user, _ := sessionUser(r)
	id, err := pathID(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "ID tidak valid")
		return
	}
	owned, err := s.eventOwnedByOrganizer(r, id, user.ID)
	if err != nil {
		fail(w, err)
		return
	}
	if !owned {
		writeError(w, http.StatusForbidden, "forbidden", "Event bukan milik komunitasmu")
		return
	}
	participants, err := s.store.CancelRegistrationsForEvent(r.Context(), id)
	if err != nil {
		fail(w, err)
		return
	}
	ev, err := s.store.SetEventStatus(r.Context(), id, "cancelled")
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"event": ev, "cancelledParticipants": participants})
}

func (s *Server) handleEventRegistrations(w http.ResponseWriter, r *http.Request) {
	user, _ := sessionUser(r)
	id, err := pathID(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "ID tidak valid")
		return
	}
	owned, err := s.eventOwnedByOrganizer(r, id, user.ID)
	if err != nil {
		fail(w, err)
		return
	}
	if !owned {
		writeError(w, http.StatusForbidden, "forbidden", "Event bukan milik komunitasmu")
		return
	}
	regs, err := s.store.ListRegistrationsByEvent(r.Context(), id)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": regs})
}

func (s *Server) handleApproveRegistration(w http.ResponseWriter, r *http.Request) {
	user, _ := sessionUser(r)
	id, err := pathID(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "ID tidak valid")
		return
	}
	reg, err := s.store.ApproveRegistration(r.Context(), id, user.ID)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"registration": reg})
}

func (s *Server) handleRejectRegistration(w http.ResponseWriter, r *http.Request) {
	user, _ := sessionUser(r)
	id, err := pathID(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "ID tidak valid")
		return
	}
	reg, err := s.store.RejectRegistration(r.Context(), id, user.ID)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"registration": reg})
}
