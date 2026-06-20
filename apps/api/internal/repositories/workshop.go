package repositories

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"car-workshop-admin-api/internal/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type WorkshopRepository struct {
	db *pgxpool.Pool
}

func NewWorkshopRepository(db *pgxpool.Pool) *WorkshopRepository {
	return &WorkshopRepository{db: db}
}

func (r *WorkshopRepository) Create(ctx context.Context, input domain.CreateWorkshopRepositoryInput) (domain.Workshop, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return domain.Workshop{}, err
	}
	defer tx.Rollback(ctx)

	tenantID := uuid.NewString()
	companySettingsID := uuid.NewString()

	_, err = tx.Exec(ctx, `
		INSERT INTO "Tenant" (
			"id", "name", "slug", "status", "customDomain", "customDomainVerifiedAt",
			"customDomainVerificationToken", "customDomainStatus", "customDomainLastError",
			"createdAt", "updatedAt"
		)
		VALUES ($1, $2, $3, $4, $5, NULL, NULL, 'PENDING', NULL, NOW(), NOW())
	`, tenantID, input.Name, input.Slug, input.Status, input.CustomDomain)
	if err != nil {
		return domain.Workshop{}, mapPgError(err)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO "CompanySettings" (
			"id", "tenantId", "singletonKey", "legalName", "tradeName", "document",
			"email", "phone", "logoUrl", "createdAt", "updatedAt"
		)
		VALUES ($1, $2, 'company', $3, $4, $5, $6, $7, $8, NOW(), NOW())
	`, companySettingsID, tenantID, input.LegalName, input.TradeName, input.Document, input.Email, input.Phone, input.Branding.LogoURL)
	if err != nil {
		return domain.Workshop{}, mapPgError(err)
	}

	customizationID := uuid.NewString()
	customizationJSON, err := marshalCustomization(input.Customization)
	if err != nil {
		return domain.Workshop{}, err
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO "Customization" ("id", "tenantId", "data", "createdAt", "updatedAt")
		VALUES ($1, $2, $3::jsonb, NOW(), NOW())
	`, customizationID, tenantID, customizationJSON)
	if err != nil {
		return domain.Workshop{}, mapPgError(err)
	}

	if err := tx.Commit(ctx); err != nil {
		return domain.Workshop{}, err
	}

	return r.FindByID(ctx, tenantID)
}

func (r *WorkshopRepository) List(ctx context.Context, filter domain.ListWorkshopsFilter) ([]domain.WorkshopSummary, int, error) {
	args := []any{}
	conditions := []string{"1 = 1"}

	if filter.Search != "" {
		args = append(args, "%"+filter.Search+"%")
		conditions = append(conditions, fmt.Sprintf(`(
			t."name" ILIKE $%d OR t."slug" ILIKE $%d OR cs."legalName" ILIKE $%d OR cs."tradeName" ILIKE $%d
		)`, len(args), len(args), len(args), len(args)))
	}
	if filter.Status != nil {
		args = append(args, *filter.Status)
		conditions = append(conditions, fmt.Sprintf(`t."status" = $%d`, len(args)))
	}

	where := strings.Join(conditions, " AND ")
	countQuery := `SELECT COUNT(*) FROM "Tenant" t LEFT JOIN "CompanySettings" cs ON cs."tenantId" = t."id" WHERE ` + where

	var total int
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, filter.Limit, filter.Offset)
	query := `
		SELECT
			t."id", t."name", t."slug", t."status", t."customDomain", t."customDomainVerifiedAt",
			t."customDomainVerificationToken", t."customDomainLastError", t."customDomainStatus",
			COALESCE(cs."legalName", t."name"), cs."tradeName",
			cs."logoUrl", COALESCE(cu."data", '{}'::jsonb)::text,
			(SELECT COUNT(*) FROM "TenantUser" tu WHERE tu."tenantId" = t."id" AND tu."isActive" = TRUE),
			(SELECT COUNT(*) FROM "Client" c WHERE c."tenantId" = t."id"),
			(SELECT COUNT(*) FROM "ServiceOrder" so WHERE so."tenantId" = t."id"),
			(SELECT COUNT(*) FROM "Sale" s WHERE s."tenantId" = t."id"),
			t."createdAt", t."updatedAt"
		FROM "Tenant" t
		LEFT JOIN "CompanySettings" cs ON cs."tenantId" = t."id"
		LEFT JOIN "Customization" cu ON cu."tenantId" = t."id"
		WHERE ` + where + `
		ORDER BY t."createdAt" DESC
		LIMIT $` + fmt.Sprint(len(args)-1) + ` OFFSET $` + fmt.Sprint(len(args))

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	workshops := make([]domain.WorkshopSummary, 0)
	for rows.Next() {
		var workshop domain.WorkshopSummary
		var customizationJSON string
		if err := rows.Scan(
			&workshop.ID,
			&workshop.Name,
			&workshop.Slug,
			&workshop.Status,
			&workshop.CustomDomain,
			&workshop.CustomDomainVerifiedAt,
			&workshop.CustomDomainVerificationToken,
			&workshop.CustomDomainLastError,
			&workshop.CustomDomainStatus,
			&workshop.LegalName,
			&workshop.TradeName,
			&workshop.LogoURL,
			&customizationJSON,
			&workshop.UsersCount,
			&workshop.ClientsCount,
			&workshop.ServiceOrdersCount,
			&workshop.SalesCount,
			&workshop.CreatedAt,
			&workshop.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		workshop.Customization = unmarshalCustomization(customizationJSON)
		workshops = append(workshops, workshop)
	}

	return workshops, total, rows.Err()
}

