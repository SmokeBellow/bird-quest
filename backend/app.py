"""
BirdNET CORS proxy.

Starts birdnet_analyzer.server internally on INTERNAL_PORT,
then exposes a CORS-enabled FastAPI endpoint on PORT that forwards requests.

BirdNET readiness is detected by polling the internal server,
so we don't rely on fragile log-line parsing.
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
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

_birdnet_ready = threading.Event()


def _start_birdnet():
    log.info("Starting birdnet_analyzer.server on port %d", INTERNAL_PORT)
    proc = subprocess.Popen(
        ["python", "-m", "birdnet_analyzer.server", "--port", str(INTERNAL_PORT)],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    for line in proc.stdout:
        log.info("[birdnet] %s", line.decode(errors="replace").rstrip())


def _poll_birdnet_ready():
    """Poll the internal BirdNET server until it responds."""
    import time
    for attempt in range(60):  # up to 5 minutes
        time.sleep(5)
        try:
            r = httpx.get(f"http://localhost:{INTERNAL_PORT}/", timeout=5)
            # Any response (even 404) means the server is up
            _birdnet_ready.set()
            log.info("BirdNET server ready after %d seconds", (attempt + 1) * 5)
            return
        except Exception:
            log.info("BirdNET not ready yet (attempt %d/60)…", attempt + 1)
    log.warning("BirdNET did not become ready in time")


@app.on_event("startup")
def startup():
    threading.Thread(target=_start_birdnet, daemon=True).start()
    threading.Thread(target=_poll_birdnet_ready, daemon=True).start()
    log.info("BirdNET proxy started, waiting for model to load…")


@app.get("/health")
def health():
    return JSONResponse(
        {"status": "ok", "birdnet_ready": _birdnet_ready.is_set()},
        headers={"Access-Control-Allow-Origin": "*"},
    )


@app.options("/{path:path}")
async def options_handler(path: str):
    """Explicit OPTIONS handler ensures preflight always succeeds."""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )


@app.api_route(
    "/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "HEAD", "PATCH"],
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
                headers={"Access-Control-Allow-Origin": "*"},
            )

    return Response(
        content=resp.content,
        status_code=resp.status_code,
        media_type=resp.headers.get("content-type", "application/json"),
        headers={"Access-Control-Allow-Origin": "*"},
    )
