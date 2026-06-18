package usecases

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"net"
	"net/mail"
	"regexp"
	"strings"
	"time"

	"car-workshop-admin-api/internal/domain"
)

type WorkshopRepository interface {
	Create(ctx context.Context, input domain.CreateWorkshopRepositoryInput) (domain.Workshop, error)
	List(ctx context.Context, filter domain.ListWorkshopsFilter) ([]domain.WorkshopSummary, int, error)
	FindByID(ctx context.Context, id string) (domain.Workshop, error)
	UpdateStatus(ctx context.Context, id string, status domain.TenantStatus) (domain.Workshop, error)
	UpdateBranding(ctx context.Context, id string, branding domain.WorkshopBranding) (domain.Workshop, error)
	UpdateCustomDomain(ctx context.Context, id string, customDomain *string, verificationToken string) (domain.Workshop, error)
	MarkCustomDomainVerified(ctx context.Context, id string) (domain.Workshop, error)
	MarkCustomDomainError(ctx context.Context, id string, message string) (domain.Workshop, error)
	RemoveCustomDomain(ctx context.Context, id string) (domain.Workshop, error)
}

type WorkshopUsecase struct {
	repository  WorkshopRepository
	cnameTarget string
}

var slugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
var domainPattern = regexp.MustCompile(`^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$`)

func NewWorkshopUsecase(repository WorkshopRepository, cnameTarget string) *WorkshopUsecase {
	return &WorkshopUsecase{
		repository:  repository,
		cnameTarget: normalizeDNSTarget(cnameTarget),
	}
}

func (u *WorkshopUsecase) Create(ctx context.Context, input domain.CreateWorkshopInput) (domain.Workshop, error) {
	normalized, err := normalizeCreateInput(input)
	if err != nil {
		return domain.Workshop{}, err
	}

	return u.repository.Create(ctx, domain.CreateWorkshopRepositoryInput{
		CreateWorkshopInput: normalized,
		Status:              domain.TenantStatusTrial,
	})
}

func (u *WorkshopUsecase) List(ctx context.Context, filter domain.ListWorkshopsFilter) ([]domain.WorkshopSummary, int, error) {
	if filter.Limit <= 0 || filter.Limit > 100 {
		filter.Limit = 20
	}
	if filter.Offset < 0 {
		filter.Offset = 0
	}
	if filter.Status != nil && !filter.Status.IsValid() {
		return nil, 0, fmt.Errorf("%w: invalid status", domain.ErrInvalidInput)
	}
	filter.Search = strings.TrimSpace(filter.Search)

	return u.repository.List(ctx, filter)
}

func (u *WorkshopUsecase) FindByID(ctx context.Context, id string) (domain.Workshop, error) {
	if strings.TrimSpace(id) == "" {
		return domain.Workshop{}, fmt.Errorf("%w: id is required", domain.ErrInvalidInput)
	}
	return u.repository.FindByID(ctx, id)
}

func (u *WorkshopUsecase) UpdateStatus(ctx context.Context, id string, status domain.TenantStatus) (domain.Workshop, error) {
	if strings.TrimSpace(id) == "" {
		return domain.Workshop{}, fmt.Errorf("%w: id is required", domain.ErrInvalidInput)
	}
	if !status.IsValid() {
		return domain.Workshop{}, fmt.Errorf("%w: invalid status", domain.ErrInvalidInput)
	}
	return u.repository.UpdateStatus(ctx, id, status)
}

func (u *WorkshopUsecase) UpdateBranding(ctx context.Context, id string, branding domain.WorkshopBranding) (domain.Workshop, error) {
	if strings.TrimSpace(id) == "" {
		return domain.Workshop{}, fmt.Errorf("%w: id is required", domain.ErrInvalidInput)
	}
	if err := validateBranding(branding); err != nil {
		return domain.Workshop{}, err
	}
	return u.repository.UpdateBranding(ctx, id, branding)
}

func (u *WorkshopUsecase) UpdateCustomDomain(ctx context.Context, id string, customDomain *string) (domain.CustomDomainResult, error) {
	if strings.TrimSpace(id) == "" {
		return domain.CustomDomainResult{}, fmt.Errorf("%w: id is required", domain.ErrInvalidInput)
	}

	normalizedDomain := normalizeDomain(customDomain)
	if normalizedDomain == nil || !domainPattern.MatchString(*normalizedDomain) {
		return domain.CustomDomainResult{}, fmt.Errorf("%w: invalid customDomain", domain.ErrInvalidInput)
	}

	token, err := generateVerificationToken()
	if err != nil {
		return domain.CustomDomainResult{}, err
	}

	workshop, err := u.repository.UpdateCustomDomain(ctx, id, normalizedDomain, token)
	if err != nil {
		return domain.CustomDomainResult{}, err
	}

	return domain.CustomDomainResult{
		Workshop:     workshop,
		Instructions: u.customDomainInstructions(workshop),
	}, nil
}

