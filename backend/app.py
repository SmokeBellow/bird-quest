"""
BirdNET API — loads the BirdNET model ONCE at startup using the
birdnet_analyzer Python API directly (no subprocess per request).

First /analyze after cold start: slow (model loads into memory).
Every subsequent request: fast (model already in RAM).
"""

import csv
import logging
import os
import tempfile
import threading
import types

# ── 1. Patch tflite_runtime BEFORE any birdnet_analyzer import ────────────────
try:
    import tflite_runtime.interpreter as _tflite
    if not hasattr(_tflite, 'experimental'):
        _tflite.experimental = types.SimpleNamespace(
            OpResolverType=getattr(
                _tflite, 'OpResolverType',
                types.SimpleNamespace(BUILTIN_WITHOUT_DEFAULT_DELEGATES=1)
            )
        )
except ImportError:
    pass  # tensorflow-cpu is used instead — no patch needed

import httpx
from fastapi import FastAPI, Form, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

PORT = int(os.environ.get("PORT", 8080))
INAT_TOKEN = os.environ.get("INAT_TOKEN", "")
EBIRD_API_KEY = os.environ.get("EBIRD_API_KEY", "")

app = FastAPI(title="BirdNET API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

_birdnet_ready = threading.Event()
_analyze_lock = threading.Lock()  # birdnet_analyzer is not thread-safe


# ── 2. Import birdnet_analyzer at module level (triggers one-time setup) ──────
try:
    from birdnet_analyzer import analyze as _ba_analyze
    _BIRDNET_AVAILABLE = True
except Exception as e:
    log.error("Failed to import birdnet_analyzer: %s", e)
    _BIRDNET_AVAILABLE = False


def _warm_up():
    """Mark BirdNET as ready immediately — model loads lazily on first /analyze call."""
    if not _BIRDNET_AVAILABLE:
        return
    log.info("BirdNET available — model will load on first analysis request ✓")
    _birdnet_ready.set()

    _birdnet_ready.set()


def _parse_detections(out_dir: str) -> dict[str, float]:
    """Read detection CSVs written by birdnet_analyzer and return {label: confidence}."""
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
                # birdnet_analyzer v2.4 columns: Common name, Scientific name, Confidence
                common = (
                    row.get("Common name") or row.get("common_name")
                    or row.get("species_name") or ""
                ).strip()
                scientific = (
                    row.get("Scientific name") or row.get("scientific_name") or ""
                ).strip()
                try:
                    conf = float(row.get("Confidence") or row.get("confidence") or 0)
                except ValueError:
                    continue
                if common and conf > 0:
                    label = f"{common}_{scientific}" if scientific else common
                    if label not in detections or conf > detections[label]:
                        detections[label] = conf
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
            with _analyze_lock:
                _ba_analyze(
                    audio_input=audio_path,
                    output=out_dir,
                    lat=lat if lat != -1 else None,
                    lon=lon if lon != -1 else None,
                    week=week if week != -1 else None,
                    sensitivity=sensitivity,
                    locale=locale,
                    min_conf=0.1,
                    rtype="csv",
                )
        except Exception as e:
            log.exception("BirdNET analysis error: %s", e)
            return JSONResponse(
                {"msg": "Error", "detail": str(e)},
                status_code=500,
                headers={"Access-Control-Allow-Origin": "*"},
            )

        detections = _parse_detections(out_dir)

    return JSONResponse(
        {"msg": "Success.", "results": {"detections": detections}},
        headers={"Access-Control-Allow-Origin": "*"},
    )


# ── iNaturalist Vision proxy ──────────────────────────────────────────────────

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


# ── eBird / iNaturalist nearby proxy ─────────────────────────────────────────

@app.get("/nearby")
async def nearby(
    lat: float = Query(...),
    lng: float = Query(...),
    dist: float = Query(25),
):
    headers = {}
    if INAT_TOKEN:
        headers["Authorization"] = f"Bearer {INAT_TOKEN}"

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(
            "https://api.inaturalist.org/v1/observations",
            params={
                "taxon_id": 3,
                "lat": lat,
                "lng": lng,
                "radius": dist,
                "per_page": 100,
                "order_by": "observed_on",
                "order": "desc",
                "quality_grade": "research,needs_id",
            },
            headers=headers,
        )

    if not resp.is_success:
        return JSONResponse(
            [],
            status_code=resp.status_code,
            headers={"Access-Control-Allow-Origin": "*"},
        )

    seen: set[int] = set()
    results = []
    for obs in resp.json().get("results", []):
        taxon = obs.get("taxon")
        if not taxon:
            continue
        tid = taxon.get("id")
        if tid in seen:
            continue
        seen.add(tid)
        photo = taxon.get("default_photo") or {}
        results.append({
            "speciesCode": str(tid),
            "comName": taxon.get("preferred_common_name") or taxon.get("name", ""),
            "sciName": taxon.get("name", ""),
            "obsDt": obs.get("observed_on", ""),
            "thumbnailUrl": photo.get("square_url"),
        })

    return JSONResponse(results, headers={"Access-Control-Allow-Origin": "*"})
