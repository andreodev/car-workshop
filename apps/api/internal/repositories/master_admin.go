package repositories

import (
	"context"
	"errors"

	"car-workshop-admin-api/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type MasterAdminRepository struct {
	db *pgxpool.Pool
}

func NewMasterAdminRepository(db *pgxpool.Pool) *MasterAdminRepository {
	return &MasterAdminRepository{db: db}
}

func (r *MasterAdminRepository) ExistsByUserID(ctx context.Context, userID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM "TenantUser"
			WHERE "userId" = $1
			  AND "role" = 'OWNER'
			  AND "isActive" = TRUE
		 )
	`, userID).Scan(&exists)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, domain.ErrNotFound
		}
		return false, err
	}
	return exists, nil
}
