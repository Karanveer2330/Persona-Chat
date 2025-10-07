const express = require('express');
const cors = require('cors');
const app = express();

const PORT = 5000;

// CORS configuration for mobile access
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://localhost:3000',
    'http://localhost:9443',
    'https://localhost:9443',
    'http://127.0.0.1:3000',
    'https://127.0.0.1:3000',
    'http://127.0.0.1:9443',
    'https://127.0.0.1:9443',
    // Mobile network access patterns
    /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
    /^https:\/\/192\.168\.\d+\.\d+:\d+$/,
    /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
    /^https:\/\/10\.\d+\.\d+\.\d+:\d+$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-memory storage
let users = [];

// Helper function
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Backend server is running!',
    timestamp: new Date().toISOString(),
    users: users.length
  });
});

// Signup endpoint
app.post('/api/users/signup', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const user = {
      id: generateId(),
      username,
      password, // In production, hash this
      createdAt: new Date().toISOString()
    };
    
    users.push(user);
    
    res.json({
      success: true,
      user: { id: user.id, username: user.username }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
app.post('/api/users/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    res.json({
      success: true,
      user: { id: user.id, username: user.username }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 ================================');
  console.log('🌟 SIMPLE BACKEND SERVER RUNNING!');
  console.log(`🌐 HTTP URL: http://localhost:${PORT}`);
  console.log('📱 Mobile Ready: Signup & Login');
  console.log('✅ Features: User registration, authentication');
  console.log('🚀 ================================\n');
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error);
}); 