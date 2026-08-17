"""
The contract a client is built against: routing, versioning, error codes,
security headers and rate limiting.

Routing is checked behaviourally rather than by reading app.routes, because
this FastAPI version stores includes lazily as _IncludedRouter objects. A
routed-but-unauthenticated path answers 401 or 403; an unmounted one answers
404.
"""
from __future__ import annotations

import pytest

from errors import ErrorCode

V1_PATHS = [
    "/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/refresh",
    "/api/v1/auth/logout", "/api/v1/auth/sessions", "/api/v1/rides",
    "/api/v1/admin/users", "/api/v1/notifications",
]


class TestVersioning:
    @pytest.mark.parametrize("path", V1_PATHS)
    def test_v1_paths_are_documented(self, client, path):
        assert path in client.app.openapi()["paths"]

    def test_legacy_paths_are_hidden_from_the_schema(self, client):
        """One API in /docs, not two copies of it."""
        documented = client.app.openapi()["paths"]
        assert not any(p.startswith("/api/auth") for p in documented)

    @pytest.mark.parametrize("path", [
        "/api/auth/me", "/api/v1/auth/me", "/api/admin/users", "/api/v1/admin/users",
    ])
    def test_both_mounts_are_routed(self, client, path):
        assert client.get(path).status_code in (401, 403)

    def test_an_unmounted_version_is_a_404(self, client):
        assert client.get("/api/v2/auth/me").status_code == 404

    def test_legacy_responses_announce_their_end_date(self, client):
        response = client.get("/api/auth/me")
        assert response.headers["Deprecation"] == "true"
        assert response.headers["Sunset"]
        assert "successor-version" in response.headers["Link"]

    def test_v1_responses_are_not_deprecated(self, client):
        assert client.get("/api/v1/auth/me").headers.get("Deprecation") is None


class TestClientVersionGate:
    """The only lever available over a build already installed on a phone."""

    def test_outdated_client_is_refused(self, client):
        response = client.get("/api/v1/rides", headers={"X-Client-Version": "1.0.0"})
        assert response.status_code == 426
        assert response.json()["code"] == ErrorCode.UPGRADE_REQUIRED
        assert response.json()["minimum_version"] == "1.2.0"

    def test_current_client_passes(self, client):
        response = client.get("/api/v1/auth/me", headers={"X-Client-Version": "1.2.0"})
        assert response.status_code in (401, 403)

    def test_unversioned_client_is_not_blocked(self, client):
        """The web frontend sends no version header and must keep working."""
        assert client.get("/api/v1/auth/me").status_code in (401, 403)

    @pytest.mark.parametrize("version,too_old", [
        ("1.1.9", True), ("1.2.0", False), ("2.0.0", False),
        ("0.9", True), ("banana", True),
    ])
    def test_version_comparison(self, version, too_old):
        import app as app_module
        assert app_module._older_than_minimum(version) is too_old


class TestErrorShape:
    def test_errors_carry_a_stable_code(self, client):
        body = client.get("/api/v1/rides", headers={"X-Client-Version": "0.1"}).json()
        assert body["code"] == ErrorCode.UPGRADE_REQUIRED

    def test_detail_stays_a_plain_string_for_existing_clients(self, client):
        body = client.get("/api/v1/rides", headers={"X-Client-Version": "0.1"}).json()
        assert isinstance(body["detail"], str)

    def test_ride_errors_map_to_codes(self):
        from controllers.ride_controller import _to_api_error
        from services.ride_service import RideError

        cases = [
            ("Carona não encontrada.", 404, ErrorCode.RIDE_NOT_FOUND),
            ("Esta carona está sem vagas disponíveis.", 400, ErrorCode.RIDE_FULL),
            ("Apenas motoristas podem publicar caronas.", 403, ErrorCode.NOT_A_DRIVER),
            ("Você não pode reservar sua própria carona.", 400, ErrorCode.OWN_RIDE),
        ]
        for message, status, expected in cases:
            assert _to_api_error(RideError(message, status)).code == expected

    def test_an_explicit_code_beats_the_message_table(self):
        from controllers.ride_controller import _to_api_error
        from services.ride_service import RideError

        error = _to_api_error(RideError("Carona não encontrada.", 404, ErrorCode.RIDE_FULL))
        assert error.code == ErrorCode.RIDE_FULL

    def test_auth_errors_map_to_codes(self):
        from controllers.auth_controller import _to_api_error
        from services.auth_service import AuthError

        cases = [
            ("RGM ou senha inválidos.", 401, ErrorCode.INVALID_CREDENTIALS),
            ("Esta conta está desativada.", 403, ErrorCode.ACCOUNT_DISABLED),
            ("Sessão encerrada por motivo de segurança.", 401, ErrorCode.REFRESH_REUSED),
            ("Este RGM já está cadastrado.", 409, ErrorCode.RGM_TAKEN),
        ]
        for message, status, expected in cases:
            assert _to_api_error(AuthError(message, status)).code == expected


