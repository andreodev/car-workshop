# Admin API Whitelabel

API Go para o admin whitelabel da plataforma de oficinas.

## Stack

- Go 1.26
- `chi` para HTTP routing
- `pgx` para PostgreSQL
- JWT HS256 para autenticar usuários OWNER
- Camadas separadas em `handlers`, `usecases` e `repositories`

## Rodando com Docker

Com o `web-platform` já rodando, suba somente a API Go:

```bash
docker compose up --build
```

A API sobe em `http://localhost:8080`.

## Atualizando em produção

No servidor, force o checkout a ficar igual ao `main` remoto e recrie o container da API. Isso evita manter uma imagem/container antigo depois do deploy.

```bash
cd /var/www/oficina-api/car-workshop
git fetch origin
git reset --hard origin/main
cd apps/api
docker compose up -d --build --force-recreate
docker image prune -f
```

O workflow `.github/workflows/deploy-api.yml` usa esse mesmo fluxo.

## Desenvolvimento com hot reload

Para evitar chamar uma versão antiga da API depois de alterar rotas ou handlers, rode a API em modo dev. O `air` observa os arquivos `.go`, recompila e reinicia o servidor automaticamente.

Rodando fora do Docker:

```bash
make dev
```

Rodando dentro do Docker, na mesma network do `web-platform`:

```bash
make docker-dev
```

Se uma rota nova continuar retornando `405`, pare o processo antigo que estiver usando a porta `8080` e suba novamente com um dos comandos acima.

## Banco

O serviço usa o mesmo schema PostgreSQL da plataforma whitelabel. O `docker-compose.yml` desta API não sobe outro banco: ele entra na network externa `car-workshop_default`, criada pelo compose do `web-platform`, e usa o serviço `db`.

```env
DATABASE_URL=postgres://postgres:postgres@db:5432/car_workshop
```

Para rodar a API fora do Docker, use `localhost`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/car_workshop
ADMIN_CORS_ORIGINS=http://localhost:3002,http://127.0.0.1:3002,http://localhost:3003,http://127.0.0.1:3003
CUSTOM_DOMAIN_CNAME_TARGET=cname.vercel-dns.com
VERCEL_TOKEN=
VERCEL_PROJECT_ID=
```

Esta API não mantém uma migration paralela para tabelas que o Prisma do `web-platform` não conhece. Enquanto o Prisma for o dono do schema compartilhado, qualquer novo campo estrutural, como cores, banner ou ícone, deve entrar primeiro em uma migration Prisma do schema principal. Hoje a API usa `Tenant` e `CompanySettings`; a imagem suportada neste primeiro contrato é `logoUrl`.

## Autenticação admin

Rotas `/admin/*` exigem:

- `Authorization: Bearer <jwt>`
- JWT HS256 assinado com `ADMIN_JWT_SECRET`
- `sub` do JWT precisa existir em `TenantUser.userId` com `role = OWNER` e `isActive = true`

## Endpoints iniciais

- `GET /healthz`
- `GET /admin/workshops`
- `POST /admin/workshops`
- `GET /admin/workshops/{id}`
- `PATCH /admin/workshops/{id}`
- `POST /admin/workshops/{id}/update`
- `DELETE /admin/workshops/{id}`
- `POST /admin/workshops/{id}/delete`
- `PATCH /admin/workshops/{id}/status`
- `POST /admin/workshops/{id}/status`
- `PUT /admin/workshops/{id}/branding`
- `PATCH /admin/workshops/{id}/custom-domain`
- `POST /admin/workshops/{id}/custom-domain/verify`
- `DELETE /admin/workshops/{id}/custom-domain`

### `GET /admin/workshops`

Query params:

- `search`: busca por nome, slug, razão social ou nome fantasia.
- `status`: `TRIAL`, `ACTIVE`, `SUSPENDED` ou `CANCELED`.
- `limit`: padrão `20`, máximo `100`.
- `offset`: padrão `0`.

Resposta:

```json
{
  "data": [
    {
      "id": "tenant_default",
      "name": "Oficina Principal",
      "slug": "oficina-principal",
      "status": "ACTIVE",
      "legalName": "Oficina Principal",
      "tradeName": "Oficina Principal",
      "logoUrl": "https://cdn.exemplo.com/logo.png",
      "usersCount": 2,
      "clientsCount": 34,
      "serviceOrdersCount": 128,
      "salesCount": 82,
      "createdAt": "2026-06-18T15:00:00Z",
      "updatedAt": "2026-06-18T15:00:00Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

## Exemplo de criação de oficina

```json
{
  "name": "Rikinho Auto Center",
  "slug": "rikinho-auto-center",
  "customDomain": "app.rikinho.com.br",
  "legalName": "Rikinho Auto Center LTDA",
  "tradeName": "Rikinho Auto Center",
  "document": "12345678000190",
  "email": "admin@rikinho.com.br",
  "phone": "95999999999",
  "branding": {
    "logoUrl": "https://cdn.exemplo.com/rikinho/logo.png"
  }
}
```

## Domínio customizado

### Atualizar domínio

```http
PATCH /admin/workshops/{id}/custom-domain
```

```json
{
  "customDomain": "app.cliente.com.br"
}
```

Retorna a oficina atualizada e instruções DNS:

```json
{
  "workshop": {
    "id": "tenant_123",
    "customDomain": "app.cliente.com.br",
    "customDomainStatus": "PENDING"
  },
  "instructions": {
    "cname": {
      "type": "CNAME",
      "name": "app.cliente.com.br",
      "value": "cname.vercel-dns.com"
    },
    "txt": {
      "type": "TXT",
      "name": "_workshop-verification",
      "value": "token-gerado"
    }
  }
}
```

### Verificar DNS

```http
POST /admin/workshops/{id}/custom-domain/verify
```

Consulta o CNAME do domínio, adiciona o domínio no projeto da Vercel usando `VERCEL_TOKEN` e `VERCEL_PROJECT_ID`, e só então marca `customDomainStatus` como `VERIFIED`. Em caso de erro no DNS ou na Vercel, salva `customDomainLastError` e mantém o domínio sem `customDomainVerifiedAt`.

### Remover domínio

```http
DELETE /admin/workshops/{id}/custom-domain
```

Limpa `customDomain`, `customDomainVerifiedAt`, token e status de verificação.
