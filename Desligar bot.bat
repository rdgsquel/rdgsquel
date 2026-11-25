@echo off
cd /d "%~dp0"
if not exist bot.pid (
  echo O bot nao esta ligado.
  pause
  exit /b
)
set /p PID=<bot.pid
taskkill /PID %PID% /T /F >nul 2>&1
del bot.pid >nul 2>&1
echo Bot desligado.
timeout /t 3 >nul
