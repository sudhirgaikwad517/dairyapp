"""Creates the default super-admin if it doesn't exist yet.

    python -m scripts.seed_admin


"""
import uuid

from sqlalchemy import select

from app import models as m
from app.core.security import hash_password
from app.db import SessionLocal

EMAIL = "admin@dairyapp.com"
PASSWORD = "password123"


def main() -> None:
    with SessionLocal() as db:
        if db.scalar(select(m.admin_users).where(m.admin_users.email == EMAIL)):
            print(f"Admin already exists. Email: {EMAIL}, Password: (hashed)")
            return
        db.add(m.admin_users(id=str(uuid.uuid4()), name="Super Admin", email=EMAIL, password=hash_password(PASSWORD)))
        db.commit()
        print(f"Created new Admin. Email: {EMAIL}, Password: {PASSWORD}")


if __name__ == "__main__":
    main()
