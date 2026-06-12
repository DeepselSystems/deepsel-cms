import logging
from typing import Optional
from fastapi import Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db import get_db
from apps.core.utils.models_pool import models_pool
from apps.core.utils.get_current_user import get_current_user
from apps.core.models.user import UserModel
from deepsel.orm import PermissionAction
from deepsel.utils.api_router import create_api_router

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

    # Snapshot the current live content before overwriting it
    old_content_text = content.content

    # Restore: set live content to the chosen revision's published snapshot, clear any draft
    content.update(db, user, {"content": revision.new_content, "draft_content": None})

    # Create a new revision that records the restore as an auditable event.
    # old_content = what was live just before the restore
    # new_content = what is now live (= the restored snapshot)
    revision_count = (
        db.query(RevisionModel)
        .filter(getattr(RevisionModel, content_field) == content_id)
        .count()
    )
    RevisionModel.create(
        db,
        user,
        {
            content_field: content_id,
            "old_content": old_content_text,
            "new_content": revision.new_content,
            "name": f"Restored from revision #{revision.revision_number} by {user.email or user.username or 'system'}",
            "revision_number": revision_count + 1,
        },
    )

    return {"message": "Content restored successfully"}


class NameRevisionRequest(BaseModel):
    content_type: str  # "page_content" or "blog_post_content"
    revision_id: int
    name: Optional[str] = None  # None = clear the name


@router.post("/name")
async def name_content_revision(
    name_request: NameRevisionRequest,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user),
):
    content_type = name_request.content_type
    revision_id = name_request.revision_id
    name = name_request.name

    if content_type == "page_content":
        RevisionModel = models_pool["page_content_revision"]
        ContentModel = models_pool["page_content"]
        content_field = "page_content_id"
    elif content_type == "blog_post_content":
        RevisionModel = models_pool["blog_post_content_revision"]
        ContentModel = models_pool["blog_post_content"]
        content_field = "blog_post_content_id"
    else:
        raise HTTPException(status_code=400, detail="Invalid content_type")

    revision = db.query(RevisionModel).filter(RevisionModel.id == revision_id).first()
    if not revision:
        raise HTTPException(status_code=404, detail="Revision not found")

    content_id = getattr(revision, content_field)
    content = db.query(ContentModel).filter(ContentModel.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    [allowed, _] = content._check_has_permission(PermissionAction.write, user)
    if not allowed:
        raise HTTPException(status_code=403, detail="Permission denied")

    revision.name = name
    db.commit()

    return {"message": "Revision name updated successfully"}
