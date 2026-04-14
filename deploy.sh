#!/bin/bash
# deploy.sh – Auf dem Server ausführen: bash deploy.sh
set -e

REPO="ssh://git@webquantum.info:8322/Uwe/ouro-news.git"
DIR="/opt/ouro-news"

echo "==> ouro.news Deploy"

# Repo klonen oder updaten
if [ -d "$DIR/.git" ]; then
  echo "==> Aktualisiere Code..."
  cd "$DIR"
  git pull gitea main
else
  echo "==> Klone Repo..."
  git clone "$REPO" "$DIR"
  cd "$DIR"
fi

# .env prüfen
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "  ⚠  .env wurde angelegt. Bitte API-Keys eintragen:"
  echo "     nano /opt/ouro-news/.env"
  echo ""
fi

# Bauen und starten
echo "==> Baue Docker-Images..."
docker compose build --no-cache

echo "==> Starte Dienste..."
docker compose up -d

echo ""
echo "  ✓ ouro.news läuft auf http://$(hostname -I | awk '{print $1}'):4321"
echo ""
echo "  Logs:   docker compose logs -f app"
echo "  Stop:   docker compose down"
