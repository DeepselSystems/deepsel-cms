from settings import installed_apps
import importlib
import os
from fastapi import FastAPI
from deepsel.utils.models_pool import models_pool
from sqlalchemy.orm import Session
from db import get_db_context
import logging
from constants import DEFAULT_ORG_ID

logger = logging.getLogger(__name__)


def import_csv_data(
    file_name: str,
    db: Session,
    demo_data: bool = False,
    organization_id: int = DEFAULT_ORG_ID,
    base_dir: str = None,
    force_update: bool = False,
    auto_commit: bool = True,
):
    logger.debug(f"Importing {file_name}")
    # rm the .csv extension
    model_name = file_name.split("/")[-1][:-4]
    model = models_pool.get(model_name, None)
    if model:
        model.install_csv_data(
            file_name=file_name,
            db=db,
            demo_data=demo_data,
            organization_id=organization_id,
            base_dir=base_dir,
            force_update=force_update,
            auto_commit=auto_commit,
        )


def install_apps(fasptapi_app: FastAPI):
    app_folders = ["deepsel"]
    app_folders += [f"apps/{app_name}" for app_name in installed_apps]

    with get_db_context() as db:
        # import routers for installed apps
        try:
            for app_folder in app_folders:
                logger.info(f"Installing app {app_folder}...")
                # check if routers folder exists, if yes, import routers
                if os.path.isdir(f"{app_folder}/routers"):
                    # list files in routers folder
                    files = os.listdir(f"{app_folder}/routers")
                    # filter files only python files, and not __init__.py
                    files = list(
                        filter(lambda x: x[-3:] == ".py" and x != "__init__.py", files)
                    )
                    # loop through router files and import them
                    for file in files:
                        module_name = (
                            f'{app_folder.replace("/", ".")}.routers.{file[:-3]}'
                        )
                        module = importlib.import_module(module_name)
                        fasptapi_app.include_router(module.router)
                        # print(f'Router {module_name} included')

                # check if data folder exists, if yes import data
                if os.path.isdir(f"{app_folder}/data"):
                    module = importlib.import_module(
                        f'{app_folder.replace("/", ".")}.data'
                    )
                    import_order = getattr(module, "import_order", [])

                    for file in import_order:
                        import_csv_data(f"{app_folder}/data/{file}", db)
        finally:
            db.close()
