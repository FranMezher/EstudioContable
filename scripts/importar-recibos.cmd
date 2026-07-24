@echo off
REM ---------------------------------------------------------------------------
REM Importa los recibos de la carpeta mensual y deja registro en logs\.
REM Pensado para el Programador de tareas de Windows (ver docs/IMPORTADOR.md).
REM
REM Uso manual:  scripts\importar-recibos.cmd
REM Simulacion:  scripts\importar-recibos.cmd --dry-run
REM ---------------------------------------------------------------------------

setlocal
REM UTF-8, para que los acentos del registro no salgan como simbolos raros.
chcp 65001 >nul
cd /d "%~dp0.."

if not exist "logs" mkdir "logs"
set "LOG=logs\importador.log"

echo.>> "%LOG%"
echo ==========================================================>> "%LOG%"
echo [%date% %time%] Iniciando importacion>> "%LOG%"

call npx tsx scripts/import-payslips.ts %* >> "%LOG%" 2>&1
set "CODE=%ERRORLEVEL%"

if not "%CODE%"=="0" (
  echo [%date% %time%] TERMINO CON ERRORES ^(codigo %CODE%^)>> "%LOG%"
) else (
  echo [%date% %time%] Terminado correctamente>> "%LOG%"
)

REM Muestra en pantalla el final del registro cuando se corre a mano.
if "%CODE%"=="0" (echo Importacion terminada. Detalle en %LOG%) else (echo La importacion fallo. Ver %LOG%)

exit /b %CODE%
