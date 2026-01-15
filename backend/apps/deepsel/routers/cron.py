from apps.deepsel.utils.crud_router import CRUDRouter
from apps.deepsel.utils.generate_crud_schemas import generate_CRUD_schemas
from apps.deepsel.utils.get_current_user import get_current_user
from fastapi import Depends, HTTPException
from db import get_db
from sqlalchemy.orm import Session
from apps.deepsel.utils.models_pool import models_pool

table_name = "cron"
CRUDSchemas = generate_CRUD_schemas(table_name)
Model = models_pool[table_name]

router = CRUDRouter(
    read_schema=CRUDSchemas.Read,
    search_schema=CRUDSchemas.Search,
    create_schema=CRUDSchemas.Create,
    update_schema=CRUDSchemas.Update,
    table_name=table_name,
    dependencies=[Depends(get_current_user)],
)


@router.get("/execute/{id}")
async def execute_cron(
    id: int, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    cron = db.query(Model).get(id)
    if not cron:
        return HTTPException(status_code=404, detail="Cron not found")

    await cron.execute(db)

    return {"message": "Cron executed successfully!"}
