"""
BirdNET CORS proxy.

Starts birdnet_analyzer.server internally on INTERNAL_PORT,
then exposes a CORS-enabled FastAPI endpoint on PORT that forwards requests.
"""

import asyncio
import logging
import os
import subprocess
import threading

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

PORT = int(os.environ.get("PORT", 8080))
INTERNAL_PORT = 8000  # birdnet_analyzer.server runs here

app = FastAPI(title="BirdNET API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_birdnet_ready = threading.Event()


def _start_birdnet():
    log.info("Starting birdnet_analyzer.server on port %d", INTERNAL_PORT)
    proc = subprocess.Popen(
        ["python", "-m", "birdnet_analyzer.server", "--port", str(INTERNAL_PORT)],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    # Stream logs and detect ready state
    for line in proc.stdout:
        decoded = line.decode(errors="replace").rstrip()
        log.info("[birdnet] %s", decoded)
        if not _birdnet_ready.is_set():
            # birdnet_analyzer.server prints "Listening on ..." when ready
            if "listening" in decoded.lower() or "running" in decoded.lower():
                _birdnet_ready.set()


@app.on_event("startup")
def startup():
    t = threading.Thread(target=_start_birdnet, daemon=True)
    t.start()
    # Give birdnet up to 60 s to start; if it doesn't signal, carry on anyway
    _birdnet_ready.wait(timeout=60)
    log.info("BirdNET proxy ready")


@app.get("/health")
def health():
    return {"status": "ok", "birdnet_ready": _birdnet_ready.is_set()}


@app.api_route(
    "/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
)
async def proxy(path: str, request: Request):
    """Forward every request to the internal birdnet_analyzer server."""
    url = f"http://localhost:{INTERNAL_PORT}/{path}"
    body = await request.body()

    async with httpx.AsyncClient(timeout=120) as client:
        try:
            resp = await client.request(
                method=request.method,
                url=url,
                headers={
                    k: v
                    for k, v in request.headers.items()
                    if k.lower() not in ("host", "content-length")
                },
                content=body,
                params=dict(request.query_params),
            )
        except httpx.ConnectError:
            return JSONResponse(
                {"detail": "BirdNET server not yet available, please retry"},
                status_code=503,
            )

    return Response(
        content=resp.content,
        status_code=resp.status_code,
        media_type=resp.headers.get("content-type", "application/json"),
    )
