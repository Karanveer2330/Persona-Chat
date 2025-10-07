@echo off
echo 🚀 Starting SecureMessenger Application...
echo.

echo 📡 Starting Backend Server (Tunnel)...
cd server
start "Backend Server" cmd /k "node tunnel-server.js"
timeout /t 3 /nobreak >nul

echo 🌐 Starting Frontend Server (Next.js)...
cd ..
start "Frontend Server" cmd /k "npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ✅ Both servers should be starting...
echo.
echo 📋 Access URLs:
echo    Backend:  https://localhost:9443
echo    Frontend: http://localhost:3000
echo.
echo 💡 For camera access, use the backend URL
echo 💡 For development, use the frontend URL
echo.
echo 💡 For camera access, use the backend URL
echo.
pause 