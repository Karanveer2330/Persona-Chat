const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

console.log('🔐 Generating proper SSL certificates for video calls...');

// Create certs directory
const certsDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

// Get local IP
const os = require('os');
const networkInterfaces = os.networkInterfaces();
let localIP = '192.168.1.8';

for (const interfaceName in networkInterfaces) {
  const interfaces = networkInterfaces[interfaceName];
  for (const iface of interfaces) {
    if (iface.family === 'IPv4' && !iface.internal) {
      localIP = iface.address;
      break;
    }
  }
}

try {
  // Generate a keypair
  const keys = forge.pki.rsa.generateKeyPair(2048);
  
  // Create a certificate
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
  
  // Set subject and issuer
  const attrs = [{
    name: 'commonName',
    value: 'localhost'
  }, {
    name: 'countryName',
    value: 'US'
  }, {
    shortName: 'ST',
    value: 'State'
  }, {
    name: 'localityName',
    value: 'City'
  }, {
    name: 'organizationName',
    value: 'Development'
  }];
  
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  
  // Add extensions
  cert.setExtensions([{
    name: 'basicConstraints',
    cA: true
  }, {
    name: 'keyUsage',
    keyCertSign: true,
    digitalSignature: true,
    nonRepudiation: true,
    keyEncipherment: true,
    dataEncipherment: true
  }, {
    name: 'subjectAltName',
    altNames: [{
      type: 2, // DNS
      value: 'localhost'
    }, {
      type: 2, // DNS
      value: '127.0.0.1'
    }, {
      type: 7, // IP
      ip: '127.0.0.1'
    }, {
      type: 7, // IP
      ip: localIP
    }]
  }]);
  
  // Sign the certificate
  cert.sign(keys.privateKey);
  
  // Convert to PEM format
  const certPem = forge.pki.certificateToPem(cert);
  const keyPem = forge.pki.privateKeyToPem(keys.privateKey);
  
  // Write files
  const certPath = path.join(certsDir, 'localhost.pem');
  const keyPath = path.join(certsDir, 'localhost-key.pem');
  
  fs.writeFileSync(certPath, certPem);
  fs.writeFileSync(keyPath, keyPem);
  
  console.log('✅ SSL certificates generated successfully!');
  console.log(`📁 Certificate: ${certPath}`);
  console.log(`🔑 Private Key: ${keyPath}`);
  console.log(`📱 Local IP: ${localIP}`);
  console.log('');
  console.log('🌐 Video calls will now work on:');
  console.log(`   - https://localhost:3000`);
  console.log(`   - https://${localIP}:3000`);
  
} catch (error) {
  console.error('❌ Failed to generate certificates:', error.message);
  console.log('💡 Make sure node-forge is installed: npm install node-forge');
}

