#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "==> Creating virtual environment..."
python3 -m venv .venv

echo "==> Installing dependencies..."
.venv/bin/pip install --quiet --upgrade pip
.venv/bin/pip install --quiet -r requirements.txt

echo "==> Creating local .env..."
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  sed -i 's|redis://redis:|redis://localhost:|g' .env.local
  echo "Created .env.local — set ENCRYPTION_KEY and SECRET_KEY before running!"
else
  echo ".env.local already exists, skipping."
fi

echo ""
echo "Setup complete. Run with:  ./start.sh"
