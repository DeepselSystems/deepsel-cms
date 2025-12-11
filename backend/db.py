from constants import DATABASE_URL, DB_POOL_SIZE, DB_MAX_OVERFLOW
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base
from sqlalchemy.engine.base import Engine
from deepsel.utils.query import Query
from contextlib import contextmanager

engine: Engine = create_engine(
    DATABASE_URL, pool_size=DB_POOL_SIZE, max_overflow=DB_MAX_OVERFLOW
)
Base = declarative_base()


def get_db():
    db = Session(engine, query_cls=Query)
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context():
    db = Session(engine, query_cls=Query)
    try:
        yield db
    finally:
        db.close()
