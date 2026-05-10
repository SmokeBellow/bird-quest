"""
BirdNET API — calls birdnet_analyzer CLI directly (no separate server process).

Startup:
  1. Run a throwaway CLI call to load the TFLite model into the OS page cache.
  2. Mark _birdnet_ready once that completes.

Each /analyze request:
  - Saves uploaded audio to a temp file.
  - Calls `python -m birdnet_analyzer.analyze` via subprocess.
  - Parses the output CSV and returns detections.
"""

import csv
import logging
import os
import subprocess
import tempfile
import threading
import types

# tflite-runtime 2.14 removed the `experimental` sub-namespace that
# birdnet_analyzer uses (tflite.experimental.OpResolverType).
# Restore it as a shim so birdnet_analyzer can import without error.
try:
    import tflite_runtime.interpreter as _tflite_interp
    if not hasattr(_tflite_interp, 'experimental'):
        _exp = types.SimpleNamespace()
        if hasattr(_tflite_interp, 'OpResolverType'):
            _exp.OpResolverType = _tflite_interp.OpResolverType
        else:
            # Fallback: define the constant birdnet_analyzer actually uses
            _exp.OpResolverType = types.SimpleNamespace(BUILTIN_WITHOUT_DEFAULT_DELEGATES=1)
        _tflite_interp.experimental = _exp
except ImportError:
    pass  # tflite_runtime not installed; birdnet_analyzer will fall back to tensorflow

import httpx

from fastapi import FastAPI, Form, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

# Service tokens — set as environment variables on Render
INAT_TOKEN = os.environ.get("INAT_TOKEN", "")
EBIRD_API_KEY = os.environ.get("EBIRD_API_KEY", "")

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

PORT = int(os.environ.get("PORT", 8080))

app = FastAPI(title="BirdNET API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

_birdnet_ready = threading.Event()

# Detect which CLI entry-point works for this version of birdnet-analyzer
_CLI_MODULE: str | None = None


PATCH_SCRIPT = os.path.join(os.path.dirname(__file__), "birdnet_patch.py")


def _detect_cli() -> str | None:
    for module in ("birdnet_analyzer.analyze", "birdnet_analyzer"):
        r = subprocess.run(
            ["python", PATCH_SCRIPT, module, "--help"],
            capture_output=True, timeout=30,
        )
        if r.returncode == 0:
            log.info("BirdNET CLI: %s (via birdnet_patch.py)", module)
            return module
    return None


def _warm_up():
    global _CLI_MODULE
    log.info("Detecting birdnet_analyzer CLI…")
    _CLI_MODULE = _detect_cli()
    if _CLI_MODULE is None:
        log.error("birdnet_analyzer CLI not found — check installation")
        return

    # Mark ready immediately after CLI detection.
    # The first real /analyze request will be slow (model loads on demand),
    # but the app becomes available right away instead of hanging for minutes.
    log.info("BirdNET CLI detected (%s) — marking ready ✓", _CLI_MODULE)
    _birdnet_ready.set()


def _write_silent_wav(path: str, duration_s: int = 1, sample_rate: int = 48000):
    import struct
    n_samples = duration_s * sample_rate
    data_size = n_samples * 2
    with open(path, "wb") as f:
        f.write(b"RIFF")
        f.write(struct.pack("<I", 36 + data_size))
        f.write(b"WAVEfmt ")
        f.write(struct.pack("<IHHIIHH", 16, 1, 1, sample_rate,
                            sample_rate * 2, 2, 16))
        f.write(b"data")
        f.write(struct.pack("<I", data_size))
        f.write(b"\x00" * data_size)


def _run_analysis(audio_path, out_dir, lat, lon, week,
                  sensitivity, locale, min_conf=0.1,
                  timeout=120) -> dict[str, float]:
    cmd = [
        "python", PATCH_SCRIPT, _CLI_MODULE,
        audio_path,          # positional INPUT argument (no flag in newer versions)
        "--output", out_dir,
        "--lat", str(lat),
        "--lon", str(lon),
        "--week", str(week),
        "--sensitivity", str(sensitivity),
        "--locale", locale,
        "--min_conf", str(min_conf),
        "--rtype", "csv",
    ]
    log.info("Running: %s", " ".join(cmd))
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if result.returncode != 0:
        log.warning("birdnet returncode=%d stderr: %s", result.returncode, result.stderr[-800:])

    detections: dict[str, float] = {}
    for fname in os.listdir(out_dir):
        if not fname.endswith(".csv"):
            continue
        fpath = os.path.join(out_dir, fname)
        with open(fpath, newline="", encoding="utf-8") as f:
            sample = f.read(512)
            f.seek(0)
            delim = ";" if ";" in sample else ","
            for row in csv.DictReader(f, delimiter=delim):
                common = (row.get("Common name") or row.get("common_name") or "").strip()
                scientific = (row.get("Scientific name") or row.get("scientific_name") or "").strip()
                try:
                    conf = float(row.get("Confidence") or row.get("confidence") or 0)
                except ValueError:
                    continue
                if common and scientific and conf > 0:
                    key = f"{common}_{scientific}"
                    if key not in detections or conf > detections[key]:
                        detections[key] = conf
    return detections


@app.on_event("startup")
def startup():
    threading.Thread(target=_warm_up, daemon=True).start()


@app.get("/health")
def health():
    return JSONResponse(
        {"status": "ok", "birdnet_ready": _birdnet_ready.is_set()},
        headers={"Access-Control-Allow-Origin": "*"},
    )


@app.options("/{path:path}")
def options_handler(path: str):
    return Response(status_code=200, headers={
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
    })


@app.post("/analyze")
async def analyze(
    audio: UploadFile,
    lat: float = Form(-1),
    lon: float = Form(-1),
    week: int = Form(-1),
    sensitivity: float = Form(1.0),
    locale: str = Form("ru"),
):
    if not _birdnet_ready.is_set():
        return JSONResponse(
            {"msg": "Error", "detail": "BirdNET model not ready yet"},
            status_code=503,
            headers={"Access-Control-Allow-Origin": "*"},
        )

    audio_bytes = await audio.read()

    with tempfile.TemporaryDirectory() as tmpdir:
        audio_path = os.path.join(tmpdir, "input.wav")
        with open(audio_path, "wb") as f:
            f.write(audio_bytes)
        out_dir = os.path.join(tmpdir, "out")
        os.makedirs(out_dir)

        try:
            detections = _run_analysis(
                audio_path, out_dir,
                lat=lat, lon=lon, week=week,
                sensitivity=sensitivity, locale=locale,
                timeout=300,
            )
        except subprocess.TimeoutExpired:
            return JSONResponse(
                {"msg": "Error", "detail": "Analysis timed out"},
                status_code=504,
                headers={"Access-Control-Allow-Origin": "*"},
            )

    return JSONResponse(
        {"msg": "Success.", "results": {"detections": detections}},
        headers={"Access-Control-Allow-Origin": "*"},
    )


# ---------------------------------------------------------------------------
# iNaturalist Vision proxy — service token stays on the server
# ---------------------------------------------------------------------------

@app.post("/identify/image")
async def identify_image(
    image: UploadFile,
    lat: float = Form(None),
    lng: float = Form(None),
):
    if not INAT_TOKEN:
        return JSONResponse(
            {"error": "iNaturalist token not configured on server"},
            status_code=503,
            headers={"Access-Control-Allow-Origin": "*"},
        )
    image_bytes = await image.read()
    files = {"image": ("photo.jpg", image_bytes, "image/jpeg")}
    data: dict = {}
    if lat is not None:
        data["lat"] = str(lat)
    if lng is not None:
        data["lng"] = str(lng)
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.inaturalist.org/v1/computervision/score_image",
            headers={"Authorization": f"Bearer {INAT_TOKEN}"},
            files=files,
            data=data,
        )
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        media_type="application/json",
        headers={"Access-Control-Allow-Origin": "*"},
    )


