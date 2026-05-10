FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

# tflite-runtime standalone is incompatible with birdnet-analyzer model format.
# tensorflow-cpu includes a working TFLite runtime; birdnet-analyzer falls back
# to `from tensorflow import lite as tflite` when tflite-runtime is absent.
RUN pip install --no-cache-dir tensorflow-cpu && \
    pip install --no-cache-dir -r requirements.txt

COPY app.py birdnet_patch.py download_model.py ./

# Pre-download BirdNET model weights into the image so the container
# doesn't need outbound access to tuc.cloud at runtime.
RUN python download_model.py

ENV PORT=8080
EXPOSE 8080

CMD uvicorn app:app --host 0.0.0.0 --port ${PORT}
