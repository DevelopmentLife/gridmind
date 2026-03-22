# =============================================================================
# GridMind Customer Portal — Multi-stage Dockerfile
# =============================================================================
# Build: docker build -t gridmind-portal ./services/portal
# Run:   docker run -p 3000:3000 gridmind-portal
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Dependencies — install node modules
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# Copy dependency files for layer caching
COPY package.json package-lock.json* ./

RUN npm ci --ignore-scripts

# ---------------------------------------------------------------------------
# Stage 2: Builder — build the Next.js application
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time environment variables
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3: Production — minimal runtime
# ---------------------------------------------------------------------------
FROM node:20-alpine AS production

# Security: non-root user
RUN addgroup --system --gid 1001 gridmind && \
    adduser --system --uid 1001 --ingroup gridmind gridmind

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Copy built assets from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# Change ownership to non-root user
RUN chown -R gridmind:gridmind /app

USER gridmind

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
