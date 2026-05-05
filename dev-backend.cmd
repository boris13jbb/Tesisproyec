@echo off
setlocal
cd /d "%~dp0backend" || exit /b 1
npm run start:dev

