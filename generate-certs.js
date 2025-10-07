const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔐 Generating SSL certificates for HTTPS development...');

// Create certs directory if it doesn't exist
const certsDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
  console.log('📁 Created certs directory');
}

try {
  // Generate private key
  console.log('🔑 Generating private key...');
  execSync('openssl genrsa -out certs/localhost-key.pem 2048', { stdio: 'inherit' });
  
  // Generate certificate
  console.log('📜 Generating certificate...');
  execSync('openssl req -new -x509 -key certs/localhost-key.pem -out certs/localhost.pem -days 365 -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"', { stdio: 'inherit' });
  
  console.log('✅ SSL certificates generated successfully!');
  console.log('📁 Certificates saved to: certs/localhost-key.pem and certs/localhost.pem');
  console.log('🚀 You can now run: npm run dev:https-server');
  
} catch (error) {
  console.error('❌ Error generating certificates:', error.message);
  console.log('💡 Make sure OpenSSL is installed on your system');
  console.log('💡 On Windows, you can install OpenSSL via:');
  console.log('   - Chocolatey: choco install openssl');
  console.log('   - Or download from: https://slproweb.com/products/Win32OpenSSL.html');
}
