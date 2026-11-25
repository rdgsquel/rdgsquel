@echo off
title Bot de Figurinhas
cd /d "%~dp0"
if not exist node_modules (
  echo Instalando dependencias, aguarde...
  call npm.cmd install
)
if not exist .env copy .env.example .env >nul
call npm.cmd start --silent || pause
