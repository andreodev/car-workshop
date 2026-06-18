package domain

import "time"

type TenantStatus string
type CustomDomainStatus string

const (
	TenantStatusTrial     TenantStatus = "TRIAL"
	TenantStatusActive    TenantStatus = "ACTIVE"
	TenantStatusSuspended TenantStatus = "SUSPENDED"
	TenantStatusCanceled  TenantStatus = "CANCELED"
)

const (
	CustomDomainStatusPending  CustomDomainStatus = "PENDING"
	CustomDomainStatusVerified CustomDomainStatus = "VERIFIED"
	CustomDomainStatusError    CustomDomainStatus = "ERROR"
)

func (s TenantStatus) IsValid() bool {
	switch s {
	case TenantStatusTrial, TenantStatusActive, TenantStatusSuspended, TenantStatusCanceled:
		return true
	default:
		return false
	}
}

type Workshop struct {
	ID                            string             `json:"id"`
	Name                          string             `json:"name"`
	Slug                          string             `json:"slug"`
	Status                        TenantStatus       `json:"status"`
	CustomDomain                  *string            `json:"customDomain,omitempty"`
	CustomDomainVerifiedAt        *time.Time         `json:"customDomainVerifiedAt,omitempty"`
	CustomDomainVerificationToken *string            `json:"customDomainVerificationToken,omitempty"`
	CustomDomainLastError         *string            `json:"customDomainLastError,omitempty"`
	CustomDomainStatus            CustomDomainStatus `json:"customDomainStatus"`
	LegalName                     string             `json:"legalName"`
	TradeName                     *string            `json:"tradeName,omitempty"`
	Document                      *string            `json:"document,omitempty"`
	Email                         *string            `json:"email,omitempty"`
	Phone                         *string            `json:"phone,omitempty"`
	LogoURL                       *string            `json:"logoUrl,omitempty"`
	CreatedAt                     time.Time          `json:"createdAt"`
	UpdatedAt                     time.Time          `json:"updatedAt"`
}

type WorkshopSummary struct {
	ID                            string             `json:"id"`
	Name                          string             `json:"name"`
	Slug                          string             `json:"slug"`
	Status                        TenantStatus       `json:"status"`
	CustomDomain                  *string            `json:"customDomain,omitempty"`
	CustomDomainVerifiedAt        *time.Time         `json:"customDomainVerifiedAt,omitempty"`
	CustomDomainVerificationToken *string            `json:"customDomainVerificationToken,omitempty"`
	CustomDomainLastError         *string            `json:"customDomainLastError,omitempty"`
	CustomDomainStatus            CustomDomainStatus `json:"customDomainStatus"`
	LegalName                     string             `json:"legalName"`
	TradeName                     *string            `json:"tradeName,omitempty"`
	LogoURL                       *string            `json:"logoUrl,omitempty"`
	UsersCount                    int                `json:"usersCount"`
	ClientsCount                  int                `json:"clientsCount"`
	ServiceOrdersCount            int                `json:"serviceOrdersCount"`
	SalesCount                    int                `json:"salesCount"`
	CreatedAt                     time.Time          `json:"createdAt"`
	UpdatedAt                     time.Time          `json:"updatedAt"`
}

type WorkshopBranding struct {
	LogoURL *string `json:"logoUrl,omitempty"`
}

type CustomDomainInstructions struct {
	CNAME CustomDomainRecord  `json:"cname"`
	TXT   *CustomDomainRecord `json:"txt,omitempty"`
}

type CustomDomainRecord struct {
	Type  string `json:"type"`
	Name  string `json:"name"`
	Value string `json:"value"`
}

type CustomDomainResult struct {
	Workshop     Workshop                 `json:"workshop"`
	Instructions CustomDomainInstructions `json:"instructions"`
}

type CreateWorkshopInput struct {
	Name         string
	Slug         string
	CustomDomain *string
	LegalName    string
	TradeName    *string
	Document     *string
	Email        *string
	Phone        *string
	Branding     WorkshopBranding
}

type CreateWorkshopRepositoryInput struct {
	CreateWorkshopInput
	Status TenantStatus
}

type ListWorkshopsFilter struct {
	Search string
	Status *TenantStatus
	Limit  int
	Offset int
}
