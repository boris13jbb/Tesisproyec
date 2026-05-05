@echo off
setlocal
echo Iniciando backend...
start "SGD Backend" cmd /d /c "%~dp0dev-backend.cmd" <nul
timeout /t 2 /nobreak >nul
echo Iniciando frontend...
start "SGD Frontend" cmd /d /c "%~dp0dev-frontend.cmd" <nul
echo Listo. Frontend: http://localhost:5173  Backend: http://localhost:3000/api/v1

