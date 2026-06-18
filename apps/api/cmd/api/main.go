package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"car-workshop-admin-api/internal/config"
	"car-workshop-admin-api/internal/database"
	"car-workshop-admin-api/internal/handlers"
	apphttp "car-workshop-admin-api/internal/http"
	"car-workshop-admin-api/internal/http/middleware"
	"car-workshop-admin-api/internal/integrations/vercel"
	"car-workshop-admin-api/internal/repositories"
	"car-workshop-admin-api/internal/usecases"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	cfg, err := config.Load()
	if err != nil {
		logger.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	ctx := context.Background()
	pool, err := database.NewPostgresPool(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("failed to connect database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	healthHandler := handlers.NewHealthHandler(pool)
	workshopRepository := repositories.NewWorkshopRepository(pool)
	masterAdminRepository := repositories.NewMasterAdminRepository(pool)
	vercelDomainRegistrar := vercel.NewDomainRegistrar(cfg.VercelToken, cfg.VercelProjectID)
	workshopUsecase := usecases.NewWorkshopUsecase(workshopRepository, cfg.CustomDomainCNAMETarget, vercelDomainRegistrar)
	workshopHandler := handlers.NewWorkshopHandler(workshopUsecase)
	masterGuard := middleware.NewMasterAdminGuard(cfg.AdminJWTSecret, masterAdminRepository)
	corsMiddleware := middleware.NewCORSMiddleware(cfg.CORSOrigins)

	router := apphttp.NewRouter(apphttp.RouterDeps{
		HealthHandler:   healthHandler,
		WorkshopHandler: workshopHandler,
		MasterGuard:     masterGuard,
		CORSMiddleware:  corsMiddleware,
	})

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		logger.Info("admin api listening", "port", cfg.Port)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("graceful shutdown failed", "error", err)
		os.Exit(1)
	}
}
