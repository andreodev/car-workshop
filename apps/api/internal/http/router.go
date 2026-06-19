package http

import (
	"net/http"

	"car-workshop-admin-api/internal/handlers"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

type RouterDeps struct {
	HealthHandler   *handlers.HealthHandler
	WorkshopHandler *handlers.WorkshopHandler
	MasterGuard     func(http.Handler) http.Handler
	CORSMiddleware  func(http.Handler) http.Handler
}

func NewRouter(deps RouterDeps) http.Handler {
	router := chi.NewRouter()
	router.Use(middleware.RequestID)
	router.Use(middleware.RealIP)
	router.Use(middleware.Recoverer)
	router.Use(deps.CORSMiddleware)

	router.Get("/healthz", deps.HealthHandler.Check)

	router.Route("/admin", func(r chi.Router) {
		r.Use(deps.MasterGuard)

		r.Route("/workshops", func(r chi.Router) {
			r.Get("/", deps.WorkshopHandler.List)
			r.Post("/", deps.WorkshopHandler.Create)
			r.Get("/{id}", deps.WorkshopHandler.FindByID)
			r.Post("/{id}/update", deps.WorkshopHandler.Update)
			r.Put("/{id}", deps.WorkshopHandler.Update)
			r.Patch("/{id}", deps.WorkshopHandler.Update)
			r.Post("/{id}/delete", deps.WorkshopHandler.Delete)
			r.Delete("/{id}", deps.WorkshopHandler.Delete)
			r.Post("/{id}/status", deps.WorkshopHandler.UpdateStatus)
			r.Patch("/{id}/status", deps.WorkshopHandler.UpdateStatus)
			r.Put("/{id}/branding", deps.WorkshopHandler.UpdateBranding)
			r.Patch("/{id}/custom-domain", deps.WorkshopHandler.UpdateCustomDomain)
			r.Post("/{id}/custom-domain/verify", deps.WorkshopHandler.VerifyCustomDomain)
			r.Delete("/{id}/custom-domain", deps.WorkshopHandler.RemoveCustomDomain)
		})
	})

	return router
}
