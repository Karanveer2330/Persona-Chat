@echo off
echo 📱 Starting Mobile Servers...
echo.

echo 🔧 Starting Backend Server (Port 5000)...
start "Backend Server" cmd /k "cd server && node main.js"

echo ⏳ Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak >nul

echo 🌐 Starting Frontend Server (Port 9002)...
start "Frontend Server" cmd /k "npm run dev"

echo.
echo ✅ Both servers are starting...
echo.
echo 📱 Mobile Access URLs:
echo    Main App: http://192.168.1.4:9002
echo    Signup: http://192.168.1.4:9002/signup
echo    Login: http://192.168.1.4:9002/login
echo.
echo 🔥 Don't forget to add firewall rules (run as Administrator):
echo    netsh advfirewall firewall add rule name="Backend Server Port 5000" dir=in action=allow protocol=TCP localport=5000
echo.
pause 