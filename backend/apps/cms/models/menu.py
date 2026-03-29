from sqlalchemy import Column, Integer, ForeignKey, Boolean, JSON
from db import Base
from apps.core.mixins.base_model import BaseModel
from apps.cms.mixins.menu import MenuMixin
from sqlalchemy.orm import relationship


class MenuModel(Base, MenuMixin, BaseModel):
    __tablename__ = "menu"

    id = Column(Integer, primary_key=True)
    position = Column(Integer, default=0)
    translations = Column(JSON, default=dict)
    open_in_new_tab = Column(Boolean, default=False)

    # Self-referential relationship for parent-child structure
    parent_id = Column(Integer, ForeignKey("menu.id"), nullable=True)
    children = relationship(
        "MenuModel",
        back_populates="parent",
        cascade="all, delete-orphan",
        lazy="joined",
        foreign_keys=[parent_id],
    )
    parent = relationship("MenuModel", back_populates="children", remote_side=[id])
