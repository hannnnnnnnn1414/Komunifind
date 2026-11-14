package httpapi

import (
	"context"
	"log"
	"net/http"
	"strings"

	"komunifind/api/internal/auth"
	"komunifind/api/internal/store"
)

type ctxKey string

const userKey ctxKey = "sessionUser"

func sessionUser(r *http.Request) (store.SessionUser, bool) {
	u, ok := r.Context().Value(userKey).(store.SessionUser)
	return u, ok
}

func (s *Server) requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			writeError(w, http.StatusUnauthorized, "unauthorized", "Butuh login")
			return
		}
		claims, err := auth.Parse(s.cfg.JWTSecret, strings.TrimPrefix(header, "Bearer "))
		if err != nil {
			writeError(w, http.StatusUnauthorized, "unauthorized", "Sesi tidak valid atau kedaluwarsa")
			return
		}
		u, err := s.store.GetSessionUser(r.Context(), claims.UserID)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "unauthorized", "User tidak ditemukan")
			return
		}
		ctx := context.WithValue(r.Context(), userKey, u)
		next(w, r.WithContext(ctx))
	}
}

func (s *Server) requireRole(role string, next http.HandlerFunc) http.HandlerFunc {
	return s.requireAuth(func(w http.ResponseWriter, r *http.Request) {
		u, _ := sessionUser(r)
		if u.Role != role && u.Role != "admin" {
			writeError(w, http.StatusForbidden, "forbidden", "Akses hanya untuk "+role)
			return
		}
		next(w, r)
	})
}

func withRecover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Printf("httpapi: panic: %v", rec)
				writeError(w, http.StatusInternalServerError, "internal_error", "Terjadi kesalahan di server")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("%s %s", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}
