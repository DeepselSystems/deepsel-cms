from deepsel.utils.crud_router import CRUDRouter
from apps.core.utils.get_current_user import get_current_user
from apps.core.schemas.role import RoleRead, RoleCreate, RoleUpdate, RoleSearch
from fastapi import Depends

table_name = "role"

router = CRUDRouter(
    read_schema=RoleRead,
    search_schema=RoleSearch,
    create_schema=RoleCreate,
    update_schema=RoleUpdate,
    table_name=table_name,
    dependencies=[Depends(get_current_user)],
)
