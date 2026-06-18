package middleware

import (
	"context"
	"net/http"
	"strings"

	"car-workshop-admin-api/internal/domain"
	"car-workshop-admin-api/internal/http/response"
	"github.com/golang-jwt/jwt/v5"
)

type MasterAdminRepository interface {
	ExistsByUserID(ctx context.Context, userID string) (bool, error)
}

type contextKey string

const masterAdminUserIDKey contextKey = "masterAdminUserID"

func NewMasterAdminGuard(jwtSecret string, repository MasterAdminRepository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, err := userIDFromBearerToken(r, jwtSecret)
			if err != nil {
				response.Error(w, http.StatusUnauthorized, "unauthorized", "Token admin inválido ou ausente.")
				return
			}

			isOwner, err := repository.ExistsByUserID(r.Context(), userID)
			if err != nil {
				response.Error(w, http.StatusInternalServerError, "internal_error", "Erro ao validar owner.")
				return
			}
			if !isOwner {
				response.Error(w, http.StatusForbidden, "forbidden", "Usuário não é owner.")
				return
			}

			ctx := context.WithValue(r.Context(), masterAdminUserIDKey, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func MasterAdminUserID(ctx context.Context) (string, bool) {
	userID, ok := ctx.Value(masterAdminUserIDKey).(string)
	return userID, ok
}

func userIDFromBearerToken(r *http.Request, jwtSecret string) (string, error) {
	header := r.Header.Get("Authorization")
	tokenValue, ok := strings.CutPrefix(header, "Bearer ")
	if !ok || strings.TrimSpace(tokenValue) == "" {
		return "", domain.ErrUnauthorized
	}

	token, err := jwt.ParseWithClaims(tokenValue, jwt.MapClaims{}, func(token *jwt.Token) (any, error) {
		if token.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, domain.ErrUnauthorized
		}
		return []byte(jwtSecret), nil
	})
	if err != nil || !token.Valid {
		return "", domain.ErrUnauthorized
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", domain.ErrUnauthorized
	}

	subject, err := claims.GetSubject()
	if err != nil || subject == "" {
		return "", domain.ErrUnauthorized
	}

	return subject, nil
}
