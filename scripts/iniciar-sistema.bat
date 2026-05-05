@echo off
setlocal
cd /d "%~dp0.."
echo Directorio del proyecto: %CD%
echo Ejecutando npm run dev:all (backend + frontend)...
call npm run dev:all
endlocal
