from sqlalchemy import Column, ForeignKey, Integer
from deepsel.mixins.orm import ORMBaseMixin
from db import Base


class ImpliedRoleModel(Base, ORMBaseMixin):
    __tablename__ = "implied_role"

    role_id = Column(Integer, ForeignKey("role.id"), nullable=False, primary_key=True)
    implied_role_id = Column(
        Integer, ForeignKey("role.id"), nullable=False, primary_key=True
    )
