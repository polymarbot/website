# PolymarBot

A web platform for managing Polymarket trading bots, featuring wallet management, strategy configuration, and bot monitoring.

## Tech Stack

- **Framework**: Nuxt 4 / Vue 3
- **UI**: PrimeVue 4 + Tailwind CSS v4
- **Database**: PostgreSQL + Prisma ORM
- **Language**: TypeScript 5
- **Package Manager**: pnpm 10 (Monorepo + Catalog)

## Getting Started

```bash
# Install dependencies
pnpm install

# Generate Prisma Client
pnpm db:generate

# Start development server
pnpm dev:website
```

## Scripts

### Code Quality

| Command | Description |
|---------|-------------|
| `pnpm typecheck:all` | Run TypeScript type checking |
| `pnpm lint:all` | Run ESLint |
| `pnpm format:all` | Format code |

### Database

| Command | Description |
|---------|-------------|
| `pnpm db:generate` | Generate all Prisma Clients |
| `pnpm db:app:push` | Push app schema to database |
| `pnpm db:app:studio` | Open app database studio |
| `pnpm db:bot:studio` | Open bot database studio |