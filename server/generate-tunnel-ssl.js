const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

console.log('🔐 Generating SSL certificates for tunnel server...');

// Create certs directory if it doesn't exist
const certsDir = path.join(__dirname, '..', 'certs');
if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
    console.log('✅ Created certs directory');
}

// Generate a new key pair
const keys = forge.pki.rsa.generateKeyPair(2048);
console.log('✅ Generated RSA key pair');

// Create a new certificate
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

// Set the subject and issuer
const attrs = [{
    name: 'commonName',
    value: 'localhost'
}, {
    name: 'countryName',
    value: 'US'
}, {
    shortName: 'ST',
    value: 'Virginia'
}, {
    name: 'localityName',
    value: 'Blacksburg'
}, {
    name: 'organizationName',
    value: 'Test'
}, {
    shortName: 'OU',
    value: 'Test'
}];

cert.setSubject(attrs);
cert.setIssuer(attrs);

// Set extensions
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
    name: 'extKeyUsage',
    serverAuth: true,
    clientAuth: true
}, {
    name: 'subjectAltName',
    altNames: [{
        type: 2, // DNS
        value: 'localhost'
    }, {
        type: 7, // IP
        ip: '127.0.0.1'
    }]
}]);

// Self-sign the certificate
cert.sign(keys.privateKey, forge.md.sha256.create());
console.log('✅ Self-signed certificate created');

// Convert to PEM format
const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
const certificatePem = forge.pki.certificateToPem(cert);

// Write to files
const keyPath = path.join(certsDir, 'localhost-key.pem');
const certPath = path.join(certsDir, 'localhost.pem');

fs.writeFileSync(keyPath, privateKeyPem);
fs.writeFileSync(certPath, certificatePem);

console.log('✅ SSL certificates saved:');
console.log(`   Private Key: ${keyPath}`);
console.log(`   Certificate: ${certPath}`);
console.log('\n🚀 You can now restart the tunnel server for HTTPS support!');
console.log('💡 For camera access, make sure to:');
console.log('   1. Accept the self-signed certificate in your browser');
console.log('   2. Enable "Insecure origins treated as secure" in Chrome flags');
console.log('   3. Or use the camera access guide for detailed instructions'); 