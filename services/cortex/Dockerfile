# =============================================================================
# GridMind Cortex (Agent Runtime) — Multi-stage Dockerfile
# =============================================================================
# Build: docker build -t gridmind-cortex ./services/cortex
# Run:   docker run -p 9090:9090 gridmind-cortex
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Builder — install dependencies
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS builder

# Install hatch for project management
RUN pip install --no-cache-dir hatch

WORKDIR /build

# Copy dependency files first for layer caching
COPY pyproject.toml hatch.toml* ./

# Install dependencies
RUN pip install --no-cache-dir --prefix=/opt/deps .

# Copy application source
COPY . .

# Install the application
RUN pip install --no-cache-dir --prefix=/opt/deps --no-deps .

# ---------------------------------------------------------------------------
# Stage 2: Production — minimal runtime
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS production

# Security: non-root user
RUN groupadd --gid 1001 gridmind && \
    useradd --uid 1001 --gid 1001 --create-home --shell /bin/bash gridmind

# Install curl for healthcheck
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /opt/deps /usr/local

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Copy application code
COPY --from=builder /build /app

# Change ownership to non-root user
RUN chown -R gridmind:gridmind /app

USER gridmind

EXPOSE 9090

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:9090/health || exit 1

ENTRYPOINT ["python", "-m", "cortex"]
