#!/usr/bin/env python3
"""
Pre-download BirdNET model weights during Docker build.
Runs with retries so a single timeout doesn't fail the build.
"""
import sys
import time

MAX_ATTEMPTS = 3

for attempt in range(1, MAX_ATTEMPTS + 1):
    try:
        print(f"[{attempt}/{MAX_ATTEMPTS}] Downloading BirdNET model from tuc.cloud…")
        # Importing this triggers ensure_model_exists() which downloads the weights
        from birdnet_analyzer.utils import ensure_model_exists  # noqa: E402
        ensure_model_exists(check_perch=False)
        print("BirdNET model downloaded successfully ✓")
        sys.exit(0)
    except Exception as exc:
        print(f"Attempt {attempt} failed: {exc}", file=sys.stderr)
        if attempt < MAX_ATTEMPTS:
            time.sleep(10)

print("WARNING: model download failed — it will retry at container startup.", file=sys.stderr)
sys.exit(0)   # don't fail the build; runtime will retry
