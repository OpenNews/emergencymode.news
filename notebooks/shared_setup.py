"""Shared setup utilities for disaster risk analysis notebooks."""

import subprocess
import sys
from IPython.display import HTML, display
import requests


def check_dependencies():
    """Verify environment is in sync with uv.lock and packages are importable."""
    # Check if environment is in sync with uv.lock
    sync_result = subprocess.run(
        ['uv', 'sync', '--frozen'],
        capture_output=True,
        text=True,
        cwd='..'  # Run from repo root, not notebooks dir
    )

    if sync_result.returncode != 0:
        # Environment is out of sync
        display(HTML("""
        <style>
            .dep-check-error {{
                border: 2px solid #f44336;
                padding: 15px;
                border-radius: 5px;
                background-color: transparent;
                color: inherit;
            }}
            .dep-check-error h3 {{
                margin-top: 0;
                color: #f44336;
            }}
            .dep-check-error code {{
                background-color: transparent;
                color: inherit;
                padding: 2px 4px;
                border: 1px solid #f44336;
                border-radius: 2px;
            }}
        </style>
        <div class="dep-check-error">
            <h3>⚠️ Environment is out of sync</h3>
            <p>Run in Terminal: <code>uv sync</code></p>
        </div>
        """))
        return

    # Environment is in sync; verify critical packages are importable
    critical_packages = [
        'pandas',
        'requests',
        'jupyterlab',
        'ipykernel',
        'tqdm',
        'numpy',
        'requests'
    ]
    missing = []

    for pkg in critical_packages:
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)

    if missing:
        display(HTML(f"""
        <style>
            .dep-check-error {{
                border: 0px;
                padding: 0px;
                border-radius: 0px;
                background-color: transparent;
                color: inherit;
            }}
            .dep-check-error h3 {{
                margin-top: 0;
                color: #f44336;
            }}
        </style>
        <div class="dep-check-error">
            <h3>⚠️ Missing packages: {', '.join(missing)}</h3>
            <p>Run in Terminal: <code>uv sync</code>, then restart kernel.</p>
        </div>
        """))
    else:
        # All checks passed
        python_version = f"Python=={sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
        versions = [python_version]
        for pkg in critical_packages:
            try:
                mod = __import__(pkg)
                if hasattr(mod, '__version__'):
                    versions.append(f"{pkg}=={mod.__version__}")
            except:
                pass

        version_str = "<br>".join(
            versions) if versions else "All packages available"

        display(HTML(f"""
        <style>
            .dep-check-success {{
                border: 0px;
                padding: 0px;
                border-radius: 0px;
                background-color: transparent;
                color: inherit;
            }}
            .dep-check-success h3 {{
                margin-top: 0;
                color: #4caf50;
            }}
            .dep-check-success pre {{
                background-color: transparent;
                color: inherit;
                border: 1px solid #666;
                padding: 10px;
                border-radius: 3px;
                font-size: 12px;
            }}
        </style>
        <div class="dep-check-success">
            <h3>✅ Environment is healthy and in sync</h3>
            <pre>{version_str}</pre>
        </div>
        """))
