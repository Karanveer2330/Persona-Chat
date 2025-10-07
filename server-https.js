const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');
const https = require('https');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Load SSL certificates (with fallback)
let httpsOptions;
try {
  httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, 'certs', 'localhost-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'certs', 'localhost.pem')),
  };
  console.log('✅ SSL certificates loaded successfully');
} catch (error) {
  console.log('⚠️ SSL certificates not found, using self-signed certificate');
  console.log('💡 Run "npm run generate-certs-ps" as Administrator to generate proper certificates');
  
  // Generate a simple self-signed certificate for development
  const { execSync } = require('child_process');
  try {
    // Try to generate a simple certificate using Node.js crypto
    const crypto = require('crypto');
    const { generateKeyPairSync } = require('crypto');
    
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });
    
    // For development, we'll use a simple approach
    console.log('🔧 Using development SSL configuration');
    httpsOptions = {
      key: privateKey,
      cert: publicKey
    };
  } catch (cryptoError) {
    console.error('❌ Could not generate SSL certificates:', cryptoError.message);
    console.log('🔄 Falling back to HTTP mode...');
    process.exit(1);
  }
}

// Configure HTTPS agent to ignore SSL certificate errors
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

app.prepare().then(() => {
  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      
      // Handle API proxy to backend (except uploads)
      if (parsedUrl.pathname.startsWith('/api/') && !parsedUrl.pathname.startsWith('/api/uploads/')) {
        const backendUrl = `https://localhost:3443${parsedUrl.pathname}${parsedUrl.search || ''}`;
        
        const options = {
          method: req.method,
          headers: {
            ...req.headers,
            host: 'localhost:3443'
          },
          agent: httpsAgent
        };
        
        const proxyReq = https.request(backendUrl, options, (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res);
        });
        
        proxyReq.on('error', (err) => {
          console.error('Proxy error:', err);
          res.statusCode = 500;
          res.end('Proxy error');
        });
        
        req.pipe(proxyReq);
        return;
      }
      
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
    .once('error', (err) => {
      console.error('HTTPS server error:', err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on https://${hostname}:${port}`);
      console.log(`> Mobile access: https://192.168.1.8:${port}`);
      console.log(`> Test page: https://192.168.1.8:${port}/mobile-connection-test.html`);
    });
});
