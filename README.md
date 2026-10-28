# JERAI FIT (Glow Move Hub) — Full-Stack Monorepo

JERAI FIT is an enterprise-grade, full-stack fitness and workout platform built with React, Vite, Tailwind CSS, Node.js, Express, TypeScript, Prisma ORM, and PostgreSQL.

> **Status Notice**: The project has completed **Phases 1 through 7C**, featuring a production-hardened monorepo, server-side authentication, role-based access control (RBAC), pluggable object storage, live workout session tracking, an interactive progress dashboard, active workout state protection, Cloudflare Pages reverse proxy, and Neon serverless database pooling support.

---

## Implemented Architecture & Roadmap (Phases 1 – 7C)

| Phase | Milestone | Core Highlights |
|---|---|---|
| **Phase 1 & 2** | UI Baseline & Experience | React 18 SPA, Tailwind CSS, dark/light theme, exercise explorer, focus mode workout timer. |
| **Phase 3** | Full-Stack Monorepo Foundation | Workspace separation (`@jerai/shared`, `@jerai/web`, `@jerai/api`), PostgreSQL with Prisma ORM, TanStack Query v5. |
| **Phase 4** | Auth & Server-Enforced RBAC | Argon2id password hashing, database-persisted session rotation, `HttpOnly` cookies, CSRF protection, interactive CLI admin bootstrap (`npm run admin:bootstrap`), server-enforced role access (`MEMBER` vs `ADMIN`). |
| **Phase 5** | Pluggable Object Storage | Local disk, Amazon S3, and Cloudflare R2 storage drivers, strict file inspection (magic bytes, MIME validation), media upload endpoints, and media asset migration script. |
| **Phase 6** | Live Sessions & Progress Tracking | Persistent workout sessions (`WorkoutSession` model), live timer with pause/resume, RPE exertion rating and notes, and user `ProgressDashboard` with streaks and activity history. |
| **Phase 7b** | Hardening, Active Guards & CI | Active workout session exit protection (confirmation dialog to prevent progress loss), dirty session state warnings, and automated GitHub Actions CI pipeline (`.github/workflows/ci.yml`). |
| **Phase 7c** | Edge Proxy & Cloudflare Integration | Cloudflare Pages Functions reverse proxy (`functions/api/[[catchall]].ts`), fail-closed proxy secret authentication (`x-proxy-secret`), anti-spoofing rate limiting, and Neon serverless PostgreSQL connection pooling (`directUrl`). |

---

## Architecture Overview

```mermaid
graph TD
    subgraph Edge ["Cloudflare Pages Edge"]
        CF[Cloudflare Pages Functions Proxy<br/>functions/api/catchall.ts]
    end

    subgraph Client ["apps/web (Frontend)"]
        UI[React 18 + Tailwind CSS + Lucide]
        RQ[TanStack Query v5]
        APIClient[Centralized API Client]
        UI --> RQ --> APIClient
    end

    subgraph Server ["apps/api (Backend REST API)"]
        ProxyAuth[Proxy Secret Guard / Anti-Spoofing]
        RateLimiter[Rate Limit Middleware]
        Express[Express REST API /api/v1]
        AuthGuard[Session Auth & RBAC Guard]
        Validator[Zod Request Validation]
        Prisma[Prisma ORM Client]
        StorageService[Pluggable Storage Driver<br/>Local / Cloudflare R2 / S3]

        ProxyAuth --> RateLimiter --> Express --> AuthGuard --> Validator --> Prisma
        Express --> StorageService
    end

    subgraph Database ["PostgreSQL (e.g., Neon Serverless)"]
        UsersTable[(Users Table)]
        SessionsTable[(Sessions Table)]
        WorkoutsTable[(Workouts & Steps Tables)]
        WorkoutSessionsTable[(WorkoutSessions Table)]
        Prisma --> UsersTable
        Prisma --> SessionsTable
        Prisma --> WorkoutsTable
        Prisma --> WorkoutSessionsTable
    end

    subgraph Shared ["packages/shared"]
        Types[TypeScript Domain Contracts]
        Schemas[Zod Validation Schemas]
    end

    APIClient -.-> CF
    CF -.-> ProxyAuth
    UI -.-> Types
    Express -.-> Types
    Express -.-> Schemas
```

### Monorepo Structure

- **`packages/shared`** (`@jerai/shared`): Shared TypeScript domain types, DTO contracts, and shared Zod validation schemas for workouts, authentication, sessions, and media.
- **`apps/web`** (`@jerai/web`): React 18 single-page application built with Vite, Tailwind CSS, Lucide icons, Framer Motion, and TanStack React Query.
- **`apps/api`** (`@jerai/api`): Node.js + Express REST API backed by Prisma ORM, PostgreSQL, and pluggable object storage.
- **`functions`**: Cloudflare Pages Functions reverse proxy for zero-CORS frontend-to-backend edge routing.
- **`apps/api/prisma`**: Committed schema (`schema.prisma`), idempotent seed script (`seed.ts`), and versioned SQL migrations supporting Neon connection pooling.