func (r *WorkshopRepository) FindByID(ctx context.Context, id string) (domain.Workshop, error) {
	var workshop domain.Workshop
	var customizationJSON string
	err := r.db.QueryRow(ctx, workshopSelectQuery()+` WHERE t."id" = $1`, id).Scan(workshopScanDest(&workshop, &customizationJSON)...)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.Workshop{}, domain.ErrNotFound
		}
		return domain.Workshop{}, err
	}
	workshop.Customization = unmarshalCustomization(customizationJSON)
	return workshop, nil
}

func (r *WorkshopRepository) UpdateStatus(ctx context.Context, id string, status domain.TenantStatus) (domain.Workshop, error) {
	commandTag, err := r.db.Exec(ctx, `
		UPDATE "Tenant"
		SET "status" = $2, "updatedAt" = NOW()
		WHERE "id" = $1
	`, id, status)
	if err != nil {
		return domain.Workshop{}, mapPgError(err)
	}
	if commandTag.RowsAffected() == 0 {
		return domain.Workshop{}, domain.ErrNotFound
	}
	return r.FindByID(ctx, id)
}

func (r *WorkshopRepository) Delete(ctx context.Context, id string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `DELETE FROM "CompanySettings" WHERE "tenantId" = $1`, id)
	if err != nil {
		return mapTenantDeleteError(err)
	}

	commandTag, err := tx.Exec(ctx, `DELETE FROM "Tenant" WHERE "id" = $1`, id)
	if err != nil {
		return mapTenantDeleteError(err)
	}
	if commandTag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}

	return tx.Commit(ctx)
}

