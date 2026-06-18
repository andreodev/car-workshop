package vercel

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const apiBaseURL = "https://api.vercel.com"

type DomainRegistrar struct {
	client    *http.Client
	token     string
	projectID string
}

func NewDomainRegistrar(token string, projectID string) *DomainRegistrar {
	return &DomainRegistrar{
		client: &http.Client{
			Timeout: 15 * time.Second,
		},
		token:     strings.TrimSpace(token),
		projectID: strings.TrimSpace(projectID),
	}
}

func (r *DomainRegistrar) IsConfigured() bool {
	return r != nil && r.token != "" && r.projectID != ""
}

func (r *DomainRegistrar) AddProjectDomain(ctx context.Context, customDomain string) error {
	if !r.IsConfigured() {
		return fmt.Errorf("configuracao da Vercel ausente: defina VERCEL_TOKEN e VERCEL_PROJECT_ID")
	}

	payload, err := json.Marshal(map[string]string{
		"name": customDomain,
	})
	if err != nil {
		return err
	}

	endpoint := fmt.Sprintf("%s/v10/projects/%s/domains", apiBaseURL, url.PathEscape(r.projectID))
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	request.Header.Set("Authorization", "Bearer "+r.token)
	request.Header.Set("Content-Type", "application/json")

	response, err := r.client.Do(request)
	if err != nil {
		return fmt.Errorf("falha ao chamar Vercel: %w", err)
	}
	defer response.Body.Close()

	if response.StatusCode >= http.StatusOK && response.StatusCode < http.StatusMultipleChoices {
		return nil
	}

	return fmt.Errorf("Vercel recusou o dominio: status %d: %s", response.StatusCode, readErrorBody(response.Body))
}

func readErrorBody(body io.Reader) string {
	data, err := io.ReadAll(io.LimitReader(body, 2048))
	if err != nil {
		return "erro ao ler resposta"
	}

	message := strings.TrimSpace(string(data))
	if message == "" {
		return "resposta vazia"
	}

	return message
}
