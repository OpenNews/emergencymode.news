#!/bin/bash
set -e

# Keep this install deterministic: when bumping UV_VERSION,
# update the per-architecture UV_SHA256 values from the matching
# .sha256 assets in the same GitHub release tag.
UV_VERSION="0.5.10"

# Install system packages (shellcheck, GitHub CLI) if needed
NEEDS_APT_UPDATE=0
if ! command -v shellcheck >/dev/null 2>&1; then
  NEEDS_APT_UPDATE=1
fi
if ! command -v gh >/dev/null 2>&1; then
  NEEDS_APT_UPDATE=1
fi

if [[ "$NEEDS_APT_UPDATE" -eq 1 ]]; then
  sudo apt-get update
  if ! command -v shellcheck >/dev/null 2>&1; then
    sudo apt-get install -y shellcheck
  fi
  if ! command -v gh >/dev/null 2>&1; then
    sudo apt-get install -y gh
  fi
fi

# Install uv in user space if missing or version does not match UV_VERSION
INSTALL_PINNED_UV=0
if ! command -v uv >/dev/null 2>&1; then
  INSTALL_PINNED_UV=1
else
  INSTALLED_UV_VERSION="$(uv --version 2>/dev/null | awk '{print $2}')"
  if [[ "${INSTALLED_UV_VERSION}" != "${UV_VERSION}" ]]; then
    INSTALL_PINNED_UV=1
  fi
fi

if [[ "${INSTALL_PINNED_UV}" -eq 1 ]]; then

  case "$(uname -m)" in
    x86_64)
      UV_ARCHIVE="uv-x86_64-unknown-linux-gnu.tar.gz"
      UV_SHA256="13452b7a99d953e970ec52861de03f6f2e00bfee2c4357bc63c292a70472b386"
      ;;
    aarch64)
      UV_ARCHIVE="uv-aarch64-unknown-linux-gnu.tar.gz"
      UV_SHA256="f4316a657c964994d7eb736ba875f3f685c4b61e961f514e98fb50ed181da72a"
      ;;
    *)
      echo "Error: unsupported architecture for pinned uv install: $(uname -m)" >&2
      exit 1
      ;;
  esac

  UV_URL="https://github.com/astral-sh/uv/releases/download/${UV_VERSION}/${UV_ARCHIVE}"
  TMP_UV_ARCHIVE="$(mktemp)"
  TMP_UV_DIR="$(mktemp -d)"

  trap 'rm -f "${TMP_UV_ARCHIVE:-}"; rm -rf "${TMP_UV_DIR:-}"' EXIT

  curl -LsSf -o "${TMP_UV_ARCHIVE}" "${UV_URL}"
  echo "${UV_SHA256}  ${TMP_UV_ARCHIVE}" | sha256sum -c -

  mkdir -p "$HOME/.local/bin"
  tar -xzf "${TMP_UV_ARCHIVE}" -C "${TMP_UV_DIR}"

  UV_BIN_PATH="$(find "${TMP_UV_DIR}" -type f -name uv | head -n 1)"
  if [[ -z "${UV_BIN_PATH}" ]]; then
    echo "Error: could not find uv binary in ${UV_ARCHIVE}" >&2
    exit 1
  fi

  install -m 0755 "${UV_BIN_PATH}" "$HOME/.local/bin/uv"
fi

# Ensure user-level binaries are available in this shell
export PATH="$HOME/.local/bin:$PATH"

# Skip project setup in CI - only validate container tools are installed
# CI workflow checks tool versions without needing full project dependencies
if [[ "${CI:-}" != "true" ]]; then
  # Create venv and install all project dependencies
  uv sync

  # Register the project venv as a named Jupyter kernel
  uv run python -m ipykernel install \
    --user \
    --name=emergencymode-disaster-risk \
    --display-name="Emergency Mode Disaster Risk"
fi
