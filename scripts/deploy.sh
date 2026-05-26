#!/usr/bin/env bash

set -euo pipefail

# --- Configuración ---
SSH_ALIAS="hostinger-lab"
DOMAIN="labtecnosocial.org"
BUILD_DIR="${npm_package_config_buildDir:?'Falta config.buildDir en package.json'}"
REMOTE_BASE="domains/$DOMAIN/public_html/$BUILD_DIR"
# ---------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "==> Build..."
bash "$SCRIPT_DIR/build.sh"

echo "==> Deploy a $SSH_ALIAS:$REMOTE_BASE"
rsync -avz --delete \
  --exclude '.DS_Store' \
  "$ROOT_DIR/$BUILD_DIR/" \
  "$SSH_ALIAS:$REMOTE_BASE/"

echo "==> Listo: https://$DOMAIN/$BUILD_DIR"
