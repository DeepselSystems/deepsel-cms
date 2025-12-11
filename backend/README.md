# Deepsel Python Template

## Set up for local development

### Python environment
Python >= 3.12 is required.
You may choose to set up a python virtual environment before installing dependencies.
```bash
pip install -r requirements.txt

```

### Run a Postgres database
```bash
# we need an env file
cp .env.sample .env
# use pre-made definition
docker-compose -f deepsel-local-docker-compose.yml up -d
```

### Install Node dependencies (for JSX compilation)
React-based templates are compiled server-side using `esbuild`.  
Install the Node dependencies once in this directory:
```bash
npm install
```
### Run
```bash
uvicorn main:app --reload 
```

### Environment Variables for Migration Control

The application supports environment variables to control database migration behavior, particularly useful for Kubernetes deployments:

#### `ONLY_MIGRATE`

- **Purpose**: Run database migrations only and exit (for init containers)
- **Usage**: ONLY_MIGRATE=true env set
- **Behavior**:
  1. Runs database schema migrations
  2. Installs apps and imports CSV data
  3. Runs startup logic
  4. Exits with code 0 on success

#### `NO_MIGRATE`  

- **Purpose**: Skip database migrations and startup logic (for main containers)
- **Usage**: NO_MIGRATE=true env set
- **Behavior**:
  - Skips database migrations
  - Skips startup logic execution
  - Starts the web server normally

### Auto-format code
Auto code formatting is done by the `black` package. Install it with:
```bash
pip install black
````

Auto-format the code with:
```bash
make format
```
### Code checking before commit
Code checking is required before committing the code, and the CI/CD pipeline will also check the code using the same steps before deploying.

The code checking is done by the following tools:
- `black` for code formatting
- `flake8` for linting
- `bandit` for security checks
- `pytest` for unit tests

To setup the tools, run:
```bash
pip install black flake8 bandit pytest
```

Before committing the code, you should check the code with the following commands:

```bash
make lint security test
```

Note that a database is required to run the tests. You can use the same database as the development database.

## A typical app structure
All apps are stored in the `apps` directory. The `deepsel` directory is a special app that contains the base models, routes, and services that are shared across all apps. 
This folder is kept in the top-level directory to make it easier to share code between apps. 
It maybe renamed to `core`  in white-label projects.


To create a new app, for example an e-commerce backend ,you can use create a new folder `ecommerce` in the `apps` directory and create the following structure:


```
apps/
    ecommerce/
        __init__.py
        data/
            __init__.py
            order.csv
            order_item.csv
            product.csv
        models/
            __init__.py
            order.py
            order_item.py
            product.py
        routers/
            __init__.py
            order.py
            order_item.py
            product.py
        templates/
            order_confirm_email.html
        utils/
            __init__.py
            my_function.py
```

### High-level overview of the app structure
- `data` contains the data files that are used to seed the database. These are CSV files, and the `import_order` (e.g. we must create products before we can create orders) is defined in the `data/__init__.py` file.
- `models` contains the SQLAlchemy database models that are used to interact with the database. The folder name must be `models` for the auto DB manager to work.
- `routers` contains the FastAPI routers that define the API endpoints. The folder name must be `routers` for the auto router installer to work.
- `templates` contains any text data that are too large to be stored in the codebase or the data CSV files. For example, email templates. The folder name is a convention and not essential to the core structure.
- `utils` contains any utility functions that you wish to use and share. The folder name is a convention and not essential to the core structure.

### Naming conventions
#### Table names
Lowercase and snake_case. For example, `order_item`.
Not pluralized. For example, `order_item` instead of `order_items`.
#### Model names
CamelCaseModel. For example, `OrderItemModel`, `ProductModel`.
#### Router names
Every router should be assigned to a variable named `router`. This is required for the auto router installer to work, it will look for a variable named `router` in the file.
#### File names
Every model or router file should be the same as the table names. For example, `models/product.py` and `routers/product.py`. 
For CSV data files, the file name is required to be the table name, for the app installer to insert the records into the correct table. 
For example, `data/product.csv`.


## How to create a model
To create a model, you need to create a new file in the `models` directory.
For example, to create a `product` model, you need to create a file named `product.py` in the `models` directory.
The file should contain the following code:

```python
from sqlalchemy import Column, Integer, String, Text, Float
from db import Base
from deepsel.mixins.base_model import BaseModel


