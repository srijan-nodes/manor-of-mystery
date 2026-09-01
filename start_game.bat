@echo off
echo Starting local web server for Manor of Mystery...
start /B python -m http.server 8080
timeout /t 2 /nobreak >nul
start http://localhost:8080/fps01.html
echo.
echo Server running at http://localhost:8080
echo Keep this window open while playing. Close it to stop the server.
