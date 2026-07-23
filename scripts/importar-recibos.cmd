@echo off
REM ---------------------------------------------------------------------------
REM Importa los recibos de la carpeta mensual.
REM Programalo con el Programador de tareas de Windows (ver docs/IMPORTADOR.md).
REM ---------------------------------------------------------------------------

cd /d "%~dp0.."

echo [%date% %time%] Iniciando importacion de recibos...
call npx tsx scripts/import-payslips.ts %*

if errorlevel 1 (
  echo [%date% %time%] La importacion TERMINO CON ERRORES.
  exit /b 1
)

echo [%date% %time%] Importacion terminada.