---

## Prerequisites

- **Node.js**: `v20.x` or `v22.x`+ (Tested on Node `v22.x` and `v24.x`)
- **npm**: `v10.x`+ (Tested on npm `v11.x`)
- **PostgreSQL**: Version 14 or higher (local installation, Docker, or managed cloud instance like Neon)

---

## Environment Configuration

Never commit credentials, connection strings, or `.env` files. Both root and workspace `.env*` files are ignored by `.gitignore`.

1. Copy the template to `.env` in the project root:
   ```bash
   cp .env.example .env
   ```

2. Configure environment variables in `.env`:

| Variable | Target | Description | Example / Default |
|---|---|---|---|
| `NODE_ENV` | Server | Runtime environment (`development`, `production`, `test`) | `development` |
| `PORT` | Server | API HTTP server port | `3000` (or `3001` in test) |
| `DATABASE_URL` | Server | PostgreSQL connection string (supports pooled connection strings) | `postgresql://postgres:postgres@localhost:5432/jerai_fit?schema=public` |
| `DIRECT_URL` | Server | Direct PostgreSQL connection string for Prisma migrations (Neon PgBouncer bypass) | `postgresql://postgres:postgres@localhost:5432/jerai_fit?schema=public` |
| `CORS_ORIGIN` | Server | Allowed CORS frontend origin | `http://localhost:5173` |
| `VITE_API_URL` | Client | Base URL for the backend API (or relative `/api/v1` when using proxy) | `/api/v1` |
| `STORAGE_DRIVER` | Server | Object storage provider (`local`, `r2`, or `s3`) | `local` |
| `STORAGE_LOCAL_DIR` | Server | Relative local upload directory (when driver is `local`) | `uploads` |
| `STORAGE_MAX_FILE_SIZE_BYTES` | Server | Maximum allowable media upload size in bytes | `5242880` (5 MB) |
| `PROXY_SECRET` | Server | Shared secret for Cloudflare Pages Functions reverse proxy | `(64-character random string)` |
| `REQUIRE_PROXY_AUTH` | Server | Fail-closed enforcement for reverse proxy header in production | `false` (dev) / `true` (prod) |
| `TRUST_PROXY` | Server | Express proxy hop trust count for anti-spoofing rate limiting | `1` (behind proxy) |
| `ADMIN_EMAIL` | Script | Initial admin email (**bootstrap script / CI only**) | `admin@example.com` |
| `ADMIN_PASSWORD` | Script | Initial admin password (**bootstrap script / CI only**) | `(secure passphrase)` |

---

## Database Setup & PostgreSQL Configuration

### Option A: Local PostgreSQL Service

1. Create a local PostgreSQL database named `jerai_fit`:
   ```sql
   CREATE DATABASE jerai_fit;
   ```
2. Update `DATABASE_URL` and `DIRECT_URL` in your `.env` file:
   ```env
   DATABASE_URL="postgresql://<username>:<password>@localhost:5432/jerai_fit?schema=public"
   DIRECT_URL="postgresql://<username>:<password>@localhost:5432/jerai_fit?schema=public"
   ```

### Option B: Docker Container

```bash
docker run --name jerai-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=jerai_fit -p 5432:5432 -d postgres:16
```

### Option C: Neon Serverless PostgreSQL (Recommended for Cloud)

Neon provides connection pooling via PgBouncer. To support both connection pooling and migrations:
```env
# Pooled connection string for regular queries
DATABASE_URL="postgresql://user:password@ep-sample-pool.us-east-2.aws.neon.tech/jerai_fit?sslmode=require&pgbouncer=true"

# Direct connection string for Prisma migrations
DIRECT_URL="postgresql://user:password@ep-sample.us-east-2.aws.neon.tech/jerai_fit?sslmode=require"
```

### Running Migrations & Seeding

1. **Generate Prisma Client**:
   ```bash
   npm run prisma:generate --workspace=@jerai/api
   ```

2. **Apply Migrations**:
   ```bash
   npm run prisma:migrate --workspace=@jerai/api
   ```

3. **Seed Default Workout Catalog**:
   ```bash
   npm run prisma:seed --workspace=@jerai/api
   ```

> [!NOTE]
> The database seed script is **fully idempotent**. Running it repeatedly updates existing records without creating duplicates or deleting user-created workouts.

---

## Running the Application Locally

### 1. Start the Backend API (Port 3000 / 3001)

```bash
npm run dev:api
```
The server will start at `http://localhost:3000`.

### 2. Start the Frontend Web App (Port 5173)

In a separate terminal:
```bash
npm run dev:web
```
Open `http://localhost:5173` in your browser.

---

## Core Feature Modules

