from sqlalchemy import text
from sqlalchemy.orm import Session


def next_customer_code(db: Session) -> str:
    try:
        with db.begin_nested():
            db.execute(text("CREATE SEQUENCE IF NOT EXISTS customer_code_seq START 10000"))
    except Exception:
        pass  # already exists, or not permitted — nextval below still works
    n = db.execute(text("SELECT nextval('customer_code_seq')")).scalar_one()
    return f"SD{n}"
