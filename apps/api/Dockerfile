FROM golang:1.26-alpine AS build

WORKDIR /src

COPY go.mod go.sum* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/admin-api ./cmd/api

FROM alpine:3.22

RUN adduser -D -H appuser
USER appuser

WORKDIR /app
COPY --from=build /bin/admin-api /app/admin-api

EXPOSE 8080

CMD ["/app/admin-api"]