class ProductModel(Base, BaseModel):
    __tablename__ = "product"
    
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False) # Strings will be rendered as TextInput by the JSX generator
    price = Column(Float) # Floats will be rendered as NumberInput, NumberFormatter by the JSX generator
    description = Column(Text) # Text will be rendered as TextArea by the JSX generator
```
The `Base` is the standard SQLAlchemy declarative base.

The `BaseModel` is a mixin defined in the `deepsel` app that adds the following fields to the model:
- `created_at` (DateTime)
- `updated_at` (DateTime)
- `string_id` (String)
- `system` (Boolean)
- `owner_id` (ForeignKey to User)
- `organization_id` (ForeignKey to Organization)

It also includes CRUD methods that are shared across all models. 
These methods ensure permissions are checked before creating, reading, updating, or deleting records. 
They will also manage record ownership and organization data separation by using `owner_id` and `organization_id`.

These methods are:
- `create`
- `get_one`
- `get_all`
- `search`
- `update`
- `delete`
- `bulk_delete`

You can find out how these methods work in `deepsel/mixins/orm.py`.

## How to create a router
To create a router, you need to create a new file in the `routers` directory.
For example, to create a `product` router, you need to create a file named `product.py` in the `routers` directory.
The file should contain the following code:

```python
from deepsel.utils.crud_router import CRUDRouter
from deepsel.utils.generate_crud_schemas import generate_CRUD_schemas
from deepsel.utils.get_current_user import get_current_user
from fastapi import Depends

table_name = "product"
CRUDSchemas = generate_CRUD_schemas(table_name)

router = CRUDRouter(
    read_schema=CRUDSchemas.Read,
    search_schema=CRUDSchemas.Search,
    create_schema=CRUDSchemas.Create,
    update_schema=CRUDSchemas.Update,
    table_name=table_name,
    dependencies=[Depends(get_current_user)],
)
```

The schemas are Pydantic models that are generated automatically, and will define the fields that are returned by the API endpoints (and also build the Swagger documentation).

## How to customize a router
You can customize the router by adding additional endpoints or modifying the existing ones.
For example, to add a custom endpoint to the `product` router, you can add the following code to the `product.py` file:

```python
from deepsel.utils.crud_router import CRUDRouter
from deepsel.utils.generate_crud_schemas import generate_CRUD_schemas
from deepsel.utils.get_current_user import get_current_user
from fastapi import Depends

table_name = "product"
CRUDSchemas = generate_CRUD_schemas(table_name)

router = CRUDRouter(
    read_schema=CRUDSchemas.Read,
    search_schema=CRUDSchemas.Search,
    create_schema=CRUDSchemas.Create,
    update_schema=CRUDSchemas.Update,
    table_name=table_name,
    dependencies=[Depends(get_current_user)]
)

@router.get("/custom_endpoint")
def custom_endpoint():
    return {"message": "This is a custom endpoint"}
```
Or if you want to modify the existing endpoint, you can override that route builder method in the router class.
For example, overriding the search route to only allow search to return products with a price greater than 100:

```python
from deepsel.utils.crud_router import CRUDRouter
from deepsel.utils.generate_crud_schemas import generate_CRUD_schemas
from deepsel.utils.get_current_user import get_current_user
from fastapi import Depends
from typing import Any, Optional
from deepsel.mixins.orm import PermissionAction, PermissionScope, SearchCriteria, Operator
from deepsel.utils.crud_router import CRUDRouter, CALLABLE_DICT, PAGINATION, SearchQuery, OrderByCriteria
from sqlalchemy.orm import Session

table_name = "product"
CRUDSchemas = generate_CRUD_schemas(table_name)

