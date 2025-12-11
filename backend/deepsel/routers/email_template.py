from typing import Optional

from pydantic import EmailStr, BaseModel
from sqlalchemy.orm import Session

from db import get_db
from deepsel.models.email_template import EmailTemplateModel
from deepsel.utils.crud_router import CRUDRouter
from deepsel.utils.generate_crud_schemas import generate_CRUD_schemas
from deepsel.utils.get_current_user import get_current_user
from fastapi import Depends, HTTPException, status

table_name = "email_template"
CRUDSchemas = generate_CRUD_schemas(table_name)

router = CRUDRouter(
    read_schema=CRUDSchemas.Read,
    search_schema=CRUDSchemas.Search,
    create_schema=CRUDSchemas.Create,
    update_schema=CRUDSchemas.Update,
    table_name=table_name,
    dependencies=[Depends(get_current_user)],
)


class EmailTemplateFindGoodConfigRequestSchema(BaseModel):
    test_recipient: EmailStr
    sleep_interval: Optional[float] = 0


@router.post("/util/find-good-config", response_model=dict)
async def find_good_config(
    request_payload: EmailTemplateFindGoodConfigRequestSchema,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    user_roles = user.get_user_roles()
    is_admin = any(
        [role.string_id in ["admin_role", "super_admin_role"] for role in user_roles]
    )

    if not is_admin:
        return HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this endpoint",
        )

    result = await EmailTemplateModel.find_good_config(
        db=db,
        test_recipient=request_payload.test_recipient,
        sleep_interval=request_payload.sleep_interval,
    )
    return {"result": result}
