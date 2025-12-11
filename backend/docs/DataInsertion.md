# CSV Data Import System Documentation

The Deepsel backend includes a CSV data import system that allows for structured data insertion with support for relationships, file attachments, and JSON content. This system is used for both initial application data and demo data.

## Overview

The CSV import system is built into the ORM base mixin (`deepsel/mixins/orm.py`) and provides two main import modes:

1. **Regular Data Import**: Used for essential application data (roles, components, etc.)
2. **Demo Data Import**: Used for sample content that can be safely inserted without existence checks

## File Structure

### Regular Data Import
```
apps/{app_name}/data/
├── __init__.py          # Contains import_order list
├── model1.csv           # CSV files for each model
├── model2.csv
└── attachments/         # Optional: files referenced by CSV
```

### Demo Data Import
```
apps/{app_name}/demo_data/
├── __init__.py          # Contains import_order list
├── model1.csv           # CSV files for each model
├── model2.csv
└── attachments/         # Optional: files referenced by CSV
```

## Configuration Files

Each data directory must contain an `__init__.py` file with an `import_order` list:

```python
# apps/cms/data/__init__.py
import_order = [
    "role.csv",
    "implied_role.csv", 
    "component.csv",
]
```

The order is important as it determines dependency resolution (parent records must be imported before child records).

## CSV File Format

### Basic Structure
```csv
"field1","field2","field3"
"value1","value2","value3"
"value4","value5","value6"
```

### Required Fields
- **string_id**: Unique identifier for the record (required for regular imports, optional for demo data)
- Other fields depend on the model structure

### Example
```csv
"string_id","name","published"
"demo_page","Demo Page",true
"about_page","About Us",false
```

## Special Column Syntaxes

The CSV import system supports several special column syntaxes for advanced data handling:

### 1. Foreign Key References: `<table>/<field>`

Used to reference related records by their `string_id`.

**Syntax**: `<related_table>/<foreign_key_field>`

**Example**:
```csv
"title","content","locale/locale_id","page/page_id"
"Home Page","Welcome content","en_US","demo_home_page"
"Startseite","Willkommen Inhalt","de_DE","demo_home_page"
```

This resolves:
- `locale/locale_id` → Finds locale record with `string_id="en_US"` and uses its `id`
- `page/page_id` → Finds page record with `string_id="demo_home_page"` and uses its `id`

### 2. File Content: `file:<field_name>`

Reads file content and stores it directly in the specified field.

**Syntax**: `file:<field_name>`

**Example**:
```csv
"string_id","name","file:translations"
"header","Header Component","apps/cms/data/header.json"
```

This reads the content of `apps/cms/data/header.json` and stores it in the `translations` field.

### 3. File Attachments: `attachment:<field_name>`

Creates an attachment record and stores the attachment ID in the field.

**Syntax**: `attachment:<field_name>`

**Example**:
```csv
"string_id","title","attachment:featured_image_id"
"blog_post_1","My Blog Post","apps/cms/demo_data/images/featured.jpg"
```

This:
1. Creates an attachment record for the image file
2. Stores the attachment's `id` in the `featured_image_id` field

### Standalone Attachments

You can preload attachment records directly (without referencing another model field) by creating an `attachments.csv` file. Each row must provide a `file_path` column that points to the binary you want to upload. During a regular import the importer will skip rows whose `string_id` already exists, while demo imports always create a new record.

**Minimum Columns**:
```csv
"string_id","file_path","alt_text","system"
"hero_banner","apps/cms/data/attachments/hero.jpg","Hero banner image",true
```

- `file_path` can be absolute or relative to the CSV file's directory.
- Optional `filename` column lets you override the stored filename; otherwise the original filename is used unless a duplicate exists.
- Owner and organization values default the same way as other models (super user and current organization).

### 4. JSON Content: `json:<field_name>`

Parses JSON string and stores it as a JSON object. The system also recursively processes the JSON content to resolve foreign key references using the same `table/field` syntax.

**Syntax**: `json:<field_name>`

**Basic Example**:
```csv
"string_id","title","json:metadata"
"page_1","Home Page","{\"seo_title\": \"Welcome\", \"keywords\": [\"home\", \"welcome\"]}"
```

**Foreign Key Resolution in JSON**:
The system recursively processes JSON objects and arrays to resolve foreign key references:

```csv
"string_id","json:translations"
"main_menu","{
    \"en\": {
        \"title\": \"Home\",
        \"page_content/page_content_id\": \"HomePage_en\",
        \"use_page_title\": true
    },
    \"de\": {
        \"title\": \"Startseite\", 
        \"page_content/page_content_id\": \"HomePage_de\",
        \"use_page_title\": true
    }
}"
```

This will resolve to:
```json
{
    "en": {
        "title": "Home",
        "page_content_id": 123,
        "use_page_title": true
    },
    "de": {
        "title": "Startseite",
        "page_content_id": 124, 
        "use_page_title": true
    }
}
```

**Nested Arrays and Objects**:
The resolution works recursively through any level of nesting:

```csv
"string_id","json:config"
"menu_config","{
    \"items\": [
        {
            \"page_content/page_content_id\": \"HomePage_en\",
            \"settings\": {
                \"user/owner_id\": \"admin_user\",
                \"category/category_id\": \"main_category\"
            }
        }
    ]
}"
```