class ProductCustomRouter(CRUDRouter):
    def _search(self, *args: Any, **kwargs: Any) -> CALLABLE_DICT:
        def route(
                db: Session = Depends(self.db_func),
                user: UserModel = Depends(get_current_user),
                pagination: PAGINATION = self.pagination,
                search: Optional[SearchQuery] = None,
                order_by: Optional[OrderByCriteria] = None,
        ) -> dict:
            custom_criteria = SearchCriteria(
                field="price",
                operator=Operator.gt,
                value=100
            )
            search.AND.append(custom_criteria)
            return super()._search(db, user, pagination, search, order_by)
        return route

    
router = ProductCustomRouter(
    read_schema=CRUDSchemas.Read,
    search_schema=CRUDSchemas.Search,
    create_schema=CRUDSchemas.Create,
    update_schema=CRUDSchemas.Update,
    table_name=table_name,
    dependencies=[Depends(get_current_user)]
)
```

## How to customize an endpoint schema
You can customize the schema by adding additional fields or modifying the existing ones.
For example, to add a custom field called `custom_field` to the `product` get one schema, you can add the following code to the `product.py` file:


```python
from apps.ecommerce.models.product import ProductModel as Model
from deepsel.models.user import UserModel
from deepsel.utils.generate_crud_schemas import generate_CRUD_schemas
from deepsel.utils.get_current_user import get_current_user
from fastapi import Depends
from typing import Any
from deepsel.utils.crud_router import CRUDRouter, CALLABLE
from sqlalchemy.orm import Session


table_name = "product"
CRUDSchemas = generate_CRUD_schemas(table_name)


class CustomReadSchema(CRUDSchemas.Read):
    custom_field: str

    
class ProductCustomRouter(CRUDRouter):
    def _get_one(self, *args: Any, **kwargs: Any) -> CALLABLE:
        def route(
            item_id: self._pk_type,
            db: Session = Depends(self.db_func),
            user: UserModel = Depends(get_current_user),
        ) -> Model:
            
            item = super()._get_one(item_id, db, user)
            item.custom_field = "This is a custom field value"
            return item
        
        return route

    
router = ProductCustomRouter(
    read_schema=CustomReadSchema,
    search_schema=CRUDSchemas.Search,
    create_schema=CRUDSchemas.Create,
    update_schema=CRUDSchemas.Update,
    table_name=table_name,
    dependencies=[Depends(get_current_user)]
)
```


## How to customize a model
The same result of the above example can be achieved by adding a customizing the search method of the model instead of the router:
```python
from sqlalchemy import Column, Integer, String, Text, Float
from db import Base
from deepsel.mixins.base_model import BaseModel
from deepsel.mixins.orm import SearchCriteria, Operator
from deepsel.utils.crud_router import PAGINATION, SearchQuery, OrderByCriteria
from sqlalchemy.orm import Session
from typing import Any, Optional


class ProductModel(Base, BaseModel):
    #... model definition
    
    @classmethod
    def search(
            cls,
            db: Session,
            user: "UserModel",
            pagination: PAGINATION,
            search: Optional[SearchQuery] = None,
            order_by: Optional[OrderByCriteria] = None,
            *args,
            **kwargs,
    ):
        if search is None:
            search = SearchQuery()
        custom_criteria = SearchCriteria(
            field="price",
            operator=Operator.gt,
            value=100
        )
        search.AND.append(custom_criteria)
        return super().search(db, user, pagination, search, order_by)
```

## How the auto schema generator works
### Read schemas
The read schemas will automatically include all defined fields of the database model.

If a relationship is defined in the model, the schema will expand the related record(s) and include all of the related fields, recursively.

Example:
```python
from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey
from sqlalchemy.orm import relationship
from db import Base
from deepsel.mixins.base_model import BaseModel



class ProductModel(Base, BaseModel):
    __tablename__ = "product"
    
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    category_id = Column(Integer, ForeignKey('category.id'))
    
    category = relationship("CategoryModel")
    
    
