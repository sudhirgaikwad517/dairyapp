import os
from pathlib import Path
from urllib.parse import unquote

from dotenv import load_dotenv
from sqlalchemy.engine import URL

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

PORT = int(os.getenv("PORT") or 5000)

def _sqlalchemy_url(raw: str) -> URL:
    """Parses the same DATABASE_URL the Node backend used.

    Prisma-style URLs carry a `?schema=public` param libpq rejects, and the
    deployed URL has an unescaped `@` in its password (`Root@123`) — node-pg
    splits user info on the *last* `@`, so this does too rather than relying
    on SQLAlchemy's stricter parser.
    """
    if not raw:
        raise RuntimeError("DATABASE_URL environment variable must be set.")
    scheme, rest = raw.split("://", 1)
    rest, _, query = rest.partition("?")
    params = dict(p.split("=", 1) for p in query.split("&") if "=" in p)
    params.pop("schema", None)

    userinfo, _, hostpart = rest.rpartition("@")
    username, _, password = userinfo.partition(":")
    hostport, _, database = hostpart.partition("/")
    host, _, port = hostport.partition(":")

    return URL.create(
        "postgresql+psycopg2",
        username=unquote(username) or None,
        password=unquote(password) or None,
        host=host or None,
        port=int(port) if port else None,
        database=database or None,
        query=params,
    )


DATABASE_URL = _sqlalchemy_url(os.getenv("DATABASE_URL", ""))

# Validated at boot rather than silently falling back to a public, hardcoded
# secret — a missing env var must never let anyone forge a valid session token.
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET environment variable must be set — refusing to start with an insecure default.")

NODE_ENV = os.getenv("NODE_ENV") or os.getenv("APP_ENV") or "development"
IS_PRODUCTION = NODE_ENV == "production"

CORS_ORIGINS = [o.strip() for o in (os.getenv("CORS_ORIGIN") or "").split(",") if o.strip()]

UPLOADS_DIR = Path(os.getenv("UPLOADS_DIR") or (BASE_DIR / "uploads"))
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
