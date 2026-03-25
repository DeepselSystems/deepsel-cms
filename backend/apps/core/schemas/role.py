from deepsel.utils.generate_crud_schemas import generate_CRUD_schemas

CRUDSchemas = generate_CRUD_schemas("role")


class ReadSchema(CRUDSchemas.Read):
    implied_roles: list[CRUDSchemas.Read] = (
        []
    )  # This is skipped by the generator to avoid infinite recursion
