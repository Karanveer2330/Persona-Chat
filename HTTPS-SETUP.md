# 🔐 HTTPS Certificate Setup Guide

This guide will help you set up HTTPS certificates for mobile camera access.

## 🚀 Quick Setup (Recommended)

### Option 1: PowerShell (Windows)
```bash
# Run as Administrator
npm run generate-ssl-powershell
npm run dev:https
```

### Option 2: Node.js (Cross-platform)
```bash
npm run generate-ssl
npm run dev:https
```

## 📱 Mobile Access URLs

After setup, access your app via:
- **HTTPS**: `https://localhost:3000`
- **Mobile**: `https://192.168.1.8:3000` (replace with your local IP)
- **Test Page**: `https://192.168.1.8:3000/mobile-connection-test.html`

## 🔧 Manual Setup

### Step 1: Generate Certificates

#### PowerShell (Windows):
```powershell
# Run PowerShell as Administrator
.\generate-cert-simple.ps1
```

#### Node.js (Cross-platform):
```bash
node generate-ssl-simple.js
```

### Step 2: Start HTTPS Server
```bash
npm run dev:https
```

## 🛠️ Troubleshooting

### Certificate Issues
- **"Not Secure" warning**: Accept the certificate in your browser
- **Certificate error**: Regenerate certificates with `npm run generate-ssl`
- **Permission denied**: Run PowerShell as Administrator

### Mobile Connection Issues
1. **Check IP address**: Use `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. **Firewall**: Allow port 3000 through Windows Firewall
3. **Network**: Ensure both devices are on the same WiFi network

### Camera Access Issues
1. **HTTPS required**: Mobile browsers require HTTPS for camera access
2. **Permissions**: Allow camera permissions when prompted
3. **Browser**: Use modern browsers (Chrome, Firefox, Safari)

## 🌐 Network Configuration

### Find Your Local IP
```bash
# Windows
ipconfig | findstr "IPv4"

# Mac/Linux
ifconfig | grep "inet "
```

### Firewall Rules
```powershell
# Allow port 3000 through Windows Firewall
netsh advfirewall firewall add rule name="Next.js HTTPS" dir=in action=allow protocol=TCP localport=3000
```

## 📋 Certificate Files

Generated certificates are stored in:
- `certs/localhost.pem` - Certificate file
- `certs/localhost-key.pem` - Private key file

## 🔒 Security Notes

- These are **self-signed certificates** for development only
- **Do not use** in production environments
- Certificates expire after 1 year
- Regenerate certificates if you get security warnings

## 🆘 Still Having Issues?

1. **Test connection**: Visit `/mobile-connection-test.html`
2. **Check console**: Look for error messages in browser console
3. **Verify HTTPS**: Ensure URL starts with `https://`
4. **Try different browser**: Some browsers handle certificates differently

## 📞 Support

If you continue having issues:
1. Check the browser console for specific error messages
2. Verify your local IP address matches the certificate
3. Ensure both devices are on the same network
4. Try accessing from a different mobile device

---

**Happy coding! 🎉**

