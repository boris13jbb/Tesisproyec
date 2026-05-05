@echo off
setlocal
cd /d "%~dp0.."
set "REPO=%CD%"

echo Abriendo backend en una ventana nueva...
start "SGD Backend" powershell -NoExit -Command "Set-Location -LiteralPath $env:REPO; Write-Host 'Backend (NestJS)' -ForegroundColor Blue; npm run start:dev --prefix backend"

timeout /t 2 /nobreak >nul

echo Abriendo frontend en otra ventana...
start "SGD Frontend" powershell -NoExit -Command "Set-Location -LiteralPath $env:REPO; Write-Host 'Frontend (Vite)' -ForegroundColor Magenta; npm run dev --prefix frontend"

echo.
echo Listo. Revisa las dos ventanas.
endlocal
