# Multi-tenant domains

## Environment variables

```env
PLATFORM_ROOT_DOMAIN=meudominio.com.br
NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN=meudominio.com.br
PLATFORM_APP_DOMAIN=app.meudominio.com.br
NEXT_PUBLIC_PLATFORM_APP_DOMAIN=app.meudominio.com.br
NEXT_PUBLIC_PLATFORM_BASE_URL=https://app.meudominio.com.br
NEXT_PUBLIC_CUSTOM_DOMAIN_CNAME_TARGET=cname.vercel-dns.com
```

- `PLATFORM_ROOT_DOMAIN`: base domain used for tenant subdomains, such as `oficinaA.meudominio.com.br`.
- `PLATFORM_APP_DOMAIN`: main platform/admin host. It is treated as platform root and does not resolve to a tenant by host.
- `NEXT_PUBLIC_PLATFORM_BASE_URL`: public base URL used when redirecting users from platform-root flows.
- `NEXT_PUBLIC_CUSTOM_DOMAIN_CNAME_TARGET`: DNS CNAME target shown in the admin custom-domain screen.

## Wildcard subdomains

1. Configure DNS for `*.meudominio.com.br` pointing to the deployment provider.
2. Add `meudominio.com.br` and `*.meudominio.com.br` in the hosting provider.
3. Set the env vars above.
4. Create a tenant with slug `oficinaA`.
5. Access `https://oficinaA.meudominio.com.br`.

## Custom domains

1. Create the tenant in the admin.
2. Add `app.cliente.com.br` as the tenant custom domain.
3. Show the customer the DNS instructions:
   - Type: `CNAME`
   - Name: `app`
   - Value: `cname.vercel-dns.com` or the configured target
4. Optionally show TXT verification:
   - Type: `TXT`
   - Name: `_workshop-verification`
   - Value: generated verification token
5. Run domain verification from the admin.
6. When DNS matches, set `customDomainVerifiedAt` and mark the domain as `VERIFIED`.

## Resolution order

1. Verified custom domain.
2. Tenant subdomain using `Tenant.slug`.
3. Session-selected tenant on platform root.
4. Development-only override using `x-tenant-id`, `?tenant=` or `?tenantId=`.

Host-derived tenant is authoritative. Client-provided tenant ids are only accepted in development or protected automation flows.
