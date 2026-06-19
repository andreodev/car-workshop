package config

import (
	"errors"
	"os"
)

type Config struct {
	Port                    string
	DatabaseURL             string
	AdminJWTSecret          string
	CORSOrigins             string
	CustomDomainCNAMETarget string
	VercelToken             string
	VercelProjectID         string
}

func Load() (Config, error) {
	cfg := Config{
		Port:                    getEnv("PORT", "8080"),
		DatabaseURL:             os.Getenv("DATABASE_URL"),
		AdminJWTSecret:          os.Getenv("ADMIN_JWT_SECRET"),
		CORSOrigins:             getEnv("ADMIN_CORS_ORIGINS", "http://localhost:3002,http://127.0.0.1:3002,http://localhost:3003,http://127.0.0.1:3003"),
		CustomDomainCNAMETarget: getEnv("CUSTOM_DOMAIN_CNAME_TARGET", "cname.vercel-dns.com"),
		VercelToken:             os.Getenv("VERCEL_TOKEN"),
		VercelProjectID:         os.Getenv("VERCEL_PROJECT_ID"),
	}

	if cfg.DatabaseURL == "" {
		return Config{}, errors.New("DATABASE_URL is required")
	}
	if cfg.AdminJWTSecret == "" {
		return Config{}, errors.New("ADMIN_JWT_SECRET is required")
	}

	return cfg, nil
}

func getEnv(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
