.PHONY: run test fmt tidy docker-up

run:
	go run ./cmd/api

test:
	go test ./...

fmt:
	gofmt -w .

tidy:
	go mod tidy

docker-up:
	docker compose up --build
