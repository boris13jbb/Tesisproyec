@echo off
setlocal
cd /d "%~dp0frontend" || exit /b 1
npm run dev -- --host 0.0.0.0 --port 5173

