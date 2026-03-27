---
name: data-insertion
description: Create or modify CSV seed data and demo data for backend apps, or themes in the themes folder. Use when asked to add seed data, create demo data, write CSV import files, or set up data.
argument-hint: <app-name> [data|demo_data]
---

# CSV Data Insertion

Create, modify, or troubleshoot CSV seed data files for Deepsel CMS backend apps.

## Arguments

- `$0` — App name (e.g., `cms`, `core`, `locales`)
- `$1` — (optional) `data` for regular seed data, `demo_data` for demo data. Defaults to `data`.

If arguments are missing, ask the user which app and data type they need.

## When to Use

- User asks to add seed/initial data for a model
- User wants to create demo data for an app
- User needs to fix or extend existing CSV import files
- User asks about CSV import format or special column syntax

## Reference

Read `backend/docs/DataInsertion.md` for the full specification. The key details are summarized below.

## File Structure

```
apps/{app_name}/{data|demo_data}/
├── __init__.py          # Contains import_order list
├── model1.csv           # CSV files (filename = model's __tablename__)
├── model2.csv
└── attachments/         # Optional: binary files referenced by CSV
```

## Step-by-Step Workflow

### Step 1: Understand the Target Model

1. Read the model file in `apps/{app_name}/models/` to understand:
   - `__tablename__` (this becomes the CSV filename)
   - Column names, types, and constraints
   - Foreign key relationships
   - Whether the model uses `OrganizationMetaDataMixin` or `BaseModel`
2. Check existing data files in `apps/{app_name}/{data|demo_data}/` for patterns

### Step 2: Create or Update `__init__.py`

The `__init__.py` must contain an `import_order` list. Order matters — parent tables before child tables:

```python
import_order = [
    "parent_model.csv",    # No dependencies
    "child_model.csv",     # Depends on parent_model
]
```

If the file already exists, append new CSVs in the correct dependency order.

### Step 3: Write the CSV File

**Filename**: Must match the model's `__tablename__` (e.g., model with `__tablename__ = "blog_post"` → `blog_post.csv`).

**Required columns**:
- `string_id` — unique identifier (required for regular data, optional for demo data)

**All values must be quoted** except booleans (`true`/`false`).

### Step 4: Handle Special Columns

#### Foreign Key References: `<table>/<field>`
Reference related records by their `string_id`:
```csv
"title","locale/locale_id","page/page_id"
"Home Page","en_US","demo_home_page"
```
Resolves `locale/locale_id` → finds locale with `string_id="en_US"`, uses its `id`.

#### File Content: `file:<field_name>`
Reads file content into a field:
```csv
"string_id","file:translations"
"header","apps/cms/data/header.json"
```

#### File Attachments: `attachment:<field_name>`
Creates an attachment record and stores its ID:
```csv
"string_id","attachment:featured_image_id"
"blog_post_1","apps/cms/demo_data/images/featured.jpg"
```

#### Standalone Attachments
Create `attachments.csv` with `file_path` column:
```csv
"string_id","file_path","alt_text","system"
"hero_banner","apps/cms/data/attachments/hero.jpg","Hero banner",true
```

#### JSON Content: `json:<field_name>`
Parses JSON string into a JSON object. Supports recursive foreign key resolution inside the JSON:
```csv
"string_id","json:translations"
"main_menu","{\"en\": {\"title\": \"Home\", \"page_content/page_content_id\": \"HomePage_en\"}}"
```
The `page_content/page_content_id` key inside the JSON will be resolved to the actual ID.

### Step 5: Verify

1. Check that all referenced `string_id` values exist in their respective CSVs (or will be created by earlier CSVs in the import order)
2. Check that all referenced files exist (for `file:` and `attachment:` columns)
3. Check that JSON strings are valid (for `json:` columns)
4. Verify import order respects foreign key dependencies

## Import Behavior

### Regular Data (`data/`)
- Loaded automatically at startup for all installed apps
- Checks for existing records by `string_id`
- Updates only if record has `system=True`
- Skips if record has `system=False` (preserves user changes)
- Creates new if record doesn't exist

### Demo Data (`demo_data/`)
- Loaded via `POST /load_demo_data/{app_name}` or from admin UI
- Always creates new records (no existence check)
- `string_id` is optional
- Can cause duplicates if run multiple times
- Requires admin privileges

## Default Value Handling

- `organization_id` — auto-assigned to default organization if not specified
- `owner_id` — auto-assigned to default system user if not specified
- Booleans — `"true"`/`"True"`/`"1"` → `True`; `"false"`/`"False"`/`"0"` → `False`

## Common Patterns

### Multilingual content
```csv
"title","slug","locale/locale_id","page/page_id"
"Home Page","home-page","en_US","home"
"Startseite","startseite","de_DE","home"
```

### Blog with featured images
```csv
"string_id","published","attachment:featured_image_id"
"tech_post_1",true,"demo_data/images/tech-featured.jpg"
```

### Menu with nested JSON translations
```csv
"string_id","json:translations"
"main_menu","{\"en\": {\"title\": \"Home\", \"page_content/page_content_id\": \"HomePage_en\", \"use_page_title\": true}, \"de\": {\"title\": \"Startseite\", \"page_content/page_content_id\": \"HomePage_de\", \"use_page_title\": true}}"
```

## Troubleshooting

- **Integrity error on import** — duplicate `string_id` or unique constraint violation. Check for duplicates across CSVs.
- **Missing reference** — the referenced `string_id` doesn't exist. Check import order and that the parent CSV is listed first.
- **File not found** — file path in `file:` or `attachment:` column doesn't exist. Paths are relative to `backend/` root.
- **Invalid JSON** — malformed JSON in `json:` column. Validate the JSON string (watch for escaping: `\"` inside CSV).

## Theme Seed Data

Themes can include seed data in `themes/{theme_name}/data/` using the same CSV format as app data.

### Structure

```
themes/{theme_name}/data/
├── __init__.py      # import_order + optional post_install(db)
└── menu.csv
```

### `post_install(db)` Hook

`__init__.py` can define a `post_install(db)` function for non-CSV operations (e.g., configuring site language defaults, updating CMS settings). It receives a SQLAlchemy session and runs after all CSVs are imported.

```python
import_order = ["menu.csv"]

def post_install(db):
    """Custom setup logic after CSV import."""
    # e.g., set default language, configure available languages
    pass
```

### Loading

Theme seed data is loaded by `load_theme_seed_data()` in `backend/apps/cms/utils/setup_themes.py` at server startup for all themes. The hook must be idempotent.
