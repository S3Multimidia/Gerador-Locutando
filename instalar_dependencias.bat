@echo off
echo ==========================================
echo CONFIGURANDO BACKEND DO LOCUTANDO
echo ==========================================
echo.
echo 1. Verificando Python...
python --version
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Python nao encontrado!
    echo Por favor, instale o Python em https://python.org
    echo IMPORTANTE: Marque a opcao "Add Python to PATH" na instalacao.
    pause
    exit /b
)

echo.
echo 2. Instalando depedencias...
pip install -r backend/requirements.txt

echo.
echo 3. Verificando Banco de Dados...
cd backend
python manage.py migrate

echo.
echo ==========================================
echo TUDO PRONTO!
echo Agora execute o arquivo "iniciar_backend.bat"
echo ==========================================
pause
