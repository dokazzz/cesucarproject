"""
The application must refuse to start on a bad environment.

SECRET_KEY and JWT_SECRET_KEY used to fall back to hardcoded strings that are
in this repository's history, so a host missing its environment booted happily
and signed tokens with a value anyone could read.

Each case runs in a subprocess from a temporary directory: config validates at
import, so it cannot be re-imported with different values in-process, and the
empty cwd stops python-dotenv from quietly supplying the real backend/.env.
"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile

import pytest

BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

VALID_ENV = {
    "SECRET_KEY":     "k" * 48,
    "JWT_SECRET_KEY": "j" * 48,
    "DATABASE_URL":   "postgresql://u:p@127.0.0.1:1/none",
    "DEBUG":          "false",
}


def import_config(env: dict) -> tuple[int, str, str]:
    """Import config in a clean subprocess. Returns (returncode, stderr, stdout)."""
    clean = {k: v for k, v in os.environ.items() if k not in VALID_ENV}
    clean.update(env)
    clean["PYTHONPATH"] = BACKEND
    with tempfile.TemporaryDirectory() as empty_dir:
        result = subprocess.run(
            [sys.executable, "-c", "import config; print('IMPORTED_OK')"],
            cwd=empty_dir, env=clean, capture_output=True, text=True,
        )
    return result.returncode, result.stderr or "", result.stdout or ""


def test_valid_environment_imports_cleanly():
    _, _, stdout = import_config(VALID_ENV)
    assert "IMPORTED_OK" in stdout


@pytest.mark.parametrize("missing", ["SECRET_KEY", "JWT_SECRET_KEY", "DATABASE_URL"])
def test_missing_required_setting_aborts_startup(missing):
    env = {k: v for k, v in VALID_ENV.items() if k != missing}
    code, stderr, _ = import_config(env)
    assert code != 0
    assert "ConfigError" in stderr
    assert missing in stderr


@pytest.mark.parametrize("placeholder", [
    "dev-secret-change-in-production",
    "jwt-dev-secret-change-in-production",
    "replace-with-a-long-random-string",
    "changeme",
])
def test_published_placeholders_are_rejected_by_value(placeholder):
    """These strings are in this repository's history; treat them as known."""
    code, stderr, _ = import_config({**VALID_ENV, "SECRET_KEY": placeholder})
    assert code != 0
    assert "ConfigError" in stderr


def test_short_secret_rejected_outside_debug():
    code, stderr, _ = import_config({**VALID_ENV, "JWT_SECRET_KEY": "short"})
    assert code != 0
    assert "ConfigError" in stderr


def test_short_secret_tolerated_in_debug():
    """Local development should not need a 32-character secret to run."""
    _, _, stdout = import_config({**VALID_ENV, "JWT_SECRET_KEY": "short", "DEBUG": "true"})
    assert "IMPORTED_OK" in stdout


def test_error_message_says_how_to_generate_one():
    """A failure at startup should not need a web search to resolve."""
    env = {k: v for k, v in VALID_ENV.items() if k != "SECRET_KEY"}
    _, stderr, _ = import_config(env)
    assert "secrets.token_urlsafe" in stderr
