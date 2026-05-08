FROM python:3.10-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

# tflite-runtime 2.13 is ~5 MB vs tensorflow-cpu ~500 MB.
# Python 3.10 required: tflite-runtime 2.14 (py3.11 only) removed
# the `experimental` namespace that birdnet-analyzer depends on.
RUN pip install --no-cache-dir "tflite-runtime==2.13.0" && \
    pip install --no-cache-dir -r requirements.txt

COPY app.py .

ENV PORT=8080
EXPOSE 8080

CMD uvicorn app:app --host 0.0.0.0 --port ${PORT}
