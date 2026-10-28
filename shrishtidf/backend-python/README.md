# Shrishti Dairy API — Python (FastAPI)

Backend for the website, customer app, delivery app and admin panel.
Response JSON and auth tokens keep the format those clients were built
against (originally an Express + Prisma backend).

- FastAPI + SQLAlchemy 2 (sync) + psycopg2, on the existing Postgres schema
  (no migrations — the database is shared with/owned by the existing setup).
- JWTs (admin / staff / delivery boy) are HS256 with `JWT_SECRET`; passwords
  are bcrypt.
- JSON is encoded like Prisma + `JSON.stringify` (`app/core/serialize.py`):
  dates as `…T00:00:00.000Z`, decimals as strings, no `5.0` floats.

## Run locally

```bash
cd shrishtidf/backend-python
python -m venv .venv
.venv\Scripts\activate            # Windows  (Linux/macOS: source .venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env            # then fill in DATABASE_URL, JWT_SECRET, Razorpay keys
python -m app.main                # or: uvicorn app.main:app --reload --port 5555
```

`/docs` shows the interactive API docs when `NODE_ENV` is not `production`.
Create the default admin with `python -m scripts.seed_admin`.

## Docker

- `../docker-compose.yml` builds this folder as the `backend` service, the one backend for
  everything: the website, browser app and delivery app reach it through the gateway nginx, and the
  phone app, admin panel and ERP through `erp.shrishtidairyfarm.com/api` (port 3050).
  Its settings come from `.env` here (DATABASE_URL, JWT_SECRET, Razorpay keys).

## Layout

- `app/main.py` — app setup, middleware, router registration
- `app/models.py`, `app/db.py` — SQLAlchemy models and session
- `app/core/` — auth & rate limits (`security.py`), access-control catalog,
  JSON encoding (`serialize.py`), response helpers (`http.py`), dates
- `app/services/` — cart, checkout, products, customer auth, subscriptions,
  cut-off time, Razorpay, activity log
- `app/routers/` — `/api/v1` (website, customer app, delivery app)
- `app/routers/admin/` — `/api/admin` (admin panel)

The database and ERP admin panel containers are defined in
`../infra/docker-compose.yml`.
