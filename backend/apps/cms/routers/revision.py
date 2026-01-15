import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db import get_db
from apps.deepsel.utils.models_pool import models_pool
from apps.deepsel.utils.get_current_user import get_current_user
from apps.deepsel.models.user import UserModel
from apps.deepsel.mixins.orm import PermissionAction
from apps.deepsel.utils.api_router import create_api_router

logger = logging.getLogger(__name__)

router = create_api_router("revision", tags=["Content Revision"])


class RestoreRequest(BaseModel):
    content_type: str  # "page_content" or "blog_post_content"
    content_id: int
    revision_id: int


@router.post("/restore")
async def restore_content_revision(
    restore_request: RestoreRequest,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):

    content_type = restore_request.content_type
    content_id = restore_request.content_id
    revision_id = restore_request.revision_id

    # Get the appropriate models
    if content_type == "page_content":
        ContentModel = models_pool["page_content"]
        RevisionModel = models_pool["page_content_revision"]
        content_field = "page_content_id"
    elif content_type == "blog_post_content":
        ContentModel = models_pool["blog_post_content"]
        RevisionModel = models_pool["blog_post_content_revision"]
        content_field = "blog_post_content_id"
    else:
        raise HTTPException(status_code=400, detail="Invalid content_type")

    # Get the content record
    content = db.query(ContentModel).filter(ContentModel.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    # Check permissions
    [allowed, _] = content._check_has_permission(PermissionAction.write, user)
    if not allowed:
        raise HTTPException(status_code=403, detail="Permission denied")

    # Get the revision
    revision = (
        db.query(RevisionModel)
        .filter(
            RevisionModel.id == revision_id,
            getattr(RevisionModel, content_field) == content_id,
        )
        .first()
    )
    if not revision:
        raise HTTPException(status_code=404, detail="Revision not found")

    # Restore the content to the old_content of the revision
    if content_type == "page_content":
        # For page_content, reconstruct the JSON structure
        restored_content = (
            {
                "main": {
                    "ds-label": "Content",
                    "ds-type": "wysiwyg",
                    "ds-value": revision.old_content,
                }
            }
            if revision.old_content
            else None
        )
    else:
        # For blog_post_content, content is plain text
        restored_content = revision.old_content

    content.update(db, user, {"content": restored_content})

    # Update the last revision name to indicate it was a restore
    last_revision = (
        db.query(RevisionModel)
        .filter(getattr(RevisionModel, content_field) == content_id)
        .order_by(RevisionModel.created_at.desc())
        .first()
    )

    if last_revision:
        last_revision.name = f"Restored from revision #{revision.revision_number} by {user.username or user.email or 'system'}"
        db.commit()

    return {"message": "Content restored successfully"}
