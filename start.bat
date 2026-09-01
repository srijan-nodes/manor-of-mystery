@echo off
setlocal
title Manor of Whispers - Launcher

echo ========================================================
echo        MANOR OF WHISPERS: 3D DETECTIVE MYSTERY
echo ========================================================
echo.

:: 1. Check if Ollama is running, launch if not
echo [1/3] Checking Ollama API connection...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [*] Ollama is not active. Launching Ollama in background...
    start /b "" ollama serve
    timeout /t 2 /nobreak >nul
) else (
    echo [OK] Ollama is active and ready.
)

:: 2. Open game in default web browser
echo [2/3] Opening browser at http://localhost:8000/fps01.html...
start http://localhost:8000/fps01.html

:: 3. Start local Python web server
echo [3/3] Starting local game server on port 8000...
echo.
echo ========================================================
echo  Game is running! Keep this window open while playing.
echo  Close this window or press Ctrl+C to stop the server.
echo ========================================================
echo.
python -m http.server 8000
