# JERAI FIT (Glow Move Hub) — Full-Stack Monorepo

JERAI FIT is a full-stack fitness workout platform built with React, Vite, Tailwind CSS, Node.js, Express, TypeScript, Prisma ORM, and PostgreSQL.

> **Status Notice**: The project is currently at **Phase 3 (PostgreSQL-Backed API Foundation)**. It is an evolving software engineering application and is **not yet production-ready**. Writes to the API are fail-closed by default until Phase 4 (Authentication & Authorization).

---

## Architecture Overview

JERAI FIT is organized as an npm workspaces monorepo containing three core packages:

```mermaid
graph TD
    subgraph Client ["apps/web (Port 8080)"]
        UI[React 18 + Tailwind CSS]
        RQ[TanStack Query v5]
        APIClient[Centralized API Client]
        UI --> RQ --> APIClient
    end

    subgraph Server ["apps/api (Port 3000)"]
        Express[Express REST API /api/v1]
        WriteGuard[Fail-Closed Write Guard]
        Validator[Zod Request Validation]
        Prisma[Prisma ORM Client]
        Express --> WriteGuard --> Validator --> Prisma
    end

    subgraph Database ["PostgreSQL"]
        WorkoutsTable[(Workouts Table)]
        StepsTable[(WorkoutSteps Table)]
        Prisma --> WorkoutsTable
        Prisma --> StepsTable
    end

    subgraph Shared ["packages/shared"]
        Types[TypeScript Types & Contracts]
        Schemas[Zod Validation Schemas]
    end

    APIClient -.-> Express
    UI -.-> Types
    Express -.-> Types
    Express -.-> Schemas
```

### Monorepo Structure

- **`packages/shared`** (`@jerai/shared`): Shared TypeScript domain types, DTO contracts, and shared Zod validation schemas.
- **`apps/web`** (`@jerai/web`): React 18 single-page application built with Vite, Tailwind CSS, Lucide icons, Framer Motion, and TanStack React Query.
- **`apps/api`** (`@jerai/api`): Node.js + Express REST API backed by Prisma ORM and PostgreSQL.
- **`apps/api/prisma`**: Committed schema (`schema.prisma`), idempotent seed script (`seed.ts`), and versioned SQL migration (`migrations/20261025000000_init_workouts`).

---

## Prerequisites

- **Node.js**: `v20.x` or `v22.x`+ (Tested on Node `v24.13.0`)
- **npm**: `v10.x`+ (Tested on npm `v11.6.2`)
- **PostgreSQL**: Version 14 or higher (local installation, Docker, or managed cloud instance)

---

## Environment Configuration

Never commit credentials, connection strings, or `.env` files. Both root and workspace `.env*` files are ignored by `.gitignore`.

1. Copy the template to `.env` in the project root:
   ```bash
   cp .env.example .env
   ```

2. Configure environment variables in `.env`:

| Variable | Target | Description | Example |
|---|---|---|---|
| `NODE_ENV` | Server | Runtime mode (`development`, `production`, `test`) | `development` |
| `PORT` | Server | API HTTP server port | `3000` |
| `DATABASE_URL` | Server | PostgreSQL connection string (**server-side only**) | `postgresql://postgres:postgres@localhost:5432/jerai_fit?schema=public` |
| `ALLOW_LOCAL_DEV_WRITES` | Server | Fail-closed write guard opt-in (**development only**) | `false` |
| `CORS_ORIGIN` | Server | Allowed CORS frontend origin | `http://localhost:8080` |
| `VITE_API_URL` | Client | Base URL for the backend API | `http://localhost:3000/api/v1` |

> [!WARNING]
> The server refuses to start if `ALLOW_LOCAL_DEV_WRITES=true` is set when `NODE_ENV=production`. Production mutations are reserved for Phase 4 authentication.

---

## Database Setup & PostgreSQL Configuration

### Option A: Local PostgreSQL Service

1. Create a local PostgreSQL database named `jerai_fit`:
   ```sql
   CREATE DATABASE jerai_fit;
   ```
2. Update `DATABASE_URL` in your `.env` file:
   ```env
   DATABASE_URL="postgresql://<username>:<password>@localhost:5432/jerai_fit?schema=public"
   ```

### Option B: Docker Container

