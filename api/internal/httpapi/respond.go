package httpapi

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"

	"komunifind/api/internal/store"
)

type apiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v != nil {
		if err := json.NewEncoder(w).Encode(v); err != nil {
			log.Printf("httpapi: encode response: %v", err)
		}
	}
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]apiError{"error": {Code: code, Message: message}})
}

func fail(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, store.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", err.Error())
	case errors.Is(err, store.ErrConflict):
		writeError(w, http.StatusConflict, "conflict", "Kamu sudah terdaftar di event ini")
	case errors.Is(err, store.ErrQuotaFull):
		writeError(w, http.StatusConflict, "quota_full", "Kuota event sudah penuh")
	case errors.Is(err, store.ErrInvalidState):
		writeError(w, http.StatusConflict, "invalid_state", "Aksi tidak valid untuk status saat ini")
	case errors.Is(err, store.ErrEventStarted):
		writeError(w, http.StatusConflict, "event_started", "Event sudah dimulai atau lewat")
	case errors.Is(err, store.ErrCapacityBelow):
		writeError(w, http.StatusBadRequest, "capacity_below_approved", err.Error())
	case errors.Is(err, store.ErrForbidden):
		writeError(w, http.StatusForbidden, "forbidden", "Kamu tidak punya akses ke data ini")
	default:
		log.Printf("httpapi: %v", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "Terjadi kesalahan di server")
	}
}

func decodeJSON(r *http.Request, dst any) error {
	dec := json.NewDecoder(http.MaxBytesReader(nil, r.Body, 1<<20))
	if err := dec.Decode(dst); err != nil {
		return errors.New("body JSON tidak valid")
	}
	return nil
}

func pathID(r *http.Request, name string) (int64, error) {
	return strconv.ParseInt(r.PathValue(name), 10, 64)
}

func queryInt(r *http.Request, name string, fallback int) int {
	raw := r.URL.Query().Get(name)
	if raw == "" {
		return fallback
	}
	v, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return v
}
