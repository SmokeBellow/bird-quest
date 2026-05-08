FROM python:3.11-slim

# ffmpeg is required by birdnet_analyzer to decode audio formats
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
# Install CPU-only TensorFlow to keep image size reasonable
RUN pip install --no-cache-dir tensorflow-cpu && \
    pip install --no-cache-dir -r requirements.txt

COPY app.py .

# Render injects $PORT; default to 8080 for local use
ENV PORT=8080
EXPOSE 8080

CMD uvicorn app:app --host 0.0.0.0 --port ${PORT}
