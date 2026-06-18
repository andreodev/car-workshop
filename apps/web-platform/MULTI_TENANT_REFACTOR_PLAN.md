# Multi-Tenant Architecture

Scope: `apps/web-platform`.

This document specifies the runtime architecture for multi-tenancy: data model, resolver, middleware, and the user-facing flows that depend on them (login, tenant switch, custom domain, admin master). It assumes the tenant resolution contract defined in `Multi-Tenant Refactor Plan`, Section 9, as a fixed dependency — domain taxonomy, resolution order, and the 404/403 split are not re-derived here, only built on.

This document is a design artifact only. No production code, Prisma schema, migrations, or behavior were changed for this stage.

## 1. Data Model

### 1.1 `Tenant`

| Field                    | Type                                                    | Notes                                                                                                                                                                                                                |
| ------------------------ | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                     | `String @id @default(cuid())`                           |                                                                                                                                                                                                                      |
| `name`                   | `String`                                                | Display name, e.g. "Rikinho Auto Center".                                                                                                                                                                            |
| `slug`                   | `String @unique`                                        | Used for `{slug}.sistema.com.br`. Lowercase, URL-safe, immutable after creation (changing it breaks bookmarks and any cached subdomain routing).                                                                     |
| `status`                 | `enum TenantStatus { TRIAL ACTIVE SUSPENDED CANCELED }` | Drives whether the resolver allows the tenant through at all (Section 5.4).                                                                                                                                          |
| `customDomain`           | `String? @unique`                                       | Nullable. Raw domain string, e.g. `app.rikinhoautocenter.com.br`.                                                                                                                                                    |
| `customDomainVerifiedAt` | `DateTime?`                                             | Null until DNS verification (Section 4) completes. A non-null `customDomain` with a null `customDomainVerifiedAt` must **not** be usable for resolution — only a verified domain enters the resolver's domain table. |
| `createdAt`, `updatedAt` | `DateTime`                                              | Standard.                                                                                                                                                                                                            |

`CompanySettings` (from the refactor plan, Section 5) becomes a one-to-one child of `Tenant` rather than merged into it — keeping it a separate table preserves the existing settings route's shape and avoids a wide `Tenant` table mixing identity/billing concerns with operational config (PDF letterhead, business hours, etc.).

### 1.2 `TenantUser`

| Field                    | Type                                    | Notes                                                                                                                                |
| ------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                     | `String @id @default(cuid())`           |                                                                                                                                      |
| `tenantId`               | `String`                                | FK to `Tenant`.                                                                                                                      |
| `userId`                 | `String`                                | FK to `User`.                                                                                                                        |
| `role`                   | `enum TenantRole { OWNER ADMIN STAFF }` | See Section 2.                                                                                                                       |
| `isActive`               | `Boolean @default(true)`                | Soft-disable a membership without deleting history (e.g. removing an employee but keeping their attribution on past service orders). |
| `createdAt`, `updatedAt` | `DateTime`                              |                                                                                                                                      |

`@@unique([tenantId, userId])` — one membership row per user per tenant. A user with no `TenantUser` rows at all is a fully registered account with no workshop access yet (e.g. mid-signup); this is a valid, expected state, not an error state.

This is the only place `tenantId` touches the `User`/`Account`/`Session`/`VerificationToken` graph. Those four NextAuth tables stay exactly as the refactor plan's Section 4 describes: untouched, global, adapter-compatible.

### 1.3 `MasterAdmin`

| Field       | Type                          | Notes         |
| ----------- | ----------------------------- | ------------- |
| `id`        | `String @id @default(cuid())` |               |
| `userId`    | `String @unique`              | FK to `User`. |
| `createdAt` | `DateTime`                    |               |

A separate table, not a `TenantRole` value. A master admin is not "a member of every tenant" — they have no `TenantUser` row at all under normal operation. This keeps the two privilege systems from ever being compared by the same code path (Section 6 explains why that separation is load-bearing, not incidental).

## 2. Roles and Permissions

Three roles, scoped per `TenantUser` row — a user can hold different roles in different tenants:

| Role    | Can                                                                                                                                                                                              | Cannot                                                                                                              |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `OWNER` | Everything `ADMIN` can, plus: manage billing, change `Tenant.customDomain`, remove other `OWNER`/`ADMIN` memberships, delete the tenant.                                                         | —                                                                                                                   |
| `ADMIN` | Manage `TenantUser` memberships (invite/deactivate `STAFF`/`ADMIN`), manage `CompanySettings`, full CRUD on all business modules (clients, vehicles, service orders, sales, finance, suppliers). | Cannot remove an `OWNER`, cannot touch billing or custom domain.                                                    |
| `STAFF` | Operate day-to-day modules per the refactor plan's module list (service orders, sales/PDV, estimates, mechanics, catalog) — create/read/update on operational records.                           | Cannot manage memberships, `CompanySettings`, financial-category configuration, or anything billing/domain related. |

Permissions are role-based, not per-action, deliberately: the business surface here (workshop operations) doesn't have enough distinct actions to justify a permission-matrix system, and a three-role model is cheap to reason about in every route handler (`if (role === "STAFF") return 403` is auditable at a glance; a permissions table is not). If a future module needs finer granularity (e.g. a `STAFF` who can see finance but not edit it), extend with a capability flag on `TenantUser` rather than introducing a fourth role — additive flags are easier to migrate than a role split.

Every tenant must have at least one `OWNER` at all times. Removing the last `OWNER` (demotion or deactivation) is rejected at the service layer, not just the UI — this is a business invariant, not a presentation rule.

## 3. Tenant Resolver as Middleware

This section makes the Section 9 resolver concrete as Next.js middleware. It does not redefine resolution order, domain taxonomy, or the 404/403 split — see the refactor plan for those.

### 3.1 Placement

`middleware.ts` at the project root, matched against all paths except static assets:

