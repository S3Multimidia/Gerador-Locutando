@echo off
setlocal
rem Usa automaticamente a pasta onde este .bat está salvo
set "PROJECT_DIR=%~dp0"
set "PORT=%~1"
if "%PORT%"=="" set "PORT=5173"

rem Encerra qualquer processo escutando na PORT
for /f "tokens=5" %%A in ('netstat -ano ^| findstr :%PORT% ^| findstr LISTENING') do taskkill /PID %%A /F >nul 2>&1

rem Fecha janelas antigas do dev server iniciadas por este script
taskkill /FI "WINDOWTITLE eq Vite Dev Server" /F >nul 2>&1

cd /d "%PROJECT_DIR%"
start "Vite Dev Server" cmd /c "npm.cmd run dev -- --port %PORT%"
timeout /t 2 >nul
start "" "http://localhost:%PORT%"
exit /b 0