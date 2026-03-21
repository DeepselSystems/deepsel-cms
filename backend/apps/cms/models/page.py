from sqlalchemy import Column, Integer, Boolean, Text

from apps.cms.utils.page_content import (
    check_page_content_slug_with_conflict,
    generate_slug_from_title,
)
from db import Base
from apps.core.mixins.base_model import BaseModel
from apps.core.mixins.activity import ActivityMixin
from deepsel.orm import (
    PAGINATION,
    SearchQuery,
    OrderByCriteria,
    SearchCriteria,
)
from apps.core.models.user import UserModel
from sqlalchemy.orm import relationship, Session
from fastapi import HTTPException, status
from typing import Optional


class PageModel(Base, ActivityMixin, BaseModel):
    __tablename__ = "page"
    __tracked_fields__ = ["published"]

    id = Column(Integer, primary_key=True)
    published = Column(Boolean, default=False)

    # if True, this page has a fixed path in the frontend router
    # the content slugs in the page_content table are ignored
    # frontend will load the page_content JSON data for use in i18n
    is_frontend_page = Column(Boolean, default=False)

    is_homepage = Column(Boolean, default=False)

    # Require login to view page content
    require_login = Column(Boolean, default=False)

    # Custom code field for all languages
    page_custom_code = Column(Text, nullable=True)

    contents = relationship("PageContentModel", back_populates="page")

    @classmethod
    def get_one(
        cls, db: Session, user: UserModel, item_id: int, *args, **kwargs
    ) -> "PageModel":
        res = db.query(cls).get(item_id)
        # check if user is public user
        # if yes filter by published=True
        if user.is_public_user():
            if not res.published:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Item not found",
                )
        return res

    @classmethod
    def search(
        cls,
        db: Session,
        user: UserModel,
        pagination: PAGINATION,
        search: Optional[SearchQuery] = None,
        order_by: Optional[OrderByCriteria] = None,
        *args,
        **kwargs,
    ):
        # check if user is public user
        # if yes filter by published=True
        if user.is_public_user():
            search = search or SearchQuery()
            if search.AND is None:
                search.AND = []
            search.AND.append(
                SearchCriteria(field="published", operator="=", value=True)
            )

        return super().search(db, user, pagination, search, order_by, *args, **kwargs)

    @classmethod
    def create(
        cls, db: Session, user: UserModel, values: dict, *args, **kwargs
    ) -> "PageModel":
        contents = values.get("contents", [])
        cls._normalize_contents(contents)
        if values.get("is_homepage"):
            cls._resolve_homepage_switch(db, current_page_id=None)
        cls._validate_contents(db=db, contents=contents)
        return super().create(db, user, values, *args, **kwargs)

    def update(
        self,
        db: Session,
        user: "UserModel",
        values: dict,
        commit: Optional[bool] = True,
        *args,
        **kwargs,
    ) -> "[PageModel]":
        contents = values.get("contents", [])
        self._normalize_contents(contents)
        if values.get("is_homepage"):
            self._resolve_homepage_switch(db, current_page_id=self.id)
        self._validate_contents(db=db, contents=contents)
        return super().update(db, user, values, commit, *args, **kwargs)

    @classmethod
    def _resolve_homepage_switch(cls, db: Session, current_page_id: int = None):
        """
        When a page is being set as the new homepage, resolve conflicts with
        the old homepage by unsetting its is_homepage flag and generating
        new slugs for its contents.
        """
        query = db.query(cls).filter(cls.is_homepage == True)  # noqa: E712
        if current_page_id is not None:
            query = query.filter(cls.id != current_page_id)

        old_homepages = query.all()
        for old_homepage in old_homepages:
            old_homepage.is_homepage = False
            for content in old_homepage.contents:
                if content.slug == "/":
                    content.slug = generate_slug_from_title(
                        db=db,
                        title=content.title,
                        locale_id=content.locale_id,
                        current_page_content_id=content.id,
                    )
        db.flush()

    @classmethod
    def _normalize_slug(cls, slug: str) -> str:
        """
        Normalize slug by ensuring it starts with a forward slash.
        """
        if not slug.startswith("/"):
            return f"/{slug}"
        return slug

    @classmethod
    def _normalize_contents(cls, contents: list[dict]):
        """
        Normalize all slugs in contents by ensuring they start with a forward slash.
        """
        for content in contents:
            content["slug"] = cls._normalize_slug(content["slug"])

    @classmethod
    def _validate_contents(cls, db: Session, contents: list[dict]):
        """
        Validate page contents for slug conflicts.

        This function performs two types of validation:
        1. Internal validation: Check for duplicate slugs within the same locale_id among the contents being validated
        2. External validation: Check for slug conflicts with existing content in the database
        """
        # Internal validation: Check for duplicate slugs within the same locale_id
        slug_locale_combinations = {}
        for i, content in enumerate(contents):
            slug = content["slug"]
            locale_id = content["locale_id"]
            combination_key = (slug, locale_id)

            if combination_key in slug_locale_combinations:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Duplicate slug '{slug}' found for locale_id '{locale_id}' within the same page contents",
                )
            slug_locale_combinations[combination_key] = i

        # External validation: Check for conflicts with existing content in database
        for content in contents:
            is_valid, existing_content = check_page_content_slug_with_conflict(
                db=db,
                slug=content["slug"],
                locale_id=content["locale_id"],
                current_page_content_id=content.get("id", None),
            )
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Slug '{content['slug']}' is not valid, it is already used on '{existing_content.title} (Language: {existing_content.locale.name})'",
                )
