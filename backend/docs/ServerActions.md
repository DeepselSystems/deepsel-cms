# Developer Guide: Migration Tasks with Server Actions

## Overview
This guide explains how to create simple migration tasks using the `upgrade` function. It makes running server actions at startup straightforward.

## Key Files
- **`server_events.py`**: Manages server start and stop.
- **`settings.py`**: Holds app settings, like `version`. Update `version` when adding features and needing upgrades.
- `apps/{app_name}/__init__.py`: If define `upgrade` function, it will be called when server startup. There is a demo in `apps/cms/__init__.py`, so it is used to demonstrate the migration process. Notice that we use asyncio to run background tasks. But you can using other way to run, for example using thread, it depends on your use case.

### Upgrade Function
The `upgrade` function is defined in `apps/{app_name}/__init__.py` and is responsible for upgrading the application from a current version to a new version.

### Function Signature
```python
def upgrade(db, from_version, to_version):
```
- `db`: Database session object.
- `from_version`: The current version of the application in the database.
- `to_version`: The target version to upgrade to, as defined in `settings.py`.

### Important Considerations

- If the `upgrade` function is defined, it will run every time the server starts. Additionally, the current version in the database will be updated to the new version, even if the migration is unsuccessful. Therefore, if there is a migration that should only run once, make sure to handle it within your logic and do not rely solely on the version parameter.

- **Background Tasks**: Initiates tasks asynchronously to ensure the server starts quickly. But long running tasks still can block event loop, so need to test it carefully.


### Using the `migration_task` decorator

For more advanced migration scenarios, you can use the `@migration_task` decorator. This decorator is useful for running specific migration functions that need to be executed automatically when the server starts.

**Parameters:**
- `task_title` (str): Description of the migration task for logging
- `target_version` (str): Specific version when this migration should run

**Key features:**
- Only runs when upgrading to the exact `target_version`
- Supports both synchronous and asynchronous functions
- Provides version checking and comprehensive logging
- Automatically skips if version conditions aren't met
- Prevents duplicate execution of the same migration

**Function signature:**
Your migration function will receive these parameters:
- `db`: Database session
- `app_name`: Name of the current app
- `from_version`: Previous version
- `to_version`: Target version being upgraded to

**Usage:**
```python
from deepsel.utils.migration_utils import migration_task

@migration_task("Update data format", "1.2.0")
def migrate_data_format(db, app_name, from_version, to_version):
    print(f"Migrating {app_name} from {from_version} to {to_version}")
    # Your migration logic here
    # Example: Transform data, update records, fix data inconsistencies, etc.
    pass

@migration_task("Process large dataset", "1.3.0")
async def migrate_large_dataset(db, app_name, from_version, to_version):
    print(f"Running async migration for {app_name}")
    # Async migration logic
    # Example: Process large datasets, batch operations, external API calls, etc.
    pass
```
