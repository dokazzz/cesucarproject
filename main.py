"""
Entry point for Vercel deployment.
Adds backend/ to sys.path, mounts static assets, and serves HTML pages via clean URLs.
"""
import os
import sys

from fastapi import HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(_root, "backend"))

from app import app  # noqa: E402

# Mount static asset folders
for _folder in ("css", "js", "images"):
    _p = os.path.join(_root, _folder)
    if os.path.isdir(_p):
        app.mount(f"/{_folder}", StaticFiles(directory=_p), name=_folder)


_NO_CACHE = {"Cache-Control": "no-store, must-revalidate", "Pragma": "no-cache"}

# Serve-able names are resolved once, at import, into two allowlists. The
# request path is only ever tested for *membership* in these sets — it is never
# joined onto a filesystem path — so no traversal, dotfile, or extension trick
# can reach a file that isn't listed here. Previously this handler joined the
# raw path onto the project root, which served /.env to anonymous callers.
_ASSET_SUFFIXES = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp"}

_PAGES: set[str] = {
    name[:-5]
    for name in os.listdir(_root)
    if name.endswith(".html") and os.path.isfile(os.path.join(_root, name))
}

_ASSETS: set[str] = {
    name
    for name in os.listdir(_root)
    if not name.startswith(".")
    and os.path.splitext(name)[1].lower() in _ASSET_SUFFIXES
    and os.path.isfile(os.path.join(_root, name))
}


@app.get("/{page:path}")
async def serve_frontend(page: str):
    page = page.strip("/")

    # Root index
    if not page:
        return FileResponse(
            os.path.join(_root, "index.html"), media_type="text/html", headers=_NO_CACHE
        )

    # Clean URL: /login → login.html, /dashboard → dashboard.html, etc.
    if page in _PAGES:
        return FileResponse(
            os.path.join(_root, f"{page}.html"), media_type="text/html", headers=_NO_CACHE
        )

    # Root-level image assets: /logo.png, /favicon.ico, etc.
    if page in _ASSETS:
        return FileResponse(os.path.join(_root, page))

    raise HTTPException(status_code=404)
