const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Basic CORS for all origins
app.use(cors());
app.use(express.json());

// In-memory storage
let users = [];

// Test endpoint
app.get('/api/test', (req, res) => {
  console.log('✅ Test endpoint hit');
  res.json({
    success: true,
    message: 'Backend server is running!',
    timestamp: new Date().toISOString(),
    users: users.length
  });
});

// Signup endpoint
app.post('/api/users/signup', (req, res) => {
  console.log('✅ Signup endpoint hit:', req.body);
  
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
      id: Date.now().toString(),
      username,
      password,
      createdAt: new Date().toISOString()
    };
    
    users.push(user);
    console.log('✅ User created:', user.username);
    
    res.json({
      success: true,
      user: { id: user.id, username: user.username }
    });
  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
app.post('/api/users/login', (req, res) => {
  console.log('✅ Login endpoint hit:', req.body);
  
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    console.log('✅ User logged in:', user.username);
    res.json({
      success: true,
      user: { id: user.id, username: user.username }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 ================================');
  console.log('🌟 WORKING BACKEND SERVER RUNNING!');
  console.log(`🌐 HTTP URL: http://localhost:${PORT}`);
  console.log(`🌐 Network URL: http://0.0.0.0:${PORT}`);
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