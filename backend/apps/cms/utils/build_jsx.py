import tempfile
import subprocess  # nosec B404
import os
from fastapi import HTTPException


def build_jsx(jsx_code: str, component_name: str | None = None) -> str:
    current_dir = os.getcwd()

    with tempfile.NamedTemporaryFile(suffix=".jsx", delete=False) as f:
        f.write(jsx_code.encode())
        f.flush()
        out_path = f.name.replace(".jsx", ".js")

        try:
            command = [
                "node",
                "./apps/cms/utils/build-jsx.mjs",
                f.name,
                out_path,
            ]
            if component_name:
                command.append(component_name)

            subprocess.run(  # nosec B603 B607
                command,
                check=True,
                capture_output=True,
                text=True,
                cwd=current_dir,
            )

        except subprocess.CalledProcessError as e:
            if os.path.exists(f.name):
                os.unlink(f.name)
            if os.path.exists(out_path):
                os.unlink(out_path)
            raise HTTPException(
                status_code=500,
                detail=f"JSX compilation failed: {e.stderr}",
            )

    # Read compiled code
    with open(out_path) as f2:
        code = f2.read()

    # Clean up temp files
    os.unlink(f.name)
    os.unlink(out_path)

    return code
