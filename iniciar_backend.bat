@echo off
echo Iniciando servidor backend...
cd backend
python manage.py runserver 0.0.0.0:8000
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERRO: Falha ao iniciar o Python.
    echo Verifique se o Python esta instalado e adicionado ao PATH do sistema.
    pause
)
pause
