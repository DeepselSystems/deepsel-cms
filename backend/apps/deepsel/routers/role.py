from apps.deepsel.utils.crud_router import CRUDRouter
from apps.deepsel.utils.models_pool import models_pool
from apps.deepsel.utils.generate_crud_schemas import (
    generate_CRUD_schemas,
    generate_search_schema,
)
from apps.deepsel.utils.get_current_user import get_current_user
from fastapi import Depends

table_name = "role"
CRUDSchemas = generate_CRUD_schemas(table_name)
Model = models_pool[table_name]


class ReadSchema(CRUDSchemas.Read):
    implied_roles: list[CRUDSchemas.Read] = (
        []
    )  # This is skipped by the generator to avoid infinite recursion


SearchSchema = generate_search_schema(Model, ReadSchema)

router = CRUDRouter(
    read_schema=ReadSchema,
    search_schema=SearchSchema,
    create_schema=CRUDSchemas.Create,
    update_schema=CRUDSchemas.Update,
    table_name=table_name,
    dependencies=[Depends(get_current_user)],
)
