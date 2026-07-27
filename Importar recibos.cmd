@echo off
REM ===========================================================================
REM  IMPORTADOR DE RECIBOS — Mezher Pampin
REM  Doble clic para abrir el menú. Elegís la empresa y listo.
REM ===========================================================================
chcp 65001 >nul
title Importador de recibos - Mezher Pampin
cd /d "%~dp0"

call npx tsx scripts/menu-importador.ts

echo.
pause
