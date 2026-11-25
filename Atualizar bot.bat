@echo off
title Atualizar Bot de Figurinhas
cd /d "%~dp0"
where git >nul 2>&1 || (echo Git nao instalado. Rode: winget install Git.Git & pause & exit /b)
if not exist .git (
  git init -q
  git remote add origin https://github.com/rdgsquel/rdgsquel.git
)
echo Baixando atualizacoes...
git fetch -q origin claude/whatsapp-sticker-bot-gt3vjr || (echo Falha ao baixar. & pause & exit /b)
git reset -q --hard FETCH_HEAD
call npm.cmd install --silent
echo.
echo Bot atualizado! Seu login do WhatsApp foi mantido.
pause