```js
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

The middleware performs **host-based** resolution only (Section 9.1 steps 1–2, plus the dev override of step 4 when `Host` is the platform root domain or localhost). It cannot perform **session-based** resolution (step 3) itself, because Next.js middleware runs before most session-reading server logic is convenient to invoke consistently across the app router — session resolution is instead handled in a shared server helper (Section 3.3) called from layouts/route handlers on the platform root domain.

### 3.2 Middleware responsibilities

1. Parse `Host`. Classify it per the Section 9.0 taxonomy (tenant subdomain / verified custom domain / platform root).
2. If tenant subdomain or verified custom domain: look up the `Tenant` row. Not found → `404` immediately, short-circuiting the request before it reaches any page or route handler. Found → attach `tenantId` to the request via a header rewrite (e.g. `x-resolved-tenant-id`) that downstream server code reads — never trust a client-supplied version of this header; middleware must strip any incoming `x-resolved-tenant-id` from the original request before setting its own.
3. If platform root: pass through with no tenant header set. Downstream code (Section 3.3) is responsible for session/dev-override resolution.
4. Check `Tenant.status` (Section 5.4) immediately after lookup, before passing the request through — a `SUSPENDED` or `CANCELED` tenant should not reach application code at all.

### 3.3 Shared server helper

A single function, e.g. `getTenantContext()`, callable from server components and route handlers, that:

- Reads `x-resolved-tenant-id` if middleware set it (host-based resolution already happened).
- If not set (platform root domain), reads the session's selected tenant (Section 7), or the dev override if applicable and non-production.
- Returns `{ tenantId, role, userId } | null`.
- Does **not** itself perform the membership check (403 logic) — that's the caller's job, because some callers (public token routes) deliberately skip it. `getTenantContext()` only answers "what tenant does this request resolve to," not "is this user allowed here."

A second function, e.g. `requireTenantMembership()`, wraps `getTenantContext()` and adds the 403 check from Section 9.2. Authenticated business routes call this one; it's the default. Only routes with a documented reason (public token routes, the platform root marketing/login pages) call the bare `getTenantContext()` or skip it entirely.

### 3.4 What middleware must not do

Middleware must not query business tables (clients, service orders, etc.) — only `Tenant` and, if needed, session cookies. Keeping it to identity/routing concerns keeps the hot path fast and keeps "what counts as tenant resolution" auditable in one file instead of leaking into every route.

## 4. Custom Domain Flow

1. **Add domain.** `OWNER` enters a domain (e.g. `app.rikinhoautocenter.com.br`) in tenant settings. Stored as `Tenant.customDomain`, `customDomainVerifiedAt = null`. At this point the domain is inert — not usable for resolution (Section 1.1).
2. **Show verification instructions.** UI displays a DNS record the owner must create: a `TXT` record (e.g. `_verify.app.rikinhoautocenter.com.br` → a generated token) and a `CNAME` pointing the domain at the platform's edge (e.g. `app.rikinhoautocenter.com.br CNAME tenants.sistema.com.br`). TXT proves domain ownership; CNAME makes the domain actually route to the platform — both are required before activation.
3. **Verify.** A background job (or an explicit "Check now" action) queries DNS for both records. On success: set `customDomainVerifiedAt = now()`, and only at this point does the domain enter the resolver's lookup table (Section 3.2 step 2). On failure: leave as-is, surface a clear error (which record is missing/wrong), allow retry.
4. **TLS.** Certificate provisioning for the verified domain happens through whatever edge/CDN layer terminates TLS (out of scope for the application layer itself, but the activation step above — entering the resolver's table — should not happen until both DNS _and_ certificate issuance succeed, or the tenant's first visitor hits a TLS error instead of the app).
5. **Removal/change.** Changing or removing `customDomain` immediately unverifies it (`customDomainVerifiedAt = null`) and removes it from the resolver's table in the same transaction — there must be no window where a stale, removed domain still resolves to the tenant.

Only `OWNER` can perform steps 1 and 5 (Section 2).

## 5. Login Flow

### 5.1 Entry on platform root

A user visiting `app.sistema.com.br/login` authenticates via the existing NextAuth flow (refactor plan, Section 1 — unchanged). After successful authentication, the session exists but has no selected tenant yet.

### 5.2 Membership count branches the flow

Immediately after login, load the user's active `TenantUser` rows (`isActive: true`):

- **Zero memberships** → redirect to an onboarding/"create your workshop" flow, or a "waiting for an invite" screen if the product expects admins to invite users rather than self-serve signup. This is a valid state (Section 1.2), not an error.
- **Exactly one membership** → select it automatically, write it to session (Section 7), redirect to that tenant's subdomain (or custom domain if set and verified) dashboard.
- **More than one membership** → show a tenant picker (workshop name + logo if available) on the platform root domain. Selection writes to session and redirects to the chosen tenant's domain.

### 5.3 Entry directly on a tenant domain

A user can also land directly on `rikinho.sistema.com.br/login` (e.g. a bookmark). Middleware (Section 3.2) already resolved the tenant from `Host` before the login page renders. After authentication, check membership for _that specific_ `tenantId`:

- Member → log in directly into that tenant, no picker needed even if the user has other memberships elsewhere.
- Not a member → `403`, with a link to the platform root login in case they meant a different workshop. Do not silently redirect to a tenant they _do_ belong to — that would be surprising and could look like an account mix-up.

### 5.4 Tenant status gate

After tenant resolution but before rendering any authenticated page, check `Tenant.status`:

- `TRIAL` / `ACTIVE` → proceed normally.
- `SUSPENDED` → block with a billing-issue message, regardless of role (even `OWNER` sees this, since the point is to prompt them to resolve billing — though the billing-resolution page itself must be reachable despite the suspension).
- `CANCELED` → block with a different message (account closed), no path back except support/reactivation outside the normal app flow.

This check is independent of membership (Section 9.2) — a user can have a perfectly valid membership in a suspended tenant.

## 6. Tenant-Switch Flow

Because `Host` always wins over session (refactor plan, Section 9.1), "switching tenants" is fundamentally a navigation action, not just a state update:

1. User (with multiple memberships) opens a tenant switcher from within the app.
2. UI lists the user's active memberships.
3. Selecting a different tenant updates the session's selected tenant **and** navigates the browser to that tenant's domain (subdomain or verified custom domain) — a same-page state change without a navigation would leave the URL pointing at the old tenant's domain while the UI shows the new tenant's data, which breaks on refresh and on shared links.
4. If the destination tenant has a verified custom domain, prefer redirecting there over the default subdomain, since that's the domain the tenant's own users expect to see.

This means "selected tenant in session" (Section 7) is really only meaningful while the user is on the platform root domain (between picking and redirecting) or as a fallback default for the next time they land on the root domain — once they're on a tenant domain, `Host` is authoritative and the session's selected-tenant field is not consulted (Section 9.1's "host wins over session, always").

## 7. Session Shape

The NextAuth session (JWT or database session, whichever the adapter already uses) gains one additional field, set only through the flows in Sections 5 and 6 — never written by arbitrary route handlers:

```
session.selectedTenantId: string | null
```

This field is:

- **Read** by `getTenantContext()` (Section 3.3) only when `Host` is the platform root domain.
- **Ignored** by the resolver whenever `Host` resolves to a tenant directly (Section 9.1).
- **Not** an authorization grant by itself — `requireTenantMembership()` still re-checks `TenantUser` on every request; a stale or tampered `selectedTenantId` cannot grant access to a tenant the user isn't a member of, it can at most cause a `403` if the membership was revoked after the session was issued.

## 8. Admin Master Flow

Master admins (Section 1.3) need to operate across tenants — support, billing intervention, content moderation — without that capability being reachable through the same code paths regular tenant users go through.

### 8.1 Separate route namespace

Master routes live under a distinct path/host not reachable via any tenant subdomain or custom domain, e.g. `admin.sistema.com.br/*` or `app.sistema.com.br/master/*`. Middleware (Section 3.2) treats this host/path as its own category: it never attempts tenant resolution from `Host` for these routes, and `requireTenantMembership()` is never called on them.

### 8.2 Authorization check

A separate guard, e.g. `requireMasterAdmin()`, checks the `MasterAdmin` table directly — independent of `TenantUser` entirely. This is the reason Section 1.3 made `MasterAdmin` its own table rather than a `TenantRole`: if master privilege were just "a role value that happens to match across all tenants," every place that checks `role === "ADMIN"` would need to also remember to check for the master case, and a missed check becomes a cross-tenant privilege escalation. With a separate table, regular tenant code never has a reason to look at it at all.

### 8.3 Acting "as" a tenant

When a master admin needs to view or act within a specific tenant (e.g. debugging a support ticket), this is an explicit, logged "impersonation" or "view as tenant" action — not a silent grant of `OWNER`-equivalent access. Implementation: the master admin route sets a distinct context flag (e.g. `actingAsTenantId` + `isMasterImpersonation: true`) that downstream code can check separately from normal `TenantUser` membership, and every read/write performed under this flag should be attributable in audit logs to the master admin's own user id, not laundered as if the tenant's own `OWNER` performed it.

### 8.4 What master routes can see

Cross-tenant aggregate queries (tenant list, status, billing state) are only ever issued from routes under 8.1, guarded by 8.2. No business-data route (clients, service orders, sales, etc.) is ever exempted from tenant scoping for a master admin without going through the explicit 8.3 mechanism — "master admin" is not a bypass flag sprinkled into business queries.

## 9. Open Decisions Before Implementation

This document is ready to implement against, but the following should be confirmed against actual infrastructure before Phase 1 (refactor plan, Section 10) starts, since they affect schema fields proposed in Section 1:

1. DNS provider / edge layer for custom domains (Section 4) — whether automatic TLS provisioning is available, which determines whether "verified" can also mean "TLS-ready" in one step or two.
2. Whether self-serve tenant creation (signup → new `Tenant`) exists at all, or whether tenants are only created by an internal/master process — this changes the "zero memberships" branch in Section 5.2 from an onboarding flow to a waiting-room screen.
3. Whether `STAFF` needs read-only finance visibility in practice (Section 2's note on capability flags) — worth confirming with whoever defined the original module list before the role table is finalized.

# Multi-Tenant Refactor Plan

Scope: `apps/web-platform`.

This document is an inventory and planning artifact only. No production code, Prisma schema, migrations, or behavior were changed for this stage.

## 1. Project Structure

The project is a single Next.js App Router application inside `apps/web-platform`.

| Area                             | Location                                                                                                                                                                                                                     | Notes                                                                                                                            |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Frontend app                     | `app/(app)`, `app/(auth)`, `modules/*`                                                                                                                                                                                       | Route files under `app/*` render domain pages from `modules/*` where the modular frontend refactor is already partially applied. |
| API                              | `app/api/*`                                                                                                                                                                                                                  | API is inside Next.js route handlers, not in a separate `apps/api`. Backend and frontend live in the same app.                   |
| Auth                             | `app/api/auth/[...nextauth]`, `app/lib/auth.ts`, `app/actions/auth.ts`                                                                                                                                                       | NextAuth with Prisma adapter models in the same schema.                                                                          |
| Prisma schema                    | `prisma/schema.prisma`                                                                                                                                                                                                       | PostgreSQL datasource and Prisma Client generator.                                                                               |
| Seed                             | `prisma/seed.js`                                                                                                                                                                                                             | Creates and deletes operational workshop data directly, without tenant context.                                                  |
| Main backend modules             | `app/api/clients`, `vehicles`, `service-orders`, `estimates`, `sales`, `cash-movements`, `financial-accounts`, `financial-categories`, `mechanics`, `sectors`, `suppliers`, `supplier-orders`, `company-settings`, `reports` | Business logic is split between route handlers, repositories, services, and shared server libs.                                  |
| Main frontend modules            | `modules/client`, `modules/vehicle`, `modules/order-service`, `modules/estimate`, `modules/pdv`                                                                                                                              | Other screens still call APIs from route pages or local components.                                                              |
| Reports and dashboard aggregates | `app/(app)/page.tsx`, `app/lib/reports.ts`, `app/api/*/pdf`, `app/api/automations/daily-report-email`                                                                                                                        | High risk for accidental cross-tenant aggregation.                                                                               |

Conclusion: this is a Next.js monolith. The API is mixed into the frontend application through App Router route handlers. Multi-tenant work should first introduce a shared tenant resolution layer for server routes and server components before altering business queries.

## 2. Prisma Models Inventory

| Model                              | Category                              | Should Receive tenantId?                                                      | Reason                                                                         | Relations                                                                                                | Risks                                                                                                                 |
| ---------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| User                               | Global / auth membership              | Not directly as only tenant field; needs tenant membership design             | Auth identity can be global while access may be scoped by tenant membership    | Account, Session                                                                                         | Adding a single `tenantId` to User may block users who manage multiple workshops or master admins.                    |
| Account                            | Global auth dependent                 | No direct tenantId                                                            | NextAuth provider account tied to User                                         | User                                                                                                     | Keep auth adapter compatibility; tenant should be resolved through User membership.                                   |
| Session                            | Global auth dependent                 | No direct tenantId                                                            | NextAuth session tied to User                                                  | User                                                                                                     | Session needs selected/current tenant context elsewhere, not schema-only.                                             |
| VerificationToken                  | Global auth dependent                 | No                                                                            | NextAuth verification artifact                                                 | None                                                                                                     | Low domain risk; avoid changing adapter contract unnecessarily.                                                       |
| Client                             | Tenant Scoped                         | Yes                                                                           | Customer records are workshop business data                                    | Vehicle, ServiceOrder, Estimate, Sale, FinancialAccount                                                  | Search, CPF/email indexes, direct `findUnique(id)` and reports need tenant filters.                                   |
| Vehicle                            | Tenant Scoped                         | Yes                                                                           | Vehicles belong to a workshop through client ownership and operational history | Client, ServiceOrder, Estimate                                                                           | `code` and plate search are currently global; `clientId` must be tenant-validated.                                    |
| ServiceOrder                       | Tenant Scoped                         | Yes                                                                           | Core workshop operation and financial source                                   | Client, Vehicle, Mechanic, ServiceOrderItem, Sale, Inspection, Estimate, FinancialAccount, StockMovement | `code @unique`, finance sync, stock sync, dashboard aggregates, public inspection links.                              |
| ServiceOrderVehicleInspection      | Join/Dependent / public access        | Prefer direct tenantId plus parent validation                                 | It depends on ServiceOrder but has public token access                         | ServiceOrder, Photo                                                                                      | Token route has no authenticated tenant context; direct tenant or signed token strategy is needed.                    |
| ServiceOrderVehicleInspectionPhoto | Join/Dependent                        | Usually inherit from inspection; optional direct tenantId for storage cleanup | Photo belongs to an inspection                                                 | ServiceOrderVehicleInspection                                                                            | File paths and public upload cleanup can cross tenants if only URL is checked.                                        |
| ServiceOrderItem                   | Join/Dependent                        | Prefer direct tenantId for safety and reporting                               | Item belongs to a service order and may touch stock, mechanic, sector          | ServiceOrder, CatalogItem, Mechanic, Sector, StockMovement                                               | Cross-tenant item injection through catalog/mechanic/sector ids if only parent is checked late.                       |
| Estimate                           | Tenant Scoped                         | Yes                                                                           | Commercial document for a workshop                                             | Client, Vehicle, Mechanic, ServiceOrder, EstimateItem                                                    | `code @unique`, conversion to OS, PDF generation, client/vehicle validation.                                          |
| EstimateItem                       | Join/Dependent                        | Prefer direct tenantId for safety and reporting                               | Item belongs to Estimate and may reference catalog/mechanic/sector             | Estimate, CatalogItem, Mechanic, Sector                                                                  | Conversion can create cross-tenant OS items if referenced ids are not scoped.                                         |
| CatalogItem                        | Tenant Scoped                         | Yes                                                                           | Products/services and stock belong to a workshop                               | Sector, ServiceOrderItem, EstimateItem, SaleItem, StockMovement                                          | `code @unique`, stock levels, SKU/barcode search, stock movements must be scoped.                                     |
| Sector                             | Tenant Scoped / configuration         | Yes                                                                           | Operational sector catalog is per workshop                                     | Sale, CatalogItem, ServiceOrderItem, EstimateItem                                                        | `name @unique` is global today and must become tenant-scoped.                                                         |
| Mechanic                           | Tenant Scoped                         | Yes                                                                           | Mechanics and commissions are per workshop                                     | ServiceOrder, ServiceOrderItem, Estimate, EstimateItem                                                   | `name @unique` and commission reports need tenant scoping.                                                            |
| Supplier                           | Tenant Scoped                         | Yes                                                                           | Suppliers are workshop business data                                           | SupplierOrder, FinancialAccount                                                                          | Supplier search and payable relations must be isolated.                                                               |
| SupplierOrder                      | Tenant Scoped                         | Yes                                                                           | Purchasing operation and finance source                                        | Supplier, FinancialAccount                                                                               | `code @unique`, finance sync, dashboard pending orders.                                                               |
| Sale                               | Tenant Scoped                         | Yes                                                                           | PDV sale and revenue data belong to a workshop                                 | Client, ServiceOrder, Sector, SaleItem, SalePayment, StockMovement, CashMovement                         | `code @unique`, stock/finance side effects, receipts, email notifications.                                            |
| SaleItem                           | Join/Dependent                        | Prefer direct tenantId for safety and reporting                               | Item belongs to Sale and may reference CatalogItem                             | Sale, CatalogItem, StockMovement                                                                         | Sales reports query `SaleItem` directly; tenant filter would be easier and safer if direct.                           |
| StockMovement                      | Join/Dependent / Tenant Scoped ledger | Yes                                                                           | Stock ledger is tenant-sensitive and queried directly                          | CatalogItem, Sale, SaleItem, ServiceOrder, ServiceOrderItem                                              | Direct reports and stock reconciliation need tenant filter; parent may be nullable.                                   |
| FinancialAccount                   | Tenant Scoped                         | Yes                                                                           | Receivable/payable records are financial tenant data                           | Client, Supplier, ServiceOrder, SupplierOrder, CashMovement                                              | `code @unique`, one-to-one service/supplier order unique constraints, dashboards and summaries.                       |
| FinancialCategory                  | Tenant Scoped / configuration         | Yes                                                                           | Categories are customizable per workshop                                       | CashMovement                                                                                             | `name @unique` global today; upsert helpers can accidentally reuse another tenant category.                           |
| CashMovement                       | Tenant Scoped                         | Yes                                                                           | Cash ledger is tenant financial data                                           | FinancialCategory, Sale, FinancialAccount                                                                | `code @unique`, statement PDFs, open summary, reverse movement logic.                                                 |
| CompanySettings                    | Tenant Configuration                  | Replace singleton with Tenant relation                                        | Represents workshop/company settings                                           | None                                                                                                     | `singletonKey @unique default("company")` blocks multiple tenants; PDF headers and settings route assume one company. |
| SalePayment                        | Join/Dependent                        | Prefer direct tenantId for reporting/performance; can inherit from Sale       | Payment belongs to Sale                                                        | Sale                                                                                                     | Payment cleanup and future payment reports need tenant-safe parent validation.                                        |

## 3. Tenant Scoped Models

These models should receive a direct `tenantId` because they are queried directly, aggregate financial or operational data, or own tenant-sensitive unique fields:

- `Client`
- `Vehicle`
- `ServiceOrder`
- `Estimate`
- `CatalogItem`
- `Sector`
- `Mechanic`
- `Supplier`
- `SupplierOrder`
- `Sale`
- `StockMovement`
- `FinancialAccount`
- `FinancialCategory`
- `CashMovement`

Important index changes:

- Replace global `code @unique` with tenant-scoped uniqueness such as `@@unique([tenantId, code])` on business-code models.
- Replace global `name @unique` on `Sector`, `Mechanic`, and `FinancialCategory` with tenant-scoped uniqueness.
- Review direct URL id access and avoid `findUnique({ where: { id } })` as the only authorization boundary.

## 4. Global Models

These models should remain global or be redesigned around membership:

- `User`
- `Account`
- `Session`
- `VerificationToken`

Recommended direction:

- Keep NextAuth adapter tables compatible.
- Add a future `Tenant` model and a membership model, for example `TenantUser`, instead of assuming one `User` equals one workshop.
- Store role and selected tenant context outside the current NextAuth tables, then resolve tenant in server routes.

There are no current global business models like `Plan`, `SubscriptionPlan`, `Country`, `State`, or `Permission` in this schema.

## 5. Tenant Configuration Models

- `CompanySettings` should become tenant configuration. The current singleton key must be replaced or complemented by a tenant relation.
- `Sector` and `FinancialCategory` behave like tenant-managed configuration/catalog data, but they are also referenced by operations, so they should have direct `tenantId`.
- A future `Tenant` model should own branding, domain, subscription, and company-level configuration decisions. `CompanySettings` can either become a one-to-one child of `Tenant` or be merged into a broader tenant settings model.

Special risk: PDF generation and document headers read `CompanySettings` through `findUnique({ singletonKey: "company" })`. That pattern must become tenant-aware before multiple companies exist.

## 6. Join/Dependent Models

These models can technically inherit tenant scope from their parent, but direct tenant fields are recommended where reporting, security, or nullable parent chains make inherited scope fragile:

| Model                                | Parent Scope   | Recommendation                                                                                                               |
| ------------------------------------ | -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `ServiceOrderItem`                   | `ServiceOrder` | Add `tenantId` directly. It references catalog, mechanic, sector, and stock movements, and may be queried for reports later. |
| `EstimateItem`                       | `Estimate`     | Add `tenantId` directly or enforce all referenced ids through tenant-scoped parent validation during create/update.          |
| `SaleItem`                           | `Sale`         | Add `tenantId` directly because `app/lib/reports.ts` queries `saleItem.findMany` directly.                                   |
| `SalePayment`                        | `Sale`         | Direct `tenantId` optional now, recommended for future payment reports and easier cleanup.                                   |
| `ServiceOrderVehicleInspection`      | `ServiceOrder` | Add `tenantId` or tenant-bound token because public token routes cannot rely on session tenant.                              |
| `ServiceOrderVehicleInspectionPhoto` | `Inspection`   | Can inherit, but storage/file lifecycle should include tenant-aware paths or ownership checks.                               |

## 7. Prisma Query Map

| File                                                                        | Model                                                                                            | Operation                                                                     | Needs Tenant Filter?      | Notes                                                                              |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------- |
| `app/actions/auth.ts`                                                       | User                                                                                             | `findUnique`, `create`                                                        | No business tenant filter | Signup flow must later create/select tenant membership separately.                 |
| `app/lib/auth.ts`                                                           | User                                                                                             | `findUnique`                                                                  | No business tenant filter | Session callback can carry selected tenant after membership exists.                |
| `app/(app)/page.tsx`                                                        | Client, Vehicle, Mechanic, ServiceOrder, Estimate, Sale, FinancialAccount, SupplierOrder         | `count`, `groupBy`, `aggregate`, `findMany`, `$queryRaw`                      | Yes                       | Dashboard aggregates are high-risk cross-tenant totals.                            |
| `app/api/clients/repositories/client.repository.ts`                         | Client                                                                                           | `count`, `findMany`, `findUnique`, `create`, `update`, `delete`               | Yes                       | CRUD repository should receive tenant context and use tenant-scoped where clauses. |
| `app/api/vehicles/repositories/vehicle.repository.ts`                       | Vehicle, Client                                                                                  | `count`, `findMany`, `findUnique`, `create`, `update`, `delete`               | Yes                       | Client ownership validation must include tenant.                                   |
| `app/api/service-orders/repositories/service-order.repository.ts`           | ServiceOrder, Client, Vehicle, Mechanic, Sector, CatalogItem                                     | `count`, `findMany`, `findUnique`, `findMany`, transactions                   | Yes                       | OS create/update touches many tenant-scoped references.                            |
| `app/api/service-orders/stock-sync.ts`                                      | CatalogItem, StockMovement, ServiceOrder                                                         | `findUnique`, `findMany`, `update`, `create` through tx                       | Yes                       | Stock mutation must never cross catalog items from another tenant.                 |
| `app/api/service-orders/financial-sync.ts`                                  | ServiceOrder, FinancialAccount                                                                   | `findUnique`, `create`, `update` through tx                                   | Yes                       | Generated receivables need tenant and parent validation.                           |
| `app/api/estimates/repositories/estimate.repository.ts`                     | Estimate, Client, Vehicle, Mechanic, Sector, CatalogItem, CompanySettings, ServiceOrder          | `count`, `findMany`, `findUnique`, `create`, `update`, `delete`, transactions | Yes                       | Estimate conversion and PDF settings must be tenant-aware.                         |
| `app/api/sales/repositories/sale.repository.ts`                             | Sale, ServiceOrder, Client, Sector, CatalogItem, FinancialCategory, CashMovement                 | `count`, `findMany`, `findUnique`, `aggregate`, `upsert`, transactions        | Yes                       | Category upsert must be tenant scoped.                                             |
| `app/api/sales/services/sale.service.ts`                                    | Sale, SalePayment, CatalogItem, StockMovement, ServiceOrder, CashMovement, FinancialAccount      | tx `create`, `findUnique`, `findMany`, `update`, `delete`, `deleteMany`       | Yes                       | PDV has the largest side-effect surface: stock, cash, payments, commissions.       |
| `app/api/sales/[id]/receipt/receipt-pdf.ts`                                 | Sale, CompanySettings                                                                            | `findUnique`                                                                  | Yes                       | Receipt route must validate sale and company settings under the same tenant.       |
| `app/lib/pdv-sale-email.ts`                                                 | Sale                                                                                             | `findUnique`                                                                  | Yes                       | Notification content must not expose another tenant sale.                          |
| `app/api/catalog-items/route.ts` and `[id]/route.ts`                        | CatalogItem, StockMovement                                                                       | `count`, `findMany`, `findUnique`, `create`, `update`, `delete`, tx `create`  | Yes                       | Catalog codes, stock adjustments, and delete checks need tenant scoping.           |
| `app/api/sectors/route.ts` and `[id]/route.ts`                              | Sector                                                                                           | `count`, `findMany`, `findUnique`, `create`, `update`, `delete`               | Yes                       | `name @unique` must become tenant scoped.                                          |
| `app/api/mechanics/route.ts` and `[id]/route.ts`                            | Mechanic                                                                                         | `count`, `findMany`, `findUnique`, `create`, `update`, `delete`               | Yes                       | `name @unique` and commission data are tenant-specific.                            |
| `app/api/mechanics/[id]/report/route.ts`                                    | Mechanic, ServiceOrder, FinancialAccount                                                         | `findUnique`, `findMany`                                                      | Yes                       | Report can leak work orders and commission payables.                               |
| `app/api/mechanics/commissions/shared.ts`                                   | FinancialAccount, ServiceOrder, Mechanic                                                         | `findMany`                                                                    | Yes                       | Commission summaries must filter every source model.                               |
| `app/api/mechanics/commissions/pdf/route.ts`                                | CompanySettings                                                                                  | `findUnique`                                                                  | Yes                       | PDF header must use tenant company.                                                |
| `app/api/suppliers/route.ts` and `[id]/route.ts`                            | Supplier                                                                                         | `count`, `findMany`, `findUnique`, `create`, `update`, `delete`               | Yes                       | Supplier directory is tenant data.                                                 |
| `app/api/supplier-orders/route.ts` and `[id]/route.ts`                      | SupplierOrder                                                                                    | `count`, `findMany`, `findUnique`, `create`, `update`, `delete`               | Yes                       | Supplier id and generated financial account need tenant validation.                |
| `app/api/supplier-orders/financial-sync.ts`                                 | SupplierOrder, FinancialAccount                                                                  | tx `findUnique`, `create`, `update`                                           | Yes                       | Payables from purchase orders must carry tenant.                                   |
| `app/api/financial-accounts/route.ts` and `[id]/route.ts`                   | FinancialAccount, Client                                                                         | `count`, `findMany`, `findUnique`, `groupBy`, `create`, `update`              | Yes                       | Financial values and payment status are tenant-critical.                           |
| `app/api/financial-accounts/cash-sync.ts`                                   | FinancialAccount, FinancialCategory, CashMovement                                                | `findUnique`, `findMany`, `upsert`, `create` through tx                       | Yes                       | Category upsert and movement generation must be tenant scoped.                     |
| `app/api/financial-categories/route.ts` and `[id]/route.ts`                 | FinancialCategory                                                                                | `count`, `findMany`, `findUnique`, `create`, `update`, `delete`               | Yes                       | `name @unique` must become tenant scoped.                                          |
| `app/api/cash-movements/route.ts` and `[id]/route.ts`                       | CashMovement, FinancialCategory                                                                  | `count`, `findMany`, `findUnique`, `groupBy`, `create`, `update`              | Yes                       | Cash ledger and category validation must use tenant.                               |
| `app/api/financial-open-summary/route.ts`                                   | FinancialAccount, ServiceOrder                                                                   | `groupBy`, `aggregate`                                                        | Yes                       | Open financial summary must never be global.                                       |
| `app/api/financial-statement/pdf/route.ts`                                  | FinancialAccount, CashMovement, FinancialCategory, CompanySettings                               | `findMany`, `findUnique`                                                      | Yes                       | Statement export is financial and document-header sensitive.                       |
| `app/lib/reports.ts`                                                        | ServiceOrder, SaleItem, Sale, FinancialAccount, CashMovement, CatalogItem, StockMovement, Client | `aggregate`, `findMany`, `groupBy`, transactions                              | Yes                       | Main report library is a critical tenant boundary.                                 |
| `app/api/automations/daily-report-email/daily-report.ts`                    | CashMovement, FinancialAccount                                                                   | `findMany`, `groupBy`                                                         | Yes                       | Scheduled report currently has no tenant loop or recipient-per-tenant design.      |
| `app/api/company-settings/route.ts`                                         | CompanySettings                                                                                  | `findUnique`, `upsert`                                                        | Yes                       | Singleton `company` must be replaced by tenant-specific settings.                  |
| `app/api/vehicle-inspections/repositories/vehicle-inspection.repository.ts` | ServiceOrderVehicleInspection                                                                    | `findUnique`, `update`                                                        | Yes, via token/parent     | Public token access needs explicit tenant-safe design.                             |
| `prisma/seed.js`                                                            | Almost all models                                                                                | `deleteMany`, `create`, `findUnique`, `update`, `count`                       | Yes in future seed        | Seed must create initial tenant and attach all demo/existing data to it.           |

## 8. Critical Risks

- Global unique constraints: `code @unique` appears on many business models and will block duplicate codes across tenants. Use `@@unique([tenantId, code])` and update lookups.
- Global names: `Sector.name`, `Mechanic.name`, and `FinancialCategory.name` are globally unique today and should become tenant-scoped.
- `findUnique({ where: { id } })` as access boundary: many routes fetch by plain id. Tenant filtering requires either `findFirst({ where: { id, tenantId } })` or composite unique indexes.
- Singleton company settings: `CompanySettings.singletonKey = "company"` prevents multiple workshop configurations.
- Dashboard and reports: `app/(app)/page.tsx`, `app/lib/reports.ts`, financial PDFs, mechanic reports, and daily emails aggregate without tenant filters.
- Public routes: `app/vistoria/[token]` and `/api/vehicle-inspections/[token]` need tenant-safe token validation because there may be no authenticated tenant context.
- Side effects: service orders and sales generate stock movements, cash movements, financial accounts, sale payments, and commission records. Tenant must be passed through the whole transaction.
- Seeds and existing data: migration must create a default tenant and backfill every tenant-scoped row before enforcing non-null `tenantId`.
- Raw SQL: dashboard uses `$queryRaw`; future tenant filtering must be manually added and reviewed.
- Scheduled automation: daily report email currently assumes one company and one recipient list.
- User access: auth tables do not currently express which workshop a user belongs to.
- ID references in payloads: client, vehicle, mechanic, sector, supplier, catalog item, service order, and category ids from request bodies must be validated against tenant before writes.

## 9. Tenant Resolution Strategy

This section defines the resolver contract referenced by Phase 1 and Phase 3. It must be settled before any `tenantId` column is added, because the backfill and query-scoping work in Phase 2 and Phase 4 assume a single, predictable way to know "which tenant is this request for."

### 9.0 Domain taxonomy

Before the resolution order makes sense, the platform needs three distinct domain categories defined, because the resolver branches on which category the request `Host` falls into:

- **Tenant subdomain** — `{slug}.sistema.com.br`. Always maps to exactly one tenant via slug lookup.
- **Verified custom domain** — any domain stored and verified on a `Tenant.customDomain` record (e.g. `app.rikinhoautocenter.com.br`). Always maps to exactly one tenant.
- **Platform root domain** — `sistema.com.br` and `app.sistema.com.br` (marketing site, generic login, signup, tenant-switch UI, master-admin panel). Maps to **no** tenant by host; tenant here, if any, comes only from session or dev override.

Any `Host` that doesn't match one of these three categories is a resolution failure (Section 9.2), not an attempt to fall through to session.

### 9.1 Resolution order

A single shared utility (for example `resolveTenant(request)`) should run early in the request lifecycle (middleware or a shared server helper called at the top of each route handler / server component) and resolve tenant through this fallback chain, in order:

1. **Custom domain** — if `Host` matches a verified custom domain (9.0), resolve directly to that tenant. This takes priority because a customer who paid for a custom domain should never silently resolve to a different tenant through some other signal.
2. **Subdomain** — if `Host` matches `{slug}.sistema.com.br`, resolve `tenant = Tenant.findBySlug(slug)`.
3. **Session membership** — only reached when `Host` is the platform root domain (9.0). Resolve tenant from the user's selected membership stored in session.
4. **Development override** — only outside production, and only when `Host` is the platform root domain or localhost: `x-tenant-id` header or `?tenant=` query param, explicitly disabled when `NODE_ENV === "production"` so it can never become a silent backdoor.

**Host wins over session, always.** If `Host` resolves to a tenant via step 1 or 2, the resolver uses that tenant regardless of what tenant the user's session has selected — it does not fall back to session, and it does not silently switch the session's selected tenant to match. A logged-in user whose session is scoped to Tenant A who requests `tenantb.sistema.com.br` is evaluated as "tenant B, checked for membership" (Section 9.2), not "tenant A, redirected" or "tenant B, auto-granted." Step 3 only ever runs when the host itself carries no tenant signal.

**The dev override does not skip 9.2.** Step 4 only changes _which_ tenant is resolved from the request; it does not bypass the membership check that follows. A developer using `x-tenant-id` to test still needs a `TenantUser` row for that tenant, or the request gets `403` like any other. This is intentional — the override exists to make local multi-tenant testing convenient, not to create an auth bypass that someone forgets to gate behind environment checks.

Steps are tried in order and the first match wins. The resolver does not merge signals from multiple steps in a single request.

### 9.2 Failure modes

Two distinct failure cases must be handled differently, because conflating them is itself a security bug:

- **Tenant not found** (`Host` doesn't match any of the three categories in 9.0, or matches a subdomain/custom domain with no corresponding `Tenant` row) → `404 Tenant Not Found`. This is a routing failure, not an authorization failure, and should not reveal whether a slug exists for other tenants' inputs.
- **Tenant found, but the authenticated user has no active `TenantUser` membership for it** → `403 Forbidden`. This is an authorization failure on a tenant that does exist, and must never fall through to `404` (which would let a user probe for valid tenant slugs) or silently use a different tenant from session.
- **No session at all, tenant found, route requires authentication** → standard unauthenticated redirect/`401`, evaluated before the membership check in the bullet above (there's no membership to check without a session).

Public, unauthenticated routes (inspection tokens, etc.) are exempt from the membership check above but must still resolve a concrete tenant per 9.3 before touching any tenant-scoped table.

### 9.3 Public / token-based routes

Routes like `app/vistoria/[token]` and `/api/vehicle-inspections/[token]` have no session and cannot use steps 3 or 4 above. These resolve tenant through the signed token or the parent record it points to (for example, the token decodes to an `inspectionId`, and the resolver loads `ServiceOrderVehicleInspection.tenantId` from that row) — never through `Host`, query params, or any client-supplied tenant value. If the token is invalid, expired, or its parent record's tenant cannot be established, the route must fail closed (404) rather than proceed with an unscoped query.

### 9.4 Where resolved tenant is carried

Once resolved, the tenant id should be attached to the request context (for example via `AsyncLocalStorage`, a typed request object, or a server-component context value) and passed explicitly into repository/service calls — not re-resolved ad hoc in each route handler, and not implicitly trusted from a client-supplied body field. Section 8's note on validating relational ids in payloads still applies on top of this: the resolved tenant establishes the boundary, but every foreign id inside the payload must still be checked against it.

## 10. Recommended Migration Strategy

### Phase 1 - Create Tenant

- Add `Tenant` model with basic fields: `id`, `name`, `slug`, `status`, `customDomain` (nullable, unique, verified flag), timestamps.
- Add a membership model `TenantUser` with `tenantId`, `userId`, `role`, and active flags. Do not add `tenantId` directly to `User` — a single field there would block a user who belongs to more than one workshop or a master-admin account that needs cross-tenant access. The relation is `User` → `TenantUser` → `Tenant`, not `User.tenantId`.
- Create one initial tenant for all existing data.
- Adopt the resolution order defined in Section 9 for how selected tenant is resolved in authenticated requests; do not improvise a different mechanism per route.

### Phase 2 - Add tenantId

- Add nullable `tenantId` columns first to tenant-scoped and selected dependent models.
- Backfill existing rows to the initial tenant.
- Add indexes for `tenantId` plus common filters.
- Convert global uniques to tenant-scoped composites.
- Only after backfill, make required tenant fields non-null where appropriate.

### Phase 3 - Resolve Current Tenant

- Implement the resolver from Section 9 as one shared utility, used by middleware, route handlers, and server components alike.
- Implement the 404/403 distinction from Section 9.2 before any module is migrated, so the first migrated module already enforces it correctly.
- Public routes implement Section 9.3 (signed token/parent record resolution).

### Phase 4 - Apply Tenant to Queries

- Update repositories and route handlers to accept tenant context.
- Start with high-risk modules: finance, sales, service orders, stock, reports, company settings.
- Replace plain `findUnique(id)` access with tenant-aware lookup patterns.
- Validate every relational id in payloads under the same tenant before create/update.
- Update transactions so every created side-effect row receives tenant context.

### Phase 5 - Prepare Admin Master

- Add master/admin role semantics in membership or separate admin model.
- Keep master routes separate from tenant-scoped application routes.
- Add tenant list/switching only after data isolation is enforced.

## 11. Next Step Recommendation

Next step should be a small design PR, not the tenantId migration yet:

1. Confirm the Section 9 tenant resolution contract (resolution order, 404 vs 403 split, public-route token strategy) against real deployment plans (which domains/subdomains will actually exist, how custom domains get verified).
2. Define the target tenant model and membership model fields beyond the minimum listed in Phase 1.
3. Decide which dependent models will receive direct `tenantId` (Section 6 gives a starting recommendation per model).
4. Draft the exact Prisma migration plan for default-tenant backfill and unique-index replacement.

After that, implement Phase 1 and Phase 2 in separate, reviewable changes. Do not start by editing all route handlers at once; first create the tenant foundation and backfill strategy, then update the highest-risk query paths module by module.

## 12. Suggested Follow-up Document

Once Section 9 is reviewed and agreed, a second document — `MULTI_TENANT_ARCHITECTURE.md` — can formalize the runtime architecture before any Prisma schema change lands. Recommended scope:

- `Tenant` and `TenantUser` models, with field-level detail beyond this document's inventory.
- Roles and permissions within a tenant (owner, admin, staff, etc.), and whether permissions are role-based or per-action.
- The tenant resolver as implementable middleware, including where in the Next.js request lifecycle it runs and what it attaches to context.
- Login flow: how a user with multiple memberships picks a tenant at login versus mid-session.
- Tenant-switch flow: whether switching tenant requires a new session, a context update, or a redirect to a different subdomain.
- Custom-domain flow: verification process (DNS TXT/CNAME check), and what happens between "domain added" and "domain verified."
- Admin-master flow: how master/admin accounts traverse tenants without themselves needing a `TenantUser` row per tenant, and how that's kept separate from normal tenant-scoped routes (Phase 5).

This second document should be written after Section 9 is settled, since the resolver contract is the dependency every one of those flows builds on — writing them in parallel risks the architecture document assuming a resolution order that the planning document above doesn't actually commit to.