func (r *WorkshopRepository) Update(ctx context.Context, id string, input domain.UpdateWorkshopInput) (domain.Workshop, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return domain.Workshop{}, err
	}
	defer tx.Rollback(ctx)

	commandTag, err := tx.Exec(ctx, `
		UPDATE "Tenant"
		SET "name" = $2, "slug" = $3, "updatedAt" = NOW()
		WHERE "id" = $1
	`, id, input.Name, input.Slug)
	if err != nil {
		return domain.Workshop{}, mapPgError(err)
	}
	if commandTag.RowsAffected() == 0 {
		return domain.Workshop{}, domain.ErrNotFound
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO "CompanySettings" (
			"id", "tenantId", "singletonKey", "legalName", "tradeName", "document",
			"email", "phone", "logoUrl", "createdAt", "updatedAt"
		)
		VALUES ($1, $2, 'company', $3, $4, $5, $6, $7, $8, NOW(), NOW())
		ON CONFLICT ("tenantId") DO UPDATE SET
			"legalName" = EXCLUDED."legalName",
			"tradeName" = EXCLUDED."tradeName",
			"document" = EXCLUDED."document",
			"email" = EXCLUDED."email",
			"phone" = EXCLUDED."phone",
			"logoUrl" = EXCLUDED."logoUrl",
			"updatedAt" = NOW()
	`, uuid.NewString(), id, input.LegalName, input.TradeName, input.Document, input.Email, input.Phone, input.Branding.LogoURL)
	if err != nil {
		return domain.Workshop{}, mapPgError(err)
	}

	customizationJSON, err := marshalCustomization(input.Customization)
	if err != nil {
		return domain.Workshop{}, err
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO "Customization" ("id", "tenantId", "data", "createdAt", "updatedAt")
		VALUES ($1, $2, $3::jsonb, NOW(), NOW())
		ON CONFLICT ("tenantId") DO UPDATE SET
			"data" = EXCLUDED."data",
			"updatedAt" = NOW()
	`, uuid.NewString(), id, customizationJSON)
	if err != nil {
		return domain.Workshop{}, mapPgError(err)
	}

	if err := tx.Commit(ctx); err != nil {
		return domain.Workshop{}, err
	}

	return r.FindByID(ctx, id)
}

func (r *WorkshopRepository) UpdateBranding(ctx context.Context, id string, branding domain.WorkshopBranding) (domain.Workshop, error) {
	commandTag, err := r.db.Exec(ctx, `
		INSERT INTO "CompanySettings" (
			"id", "tenantId", "singletonKey", "legalName", "logoUrl", "createdAt", "updatedAt"
		)
		SELECT $1, t."id", 'company', t."name", $3, NOW(), NOW()
		FROM "Tenant" t
		WHERE t."id" = $2
		ON CONFLICT ("tenantId") DO UPDATE SET
			"logoUrl" = EXCLUDED."logoUrl",
			"updatedAt" = NOW()
	`, uuid.NewString(), id, branding.LogoURL)
	if err != nil {
		return domain.Workshop{}, mapPgError(err)
	}
	if commandTag.RowsAffected() == 0 {
		return domain.Workshop{}, domain.ErrNotFound
	}

	return r.FindByID(ctx, id)
}

func (r *WorkshopRepository) UpdateCustomDomain(ctx context.Context, id string, customDomain *string, verificationToken string) (domain.Workshop, error) {
	commandTag, err := r.db.Exec(ctx, `
		UPDATE "Tenant"
		SET
			"customDomain" = $2,
			"customDomainVerifiedAt" = NULL,
			"customDomainVerificationToken" = $3,
			"customDomainStatus" = 'PENDING',
			"customDomainLastError" = NULL,
			"updatedAt" = NOW()
		WHERE "id" = $1
	`, id, customDomain, verificationToken)
	if err != nil {
		return domain.Workshop{}, mapPgError(err)
	}
	if commandTag.RowsAffected() == 0 {
		return domain.Workshop{}, domain.ErrNotFound
	}

	return r.FindByID(ctx, id)
}

func (r *WorkshopRepository) MarkCustomDomainVerified(ctx context.Context, id string) (domain.Workshop, error) {
	commandTag, err := r.db.Exec(ctx, `
		UPDATE "Tenant"
		SET
			"customDomainVerifiedAt" = NOW(),
			"customDomainStatus" = 'VERIFIED',
			"customDomainLastError" = NULL,
			"updatedAt" = NOW()
		WHERE "id" = $1 AND "customDomain" IS NOT NULL
	`, id)
	if err != nil {
		return domain.Workshop{}, mapPgError(err)
	}
	if commandTag.RowsAffected() == 0 {
		return domain.Workshop{}, domain.ErrNotFound
	}

	return r.FindByID(ctx, id)
}

