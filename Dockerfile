# syntax=docker/dockerfile:1.20

# =============================================================================
# Base Stage - Common dependencies
# =============================================================================
FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

# Set working directory
WORKDIR /app

# =============================================================================
# Dependencies Stage - Install all dependencies
# =============================================================================
FROM base AS deps

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Copy prisma schema files for postinstall
COPY prisma ./prisma

# Install dependencies
RUN pnpm install --frozen-lockfile

# =============================================================================
# Build Stage - Build the application
# =============================================================================
FROM base AS builder

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set build options
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Generate Prisma clients (dummy URLs for type generation only, no DB connection needed)
ENV APP_DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV BOT_DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV LOGS_DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN pnpm db:generate

# Build the application (without dotenv-cli for production)
RUN pnpm build

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
COPY --from=builder --chown=nuxt:nodejs /app/.output ./.output

# Switch to non-root user
USER nuxt

# Expose the application port
EXPOSE ${APP_PORT}

# Health check (use 127.0.0.1 to force IPv4, as app listens on 0.0.0.0)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT}/ || exit 1

# Start the application
CMD ["node", ".output/server/index.mjs"]