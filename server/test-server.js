console.log('Testing Node.js...');
console.log('Current directory:', process.cwd());
console.log('Node version:', process.version);

// Test if we can create a simple HTTPS server
const https = require('https');
const fs = require('fs');
const path = require('path');

try {
  const certPath = path.join(__dirname, '..', 'certs', 'localhost.pem');
  const keyPath = path.join(__dirname, '..', 'certs', 'localhost-key.pem');
  
  console.log('Checking certificates...');
  console.log('Cert path:', certPath);
  console.log('Key path:', keyPath);
  console.log('Cert exists:', fs.existsSync(certPath));
  console.log('Key exists:', fs.existsSync(keyPath));
  
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    const cert = fs.readFileSync(certPath, 'utf8');
    const key = fs.readFileSync(keyPath, 'utf8');
    
    console.log('Cert length:', cert.length);
    console.log('Key length:', key.length);
    
    // Try to create server
    const httpsOptions = { cert, key };
    const server = https.createServer(httpsOptions, (req, res) => {
      res.writeHead(200);
      res.end('Test server working!');
    });
    
    server.listen(3443, () => {
      console.log('✅ Test HTTPS server listening on port 3443');
    });
    
    server.on('error', (err) => {
      console.error('❌ Server error:', err);
    });
    
  } else {
    console.log('❌ Certificates not found');
  }
} catch (error) {
  console.error('❌ Error:', error);
}
