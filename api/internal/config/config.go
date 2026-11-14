package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port            string
	DatabaseURL     string
	JWTSecret       []byte
	InternalSecret  string
	JWTTTL          time.Duration
	GoogleClientID  string
	AppBaseURL      string
	UploadDir       string
	MigrationsDir   string
	MaxUploadBytes  int64
	DevLogin        bool
}

func Load() Config {
	return Config{
		Port:           env("API_PORT", "8080"),
		DatabaseURL:    env("DATABASE_URL", "postgres://komunifind:komunifind_dev@localhost:5432/komunifind?sslmode=disable"),
		JWTSecret:      []byte(env("JWT_SECRET", "dev-secret-change-me-0000000000000000")),
		InternalSecret: env("INTERNAL_SECRET", "dev-internal-secret"),
		JWTTTL:         time.Duration(envInt("JWT_TTL_HOURS", 168)) * time.Hour,
		GoogleClientID: env("GOOGLE_CLIENT_ID", ""),
		AppBaseURL:     strings.TrimRight(env("APP_BASE_URL", "http://localhost:3000"), "/"),
		UploadDir:      env("UPLOAD_DIR", "./data/uploads"),
		MigrationsDir:  env("MIGRATIONS_DIR", "migrations"),
		MaxUploadBytes: int64(envInt("MAX_UPLOAD_BYTES", 5242880)),
		DevLogin:       env("DEV_LOGIN", "false") == "true",
	}
}

func env(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) int {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}
