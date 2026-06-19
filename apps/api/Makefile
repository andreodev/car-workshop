.PHONY: run dev test fmt tidy docker-up docker-dev

run:
	go run ./cmd/api

dev:
	go run github.com/air-verse/air@latest -c .air.toml

test:
	go test ./...

fmt:
	gofmt -w .

tidy:
	go mod tidy

docker-up:
	docker compose up --build

docker-dev:
	docker compose -f docker-compose.dev.yml up --build
