const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔐 Generating self-signed SSL certificates for HTTPS...');

const certsDir = path.join(__dirname, 'certs');
const certPath = path.join(certsDir, 'localhost.pem');
const keyPath = path.join(certsDir, 'localhost-key.pem');

// Create certs directory if it doesn't exist
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

try {
  // Generate self-signed certificate using OpenSSL
  const opensslCommand = `openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"`;
  
  console.log('📝 Running OpenSSL command...');
  execSync(opensslCommand, { stdio: 'inherit' });
  
  console.log('✅ SSL certificates generated successfully!');
  console.log(`📁 Certificate: ${certPath}`);
  console.log(`🔑 Private Key: ${keyPath}`);
  console.log('🌐 You can now access the app via HTTPS');
  console.log('⚠️ Note: You may need to accept the self-signed certificate in your browser');
  
} catch (error) {
  console.error('❌ Failed to generate SSL certificates:', error.message);
  console.log('💡 Alternative: You can manually create the certificates or use a different method');
  
  // Create dummy certificates for testing
  console.log('📝 Creating dummy certificates for testing...');
  fs.writeFileSync(certPath, '-----BEGIN CERTIFICATE-----\nDUMMY CERTIFICATE\n-----END CERTIFICATE-----');
  fs.writeFileSync(keyPath, '-----BEGIN PRIVATE KEY-----\nDUMMY PRIVATE KEY\n-----END PRIVATE KEY-----');
  
  console.log('⚠️ Dummy certificates created. HTTPS will not work properly.');
  console.log('💡 Please install OpenSSL and run this script again for proper HTTPS support.');
} 