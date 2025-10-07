const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration for both HTTP and HTTPS
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'https://localhost:3000',
      'http://localhost:9443',
      'https://localhost:9443',
      'http://localhost:3444',
      'https://localhost:3444',
      'http://127.0.0.1:3000',
      'https://127.0.0.1:3000',
      'http://127.0.0.1:9443',
      'https://127.0.0.1:9443',
      'http://127.0.0.1:3444',
      'https://127.0.0.1:3444',
      // Mobile network access patterns
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
      /^https:\/\/192\.168\.\d+\.\d+:\d+$/,
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
      /^https:\/\/10\.\d+\.\d+\.\d+:\d+$/
    ];
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return allowed === origin;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/chat_app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatarUrl: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Room Schema
const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  messages: [{
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

const Room = mongoose.model('Room', roomSchema);

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// API Routes
app.get('/api/test', (req, res) => {
  const host = req.get('host') || 'localhost:3443';
  res.json({
    message: 'Backend server is running!',
    timestamp: new Date().toISOString(),
    hostname: req.hostname,
    ip: req.ip,
    protocol: req.protocol,
    port: PORT,
    cors: 'enabled',
    ssl: req.secure ? 'enabled' : 'disabled'
  });
});

// User registration
app.post('/api/users/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields: username, email, password' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const user = new User({
      username,
      email,
      password: hashedPassword
    });
    
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, 'your-secret-key', { expiresIn: '24h' });
    
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User login
app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, 'your-secret-key', { expiresIn: '24h' });
    
    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user rooms
app.get('/api/rooms/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const rooms = await Room.find({ participants: userId }).populate('participants', 'username avatarUrl');
    res.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new room
app.post('/api/rooms', async (req, res) => {
  try {
    const { name, participants } = req.body;
    const room = new Room({ name, participants });
    await room.save();
    res.status(201).json(room);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload avatar
app.post('/api/users/avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const avatarUrl = `/uploads/${req.file.filename}`;
    
    // Update user avatar
    const userId = req.body.userId;
    await User.findByIdAndUpdate(userId, { avatarUrl });
    
    res.json({ avatarUrl });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Create both HTTP and HTTPS servers
let httpServer, httpsServer, io;

// Function to create servers
function createServers() {
  try {
    // Check if SSL certificates exist
    const certPath = path.join(__dirname, '../certs/localhost.pem');
    const keyPath = path.join(__dirname, '../certs/localhost-key.pem');
    
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      // Create HTTPS server
      const httpsOptions = {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath)
      };
      
      httpsServer = https.createServer(httpsOptions, app);
      io = socketIo(httpsServer, {
        cors: {
          origin: ["http://localhost:3000", "https://localhost:3000", "http://localhost:9443", "https://localhost:9443"],
          methods: ["GET", "POST"],
          credentials: true
        }
      });
      
      httpsServer.listen(PORT, () => {
        console.log(`✅ HTTPS Server running on https://localhost:${PORT}`);
        console.log(`🔒 SSL Certificate: Enabled`);
      });
      
    } else {
      console.log('⚠️ SSL certificates not found, creating HTTP server only');
      createHttpServer();
    }
    
    // Always create HTTP server as fallback
    createHttpServer();
    
  } catch (error) {
    console.error('❌ Error creating HTTPS server:', error);
    console.log('🔄 Falling back to HTTP server...');
    createHttpServer();
  }
}

function createHttpServer() {
  const httpPort = PORT + 1; // Use next port for HTTP
  
  httpServer = http.createServer(app);
  const httpIo = socketIo(httpServer, {
    cors: {
      origin: ["http://localhost:3000", "https://localhost:3000", "http://localhost:9443", "https://localhost:9443"],
      methods: ["GET", "POST"],
      credentials: true
    }
  });
  
  httpServer.listen(httpPort, () => {
    console.log(`✅ HTTP Server running on http://localhost:${httpPort}`);
    console.log(`🔓 HTTP Fallback: Enabled for iOS compatibility`);
  });
  
  // Set up Socket.IO for HTTP server
  setupSocketIO(httpIo, 'HTTP');
}

function setupSocketIO(socketIo, serverType) {
  socketIo.on('connection', (socket) => {
    console.log(`🔌 ${serverType} Socket connected:`, socket.id);
    
    socket.on('join_room', (roomId) => {
      socket.join(roomId);
      console.log(`👥 User ${socket.id} joined room ${roomId}`);
    });
    
    socket.on('leave_room', (roomId) => {
      socket.leave(roomId);
      console.log(`👋 User ${socket.id} left room ${roomId}`);
    });
    
    socket.on('send_message', (data) => {
      socket.to(data.roomId).emit('receive_message', data);
      console.log(`💬 Message sent in room ${data.roomId}`);
    });
    
    socket.on('disconnect', () => {
      console.log(`🔌 ${serverType} Socket disconnected:`, socket.id);
    });
  });
}

// Set up Socket.IO for HTTPS server if it exists
if (io) {
  setupSocketIO(io, 'HTTPS');
}

// Create servers
createServers();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 Shutting down servers...');
  if (httpServer) httpServer.close();
  if (httpsServer) httpsServer.close();
  process.exit(0);
});