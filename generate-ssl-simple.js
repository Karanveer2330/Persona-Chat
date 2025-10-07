const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔐 Generating SSL certificates for HTTPS development...');

// Create certs directory if it doesn't exist
const certsDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

const certPath = path.join(certsDir, 'localhost.pem');
const keyPath = path.join(certsDir, 'localhost-key.pem');

// Get local IP address for mobile access
const os = require('os');
const networkInterfaces = os.networkInterfaces();
let localIP = '192.168.1.8'; // Default fallback

for (const interfaceName in networkInterfaces) {
  const interfaces = networkInterfaces[interfaceName];
  for (const iface of interfaces) {
    if (iface.family === 'IPv4' && !iface.internal) {
      localIP = iface.address;
      break;
    }
  }
}

console.log(`📱 Detected local IP: ${localIP}`);

try {
  // Generate self-signed certificate using OpenSSL
  const opensslCommand = `openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Development/CN=localhost" -addext "subjectAltName=DNS:localhost,DNS:127.0.0.1,IP:127.0.0.1,IP:${localIP}"`;
  
  console.log('📝 Running OpenSSL command...');
  execSync(opensslCommand, { stdio: 'inherit' });
  
  console.log('✅ SSL certificates generated successfully!');
  console.log(`📁 Certificate: ${certPath}`);
  console.log(`🔑 Private Key: ${keyPath}`);
  console.log('');
  console.log('🌐 You can now access your app via HTTPS:');
  console.log(`   - https://localhost:3000`);
  console.log(`   - https://127.0.0.1:3000`);
  console.log(`   - https://${localIP}:3000`);
  console.log('');
  console.log('📱 For mobile access:');
  console.log(`   - Visit: https://${localIP}:3000`);
  console.log('   - Accept the certificate warning in your browser');
  console.log('   - Camera access will now work properly');
  console.log('');
  console.log('⚠️ Note: This is a self-signed certificate for development only');
  
} catch (error) {
  console.error('❌ Failed to generate SSL certificates:', error.message);
  console.log('');
  console.log('💡 Alternative solutions:');
  console.log('1. Install OpenSSL: https://slproweb.com/products/Win32OpenSSL.html');
  console.log('2. Use PowerShell certificate generation (see generate-cert.ps1)');
  console.log('3. Use a tunnel service like ngrok for HTTPS');
  console.log('');
  
  // Create dummy certificates for testing
  console.log('📝 Creating dummy certificates for testing...');
  fs.writeFileSync(certPath, '-----BEGIN CERTIFICATE-----\nDUMMY CERTIFICATE\n-----END CERTIFICATE-----');
  fs.writeFileSync(keyPath, '-----BEGIN PRIVATE KEY-----\nDUMMY PRIVATE KEY\n-----END PRIVATE KEY-----');
  
  console.log('⚠️ Dummy certificates created. HTTPS will not work properly.');
  console.log('💡 Please install OpenSSL and run this script again for proper HTTPS support.');
}

