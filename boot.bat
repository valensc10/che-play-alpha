@echo off
chcp 65001 >nul
title ChePlay - Servidor
cd /d "%~dp0"
echo Iniciando ChePlay...
echo.

if exist "node-portable\node.exe" (
    set "NODE=.\node-portable\node.exe"
) else (
    set "NODE=node"
)

if not exist "node_modules" (
    echo Instalando dependencias por unica vez...
    call npm install
)

%NODE% server\index.js

pause