class CategoryModel(Base, BaseModel):
    __tablename__ = "category"
    
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    category_type_id = Column(Integer, ForeignKey('category_type.id'))
    
    type = relationship("CategoryTypeModel")
    
    
class CategoryTypeModel(Base, BaseModel):
    __tablename__ = "category_type"
    
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    
```
This will be the resulting read schema for `ProductModel`:
```json
{
  "id": 0,
  "name": "string",
  "category_id": 0,
  "category": {
    "id": 0,
    "name": "string",
    "category_type_id": 0,
    "type": {
      "id": 0,
      "name": "string"
    }
  }
}
```

As all relationships are included in the read schemas, it is important to be mindful of the depth of the relationships, 
as this can lead to very large schemas and slow API responses. 

You may choose to exclude certain relationships by customizing the schemas as above.

### Create and Update schemas

The create and update schemas will include all fields of the database model that are not `id` or relationships.

The `BaseModel` mixin fields such as `created_at`, `updated_at`, `string_id`, `system`, `owner_id`, and `organization_id` are also excluded, as they are assigned automatically.

Fields will be marked as required in the schemas if they are defined as `nullable=False` in the model. Not providing a required field will result in a validation error (HTTP 422).


## How to define a Many2One relationship

A Many2One relationship is where a record links to another record.

For example, a `product` record may link to a `category` record.

To define a Many2One relationship, you need to define a `ForeignKey` field in the model.

For example, to define a Many2One relationship between `product` and `category`, you need to add the following field to the `product` model:

```python
from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey
from sqlalchemy.orm import relationship
from db import Base
from deepsel.mixins.base_model import BaseModel


class ProductModel(Base, BaseModel):
    __tablename__ = "product"
    
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    category_id = Column(Integer, ForeignKey('category.id'))
    
    category = relationship("CategoryModel")
```
This will be the resulting read schema for `ProductModel`:
```json
{
  "id": 0,
  "name": "string",
  "category_id": 0,
  "category": {
    "id": 0,
    "name": "string"
  }
}
```

## How to define a One2Many relationship

A One2Many relationship is where a record links to multiple other records in a parent-child manner.

The children will have a `ForeignKey` field that links back to the parent record. 
This way we don't need to define third table to store the relationship like in Many2Many relationships.

An example use case is a `order` record (parent) that links to multiple `order_item` records (children).

To define a One2Many relationship, you need to define a `ForeignKey` field in the child model.

For example, to define a One2Many relationship between `order` and `order_item`, you need to add the following field to the `order_item` model:

```python
from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey
from sqlalchemy.orm import relationship
from db import Base
from deepsel.mixins.base_model import BaseModel


class OrderModel(Base, BaseModel):
    __tablename__ = "order"
    
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    
    items = relationship("OrderItemModel")


class OrderItemModel(Base, BaseModel):
    __tablename__ = "order_item"
    
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    order_id = Column(Integer, ForeignKey('order.id'))
```

This will be the resulting read schema for `OrderModel`:
```json
{
  "id": 0,
  "name": "string",
  "items": [
    {
      "id": 0,
      "order_id": 0,
      "name": "string"
    }
  ]
}
```

## How to define a Many2Many relationship

A Many2Many relationship is where a record links to multiple other records in a peer-to-peer manner.

An example use case is a `product` record that links to multiple `tag` records, and these `tag` records can be linked to multiple `product` records.

To define a Many2Many relationship, you need to define a third model that links the two models together. 
This is called an association/junction table.

For example, to define a Many2Many relationship between `product` and `tag`, you need to add the following fields to the `product` and `tag` models:

```python
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from db import Base
from deepsel.mixins.base_model import BaseModel
from deepsel.mixins.orm import ORMBaseMixin

class ProductModel(Base, BaseModel):
    __tablename__ = "product"
    
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    
    tags = relationship("TagModel", secondary="product_tag")
    
    
class TagModel(Base, BaseModel):
    __tablename__ = "tag"
    
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    
    products = relationship("ProductModel", secondary="product_tag")
    
    
