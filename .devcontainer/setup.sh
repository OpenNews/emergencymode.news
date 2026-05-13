#!/bin/bash
set -e

# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create venv and install all project dependencies
uv sync

# Register the project venv as a named Jupyter kernel
uv run python -m ipykernel install \
  --user \
  --name=emergencymode-disaster-risk \
  --display-name="Emergency Mode Disaster Risk"
