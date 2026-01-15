from settings import installed_apps
import os
import inspect
from typing import Any

app_folders = [f"apps/{app_name}" for app_name in installed_apps]
models_pool: dict[str:Any] = {}

for app_folder in app_folders:
    # check if model folder exists, if yes build models pool
    if os.path.isdir(f"{app_folder}/models"):
        # list files in models folder
        files = os.listdir(f"{app_folder}/models")
        # filter files only python files, and not __init__.py
        files = list(filter(lambda x: x[-3:] == ".py" and x != "__init__.py", files))
        # loop through model files and import them
        for file in files:
            module_name = f'{app_folder.replace("/", ".")}.models.{file[:-3]}'
            module = __import__(module_name, fromlist=[""])
            models = [
                cls
                for name, cls in inspect.getmembers(module, inspect.isclass)
                if
                # check if sqlachemy model
                hasattr(cls, "__tablename__") and cls.__module__ == module.__name__
            ]
            models_pool.update({model.__tablename__: model for model in models})
