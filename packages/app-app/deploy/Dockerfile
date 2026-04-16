# syntax=docker/dockerfile:1.20

# Build context: repo root
# Usage: docker build -f packages/app-app/deploy/Dockerfile .

# =============================================================================
# Base Stage - Common dependencies
# =============================================================================
FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

# Set working directory
WORKDIR /app

# =============================================================================
# Build Stage - Install dependencies and build the application
# =============================================================================
FROM base AS builder

# Copy package files first (for Docker layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/app-app/package.json ./packages/app-app/
COPY packages/layer-auth/package.json ./packages/layer-auth/
COPY packages/layer-basic/package.json ./packages/layer-basic/
COPY prisma ./prisma

# Install dependencies (pnpm store cached across builds)
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy source code (node_modules excluded by .dockerignore)
COPY . .

# Remove unrelated packages to avoid tsconfig resolution issues (whitelist approach)
RUN find packages -maxdepth 1 -mindepth 1 ! -name 'app-app' ! -name 'layer-auth' ! -name 'layer-basic' -exec rm -rf {} +

# Set build options
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Generate Prisma clients (dummy URLs for type generation only, no DB connection needed)
ENV APP_DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV BOT_DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV LOGS_DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN pnpm exec prisma generate --config=prisma/app/prisma.config.ts \
    && pnpm exec prisma generate --config=prisma/bot/prisma.config.ts \
    && pnpm exec prisma generate --config=prisma/bot_logs/prisma.config.ts

# Build the application
WORKDIR /app/packages/app-app
RUN pnpm exec nuxt build

# =============================================================================
# Production Stage - Final runtime image
# =============================================================================
FROM base AS runner

# Application port (single source of truth)
ARG APP_PORT=3688

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nuxt

# Set working directory
WORKDIR /app

# Set runtime environment
ENV HOST=0.0.0.0
ENV PORT=${APP_PORT}

# Copy built application
COPY --from=builder --chown=nuxt:nodejs /app/packages/app-app/.output ./.output

# Switch to non-root user
USER nuxt

# Expose the application port
EXPOSE ${APP_PORT}

# Health check (use 127.0.0.1 to force IPv4, as app listens on 0.0.0.0)
HEALTHCHECK --interval=5s --timeout=5s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT}/api/healthz || exit 1

# Start the application
CMD ["node", ".output/server/index.mjs"]