func (u *WorkshopUsecase) VerifyCustomDomain(ctx context.Context, id string) (domain.CustomDomainResult, error) {
	if strings.TrimSpace(id) == "" {
		return domain.CustomDomainResult{}, fmt.Errorf("%w: id is required", domain.ErrInvalidInput)
	}

	workshop, err := u.repository.FindByID(ctx, id)
	if err != nil {
		return domain.CustomDomainResult{}, err
	}

	if workshop.CustomDomain == nil {
		return domain.CustomDomainResult{}, fmt.Errorf("%w: customDomain is required", domain.ErrInvalidInput)
	}

	instructions := u.customDomainInstructions(workshop)
	cnameOk, dnsErr := u.validateCNAME(ctx, *workshop.CustomDomain)
	if !cnameOk {
		message := "CNAME não encontrado ou apontando para destino incorreto."
		if dnsErr != nil {
			message = dnsErr.Error()
		}
		workshop, err = u.repository.MarkCustomDomainError(ctx, id, message)
		if err != nil {
			return domain.CustomDomainResult{}, err
		}
		return domain.CustomDomainResult{Workshop: workshop, Instructions: instructions}, nil
	}

	workshop, err = u.repository.MarkCustomDomainVerified(ctx, id)
	if err != nil {
		return domain.CustomDomainResult{}, err
	}

	return domain.CustomDomainResult{
		Workshop:     workshop,
		Instructions: instructions,
	}, nil
}

func (u *WorkshopUsecase) RemoveCustomDomain(ctx context.Context, id string) (domain.Workshop, error) {
	if strings.TrimSpace(id) == "" {
		return domain.Workshop{}, fmt.Errorf("%w: id is required", domain.ErrInvalidInput)
	}

	return u.repository.RemoveCustomDomain(ctx, id)
}

func normalizeCreateInput(input domain.CreateWorkshopInput) (domain.CreateWorkshopInput, error) {
	input.Name = strings.TrimSpace(input.Name)
	input.Slug = strings.ToLower(strings.TrimSpace(input.Slug))
	input.CustomDomain = normalizeDomain(input.CustomDomain)
	input.LegalName = strings.TrimSpace(input.LegalName)
	input.TradeName = trimOptional(input.TradeName)
	input.Document = trimOptional(input.Document)
	input.Email = trimOptional(input.Email)
	input.Phone = trimOptional(input.Phone)
	input.Branding.LogoURL = trimOptional(input.Branding.LogoURL)

	if input.Name == "" {
		return input, fmt.Errorf("%w: name is required", domain.ErrInvalidInput)
	}
	if input.Slug == "" || !slugPattern.MatchString(input.Slug) {
		return input, fmt.Errorf("%w: slug must be lowercase kebab-case", domain.ErrInvalidInput)
	}
	if input.LegalName == "" {
		return input, fmt.Errorf("%w: legalName is required", domain.ErrInvalidInput)
	}
	if input.CustomDomain != nil && !domainPattern.MatchString(*input.CustomDomain) {
		return input, fmt.Errorf("%w: invalid customDomain", domain.ErrInvalidInput)
	}
	if input.Email != nil {
		if _, err := mail.ParseAddress(*input.Email); err != nil {
			return input, fmt.Errorf("%w: invalid email", domain.ErrInvalidInput)
		}
	}
	if err := validateBranding(input.Branding); err != nil {
		return input, err
	}

	return input, nil
}

func normalizeDomain(value *string) *string {
	value = trimOptional(value)
	if value == nil {
		return nil
	}

	normalized := strings.ToLower(strings.TrimPrefix(strings.TrimPrefix(*value, "https://"), "http://"))
	normalized = strings.TrimSuffix(strings.Split(normalized, "/")[0], ".")
	if normalized == "" {
		return nil
	}

	return &normalized
}

func normalizeDNSTarget(value string) string {
	return strings.TrimSuffix(strings.ToLower(strings.TrimSpace(value)), ".")
}

func generateVerificationToken() (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func (u *WorkshopUsecase) customDomainInstructions(workshop domain.Workshop) domain.CustomDomainInstructions {
	cnameName := ""
	if workshop.CustomDomain != nil {
		cnameName = *workshop.CustomDomain
	}

	instructions := domain.CustomDomainInstructions{
		CNAME: domain.CustomDomainRecord{
			Type:  "CNAME",
			Name:  cnameName,
			Value: u.cnameTarget,
		},
	}

	if workshop.CustomDomainVerificationToken != nil {
		instructions.TXT = &domain.CustomDomainRecord{
			Type:  "TXT",
			Name:  "_workshop-verification",
			Value: *workshop.CustomDomainVerificationToken,
		}
	}

	return instructions
}

func (u *WorkshopUsecase) validateCNAME(ctx context.Context, customDomain string) (bool, error) {
	resolvers := []*net.Resolver{
		net.DefaultResolver,
		dnsResolver("1.1.1.1:53"),
		dnsResolver("8.8.8.8:53"),
	}

	var lastErr error
	for _, resolver := range resolvers {
		records, err := resolver.LookupCNAME(ctx, customDomain)
		if err != nil {
			lastErr = err
			continue
		}

		return normalizeDNSTarget(records) == u.cnameTarget, nil
	}

	return false, lastErr
}

func dnsResolver(address string) *net.Resolver {
	dialer := &net.Dialer{Timeout: 5 * time.Second}

	return &net.Resolver{
		PreferGo: true,
		Dial: func(ctx context.Context, network string, _ string) (net.Conn, error) {
			return dialer.DialContext(ctx, network, address)
		},
	}
}

func validateBranding(branding domain.WorkshopBranding) error {
	branding.LogoURL = trimOptional(branding.LogoURL)
	return nil
}

func trimOptional(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func IsNotFound(err error) bool {
	return errors.Is(err, domain.ErrNotFound)
}
