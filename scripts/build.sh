#!/usr/bin/env bash

set -euo pipefail

# --- Configuración ---
OUTPUT_DIR="${npm_package_config_buildDir:?'Falta config.buildDir en package.json'}"
EXCLUDE_EXTRA=(
  "$OUTPUT_DIR"
)
# ---------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$ROOT_DIR/$OUTPUT_DIR"

rm -rf "$BUILD_DIR" "$ROOT_DIR/dist"
mkdir -p "$BUILD_DIR"

EXCLUDES=(
  '.git'
  'dist'
  'scripts'
  '.gitignore'
  '.vscode'
  '.claude'
  'CLAUDE.md'
  '.DS_Store'
  'README.md'
  'package.json'
)
for e in "${EXCLUDE_EXTRA[@]}"; do EXCLUDES+=("$e"); done

RSYNC_ARGS=()
for e in "${EXCLUDES[@]}"; do RSYNC_ARGS+=(--exclude "$e"); done

rsync -a --delete "${RSYNC_ARGS[@]}" "$ROOT_DIR/" "$BUILD_DIR/"


# Cache-busting en index.html
V="$(date +%s)"
sed -i '' "s/styles\.css\"/styles.css?v=$V\"/g; s/trufi-main\.js\"/trufi-main.js?v=$V\"/g" "$BUILD_DIR/index.html"
echo "Cache version: $V"

# Reporte de tamaño del build generado
BUILD_SIZE_HUMAN="$(du -sh "$BUILD_DIR" | awk '{print $1}')"
BUILD_SIZE_BYTES="$(du -sk "$BUILD_DIR" | awk '{print $1 * 1024}')"
echo "Build size: ${BUILD_SIZE_HUMAN} (${BUILD_SIZE_BYTES} bytes)"
