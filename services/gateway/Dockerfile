# =============================================================================
# GridMind Gateway — Multi-stage Dockerfile
# =============================================================================
# Build: docker build -t gridmind-gateway ./services/gateway
# Run:   docker run -p 8000:8000 gridmind-gateway
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Builder — install dependencies
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS builder

# Install uv for fast dependency management
COPY --from=ghcr.io/astral-sh/uv:0.4.18 /uv /usr/local/bin/uv

WORKDIR /build

# Copy dependency files first for layer caching
COPY pyproject.toml uv.lock* ./

# Install dependencies into a virtual environment
RUN uv venv /opt/venv && \
    uv pip install --python /opt/venv/bin/python -r pyproject.toml

# Copy application source
COPY . .

# Install the application itself
RUN uv pip install --python /opt/venv/bin/python --no-deps .

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

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Set PATH to use venv
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Copy application code
COPY --from=builder /build /app

# Change ownership to non-root user
RUN chown -R gridmind:gridmind /app

USER gridmind

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

CMD ["sh", "-c", "uvicorn gateway.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
