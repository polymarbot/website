# syntax=docker/dockerfile:1.20

# Build context: repo root
# Usage: docker build -f packages/app-homepage/deploy/Dockerfile .

# =============================================================================
# Build Stage - Install dependencies and generate static files
# =============================================================================
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

# Set working directory
WORKDIR /app

# Copy package files first (for Docker layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/app-homepage/package.json ./packages/app-homepage/
COPY packages/layer-basic/package.json ./packages/layer-basic/
COPY prisma ./prisma

# Install dependencies (pnpm store cached across builds)
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy source code (node_modules excluded by .dockerignore)
COPY . .

# Remove unrelated packages to avoid tsconfig resolution issues (whitelist approach)
RUN find packages -maxdepth 1 -mindepth 1 ! -name 'app-homepage' ! -name 'layer-basic' -exec rm -rf {} +

# Set build options
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Generate Prisma enums (needed by layer-basic shared types, dummy URLs for type generation only)
ENV APP_DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV BOT_DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV LOGS_DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN pnpm exec prisma generate --config=prisma/app/prisma.config.ts \
    && pnpm exec prisma generate --config=prisma/bot/prisma.config.ts \
    && pnpm exec prisma generate --config=prisma/bot_logs/prisma.config.ts

# Generate static files
WORKDIR /app/packages/app-homepage
RUN pnpm exec nuxt generate

# =============================================================================
# Production Stage - Serve static files with nginx
# =============================================================================
FROM nginx:alpine AS runner

# Copy custom nginx config
COPY packages/app-homepage/deploy/nginx.conf /etc/nginx/conf.d/default.conf

# Copy generated static files
COPY --from=builder /app/packages/app-homepage/.output/public /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=5s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1