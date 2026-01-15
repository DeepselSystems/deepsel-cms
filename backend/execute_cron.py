from contextlib import contextmanager
from constants import DATABASE_URL
import psycopg2
from apps.deepsel.utils.models_pool import models_pool
from db import get_db_context
import logging
import os
from datetime import datetime, UTC
import asyncio

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(levelname)s:     [%(asctime)s] %(name)s %(message)s",
    datefmt="%d-%m-%Y %H:%M:%S",
)
logger = logging.getLogger("CRON")


@contextmanager
def get_connection():
    conn = psycopg2.connect(DATABASE_URL)
    try:
        yield conn
    finally:
        conn.close()


@contextmanager
def get_cursor(commit=False):
    with get_connection() as connection:
        cursor = connection.cursor()
        try:
            yield cursor
            if commit:
                connection.commit()
        finally:
            cursor.close()


def obtain_lock(lock_id: int):
    with get_cursor(commit=True) as cursor:
        cursor.execute("SELECT pg_try_advisory_lock(%s);", (lock_id,))
        (obtained,) = cursor.fetchone()
        return obtained


async def main():
    with get_db_context() as db:
        CronModel = models_pool["cron"]
        crons = (
            db.query(CronModel)
            .filter(
                CronModel.enabled == True,
                CronModel.active == True,
                CronModel.next_run <= datetime.now(UTC),
            )
            .all()
        )
        for cron in crons:
            if obtain_lock(cron.id):
                try:
                    logger.info(f"Executing cron: {cron.name}")
                    await cron.execute(db)
                finally:
                    with get_cursor(commit=True) as cursor:
                        cursor.execute("SELECT pg_advisory_unlock(%s);", (cron.id,))
            else:
                logger.warning(
                    f"Could not obtain lock for cron: {cron.name}, another instance maybe running"
                )


if __name__ == "__main__":
    asyncio.run(main())
