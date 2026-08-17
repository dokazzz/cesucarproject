"""
The static handler must not serve arbitrary files.

main.py used to join the raw request path onto the project root and return
whatever it found, so GET /.env returned the secrets file -- database
credentials and the JWT signing key -- to any anonymous caller.

main.py is imported in a subprocess: importing it mounts a catch-all route on
the shared application object, which would change how every other test in the
suite sees a 404.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

PROBE = f"""
import json, os, sys
sys.path.insert(0, os.path.join({ROOT!r}, "backend"))
sys.path.insert(0, {ROOT!r})
import main
print(json.dumps({{"pages": sorted(main._PAGES), "assets": sorted(main._ASSETS)}}))
"""


@pytest.fixture(scope="module")
def allowlists():
    result = subprocess.run(
        [sys.executable, "-c", PROBE],
        cwd=ROOT, env={**os.environ, "PYTHONPATH": os.path.join(ROOT, "backend")},
        capture_output=True, text=True,
    )
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout.strip().splitlines()[-1])


@pytest.mark.parametrize("name", [
    ".env", "backend/.env", "vercel.json", "requirements.txt",
    "alembic.ini", ".gitignore", "main.py",
])
def test_sensitive_files_are_not_serveable(allowlists, name):
    assert name not in allowlists["assets"]
    assert name not in allowlists["pages"]


@pytest.mark.parametrize("traversal", [
    "../.env", "../../.env", "..%2f.env", "....//.env", "/etc/passwd",
])
def test_traversal_strings_match_nothing(allowlists, traversal):
    """
    The handler tests membership in a set rather than building a path, so
    these are not defended against -- they simply have nothing to match.
    """
    assert traversal not in allowlists["pages"]
    assert traversal not in allowlists["assets"]


@pytest.mark.parametrize("page", ["index", "login", "dashboard", "admin",
                                  "perfil", "procurar-carona", "oferecer-carona"])
def test_real_pages_are_still_served(allowlists, page):
    assert page in allowlists["pages"]


def test_root_images_are_still_served(allowlists):
    assert "logo.png" in allowlists["assets"]


def test_no_dotfile_is_ever_an_asset(allowlists):
    assert not [name for name in allowlists["assets"] if name.startswith(".")]


def test_assets_are_images_only(allowlists):
    allowed = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp"}
    for name in allowlists["assets"]:
        assert os.path.splitext(name)[1].lower() in allowed
