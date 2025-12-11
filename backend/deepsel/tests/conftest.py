import pytest
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine.base import Engine
from sqlalchemy import create_engine
from constants import DATABASE_URL
from main import app as fastapi_app
from fastapi.testclient import TestClient


engine: Engine = create_engine(DATABASE_URL)


@pytest.fixture(scope="function")
def db():
    connection = engine.connect()
    transaction = connection.begin()
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal(bind=connection)
    try:
        yield session
    finally:
        # Rollback the transaction and close the connection
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture(scope="function")
def app():
    with TestClient(fastapi_app) as client:
        yield client