func (r *WorkshopRepository) MarkCustomDomainError(ctx context.Context, id string, message string) (domain.Workshop, error) {
	commandTag, err := r.db.Exec(ctx, `
		UPDATE "Tenant"
		SET
			"customDomainVerifiedAt" = NULL,
			"customDomainStatus" = 'ERROR',
			"customDomainLastError" = $2,
			"updatedAt" = NOW()
		WHERE "id" = $1 AND "customDomain" IS NOT NULL
	`, id, message)
	if err != nil {
		return domain.Workshop{}, mapPgError(err)
	}
	if commandTag.RowsAffected() == 0 {
		return domain.Workshop{}, domain.ErrNotFound
	}

	return r.FindByID(ctx, id)
}

func (r *WorkshopRepository) RemoveCustomDomain(ctx context.Context, id string) (domain.Workshop, error) {
	commandTag, err := r.db.Exec(ctx, `
		UPDATE "Tenant"
		SET
			"customDomain" = NULL,
			"customDomainVerifiedAt" = NULL,
			"customDomainVerificationToken" = NULL,
			"customDomainStatus" = 'PENDING',
			"customDomainLastError" = NULL,
			"updatedAt" = NOW()
		WHERE "id" = $1
	`, id)
	if err != nil {
		return domain.Workshop{}, mapPgError(err)
	}
	if commandTag.RowsAffected() == 0 {
		return domain.Workshop{}, domain.ErrNotFound
	}

	return r.FindByID(ctx, id)
}

func workshopSelectQuery() string {
	return `
		SELECT
			t."id", t."name", t."slug", t."status", t."customDomain", t."customDomainVerifiedAt",
			t."customDomainVerificationToken", t."customDomainLastError", t."customDomainStatus",
			COALESCE(cs."legalName", t."name"), cs."tradeName", cs."document", cs."email", cs."phone",
			cs."logoUrl", COALESCE(cu."data", '{}'::jsonb)::text,
			t."createdAt", t."updatedAt"
		FROM "Tenant" t
		LEFT JOIN "CompanySettings" cs ON cs."tenantId" = t."id"
		LEFT JOIN "Customization" cu ON cu."tenantId" = t."id"
	`
}

func workshopScanDest(workshop *domain.Workshop, customizationJSON *string) []any {
	return []any{
		&workshop.ID,
		&workshop.Name,
		&workshop.Slug,
		&workshop.Status,
		&workshop.CustomDomain,
		&workshop.CustomDomainVerifiedAt,
		&workshop.CustomDomainVerificationToken,
		&workshop.CustomDomainLastError,
		&workshop.CustomDomainStatus,
		&workshop.LegalName,
		&workshop.TradeName,
		&workshop.Document,
		&workshop.Email,
		&workshop.Phone,
		&workshop.LogoURL,
		customizationJSON,
		&workshop.CreatedAt,
		&workshop.UpdatedAt,
	}
}

func marshalCustomization(customization domain.WorkshopCustomization) (string, error) {
	bytes, err := json.Marshal(customization)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

func unmarshalCustomization(raw string) domain.WorkshopCustomization {
	var customization domain.WorkshopCustomization
	if raw == "" {
		return customization
	}
	if err := json.Unmarshal([]byte(raw), &customization); err != nil {
		return domain.WorkshopCustomization{}
	}
	return customization
}

func mapPgError(err error) error {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		return err
	}

	switch pgErr.Code {
	case "23505":
		switch pgErr.ConstraintName {
		case "Tenant_slug_key":
			return fmt.Errorf("%w: slug já está em uso", domain.ErrConflict)
		case "Tenant_customDomain_key":
			return fmt.Errorf("%w: domínio personalizado já está em uso", domain.ErrConflict)
		case "CompanySettings_tenantId_key", "CompanySettings_tenantId_singletonKey_key", "Customization_tenantId_key":
			return fmt.Errorf("%w: metadados da oficina já existem", domain.ErrConflict)
		}
		return fmt.Errorf("%w: duplicated record", domain.ErrConflict)
	case "23503":
		return fmt.Errorf("%w: related record not found", domain.ErrInvalidInput)
	default:
		return err
	}
}

func mapTenantDeleteError(err error) error {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		return err
	}

	if pgErr.Code == "23503" {
		return fmt.Errorf(
			"%w: não é possível apagar uma oficina com dados vinculados; bloqueie a oficina para impedir acesso",
			domain.ErrConflict,
		)
	}

	return mapPgError(err)
}
