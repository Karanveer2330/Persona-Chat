@echo off
echo 🔧 Starting Tunnel Server for Mobile Access...
echo.
echo 📱 This will enable mobile access via HTTPS tunnel
echo.

cd server
node tunnel-server.js

pause 