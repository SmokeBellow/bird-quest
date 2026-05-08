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

from fastapi import FastAPI, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

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


def _detect_cli() -> str | None:
    for module in ("birdnet_analyzer.analyze", "birdnet_analyzer"):
        r = subprocess.run(
            ["python", "-m", module, "--help"],
            capture_output=True, timeout=30,
        )
        if r.returncode == 0:
            log.info("BirdNET CLI: python -m %s", module)
            return module
    return None


def _warm_up():
    global _CLI_MODULE
    log.info("Detecting birdnet_analyzer CLI…")
    _CLI_MODULE = _detect_cli()
    if _CLI_MODULE is None:
        log.error("birdnet_analyzer CLI not found — check installation")
        return

    log.info("Warming up model (first run downloads weights if needed)…")
    with tempfile.TemporaryDirectory() as tmpdir:
        # 1-second silent WAV — just enough to trigger model load
        silent_wav = os.path.join(tmpdir, "silent.wav")
        _write_silent_wav(silent_wav, duration_s=1)
        out_dir = os.path.join(tmpdir, "out")
        os.makedirs(out_dir)
        _run_analysis(silent_wav, out_dir, lat=-1, lon=-1, week=-1,
                      sensitivity=1.0, locale="en", min_conf=0.01)

    log.info("BirdNET model ready ✓")
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
                  sensitivity, locale, min_conf=0.1) -> dict[str, float]:
    cmd = [
        "python", "-m", _CLI_MODULE,
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
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
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