class ProductTagModel(Base, ORMBaseMixin): # Pls note to use ORMBaseMixin instead of BaseModel, we don't need organization/ownership control fields
    __tablename__ = "product_tag"
    
    product_id = Column(Integer, ForeignKey('product.id'), nullable=False, primary_key=True)
    tag_id = Column(Integer, ForeignKey('tag.id'), nullable=False, primary_key=True)
```

This will be the resulting read schema for `ProductModel`:
```json
{
  "id": 0,
  "name": "string",
  "tags": [
    {
      "id": 0,
      "name": "string"
    }
  ]
}
```

And this will be the resulting read schema for `TagModel`:
```json
{
  "id": 0,
  "name": "string",
  "products": [
    {
      "id": 0,
      "name": "string"
    }
  ]
}
```
## How to create a router for a model with auto-generated CRUD Endpoints

This guide will help you to create a router for a model with automatically generated CRUD (Create, Read, Update, Delete) endpoints using FastAPI library.

### Step 1: Import Necessary Modules

First, you need to import the necessary modules from FastAPI and your application. Here's what you need:

```python
from fastapi import Depends
from deepsel.utils.crud_router import CRUDRouter
from deepsel.utils.generate_crud_schemas import generate_CRUD_schemas
from deepsel.utils.get_current_user import get_current_user
```

### Step 2: Import Your Model

Next, you need to import the model you want to create a router for. Replace `YourModel` with the model you're working with:

```python
from your_app.models import YourModel as Model
```

### Step 3: Generate CRUD Schemas

You can generate Pydantic models for the CRUD operations using `generate_CRUD_schemas`. These models define the fields that are returned by the API endpoints:

```python
[ReadSchema, CreateSchema, UpdateSchema, SearchSchema] = generate_CRUD_schemas(Model)
```

### Step 4: Create the Router

Now, you can create the router using `CRUDRouter`. Pass the schemas you just created, your model, and any dependencies your router has:

```python
router = CRUDRouter(
    read_schema=ReadSchema,
    search_schema=SearchSchema,
    create_schema=CreateSchema,
    update_schema=UpdateSchema,
    db_model=Model,
    dependencies=[Depends(get_current_user)]
)
```

### Optional: Customize the Router

You can customize the router by adding additional endpoints or modifying the existing ones. For example, to add a custom endpoint to your router, you can add the following code:

```python
@router.get("/custom_endpoint")
async def custom_endpoint():
    pass
