import logging

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from deepsel.orm.mixin import ORMBaseMixin as _ORMBaseMixin

logger = logging.getLogger(__name__)


class ORMBaseMixin(_ORMBaseMixin):
    """CMS-specific ORMBaseMixin with organization role logic."""

    @classmethod
    def _resolve_organization_on_create(cls, db: Session, user, values: dict) -> dict:
        """CMS-specific organization resolution with role-based checks."""
        if not hasattr(cls, "organization_id"):
            return values

        from apps.core.utils.models_pool import models_pool

        model = models_pool[cls.__tablename__]

        user_roles = user.get_user_roles()
        is_super = any([role.string_id == "super_admin_role" for role in user_roles])
        is_admin = any([role.string_id == "admin_role" for role in user_roles])
        is_website_admin = any(
            [role.string_id == "website_admin_role" for role in user_roles]
        )
        is_website_editor = any(
            [role.string_id == "website_editor_role" for role in user_roles]
        )
        is_website_author = any(
            [role.string_id == "website_author_role" for role in user_roles]
        )

        # For User model, handle both organization_id and organizations
        if model.__tablename__ == "user":
            # Only allow super_admin or admin to set organizations
            if "organizations" in values and not (
                is_super or is_admin or is_website_admin
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to set organizations",
                )
            # Only allow super_admin or admin to set roles
            if "roles" in values and not (is_super or is_admin or is_website_admin):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to set roles",
                )
            # Set default organization_id if not provided
            if not values.get("organization_id"):
                values["organization_id"] = user.organization_id
                logger.info(f"Set user default org to: {values['organization_id']}")
        else:
            # Check if this is a page/blog_post model and user has website roles
            can_set_organization = is_super or is_admin

            # For page and blog_post models, also allow website roles to set organization_id
            if model.__tablename__ in [
                "page",
                "blog_post",
                "page_content",
                "blog_post_content",
                "menu",
                "form",
                "template",
                "template_content",
            ]:
                can_set_organization = (
                    can_set_organization
                    or is_website_admin
                    or is_website_editor
                    or is_website_author
                )

            if can_set_organization:
                # User can set any organization_id, or use their own if none provided
                if not values.get("organization_id"):
                    values["organization_id"] = user.organization_id
                    logger.info(
                        f"Authorized user - set default org to: {values['organization_id']}"
                    )
                else:
                    logger.info(
                        f"Authorized user - keeping provided org: {values['organization_id']}"
                    )
            else:
                # Regular users can only create in their own organization
                original_org = values.get("organization_id")
                values["organization_id"] = user.organization_id
                logger.info(
                    f"Regular user - overrode org from {original_org} to {values['organization_id']}"
                )

        logger.info(f"Final organization_id: {values.get('organization_id')}")
        return values

    @classmethod
    def _check_model_write_permission(cls, instance, user) -> None:
        """For user table, only admin or super admin can update/delete."""
        tablename = instance.__tablename__ if instance else cls.__tablename__
        if tablename == "user":
            user.check_and_raise_if_not_admin_or_super_admin()
