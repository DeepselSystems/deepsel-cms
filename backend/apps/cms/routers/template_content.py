from typing import Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db import get_db
from apps.deepsel.utils.crud_router import CRUDRouter
from apps.deepsel.utils.generate_crud_schemas import generate_CRUD_schemas
from apps.deepsel.utils.get_current_user import get_current_user
from fastapi import Depends, Body, HTTPException
from apps.cms.utils.render_wysiwyg_content import render_template_content
import logging
from traceback import print_exc

logger = logging.getLogger(__name__)
table_name = "template_content"
CRUDSchemas = generate_CRUD_schemas(table_name)

router = CRUDRouter(
    read_schema=CRUDSchemas.Read,
    search_schema=CRUDSchemas.Search,
    create_schema=CRUDSchemas.Create,
    update_schema=CRUDSchemas.Update,
    table_name=table_name,
    dependencies=[Depends(get_current_user)],
)


class RenderTemplateRequest(BaseModel):
    content: str
    name: str
    organization_id: int
    lang: Optional[str] = None


@router.post("/render")
def render_content(
    request: RenderTemplateRequest = Body(...),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Render template content using Jinja2 templating engine.
    """
    try:
        rendered_content = render_template_content(
            content=request.content,
            name=request.name,
            organization_id=request.organization_id,
            db=db,
            lang=request.lang,
            user=user,
        )
        return {"rendered_content": rendered_content}
    except Exception as e:
        logger.error(f"Error render template")
        print_exc()
        raise HTTPException(status_code=500, detail=str(e))
