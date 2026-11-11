# syntax=docker/dockerfile:1

FROM python:3.12-slim

RUN groupadd --system --gid 1000 agent \
    && useradd --system --uid 1000 --gid agent --create-home agent

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY bridge.py ./
COPY workspace/ /app/workspace/
RUN mkdir -p /app/config && chown -R agent:agent /app

USER agent
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD ["python", "-c", "import urllib.request, sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4).status == 200 else 1)"]

# Reload the mounted config volume on every restart; env vars come from compose.
CMD ["uvicorn", "bridge:app", "--host", "0.0.0.0", "--port", "8000"]
