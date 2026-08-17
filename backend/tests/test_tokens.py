"""
Access and refresh tokens.

Covers what can be checked without a database: token generation, hashing, the
state machine that decides whether a refresh token is still usable, and the
claims on an access token. The rotation and reuse-detection queries themselves
need Postgres and are not exercised here.
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import pytest

from config import config
from database.models.refresh_token import RefreshToken
from database.repositories.refresh_token_repository import generate_token, hash_token
from services.auth_service import AuthError, AuthService

NOW = datetime.now(UTC)


def make_token_row(**overrides) -> RefreshToken:
    fields = {
        "id": uuid.uuid4(),
        "user_id": uuid.uuid4(),
        "token_hash": hash_token(generate_token()),
        "family_id": uuid.uuid4(),
        "issued_at": NOW,
        "expires_at": NOW + timedelta(days=30),
    }
    fields.update(overrides)
    return RefreshToken(**fields)


class TestTokenGeneration:
    def test_tokens_are_unique(self):
        assert len({generate_token() for _ in range(100)}) == 100

    def test_tokens_carry_enough_entropy(self):
        """32 random bytes, URL-safe encoded."""
        assert len(generate_token()) >= 40

    def test_only_a_hash_is_ever_stored(self):
        token = generate_token()
        digest = hash_token(token)
        assert len(digest) == 64
        assert token not in digest

    def test_hashing_is_deterministic(self):
        token = generate_token()
        assert hash_token(token) == hash_token(token)

    def test_different_tokens_hash_differently(self):
        assert hash_token(generate_token()) != hash_token(generate_token())


class TestRefreshTokenState:
    def test_a_fresh_token_is_usable(self):
        assert make_token_row().is_active(NOW) is True

    def test_a_spent_token_is_not(self):
        """Second use is the reuse signal, not a valid refresh."""
        assert make_token_row(used_at=NOW).is_active(NOW) is False

    def test_a_revoked_token_is_not(self):
        assert make_token_row(revoked_at=NOW).is_active(NOW) is False

    def test_an_expired_token_is_not(self):
        expired = make_token_row(issued_at=NOW - timedelta(days=40),
                                 expires_at=NOW - timedelta(days=10))
        assert expired.is_active(NOW) is False

    def test_session_metadata_never_exposes_the_hash(self):
        """This is what GET /auth/sessions returns to the user."""
        assert "token_hash" not in make_token_row().to_dict()

    def test_session_metadata_helps_a_user_recognise_a_device(self):
        row = make_token_row(user_agent="Mozilla/5.0 (Linux; Android 14)",
                             client_ip="200.1.2.3")
        data = row.to_dict()
        assert data["user_agent"].startswith("Mozilla/5.0")
        assert data["client_ip"] == "200.1.2.3"


class TestAccessTokens:
    def test_lifetime_is_fifteen_minutes(self, driver):
        claims = AuthService.decode_token(AuthService.create_access_token(driver))
        assert (claims["exp"] - claims["iat"]) / 60 == 15

    def test_lifetime_is_the_revocation_delay(self):
        """Documents why this number is small: it bounds how long a ban lags."""
        assert config.ACCESS_TOKEN_MINUTES <= 30

    def test_typed_as_an_access_token(self, driver):
        claims = AuthService.decode_token(AuthService.create_access_token(driver))
        assert claims["typ"] == "access"

    def test_carries_the_identity_a_route_needs(self, driver):
        claims = AuthService.decode_token(AuthService.create_access_token(driver))
        assert claims["sub"] == str(driver.id)
        assert claims["rgm"] == driver.rgm

    def test_a_tampered_token_is_rejected(self, driver):
        token = AuthService.create_access_token(driver)
        forged = token[:-4] + ("aaaa" if not token.endswith("aaaa") else "bbbb")
        with pytest.raises(AuthError):
            AuthService.decode_token(forged)

    def test_a_token_signed_with_another_key_is_rejected(self, driver):
        from jose import jwt
        forged = jwt.encode({"sub": str(driver.id), "typ": "access"},
                            "an-attackers-own-key", algorithm="HS256")
        with pytest.raises(AuthError):
            AuthService.decode_token(forged)
