from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import DATABASE_URL

engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=10, max_overflow=10)
# expire_on_commit: rows returned after a write are re-read from the database,
# like Prisma's create/update results — so they carry what Postgres actually
# stored (timestamp(0) rounding, server defaults) rather than in-memory values.
SessionLocal = sessionmaker(bind=engine, autoflush=True, expire_on_commit=True)


class Base(DeclarativeBase):
    pass


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        # Anything a handler didn't explicitly commit (e.g. it bailed out
        # with an error response) is discarded, never half-applied.
        db.rollback()
        db.close()
