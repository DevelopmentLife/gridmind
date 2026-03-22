# =============================================================================
# GridMind — Development Makefile
# =============================================================================
# Usage: make <target>
# =============================================================================

.PHONY: up down test lint typecheck migrate build clean logs ps

# ---------------------------------------------------------------------------
# Docker Compose
# ---------------------------------------------------------------------------

## Start all services in background
up:
	docker compose up -d

## Stop all services
down:
	docker compose down

## Stop all services and remove volumes
clean:
	docker compose down -v --remove-orphans

## Build all Docker images
build:
	docker compose build

## Show running containers
ps:
	docker compose ps

## Tail logs for all services
logs:
	docker compose logs -f

# ---------------------------------------------------------------------------
# Testing
# ---------------------------------------------------------------------------

## Run Python tests with coverage gate (85%)
test:
	cd services/cortex && pytest --cov=. --cov-fail-under=85 -v
	cd services/gateway && pytest --cov=. --cov-fail-under=85 -v

## Run TypeScript tests with coverage
test-ts:
	cd services/admin && npx vitest run --coverage
	cd services/portal && npx vitest run --coverage
	cd services/superadmin && npx vitest run --coverage

## Run all tests
test-all: test test-ts

# ---------------------------------------------------------------------------
# Linting
# ---------------------------------------------------------------------------

## Run ruff linter on Python services
lint:
	cd services/cortex && ruff check .
	cd services/gateway && ruff check .

## Run eslint on TypeScript services
lint-ts:
	cd services/admin && npx eslint . --max-warnings 0
	cd services/portal && npx eslint . --max-warnings 0
	cd services/superadmin && npx eslint . --max-warnings 0

## Run all linters
lint-all: lint lint-ts

# ---------------------------------------------------------------------------
# Type Checking
# ---------------------------------------------------------------------------

## Run mypy strict on Python services
typecheck:
	cd services/cortex && mypy --strict .
	cd services/gateway && mypy --strict .

## Run tsc on TypeScript services
typecheck-ts:
	cd services/admin && npx tsc --noEmit
	cd services/portal && npx tsc --noEmit
	cd services/superadmin && npx tsc --noEmit

## Run all type checkers
typecheck-all: typecheck typecheck-ts

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

## Apply database migrations
migrate:
	bash migrations/apply.sh

# ---------------------------------------------------------------------------
# Shortcuts
# ---------------------------------------------------------------------------

## Full CI check (lint + typecheck + test)
ci: lint-all typecheck-all test-all

## Format Python code
fmt:
	cd services/cortex && ruff format .
	cd services/gateway && ruff format .
