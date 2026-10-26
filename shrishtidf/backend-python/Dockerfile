FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# nginx proxies /api/ to backend:5555.
ENV PORT=5555
EXPOSE 5555

# --proxy-headers: behind nginx, take the client IP from X-Forwarded-For so the
# OTP/login rate limits apply per customer rather than to the proxy's IP.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*'"]
