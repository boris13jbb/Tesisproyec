@echo off
setlocal
chcp 65001 >nul
title SGD-GADPR-LM — lanzador desarrollo

rem Ir a raíz del repo (paths con espacios: comillas duplicadas en el inner cmd.exe)
cd /d "%~dp0"

echo ============================================================
echo   SGD-GADPR-LM — Backend ^(NestJS^) + Frontend ^(Vite^)
echo ============================================================
echo.

echo [1/2] Abriendo Backend  en nueva ventana  (^:3000^)...
start "SGD Backend (NestJS :3000)" cmd /d /c "cd /d ""%CD%\backend"" && npm run start:dev" <nul

timeout /t 2 /nobreak >nul

echo [2/2] Abriendo Frontend en nueva ventana  (^:5173^)...
start "SGD Frontend (Vite :5173)" cmd /d /c "cd /d ""%CD%\frontend"" && npm run dev -- --host 0.0.0.0 --port 5173" <nul

echo.
echo Ventanas lanzadas ^(mantén MySQL/XAMPP activo para el Backend^).
echo   Web: http://localhost:5173
echo   API: http://localhost:3000/api/v1
echo.
echo Cierra cada ventana titulada SGD para detener ese servicio.
echo.
pause
endlocal
