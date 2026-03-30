"""HTTP API client — wraps httpx for authenticated requests to the Gateway."""

from __future__ import annotations

from typing import Any

import httpx

from gridmind_cli.config import ProfileConfig


class APIError(Exception):
    """Raised when the Gateway API returns a non-2xx response.

    Attributes:
        status_code: HTTP status code.
        code: Machine-readable error code from the API envelope.
        message: Human-readable error message.
    """

    def __init__(self, status_code: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


class GridMindClient:
    """Synchronous wrapper around httpx for Gateway API calls.

    Args:
        profile: A ProfileConfig containing api_url and token.
        timeout: Request timeout in seconds.
    """

    def __init__(self, profile: ProfileConfig, timeout: float = 30.0) -> None:
        headers: dict[str, str] = {"Content-Type": "application/json"}
        if profile.token:
            headers["Authorization"] = f"Bearer {profile.token}"
        self._client = httpx.Client(
            base_url=profile.api_url,
            headers=headers,
            timeout=timeout,
        )

    def _handle_response(self, resp: httpx.Response) -> Any:
        """Parse JSON and raise APIError on non-2xx status."""
        if resp.status_code >= 400:
            try:
                body = resp.json()
                err = body.get("error", {})
                raise APIError(
                    status_code=resp.status_code,
                    code=err.get("code", "UNKNOWN_ERROR"),
                    message=err.get("message", resp.text),
                )
            except (ValueError, KeyError):
                raise APIError(resp.status_code, "UNKNOWN_ERROR", resp.text)
        return resp.json()

    def get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        """Send a GET request.

        Args:
            path: API path (e.g. ``/api/v1/agents``).
            params: Optional query parameters.

        Returns:
            Parsed JSON response body.
        """
        resp = self._client.get(path, params=params)
        return self._handle_response(resp)

    def post(self, path: str, json: dict[str, Any] | None = None) -> Any:
        """Send a POST request.

        Args:
            path: API path.
            json: Request body.

        Returns:
            Parsed JSON response body.
        """
        resp = self._client.post(path, json=json)
        return self._handle_response(resp)

    def close(self) -> None:
        """Close the underlying httpx client."""
        self._client.close()
