#!/bin/bash
# start.sh — Start ragna999 bridge with auto-restart
# Usage: ./start.sh [foreground|background]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

MODE="${1:-background}"

# Check .env
if [ ! -f .env ]; then
  echo "[ERROR] .env file not found. Copy .env.example and configure."
  exit 1
fi

# Check node_modules
if [ ! -d node_modules ]; then
  echo "[INFO] Installing dependencies..."
  npm install --production
fi

# Refresh AnvitaFlow gateway token
echo "[INFO] Refreshing AnvitaFlow gateway token..."
anvitaflow a2a login --auto --role server 2>/dev/null || echo "[WARN] Could not refresh token"

# Start bridge
start_bridge() {
  echo "[INFO] Starting ragna999 bridge..."
  node src/index.js
}

if [ "$MODE" = "foreground" ]; then
  start_bridge
else
  echo "[INFO] Starting in background with auto-restart..."
  while true; do
    start_bridge
    EXIT_CODE=$?
    echo "[WARN] Bridge exited (code $EXIT_CODE). Restarting in 5s..."
    sleep 5
  done
fi
