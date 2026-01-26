from db import Base
from typing import TypeVar, Type
from pydantic import BaseModel as PydanticModel

DBModel = TypeVar("DBModel", bound=Type[Base])


class CRUDSchema(PydanticModel):
    Read: Type[PydanticModel]
    Create: Type[PydanticModel]
    Update: Type[PydanticModel]
    Search: Type[PydanticModel]
