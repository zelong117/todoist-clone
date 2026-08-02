@echo off
setlocal
chcp 65001 >nul
title TaskFlow local services
cd /d "%~dp0"

if not exist "node_modules\.bin\vite.cmd" (
  echo Frontend dependencies are missing. Run: npm ci
  pause
  exit /b 1
)
if not exist "server\node_modules\express\package.json" (
  echo Backend dependencies are missing. Run: cd server ^&^& npm ci
  pause
  exit /b 1
)

echo Starting TaskFlow backend on port 3001...
start "TaskFlow Backend" /min /D "%~dp0server" cmd /c npm start
timeout /t 3 /nobreak >nul

echo Starting TaskFlow frontend on port 5173...
start "TaskFlow Frontend" /min /D "%~dp0" cmd /c "npm run dev -- --host 0.0.0.0"
timeout /t 4 /nobreak >nul

curl --fail --silent http://127.0.0.1:3001/api/health >nul
if errorlevel 1 (
  echo Backend health check failed. Inspect the TaskFlow Backend window.
) else (
  echo Backend healthy: http://127.0.0.1:3001/api/health
)
curl --fail --silent http://127.0.0.1:5173/ >nul
if errorlevel 1 (
  echo Frontend health check failed. Inspect the TaskFlow Frontend window.
) else (
  echo Frontend healthy: http://127.0.0.1:5173/
  start "" http://127.0.0.1:5173/
)
echo.
echo Stop only these services from their two titled windows, or use their PID from Task Manager.
pause
