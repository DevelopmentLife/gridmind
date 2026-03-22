"""Contract tests — gateway API schema consistency.

Validates that:
  - Auth schemas expose the required fields for login/registration/token flows
  - Deployment schemas carry required identifiers and fields
  - Schema field types and constraints are consistent with documented API contract
  - All schemas are Pydantic models with model_fields introspection available
"""

from __future__ import annotations

import pytest


# ---------------------------------------------------------------------------
# Auth schemas
# ---------------------------------------------------------------------------


class TestLoginRequest:
    def test_login_request_has_email_field(self) -> None:
        from gateway.schemas.auth import LoginRequest
        assert "email" in LoginRequest.model_fields

    def test_login_request_has_password_field(self) -> None:
        from gateway.schemas.auth import LoginRequest
        assert "password" in LoginRequest.model_fields

    def test_login_request_instantiation(self) -> None:
        from gateway.schemas.auth import LoginRequest
        req = LoginRequest(email="user@gridmind.io", password="hunter2")
        assert req.email == "user@gridmind.io"

    def test_login_request_rejects_empty_password(self) -> None:
        from pydantic import ValidationError
        from gateway.schemas.auth import LoginRequest
        with pytest.raises(ValidationError):
            LoginRequest(email="user@gridmind.io", password="")


class TestTokenResponse:
    def test_token_response_has_access_token(self) -> None:
        from gateway.schemas.auth import TokenResponse
        assert "access_token" in TokenResponse.model_fields

    def test_token_response_has_refresh_token(self) -> None:
        from gateway.schemas.auth import TokenResponse
        assert "refresh_token" in TokenResponse.model_fields

    def test_token_response_has_token_type(self) -> None:
        from gateway.schemas.auth import TokenResponse
        assert "token_type" in TokenResponse.model_fields

    def test_token_response_default_type_is_bearer(self) -> None:
        from gateway.schemas.auth import TokenResponse
        resp = TokenResponse(access_token="tok_a", refresh_token="tok_r", expires_in=900)
        assert resp.token_type == "bearer"

    def test_token_response_has_expires_in(self) -> None:
        from gateway.schemas.auth import TokenResponse
        assert "expires_in" in TokenResponse.model_fields


class TestRegisterRequest:
    def test_register_request_has_email(self) -> None:
        from gateway.schemas.auth import RegisterRequest
        assert "email" in RegisterRequest.model_fields

    def test_register_request_has_password(self) -> None:
        from gateway.schemas.auth import RegisterRequest
        assert "password" in RegisterRequest.model_fields

    def test_register_request_has_full_name(self) -> None:
        from gateway.schemas.auth import RegisterRequest
        assert "full_name" in RegisterRequest.model_fields

    def test_register_request_has_organization_name(self) -> None:
        from gateway.schemas.auth import RegisterRequest
        assert "organization_name" in RegisterRequest.model_fields

    def test_register_response_has_user_id(self) -> None:
        from gateway.schemas.auth import RegisterResponse
        assert "user_id" in RegisterResponse.model_fields

    def test_register_response_has_org_id(self) -> None:
        from gateway.schemas.auth import RegisterResponse
        assert "org_id" in RegisterResponse.model_fields


class TestApiKeySchemas:
    def test_api_key_create_has_name(self) -> None:
        from gateway.schemas.auth import ApiKeyCreate
        assert "name" in ApiKeyCreate.model_fields

    def test_api_key_response_has_id(self) -> None:
        from gateway.schemas.auth import ApiKeyResponse
        assert "id" in ApiKeyResponse.model_fields

    def test_api_key_response_has_key_preview(self) -> None:
        from gateway.schemas.auth import ApiKeyResponse
        assert "key_preview" in ApiKeyResponse.model_fields

    def test_api_key_created_response_has_full_key(self) -> None:
        from gateway.schemas.auth import ApiKeyCreatedResponse
        assert "key" in ApiKeyCreatedResponse.model_fields


# ---------------------------------------------------------------------------
# Deployment schemas
# ---------------------------------------------------------------------------


class TestDeploymentCreate:
    def test_create_has_name_field(self) -> None:
        from gateway.schemas.deployments import DeploymentCreate
        assert "name" in DeploymentCreate.model_fields

    def test_create_has_engine_field(self) -> None:
        from gateway.schemas.deployments import DeploymentCreate
        assert "engine" in DeploymentCreate.model_fields

    def test_create_has_region_field(self) -> None:
        from gateway.schemas.deployments import DeploymentCreate
        assert "region" in DeploymentCreate.model_fields

    def test_create_default_engine_is_postgresql(self) -> None:
        from gateway.schemas.deployments import DeploymentCreate
        req = DeploymentCreate(name="my-db")
        assert req.engine == "postgresql"

    def test_create_rejects_empty_name(self) -> None:
        from pydantic import ValidationError
        from gateway.schemas.deployments import DeploymentCreate
        with pytest.raises(ValidationError):
            DeploymentCreate(name="")


class TestDeploymentResponse:
    def test_response_has_id(self) -> None:
        from gateway.schemas.deployments import DeploymentResponse
        fields = DeploymentResponse.model_fields
        assert "id" in fields

    def test_response_has_tenant_id(self) -> None:
        from gateway.schemas.deployments import DeploymentResponse
        assert "tenant_id" in DeploymentResponse.model_fields

    def test_response_has_status(self) -> None:
        from gateway.schemas.deployments import DeploymentResponse
        assert "status" in DeploymentResponse.model_fields

    def test_response_has_engine(self) -> None:
        from gateway.schemas.deployments import DeploymentResponse
        assert "engine" in DeploymentResponse.model_fields

    def test_response_has_created_at(self) -> None:
        from gateway.schemas.deployments import DeploymentResponse
        assert "created_at" in DeploymentResponse.model_fields


class TestDeploymentHealth:
    def test_health_has_deployment_id(self) -> None:
        from gateway.schemas.deployments import DeploymentHealth
        assert "deployment_id" in DeploymentHealth.model_fields

    def test_health_has_status(self) -> None:
        from gateway.schemas.deployments import DeploymentHealth
        assert "status" in DeploymentHealth.model_fields


class TestDeploymentStatus:
    def test_deployment_status_has_active(self) -> None:
        from gateway.schemas.deployments import DeploymentStatus
        assert DeploymentStatus.ACTIVE == "active"

    def test_deployment_status_has_provisioning(self) -> None:
        from gateway.schemas.deployments import DeploymentStatus
        assert DeploymentStatus.PROVISIONING == "provisioning"

    def test_deployment_status_has_deleted(self) -> None:
        from gateway.schemas.deployments import DeploymentStatus
        assert DeploymentStatus.DELETED == "deleted"
