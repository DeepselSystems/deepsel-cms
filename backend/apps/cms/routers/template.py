import logging
from deepsel.utils.crud_router import CRUDRouter
from deepsel.utils.generate_crud_schemas import generate_CRUD_schemas
from deepsel.utils.get_current_user import get_current_user
from fastapi import Depends, Response
from apps.cms.utils.build_jsx import build_jsx
from deepsel.utils.models_pool import models_pool
from db import get_db
from sqlalchemy.orm import Session
from fastapi import HTTPException
from pydantic import BaseModel


logger = logging.getLogger(__name__)

table_name = "template"
CRUDSchemas = generate_CRUD_schemas(table_name)

router = CRUDRouter(
    read_schema=CRUDSchemas.Read,
    search_schema=CRUDSchemas.Search,
    create_schema=CRUDSchemas.Create,
    update_schema=CRUDSchemas.Update,
    table_name=table_name,
    dependencies=[Depends(get_current_user)],
)


class CompileReactRequest(BaseModel):
    jsx_code: str
    component_name: str | None = None


@router.post("/compile-react")
def compile_react_on_the_fly(
    request: CompileReactRequest, current_user=Depends(get_current_user)
):
    """
    Compile React/JSX code on-the-fly and return the compiled JavaScript.

    This endpoint accepts JSX code and returns the compiled JavaScript code
    that can be executed in the browser.
    """
    try:
        compiled_code = build_jsx(request.jsx_code, request.component_name)
        return {"compiled_code": compiled_code, "success": True}
    except HTTPException:
        # Re-raise HTTPExceptions from build_jsx (compilation errors)
        raise
    except Exception as e:
        logger.error(f"Unexpected error during React compilation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Compilation failed: {str(e)}")
