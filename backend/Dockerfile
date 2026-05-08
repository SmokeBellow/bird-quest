FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

# tflite-runtime is ~5 MB vs tensorflow-cpu ~500 MB — fits in 512 MB free tier
RUN pip install --no-cache-dir tflite-runtime && \
    pip install --no-cache-dir -r requirements.txt

COPY app.py .

# Pre-download BirdNET model weights into the image layer so the container
# starts without needing to fetch them at runtime (avoids 120s timeout).
RUN python -c "\
import tempfile, os, subprocess, sys, struct; \
\
def wav(p): \
    n=48000; d=n*2; \
    open(p,'wb').write(b'RIFF'+__import__('struct').pack('<I',36+d)+b'WAVEfmt '+__import__('struct').pack('<IHHIIHH',16,1,1,48000,96000,2,16)+b'data'+__import__('struct').pack('<I',d)+b'\x00'*d) \
; \
\
mod=next((m for m in ('birdnet_analyzer.analyze','birdnet_analyzer') \
    if subprocess.run(['python','-m',m,'--help'],capture_output=True,timeout=30).returncode==0),None); \
mod or (print('WARNING: birdnet_analyzer not found',file=sys.stderr) or sys.exit(0)); \
\
import tempfile; d=tempfile.mkdtemp(); w=d+'/s.wav'; o=d+'/out'; os.makedirs(o); wav(w); \
r=subprocess.run(['python','-m',mod,w,'--output',o,'--lat','-1','--lon','-1','--week','-1','--sensitivity','1.0','--locale','en','--min_conf','0.01','--rtype','csv'],capture_output=True,text=True,timeout=300); \
print('BirdNET model pre-downloaded ✓') if r.returncode==0 else print('pre-download stderr:',r.stderr[-300:],file=sys.stderr) \
"

ENV PORT=8080
EXPOSE 8080

CMD uvicorn app:app --host 0.0.0.0 --port ${PORT}
