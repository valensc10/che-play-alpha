#!/bin/bash
# ChePlay - arranque en Mac (doble clic). La primera vez: chmod +x boot.command
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Necesitás instalar Node.js (https://nodejs.org) y volver a abrir este archivo."; read -n 1 -s -r -p "Presioná una tecla para salir…"; exit 1
fi
npm install --no-audit --no-fund --prefer-offline
node server/index.js
