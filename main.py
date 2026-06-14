"""
Entry point for Vercel deployment.
Adds backend/ to sys.path, mounts static assets, and serves HTML pages via clean URLs.
"""
import sys
import os
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


@app.get("/{page:path}")
async def serve_frontend(page: str):
    # Clean URL: /login → login.html, /dashboard → dashboard.html, etc.
    html = os.path.join(_root, f"{page}.html")
    if os.path.isfile(html):
        return FileResponse(html, media_type="text/html", headers=_NO_CACHE)
    # Direct file: /logo.png, /favicon.ico, etc.
    f = os.path.join(_root, page)
    if os.path.isfile(f):
        return FileResponse(f)
    # Root index
    index = os.path.join(_root, "index.html")
    if page == "" and os.path.isfile(index):
        return FileResponse(index, media_type="text/html", headers=_NO_CACHE)
    raise HTTPException(status_code=404)
