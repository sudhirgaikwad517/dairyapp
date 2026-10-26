"""FastAPI entry point for the Shrishti Dairy API.

Serves the website, the customer app, the delivery app and the admin panel.
Response shapes and auth tokens are what those clients were built against
(originally an Express + Prisma backend), so keep them stable.
"""
import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import CORS_ORIGINS, IS_PRODUCTION, PORT, UPLOADS_DIR
from .core.http import Abort, respond
from .routers import account, catalog, customer_auth, delivery, shop
from .routers.admin import (
    access_control,
    areas,
    auth as admin_auth,
    catalog as admin_catalog,
    content,
    customers,
    deliveries,
    feedback,
    logistics,
    masters,
    notifications,
    orders,
    products,
    reports,
    settings,
    stats,
    subscriptions,
    vacations_billing,
    wallet,
)
from .routers.admin.common import AuthUser as AdminAuth

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("app")

app = FastAPI(
    title="Shrishti Dairy API",
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None,
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
)

# Security headers as defense-in-depth — the same set helmet() sent. This API
# is consumed by three frontends over CORS, so cross-origin isolation policies
# stay off; CSP is scoped to what the one HTML page served here (the printable
# invoice) needs.
SECURITY_HEADERS = {
    "Content-Security-Policy": (
        "default-src 'self';script-src 'self' 'unsafe-inline';style-src 'self' 'unsafe-inline';"
        "img-src 'self' data:;object-src 'none';frame-ancestors 'none';base-uri 'self';"
        "font-src 'self' https: data:;form-action 'self';script-src-attr 'none';upgrade-insecure-requests"
    ),
    "Cross-Origin-Opener-Policy": "same-origin",
    "Origin-Agent-Cluster": "?1",
    "Referrer-Policy": "no-referrer",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-DNS-Prefetch-Control": "off",
    "X-Download-Options": "noopen",
    "X-Frame-Options": "SAMEORIGIN",
    "X-Permitted-Cross-Domain-Policies": "none",
    "X-XSS-Protection": "0",
}
DOCS_PATHS = ("/docs", "/openapi.json")


@app.middleware("http")
async def request_logger(request: Request, call_next):
    """Tags every request with a short correlation id (also sent back as
    `X-Request-Id`, so a client-reported bug can be matched to server logs)
    and logs one line per request: method, path, status, duration."""
    request_id = uuid.uuid4().hex[:8]
    request.state.request_id = request_id
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("[%s] Unhandled error on %s %s", request_id, request.method, request.url.path)
        response = respond({"success": False, "message": "Internal Server Error", "requestId": request_id}, 500)

    response.headers["X-Request-Id"] = request_id
    if not request.url.path.startswith(DOCS_PATHS):
        for name, value in SECURITY_HEADERS.items():
            response.headers.setdefault(name, value)

    duration = int((time.perf_counter() - start) * 1000)
    path = request.url.path + (f"?{request.url.query}" if request.url.query else "")
    line = f"[{request_id}] {request.method} {path} -> {response.status_code} ({duration}ms)"
    if response.status_code >= 500:
        logger.error(line)
    elif response.status_code >= 400:
        logger.warning(line)
    else:
        logger.info(line)
    return response


# CORS_ORIGIN is a comma-separated allow-list for production. Left unset,
# every origin is allowed — the permissive behaviour this API always had —
# so local development works without extra setup.
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS or ["*"],
    allow_methods=["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    allow_headers=["*"],
)


@app.exception_handler(Abort)
async def abort_handler(request: Request, exc: Abort):
    """Dependencies (auth, rate limits, body parsing) short-circuit with a ready response."""
    return exc.response


# Admin-uploaded files (splash/login images, ...).
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")


@app.get("/health")
def health():
    return respond({"status": "ok", "message": "Python FastAPI backend is running"})


# ---- /api/v1 — website, customer app, delivery app ---------------------------------
for router in (catalog.router, customer_auth.router, shop.router, account.router, delivery.router):
    app.include_router(router, prefix="/api/v1")

# ---- /api/admin — admin panel -------------------------------------------------------
# Login routes are public; everything else requires a valid admin or staff session.
app.include_router(admin_auth.public_router, prefix="/api/admin")
for router in (
    admin_auth.router,
    stats.router,
    orders.router,
    products.router,
    admin_catalog.router,
    customers.router,
    subscriptions.router,
    reports.router,
    wallet.router,
    vacations_billing.router,
    logistics.router,
    areas.router,
    deliveries.router,
    settings.router,
    masters.router,
    feedback.router,
    notifications.router,
    access_control.router,
    content.router,
):
    app.include_router(router, prefix="/api/admin", dependencies=[AdminAuth])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=PORT, proxy_headers=True, forwarded_allow_ips="*")