### 1. Authentication & Role-Based Access Control (Phase 4)
- **Password Security**: Argon2id hashing (`m=65536, t=3, p=1`) per OWASP recommendations.
- **Session Architecture**: Cryptographically random 32-byte tokens hashed with SHA-256 in PostgreSQL. 7-day bounded lifetime with `HttpOnly`, `SameSite=Lax` cookies.
- **CSRF Protection**: Whitelisted origin validation and Double-Submit Cookie verification with `X-CSRF-Token` headers.
- **Role Enforcement**:
  - `Public / Anonymous`: Read-only access to workouts.
  - `MEMBER`: Workout session tracking, personal progress history; blocked (403 Forbidden) from catalog edits.
  - `ADMIN`: Full workout management, step re-ordering, and media asset upload permissions.

### 2. Administrator Bootstrap
To securely initialize the first administrator account without exposing passwords in shell history:
```bash
npm run admin:bootstrap
```
Prompts interactively for email and masked password. Refuses to overwrite existing administrators.

### 3. Object Storage & Media Management (Phase 5)
- **Drivers**: Pluggable architecture supporting `local` (offline dev), `r2` (Cloudflare R2), or `s3` (AWS S3).
- **Validation**: Strict magic byte inspection to verify true image and video binary formats before persistence.
- **Migration**: Automated asset migration utility:
  ```bash
  npm run media:migrate --workspace=@jerai/api
  ```

### 4. Workout Sessions & Progress Tracking (Phase 6)
- **Live Session Engine**: Start workouts, pause/resume timers, track active elapsed time, and record exertion (RPE 1–10) and notes.
- **Progress Dashboard**: View completion statistics, active weekly streaks, total minutes trained, and detailed session history at `/progress`.

### 5. Active Session Protection (Phase 7b)
- **Loss Prevention**: Warns users if they attempt to close an active workout modal, requiring explicit confirmation to avoid accidental session abandonment.
- **Dirty State Recovery**: Uncompleted session data is safely managed to ensure accurate progress metrics.

### 6. Edge Reverse Proxy & Rate Limiting (Phase 7c)
- **Cloudflare Pages Proxy**: `functions/api/[[catchall]].ts` provides edge routing to the backend API without exposing internal hostnames or CORS complexities.
- **Proxy Authentication**: Enforces `x-proxy-secret` header checks on the backend API to block direct perimeter bypass.
- **Anti-Spoofing Rate Limits**: Resolves client IP addresses securely using express proxy trust settings.

---

## Testing & Quality Verification

Run all automated verification checks across the monorepo from the root directory:

```bash
# Run all 212 automated unit and integration tests
npm test

# Run ESLint across all packages
npm run lint

# Run TypeScript typechecks across shared, api, and web
npm run typecheck

# Build production bundles for frontend and API
npm run build

# Run Playwright end-to-end tests (requires running backend/DB)
npm run test:e2e
```

### Test Suite Breakdown (212 Tests Passing):
- **`packages/shared`** (26 tests): Zod validation schemas for workouts, sessions, authentication, and media.
- **`apps/web`** (71 tests): Frontend unit and integration tests for catalog filters, modals, focus timers, theme switching, React Query synchronization, session exit confirmation, and the `ProgressDashboard`.
- **`apps/api`** (115 tests): Backend endpoint verification covering health, workout CRUD, Argon2id auth, rate limiting, session rotation, proxy secret authentication, object storage drivers, media validation, and session tracking.

---

## Safe Production Deployment Next Steps

1. **Database Deployment**:
   - Provision a PostgreSQL database (e.g. Neon Serverless).
   - Set `DATABASE_URL` (pooled) and `DIRECT_URL` (direct).
   - Apply migrations: `npx prisma migrate deploy --workspace=@jerai/api`.
   - Seed default catalog: `npm run prisma:seed --workspace=@jerai/api`.
   - Bootstrap admin user: `npm run admin:bootstrap --workspace=@jerai/api`.

2. **Backend API Deployment (Render / Railway)**:
   - Root Directory: `.` (leave blank / root)
   - Build Command: `npm run build:api` (or `npm install --include=dev && npm run build:api`)
   - Start Command: `npm run start:api` (or `npm run start --workspace=@jerai/api`)
   - Configure environment variables: `NODE_ENV=production`, `NPM_CONFIG_PRODUCTION=false`, `PORT=3000`, `DATABASE_URL`, `DIRECT_URL`, `CORS_ORIGIN`, `PROXY_SECRET`, `REQUIRE_PROXY_AUTH=true`, `TRUST_PROXY=1`.

3. **Frontend Deployment (Cloudflare Pages)**:
   - Build output directory: `apps/web/dist`.
   - Build command: `npm run build:web`.
   - Set Cloudflare Pages environment variables: `BACKEND_API_URL` (your live API URL) and `PROXY_SECRET` (matching the backend secret).
