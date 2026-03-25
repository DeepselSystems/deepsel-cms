from deepsel.utils.crud_router import CRUDRouter
from deepsel.utils.generate_crud_schemas import generate_CRUD_schemas
from apps.core.utils.get_current_user import get_current_user
from fastapi import Depends
from apps.core.schemas.organization import ReadSchema, CreateSchema

table_name = "organization"
CRUDSchemas = generate_CRUD_schemas(table_name)

router = CRUDRouter(
    read_schema=ReadSchema,
    search_schema=CRUDSchemas.Search,
    create_schema=CreateSchema,
    update_schema=CRUDSchemas.Update,
    table_name=table_name,
    dependencies=[Depends(get_current_user)],
    export_route=False,
    import_route=False,
)
