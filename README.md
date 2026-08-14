# School ERP

A multi-tenant school management and ERP platform designed for schools in Uganda.

## Architecture

- Frontend: Next.js + React + TypeScript
- Backend: NestJS + TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Cache & Jobs: Redis + BullMQ
- PWA: Responsive and offline-capable
- Monorepo: pnpm
- Containerization: Docker

## Applications

- `apps/web` — School ERP frontend/PWA
- `apps/api` — School ERP backend API

## Shared Packages

- `packages/ui` — Shared UI components
- `packages/types` — Shared TypeScript types
- `packages/config` — Shared configuration