**Key Features**:
- **Recursive Processing**: Works with nested objects and arrays at any depth
- **Foreign Key Resolution**: Converts `table_name/column_name: string_id` to `column_name: actual_id`
- **Error Handling**: Logs errors for missing references and preserves original values
- **Organization Filtering**: Applies organization context when resolving foreign keys

## Import Modes

### Regular Data Import

**Characteristics**:
- Checks for existing records by `string_id`
- Updates existing records only if they are marked as system records
- Requires `string_id` field in CSV
- Used for essential application data

**Usage**:

App data in `apps/{app_name}/data/` folder will be loaded automatically for all installed apps.

As long as the `{app_name}` is in the `installed_apps` list in `settings.py`, its data will be loaded automatically.

**Update Logic**:
- If record exists and has `system=True` → Update with CSV data
- If record exists and has `system=False` → Skip (preserve user changes) (default value if unset is `system=False`)
- If record doesn't exist → Create new record

### Demo Data Import

**Characteristics**:
- Bypasses existence checks
- Inserts data regardless of existing records
- `string_id` field is optional
- Used for sample/demo content

**Usage**:
```python
# Via API endpoint
POST /load_demo_data/{app_name}
```

This feature is usable in the frontend in **Organization/Settings/General/Installed Business Apps/{Select app settings dropdown}/Load demo data**

**Behavior**:
- Always creates new records
- No existence checking
- Useful for populating sample content
- Can cause duplicate data if run multiple times

## Default Value Handling

The system automatically handles default values for common fields:

### Organization Assignment
If `organization_id` is not specified in CSV, records are assigned to the default organization.

### Owner Assignment  
If `owner_id` is not specified in CSV, records are assigned to the default system user.

### Boolean Conversion
String values are automatically converted to booleans:
- `"true"`, `"True"`, `"1"` → `True`
- `"false"`, `"False"`, `"0"` → `False`

## Error Handling

### Integrity Errors
If unique constraints are violated, the import will fail with an HTTP 400 error.

### File Not Found
If referenced files don't exist, the import will fail.

### Invalid JSON
If JSON syntax is invalid in `json:` columns, the import will fail.

### Missing References
If foreign key references can't be resolved, the import will fail.

## Security Considerations

### Demo Data Safety
- Demo data import should only be used in development/staging environments
- Can create duplicate or conflicting data
- Requires admin or super admin privileges

### File Access
- File paths in CSV are relative to the backend root directory
- System validates file existence before processing
- No arbitrary file system access outside the application directory

## API Endpoints

### Load Demo Data
```http
POST /load_demo_data/{app_name}
Authorization: Bearer <admin_token>
```

**Requirements**:
- User must have `admin_role` or `super_admin_role`
- App must exist in installed apps
- App must have demo_data module with import_order

**Response**:
- Success: HTTP 200
- Forbidden: HTTP 403 (insufficient permissions)
- Not Found: HTTP 404 (app or demo data not found)
- Bad Request: HTTP 400 (integrity constraint violations)
- Server Error: HTTP 500 (other errors)

## Best Practices

### 1. Import Order
Always define import order to respect foreign key dependencies:
```python
import_order = [
    "users.csv",      # No dependencies
    "roles.csv",      # No dependencies  
    "user_roles.csv", # Depends on users and roles
]
```

### 2. String IDs
Use descriptive, unique string IDs:
```csv
"string_id","name"
"admin_role","Administrator"
"editor_role","Content Editor"
"viewer_role","Read Only User"
```

### 3. File Organization
Keep related files organized:
```
demo_data/
├── __init__.py
├── pages.csv
├── page_content.csv
├── attachments/
│   ├── hero-image.jpg
│   └── about-photo.png
└── translations/
    ├── header.json
    └── footer.json
```

### 4. JSON Formatting
For complex JSON in CSV, use proper escaping:
```csv
"string_id","json:config"
"site_config","{\"theme\": \"dark\", \"features\": [\"blog\", \"shop\"]}"
```

### 5. Testing
Always test imports in a development environment first:
```bash
# Test with demo data
curl -X POST "http://localhost:8000/load_demo_data/cms" \
  -H "Authorization: Bearer <token>"
```


## Examples

### Complete Example: Blog System

**demo_data/__init__.py**:
```python
import_order = [
    "categories.csv",
    "blog_posts.csv", 
    "blog_post_content.csv",
]
```

**categories.csv**:
```csv
"string_id","name","slug"
"tech_category","Technology","technology"
"news_category","News","news"
```

**blog_posts.csv**:
```csv
"string_id","published","attachment:featured_image_id"
"tech_post_1",true,"demo_data/images/tech-featured.jpg"
"news_post_1",false,"demo_data/images/news-featured.jpg"
```

**blog_post_content.csv**:
```csv
"title","content","slug","locale/locale_id","blog_post/blog_post_id"
"Latest Tech Trends","<h1>Technology is evolving...</h1>","latest-tech-trends","en_US","tech_post_1"
"Neueste Tech-Trends","<h1>Die Technologie entwickelt sich...</h1>","neueste-tech-trends","de_DE","tech_post_1"
```

This example demonstrates:
- Foreign key references (`locale/locale_id`, `blog_post/blog_post_id`)
- File attachments (`attachment:featured_image_id`)
- Proper import ordering (categories → posts → content)
- Multilingual content support
