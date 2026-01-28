# PolymarBot Website

A web platform for managing Polymarket trading bots, featuring wallet management, strategy configuration, and bot monitoring.

## Tech Stack

- **Framework**: Nuxt 4 / Vue 3
- **UI**: PrimeVue + Tailwind CSS v4
- **Database**: Prisma ORM
- **Language**: TypeScript

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm lint` | Run linting |
| `pnpm test` | Run tests |

## Project Structure

```
app/           # Frontend source code
server/        # Backend API
shared/        # Shared code between frontend and backend
```