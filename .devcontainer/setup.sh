#!/bin/bash
set -e

# Install uv in user space if needed
if ! command -v uv >/dev/null 2>&1; then
  curl -LsSf https://astral.sh/uv/install.sh | sh
fi

# Ensure user-level binaries are available in this shell
export PATH="$HOME/.local/bin:$PATH"

# Create venv and install all project dependencies
uv sync

# Register the project venv as a named Jupyter kernel
uv run python -m ipykernel install \
  --user \
  --name=emergencymode-disaster-risk \
  --display-name="Emergency Mode Disaster Risk"