# ---------------------------------------------------------------------------
# eBird proxy — service API key stays on the server
# ---------------------------------------------------------------------------

@app.get("/nearby")
async def nearby(
    lat: float = Query(...),
    lng: float = Query(...),
    dist: float = Query(25),
    back: int = Query(14),
):
    if not EBIRD_API_KEY:
        return JSONResponse(
            {"error": "eBird API key not configured on server"},
            status_code=503,
            headers={"Access-Control-Allow-Origin": "*"},
        )
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(
            "https://api.ebird.org/v2/data/obs/geo/recent",
            params={"lat": lat, "lng": lng, "dist": dist, "back": back, "maxResults": 100},
            headers={"X-eBirdApiToken": EBIRD_API_KEY},
        )
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        media_type="application/json",
        headers={"Access-Control-Allow-Origin": "*"},
    )


@app.get("/ebird/taxonomy")
async def ebird_taxonomy(species: str = Query(...)):
    if not EBIRD_API_KEY:
        return JSONResponse([], headers={"Access-Control-Allow-Origin": "*"})
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            "https://api.ebird.org/v2/ref/taxonomy/ebird",
            params={"species": species, "fmt": "json"},
            headers={"X-eBirdApiToken": EBIRD_API_KEY},
        )
    return Response(
        content=resp.content if resp.is_success else b"[]",
        status_code=200,
        media_type="application/json",
        headers={"Access-Control-Allow-Origin": "*"},
    )


@app.get("/ebird/spplist/{lat}/{lng}")
async def ebird_spplist(lat: float, lng: float, dist: float = Query(50)):
    if not EBIRD_API_KEY:
        return JSONResponse([], headers={"Access-Control-Allow-Origin": "*"})
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"https://api.ebird.org/v2/product/spplist/{lat:.2f}/{lng:.2f}",
            params={"dist": dist},
            headers={"X-eBirdApiToken": EBIRD_API_KEY},
        )
    return Response(
        content=resp.content if resp.is_success else b"[]",
        status_code=200,
        media_type="application/json",
        headers={"Access-Control-Allow-Origin": "*"},
    )
