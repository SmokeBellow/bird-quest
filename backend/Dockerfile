FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

# tensorflow-cpu provides a working TFLite runtime for birdnet-analyzer
RUN pip install --no-cache-dir tensorflow-cpu && \
    pip install --no-cache-dir -r requirements.txt

# Pre-download BirdNET model weights into the image layer
# (avoids 20-min cold-start download on every Render restart)
COPY download_model.py .
RUN python download_model.py

COPY app.py ./

ENV PORT=8080
EXPOSE 8080

CMD uvicorn app:app --host 0.0.0.0 --port ${PORT}
