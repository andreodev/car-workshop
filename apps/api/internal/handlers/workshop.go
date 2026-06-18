package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"car-workshop-admin-api/internal/domain"
	"car-workshop-admin-api/internal/http/response"
	"github.com/go-chi/chi/v5"
)

type WorkshopUsecase interface {
	Create(ctx context.Context, input domain.CreateWorkshopInput) (domain.Workshop, error)
	List(ctx context.Context, filter domain.ListWorkshopsFilter) ([]domain.WorkshopSummary, int, error)
	FindByID(ctx context.Context, id string) (domain.Workshop, error)
	UpdateStatus(ctx context.Context, id string, status domain.TenantStatus) (domain.Workshop, error)
	UpdateBranding(ctx context.Context, id string, branding domain.WorkshopBranding) (domain.Workshop, error)
	UpdateCustomDomain(ctx context.Context, id string, customDomain *string) (domain.CustomDomainResult, error)
	VerifyCustomDomain(ctx context.Context, id string) (domain.CustomDomainResult, error)
	RemoveCustomDomain(ctx context.Context, id string) (domain.Workshop, error)
}

type WorkshopHandler struct {
	usecase WorkshopUsecase
}

type createWorkshopRequest struct {
	Name         string                  `json:"name"`
	Slug         string                  `json:"slug"`
	CustomDomain *string                 `json:"customDomain"`
	LegalName    string                  `json:"legalName"`
	TradeName    *string                 `json:"tradeName"`
	Document     *string                 `json:"document"`
	Email        *string                 `json:"email"`
	Phone        *string                 `json:"phone"`
	Branding     domain.WorkshopBranding `json:"branding"`
}

type updateStatusRequest struct {
	Status domain.TenantStatus `json:"status"`
}

type updateCustomDomainRequest struct {
	CustomDomain *string `json:"customDomain"`
}

type listWorkshopsResponse struct {
	Data   []domain.WorkshopSummary `json:"data"`
	Total  int                      `json:"total"`
	Limit  int                      `json:"limit"`
	Offset int                      `json:"offset"`
}

func NewWorkshopHandler(usecase WorkshopUsecase) *WorkshopHandler {
	return &WorkshopHandler{usecase: usecase}
}

func (h *WorkshopHandler) Create(w http.ResponseWriter, r *http.Request) {
	var body createWorkshopRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid_json", "Payload JSON inválido.")
		return
	}

	workshop, err := h.usecase.Create(r.Context(), domain.CreateWorkshopInput{
		Name:         body.Name,
		Slug:         body.Slug,
		CustomDomain: body.CustomDomain,
		LegalName:    body.LegalName,
		TradeName:    body.TradeName,
		Document:     body.Document,
		Email:        body.Email,
		Phone:        body.Phone,
		Branding:     body.Branding,
	})
	if err != nil {
		writeDomainError(w, err)
		return
	}

	response.JSON(w, http.StatusCreated, workshop)
}

func (h *WorkshopHandler) List(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	limit := parseInt(query.Get("limit"), 20)
	offset := parseInt(query.Get("offset"), 0)

	var status *domain.TenantStatus
	if rawStatus := query.Get("status"); rawStatus != "" {
		parsed := domain.TenantStatus(rawStatus)
		status = &parsed
	}

	workshops, total, err := h.usecase.List(r.Context(), domain.ListWorkshopsFilter{
		Search: query.Get("search"),
		Status: status,
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		writeDomainError(w, err)
		return
	}

	response.JSON(w, http.StatusOK, listWorkshopsResponse{
		Data:   workshops,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	})
}

func (h *WorkshopHandler) FindByID(w http.ResponseWriter, r *http.Request) {
	workshop, err := h.usecase.FindByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		writeDomainError(w, err)
		return
	}

	response.JSON(w, http.StatusOK, workshop)
}

func (h *WorkshopHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	var body updateStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid_json", "Payload JSON inválido.")
		return
	}

	workshop, err := h.usecase.UpdateStatus(r.Context(), chi.URLParam(r, "id"), body.Status)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	response.JSON(w, http.StatusOK, workshop)
}

func (h *WorkshopHandler) UpdateBranding(w http.ResponseWriter, r *http.Request) {
	var body domain.WorkshopBranding
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid_json", "Payload JSON inválido.")
		return
	}

	workshop, err := h.usecase.UpdateBranding(r.Context(), chi.URLParam(r, "id"), body)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	response.JSON(w, http.StatusOK, workshop)
}

func (h *WorkshopHandler) UpdateCustomDomain(w http.ResponseWriter, r *http.Request) {
	var body updateCustomDomainRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid_json", "Payload JSON inválido.")
		return
	}

	result, err := h.usecase.UpdateCustomDomain(r.Context(), chi.URLParam(r, "id"), body.CustomDomain)
	if err != nil {
		writeDomainError(w, err)
		return
	}

	response.JSON(w, http.StatusOK, result)
}

func (h *WorkshopHandler) VerifyCustomDomain(w http.ResponseWriter, r *http.Request) {
	result, err := h.usecase.VerifyCustomDomain(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		writeDomainError(w, err)
		return
	}

	response.JSON(w, http.StatusOK, result)
}

func (h *WorkshopHandler) RemoveCustomDomain(w http.ResponseWriter, r *http.Request) {
	workshop, err := h.usecase.RemoveCustomDomain(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		writeDomainError(w, err)
		return
	}

	response.JSON(w, http.StatusOK, workshop)
}

func parseInt(value string, fallback int) int {
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func writeDomainError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, domain.ErrInvalidInput):
		response.Error(w, http.StatusBadRequest, "invalid_input", err.Error())
	case errors.Is(err, domain.ErrUnauthorized):
		response.Error(w, http.StatusUnauthorized, "unauthorized", "Não autenticado.")
	case errors.Is(err, domain.ErrForbidden):
		response.Error(w, http.StatusForbidden, "forbidden", "Acesso negado.")
	case errors.Is(err, domain.ErrNotFound):
		response.Error(w, http.StatusNotFound, "not_found", "Registro não encontrado.")
	case errors.Is(err, domain.ErrConflict):
		response.Error(w, http.StatusConflict, "conflict", err.Error())
	default:
		response.Error(w, http.StatusInternalServerError, "internal_error", "Erro interno.")
	}
}