```bash
docker run --name jerai-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=jerai_fit -p 5432:5432 -d postgres:16
```

### Option C: Free / Low-Cost Hosted PostgreSQL Providers

You can connect to standard managed PostgreSQL tiers (e.g., Neon Serverless Postgres or Supabase). Note that provider free tier availability and quotas are subject to vendor terms.
Ensure the connection string uses SSL parameters where required by the provider:
```env
DATABASE_URL="postgresql://user:password@ep-sample-pool.us-east-2.aws.neon.tech/jerai_fit?sslmode=require"
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

## Running the Application

### 1. Start the Backend API (Port 3000)

```bash
npm run dev:api
```
The server will start at `http://localhost:3000`.

### 2. Start the Frontend Web App (Port 8080)

In a separate terminal:
```bash
npm run dev:web
```
Open `http://localhost:8080` in your browser.

---

## Versioned REST API Endpoints (`/api/v1`)

All API responses follow a consistent structured JSON schema.

### `GET /api/v1/health`
Checks application status and live PostgreSQL connectivity.

**Response (200 OK)**:
```json
{
  "status": "ok",
  "service": "jerai-fit-api",
  "timestamp": "2026-10-25T14:00:00.000Z",
  "database": {
    "connected": true
  },
  "environment": "development"
}
```

### `GET /api/v1/workouts`
List workouts with pagination, filtering, and full-text search.

- **Query Parameters**:
  - `bodyPart`: e.g. `Chest`, `Back`, `Legs`, `Cardio`
  - `difficulty`: `Beginner`, `Intermediate`, `Advanced`
  - `search`: Search query matching title or description
  - `page`: Page number (default: `1`)
  - `limit`: Items per page (default: `50`, maximum: `100`)

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "title": "Push-Up Power",
      "difficulty": "Beginner",
      "bodyPart": "Chest",
      "duration": "15 min",
      "calories": 120,
      "videoUrl": "https://www.youtube.com/embed/IODxDxX7oi4",
      "image": "/assets/workout-1.jpg",
      "description": "Master the classic push-up with perfect form.",
      "steps": ["Start in high plank", "Lower chest", "Push back up"],
      "createdAt": "2026-10-25T14:00:00.000Z",
      "updatedAt": "2026-10-25T14:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 30,
    "totalPages": 1
  }
}
```

### `GET /api/v1/workouts/:id`
Fetch a single workout with its ordered steps. Returns `404` if not found.

### `POST /api/v1/workouts`
Create a new workout. Requires `ALLOW_LOCAL_DEV_WRITES=true` in Phase 3.

### `PUT /api/v1/workouts/:id`
Update an existing workout and synchronize steps. Requires `ALLOW_LOCAL_DEV_WRITES=true` in Phase 3.

### `DELETE /api/v1/workouts/:id`
Delete a workout. Cascades to steps. Requires `ALLOW_LOCAL_DEV_WRITES=true` in Phase 3.

---

## Security Boundary & Phase 4 Dependency

- **Fail-Closed Writes**: `POST`, `PUT`, and `DELETE` requests are rejected by default with `403 Forbidden` (`WRITES_DISABLED`).
- **Phase 4 Dependency**: True multi-user production authentication (admin vs member roles, secure JWT/session verification, hashed credentials) is slated for **Phase 4**.
- **Temporary Local Dev Write Mode**: Can be enabled for local development only by setting `ALLOW_LOCAL_DEV_WRITES=true` in `.env`. This mode is strictly barred from starting in production.

---

## Testing & Quality Verification

Run automated checks across all workspaces from the monorepo root:

```bash
# Run all automated tests (74 tests across shared, web, and api)
npm test

# Run ESLint across all packages
npm run lint

# Run TypeScript typechecks across all packages
npm run typecheck

# Build production bundles for web and api
npm run build
```

### Test Coverage Summary:
- **`packages/shared`** (20 tests): Workout validation schemas, boundaries, constraints, defaults.
- **`apps/web`** (40 tests): Unit and integration tests for filtering, modals, timers, theme, TanStack Query states, and storage error resilience.
- **`apps/api`** (14 tests): Supertest endpoint verification for health, listings, filters, 404/400 handling, write-guard protection, and safe error handling.
