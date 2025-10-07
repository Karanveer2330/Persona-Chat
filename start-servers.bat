@echo off
echo Starting SecureMessenger with HTTPS...
echo.
echo [1] Starting backend server...
cd server
start "Backend Server" cmd /k "node main.js"
timeout /t 3 /nobreak >nul
echo [2] Starting frontend server...
cd ..
start "Frontend Server" cmd /k "npm run dev"
echo.
echo Both servers should be starting in separate windows...
echo Backend: https://localhost:3443
echo Frontend: https://localhost:9443
echo.
pause
