@echo off
cd /d "%~dp0"
docker info >nul 2>&1
if errorlevel 1 (
  echo Start Docker Desktop, then open this file again.
  pause
  exit /b 1
)
docker compose --progress quiet --env-file .env.n8n -f compose.yml -f compose.tunnel.yml up -d
if errorlevel 1 exit /b 1
node scripts/connect-automations.mjs
if errorlevel 1 (
  echo The tunnel may still be starting. Wait a few seconds and open this file again.
  pause
  exit /b 1
)
echo Automations connected. Editor: http://localhost:5678
pause
