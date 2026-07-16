#!/bin/bash
set -e

cd "$(dirname "$0")"
export PATH="/usr/local/bin:$PATH"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Node.js or npm is not installed in /usr/local/bin."
  echo "Run the permanent Node setup before starting Smart Reel Studio."
  read -r -p "Press Enter to close..."
  exit 1
fi

export PORT="${PORT:-4001}"
echo "Starting Smart Reel Studio at http://localhost:${PORT}/"
exec npm run hub
