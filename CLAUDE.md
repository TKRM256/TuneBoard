# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TuneBoard is a setting sheet (セッティングシート) management app for music circle live events. It solves the problem of paper-based setting sheets by providing a digital system where performers can submit setting sheets without logging in, and organizers can manage them with duplicate song detection.

## Commands

### Frontend (`frontend/`)

```bash
npm run dev      # Start dev server (Vite, :5173)
npm run build    # TypeScript check + production build
npm run lint     # ESLint
npm run test     # Vitest
npm run preview  # Preview production build
```

**After any frontend change, always run `npm run build` and `npm run lint` before finishing.**

### Backend (`backend/`)

```bash
./gradlew build          # Build project + run tests
./gradlew build -x test  # Build without tests
./gradlew test           # Run tests only
```

**After any backend change, always run `./gradlew build` (including tests) before finishing.**

## Architecture

Two separate sub-projects in the repo root:

```
frontend/   React 19 + TypeScript + Vite + shadcn/ui
backend/    Spring Boot 4.0.3 + Java 21 + PostgreSQL (H2 in dev)
```

The Vite dev server proxies `/api`, `/oauth2`, and `/login/oauth2` to the backend at `:8080`.

### Frontend Structure (`frontend/src/`)

Feature-based organization under `features/`:

- `auth/` — Google OAuth2 login, JWT storage, `RequireAuth` route wrapper
- `layout/` — Main app shell
- `lives/` — Core feature: live event CRUD, setting sheet form editor, submissions management
- `public/` — Token-based public pages for performers to submit setting sheets (no login required)
- `setting-sheet/` — Setting sheet form rendering and submission logic
- `tenants/` — Multi-tenant org management, team invitations

Shared code:
- `components/ui/` — shadcn/ui primitives (do not modify these)
- `components/original/` — Custom reusable components (`ConfirmButton`, `CreateAccordionCard`, `InlineEditPanel`, `TrashSheet`)
- `hooks/` — Custom hooks (`use-mobile`, `use-single-flight`)

Routes are lazy-loaded. Public submission pages use a share token in the URL, not authentication.

### Backend Structure (`backend/src/main/java/jp/tubeboard/`)

Feature-based organization mirroring the frontend:

- `auth/` — JWT issuance, Google OAuth2, user entity, login filter
- `lives/` — Main business domain: REST controllers (admin + public), services, JPA entities, Flyway-managed schema
- `tenants/` — Tenant/org entities, membership, invitation flow
- `health/` — Health check endpoint
- `config/` — Spring Security config, CORS, request logging filter

Database:
- Dev: H2 in PostgreSQL-compatible mode with seed data
- Production: PostgreSQL on Railway
- Migrations: Flyway, 12 versions in `backend/src/main/resources/db/migration/`

Song duplicate detection uses Kuromoji (Japanese morphological analyzer) to normalize song titles before comparison.

## Key Design Decisions

- **No login for performers** — Setting sheet submission uses a public share token. Only organizers log in via Google OAuth2.
- **Multi-tenant** — Each music circle is a separate tenant. Users can belong to multiple tenants.
- **Customizable forms** — Organizers configure which fields appear on the setting sheet per live event.
- **Soft deletes** — Entities use `deletedAt` timestamp rather than hard deletion.
- **Mobile + desktop** — UI must work well on both; use responsive design with Tailwind.

## Development Guidelines

- Think in English, output responses in Japanese.
- Keep files under 200–300 lines; split if growing beyond that.
- Single Responsibility Principle — one concern per file/class.
- Do not add features beyond what is requested; keep implementations simple.