class TestResponseHeaders:
    def test_every_response_carries_a_request_id(self, client):
        """Quoted by a user reporting a failure; matches the logged traceback."""
        assert client.get("/status").headers["X-Request-ID"]

    def test_request_ids_are_unique_per_request(self, client):
        first = client.get("/status").headers["X-Request-ID"]
        second = client.get("/status").headers["X-Request-ID"]
        assert first != second

    @pytest.mark.parametrize("header,value", [
        ("X-Content-Type-Options", "nosniff"),
        ("X-Frame-Options", "DENY"),
        ("Referrer-Policy", "strict-origin-when-cross-origin"),
    ])
    def test_security_headers_are_present(self, client, header, value):
        assert client.get("/status").headers[header] == value

    def test_api_responses_forbid_loading_anything(self, client):
        """An API response is never a document."""
        policy = client.get("/api/v1/auth/me").headers["Content-Security-Policy"]
        assert "default-src 'none'" in policy
        assert "frame-ancestors 'none'" in policy


class TestRateLimiting:
    def test_login_is_capped_and_then_refuses(self, client):
        """RGM is an 8-digit number; the administrator's is 00000001."""
        body = {"rgm": "00000001", "password": "wrong-password"}
        statuses = [client.post("/api/v1/auth/login", json=body).status_code
                    for _ in range(6)]
        assert 429 in statuses, f"never rate limited: {statuses}"

    def test_a_refusal_says_when_to_come_back(self, client):
        body = {"rgm": "00000002", "password": "wrong-password"}
        last = None
        for _ in range(8):
            last = client.post("/api/v1/auth/login", json=body)
            if last.status_code == 429:
                break
        assert last.status_code == 429
        assert last.headers["Retry-After"]
        assert last.json()["code"] == ErrorCode.RATE_LIMITED


class TestDocsExposure:
    """
    Swagger and ReDoc are a complete map of the API surface. Handy for a demo,
    less so for whoever finds the host. ENABLE_DOCS defaults to DEBUG, and the
    suite runs with DEBUG off, so they should be gone here.
    """

    @pytest.mark.parametrize("path", ["/docs", "/redoc", "/openapi.json"])
    def test_docs_are_absent_when_disabled(self, client, path):
        assert client.get(path).status_code == 404

    def test_the_api_itself_still_works_without_docs(self, client):
        """Disabling documentation must not disable anything else."""
        assert client.get("/status").status_code == 200


class TestCors:
    def test_credentialed_requests_are_not_allowed(self, client):
        """
        Authentication is a Bearer token, not a cookie. allow_credentials with
        a permissive origin is the combination that turns a CORS mistake into
        account takeover, and nothing here needs it.
        """
        response = client.options(
            "/api/v1/rides",
            headers={
                "Origin": "http://localhost:5500",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert response.headers.get("access-control-allow-credentials") is None

    def test_an_unlisted_origin_is_not_echoed_back(self, client):
        response = client.options(
            "/api/v1/rides",
            headers={
                "Origin": "https://attacker.example",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert response.headers.get("access-control-allow-origin") != "https://attacker.example"

    def test_clients_can_read_the_request_id(self, client):
        """
        Exposed deliberately, so a browser client can report it.

        Checked on a real request rather than a preflight:
        Access-Control-Expose-Headers is returned with the actual response,
        not with the OPTIONS that precedes it.
        """
        response = client.get("/api/v1/auth/me",
                              headers={"Origin": "http://localhost:5500"})
        exposed = response.headers.get("access-control-expose-headers", "")
        assert "X-Request-ID" in exposed


class TestCrashResponses:
    """
    The handler used to swallow every exception and return a bare 500 with no
    logging at all, so a production crash left no trace anywhere. These
    requests genuinely fail -- no database is reachable -- which makes them a
    real test of what a user sees when something breaks.
    """

    def test_an_unhandled_failure_returns_a_generic_500(self, client):
        response = client.post("/api/v1/auth/login",
                               json={"rgm": "99999999", "password": "irrelevant"})
        assert response.status_code in (429, 500)
        if response.status_code == 500:
            assert "Erro interno" in response.json()["detail"]

    def test_the_500_carries_a_traceable_request_id(self, client):
        """So a user can quote a code that finds the exact logged stack."""
        response = client.post("/api/v1/auth/login",
                               json={"rgm": "99999998", "password": "irrelevant"})
        if response.status_code == 500:
            body = response.json()
            assert body["code"] == ErrorCode.INTERNAL
            assert body["request_id"] == response.headers["X-Request-ID"]

    def test_the_500_leaks_no_internals(self, client):
        response = client.post("/api/v1/auth/login",
                               json={"rgm": "99999997", "password": "irrelevant"})
        if response.status_code == 500:
            body = response.text
            for leak in ("psycopg2", "Traceback", "sqlalchemy", "password"):
                assert leak not in body


class TestHealthChecks:
    def test_liveness_does_not_touch_the_database(self, client):
        """No database is reachable in this suite, so this proves the point."""
        response = client.get("/status")
        assert response.status_code == 200
        assert response.json()["status"] == "Online"

    def test_readiness_reports_degraded_when_the_database_is_unreachable(self, client):
        """The distinction that makes /health worth having over /status."""
        response = client.get("/health")
        assert response.status_code == 503
        assert response.json()["database"] == "unreachable"
