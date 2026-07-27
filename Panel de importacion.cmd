@echo off
REM ===========================================================================
REM  PANEL DE IMPORTACIÓN — Mezher Pampin
REM  Doble clic para abrir el panel visual en el navegador.
REM  Dejá esta ventana abierta mientras lo usás; cerrala para terminar.
REM ===========================================================================
chcp 65001 >nul
title Panel de importacion - Mezher Pampin
cd /d "%~dp0"

call npx tsx scripts/panel-importador.ts

pause
