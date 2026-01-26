@echo off
echo ==========================================
echo INSTALANDO FFMPEG (NECESSARIO PARA AUDIO)
echo ==========================================
echo.
echo O Windows vai pedir confirmacao para instalar.
echo Por favor, digite Y e aperte ENTER quando pedir.
echo.
winget install "FFmpeg (Essentials Build)" --id gyan.ffmpeg.essentials  --source winget
echo.
echo ==========================================
echo A instalacao terminou?
echo Se sim, FECHE esta janela e FECHE a janela do servidor preto.
echo Depois abra o "iniciar_backend.bat" de novo.
echo ==========================================
pause