```

### Optional: Read-Only Models

For read-only models, you can disable the update, delete, bulk_delete and create routes by setting the corresponding parameters to `False`:

```python
router = CRUDRouter(
    read_schema=ReadSchema,
    search_schema=SearchSchema,
    db_model=Model,
    dependencies=[Depends(get_current_user)],
    update_route=False,
    delete_one_route=False,
    bulk_delete_route=False,
    create_route=False
)
```

By following these steps, you can easily create a router with autogenerated CRUD endpoints for your models.

## How does the seeding data (CSV file) work
When the source is starting, the `install_apps` will be executed to save the seeding data (**csv file**) into the database. You can add more data automatically with multiple types, correctly related data, and keep previous data.


### The data (csv file):
-  These files must be in `.csv` format and stored in the `data` directory of each app, or in the data directory of Deepsel (in case of a bulk deployment).
	- App directory: `./apps/{app_name}/data/`
	- Deepsel directory: `./deepsel/data/`

- The file name need to be the same as the model name (**database table name**).
- File names need to be included for `import_order` in the `__init__.py` files for each data directory. The position of the file name in the `import_order` list is also the launch priority.


### Column names (**in CSV file**):
- They should match the column names of the model (**table column**).
- Special cases for column naming will be described below.


### Special Common Names (**in CSV file**):
### `string_id`
- Holds a unique value to identify the data on database that is from the **CSV file**.
- This field is required.
- It will be stored in the `string_id` column (**database table**).
- If the **database table** already has a `string_id`, **the row will be skipped**.


### `{related_table_name}/{refecenced_column}`
- You have to provide `string_id` (temporary call `file_value`) of the record at the `related_table` that you want to relate
- The saved value of this column (**database**) will be the `id` (primary id) of `related_table` record, provided that `related_table.string_id === file_value`.


### `file:{column_name}`
- You have to provide the path of file (starting from the root directory). For example: `deepsel/path/to/your/file`.
- The saved value of this column will be the content of that file (large data).


### `json:{column_name}`
- You have to provide the stringify of JSON 
- The saved value of this column will be the JSON value.


### `owner_id`
- It may be `user/owner_id` column, witch is in the format `{related_table_name}/{refecenced_column}` as explained above.
- If the CSV file does not contain a `user/owner_id` or `owner_id column`, by default it is supposed to have a `user/owner_id` column with the value that is `super_user`.
- If the CSV file contains a `user/owner_id` or `owner_id` column, the corresponding value will be stored.


### `organization_id`
- It may be `organization/organization_id` column, witch be in the format `{related_table_name}/{refecenced_column}` as explained above.
- If the CSV file does not contain an `organization/organization_id` column or `organization_id`, by default it is supposed to have a `organization/organization_id` column with the value that is `DEFAULT_ORG_ID` (`.../constants/init.py`).
- If the CSV file contains an `organization/organization_id` or `organization_id` column, the corresponding ID value will be stored.


### Example for Seeding data - CSV file
#### We have a database table `product` with the structure and previous data like this:

| id | name      | template                    | meta             | category_id | owner_id | organization_id | string_id |
|----|-----------|-----------------------------|------------------|-------------|----------|-----------------|-----------|
| 1  | product 1 | `the template file data...` | { color: 'red' } | 3           | 2        | 1               | product_1 |

#### We have to create the **seeding data (csv file)** that will be added into product table:
- File path/name: `app/product/data/product.csv`
- Declare the file name into file `app/product/__init__.py`, with the order of priority you desire.
- File data:

| string_id | name      | file:template   | meta               | category/category_id   | user/owner_id      |        |
|-----------|-----------|-----------------|--------------------|------------------------|--------------------|--------|
| product_1 | product   | `path\to\file1` | { color: 'red' }   | `category_string_id_1` | `user_string_id_1` |        |
| product_2 | product 2 | `path\to\file2` | { color: 'blue' }  | `category_string_id_2` | `user_string_id_2` |        |

#### Row by row data analysis:
- **Row 1**: Because the `string_id` is `product_1` this already exists inv the product data (**previous data in database**), so it will automatically be discarded and this row will not be processed.
- **Row 2**: Product table is added a new record with:
  - data of columns `string_id`, `name` these are mapped with  `string_id`, `name` of the csv file
  - column `template`, the data saved is the content from file of the url `path\to\file2`
  - column `meta` the data saved is JSON `{ color: 'blue' }`
  - column `category_id`, the data saved is the `id` of the recode `category` whose `string_id=category_string_id_2`. (Example, the value is: `12`)
  - column `owner_id`, the data saved is the `id` of the recode `user` whose `string_id=user_string_id_2`. (Example, the value is: `22`)
  - column `organization_id`, the data saved is the default id (`DEFAULT_ORG_ID`). (Example, the value is: `1`)

#### Finally, we have the product table data that is:

| id | name      | template                    | meta              | category_id | owner_id | organization_id | string_id |
|----|-----------|-----------------------------|-------------------|-------------|----------|-----------------|-----------|
| 1  | product 1 | `the template file data...` | { color: 'red' }  | 3           | 2        | 1               | product_1 |
| 2  | product 2 | `data of path\to\file2`     | { color: 'blue' } | 12          | 22       | 1               | product_2 |

---

### How to run logic before the server starts to upgrade the application

You can add a function with name `upgrade` in the `__init__.py` file of the app. This function will be called when the server starts and the version in `settings.py` is different from the current version.

```python
def upgrade(db, from_version, to_version):
    # your logic here
    pass
```
