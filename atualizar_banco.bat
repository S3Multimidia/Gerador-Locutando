@echo off
echo ==========================================
echo ATUALIZANDO BANCO DE DADOS (AUTH + CORE)
echo ==========================================
echo.
echo 1. Atualizando sistema de autenticacao...
python backend/manage.py migrate
echo.
echo 2. Atualizando app Core...
python backend/manage.py makemigrations core
python backend/manage.py migrate
echo.
echo ==========================================
echo Concluido! Pode fechar esta janela.
echo ==========================================
pause
