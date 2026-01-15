from apps.deepsel.utils.crud_router import CRUDRouter
from apps.deepsel.utils.generate_crud_schemas import generate_CRUD_schemas
from apps.deepsel.utils.get_current_user import get_current_user
from fastapi import Depends

table_name = "openrouter_model"
CRUDSchemas = generate_CRUD_schemas(table_name)

router = CRUDRouter(
    read_schema=CRUDSchemas.Read,
    search_schema=CRUDSchemas.Search,
    create_schema=CRUDSchemas.Create,
    update_schema=CRUDSchemas.Update,
    table_name=table_name,
    create_route=False,
    update_route=False,
    delete_one_route=False,
    delete_all_route=False,
    dependencies=[Depends(get_current_user)],
)
