from fastapi import Depends
from apps.deepsel.utils.crud_router import CRUDRouter
from apps.deepsel.utils.get_current_user import get_current_user
from apps.deepsel.utils.generate_crud_schemas import generate_CRUD_schemas
from apps.deepsel.utils.models_pool import models_pool

table_name = "activity"
CRUDSchemas = generate_CRUD_schemas(table_name)
UserModel = models_pool["user"]

router = CRUDRouter(
    read_schema=CRUDSchemas.Read,
    search_schema=CRUDSchemas.Search,
    create_route=True,
    update_route=False,
    table_name=table_name,
    dependencies=[Depends(get_current_user)],
)
