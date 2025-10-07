const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { randomUUID } = require('crypto');

class ModernChatServer {
  constructor() {
    this.app = express();
    this.httpsServer = null;
    this.httpServer = null;
    this.io = null;
    this.PORT = process.env.PORT || 3443;
    this.HTTP_PORT = this.PORT + 1;
    
    this.setupMiddleware();
    this.setupFileUpload();
    this.setupDatabase();
    this.setupRoutes();
  }

  // Setup security and middleware
  setupMiddleware() {
    // Security headers
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          mediaSrc: ["'self'", "blob:", "https:"],
          connectSrc: ["'self'", "wss:", "ws:", "https:"],
          fontSrc: ["'self'", "https:", "data:"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: []
        }
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" }
    }));

    // Rate limiting (more lenient for development)
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // CORS configuration (supports LAN/mobile regex)
    const corsOptions = {
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, Postman, or file:// URLs)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
          'http://localhost:3000',
          'https://localhost:3000',
          'http://localhost:9443',
          'https://localhost:9443',
          'http://localhost:3443',
          'https://localhost:3443',
          'http://127.0.0.1:3000',
          'https://127.0.0.1:3000',
          'http://127.0.0.1:9443',
          'https://127.0.0.1:9443',
          'http://127.0.0.1:3443',
          'https://127.0.0.1:3443',
          // LAN ranges
          /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
          /^https:\/\/192\.168\.\d+\.\d+:\d+$/,
          /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
          /^https:\/\/10\.\d+\.\d+\.\d+:\d+$/,
          'null'  // Allow file:// URLs for testing
        ];

        const isAllowed = allowedOrigins.some(allowed => {
          if (typeof allowed === 'string') return allowed === origin;
          if (allowed instanceof RegExp) return allowed.test(origin);
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
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Type'],
      exposedHeaders: ['X-Total-Count']
    };
    this.app.use(cors(corsOptions));

    // Body parsing
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
      });
      next();
    });
  }

  // Setup database connection
  setupDatabase() {
    mongoose.connect('mongodb://localhost:27017/chat_app', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'MongoDB connection error:'));
    db.once('open', () => {
      console.log('✅ Connected to MongoDB');
    });
  }

  // Setup file upload configuration
  setupFileUpload() {
    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        const uploadDir = 'public/uploads/';
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    });

    this.upload = multer({ 
      storage: storage,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
      fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|webm|mp3|wav|pdf|txt|doc|docx|zip|rar/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = /image|video|audio|application|text/.test(file.mimetype);
        
        if (mimetype && extname) {
          return cb(null, true);
        } else {
          cb(new Error('File type not allowed!'));
        }
      }
    });
  }

  // Setup API routes
  setupRoutes() {
    // Health check endpoint
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        ssl: req.secure ? 'enabled' : 'disabled',
        protocol: req.protocol,
        hostname: req.hostname
      });
    });

    // Test endpoint
    this.app.get('/api/test', (req, res) => {
      res.json({
        message: 'Modern chat server is running!',
        timestamp: new Date().toISOString(),
        hostname: req.hostname,
        ip: req.ip,
        protocol: req.protocol,
        port: this.PORT,
        cors: 'enabled',
        ssl: req.secure ? 'enabled' : 'disabled',
        security: 'helmet-enabled',
        rateLimit: 'enabled'
      });
    });

    // Video call test endpoint
    this.app.get('/api/video-call-test', (req, res) => {
      const users = Array.from(connectedUsers.entries()).map(([socketId, userData]) => ({
        socketId,
        userId: userData.userId,
        name: userData.name,
        isOnline: userData.isOnline,
        timestamp: userData.timestamp
      }));
      
      res.json({
        message: 'Video call test endpoint',
        connectedUsers: users,
        totalUsers: connectedUsers.size,
        totalSockets: this.io.sockets.sockets.size,
        serverTime: new Date().toISOString()
      });
    });

    // User registration
    this.app.post('/api/users/register', async (req, res) => {
      try {
        const { username, password } = req.body;
        
        // Validate input
        if (!username || !password) {
          return res.status(400).json({ error: 'Username and password are required' });
        }

        if (password.length < 6) {
          return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if user already exists
        const User = this.getUserModel();
        const existingUser = await User.findOne({ username });
        if (existingUser) {
          return res.status(400).json({ error: 'Username already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Create new user
        const user = new User({
          username,
          email: `${username}@chat.local`, // Generate a local email
          password: hashedPassword
        });
        
        await user.save();
        
        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key', { 
          expiresIn: '24h',
          issuer: 'chat-app',
          audience: 'chat-app-users'
        });
        
        res.status(201).json({
          message: 'User registered successfully',
          user: {
            id: user._id,
            username: user.username,
            avatarUrl: user.avatarUrl
          },
          token
        });
      } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Compatibility alias for clients expecting /api/users/signup
    this.app.post('/api/users/signup', async (req, res) => {
      try {
        const { username, password } = req.body;
        if (!username || !password) {
          return res.status(400).json({ error: 'Username and password are required' });
        }

        if (password.length < 6) {
          return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const User = this.getUserModel();
        const existingUser = await User.findOne({ username });
        if (existingUser) {
          return res.status(400).json({ error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = new User({
          username,
          email: `${username}@chat.local`,
          password: hashedPassword
        });

        await user.save();

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key', {
          expiresIn: '24h',
          issuer: 'chat-app',
          audience: 'chat-app-users'
        });

        res.status(201).json({
          message: 'User registered successfully',
          user: { id: user._id, username: user.username, avatarUrl: user.avatarUrl },
          token
        });
      } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // User login
    this.app.post('/api/users/login', async (req, res) => {
      try {
        const { username, password } = req.body;
        
        if (!username || !password) {
          return res.status(400).json({ error: 'Username and password are required' });
        }

        // Find user
        const User = this.getUserModel();
        const user = await User.findOne({ username });
        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key', { 
          expiresIn: '24h',
          issuer: 'chat-app',
          audience: 'chat-app-users'
        });
        
        res.json({
          message: 'Login successful',
          user: {
            id: user._id,
            username: user.username,
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
    this.app.get('/api/rooms/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const Room = this.getRoomModel();
        const User = this.getUserModel();
        
        const rooms = await Room.find({ participants: userId });
        
        // Populate user information for each room
        const roomsWithUsers = await Promise.all(
          rooms.map(async (room) => {
            const userPromises = room.participants.map(async (participantId) => {
              try {
                const user = await User.findById(participantId);
                return user ? {
                  _id: user._id,
                  name: user.name || user.username,
                  username: user.username,
                  email: user.email,
                  avatarUrl: user.avatarUrl
                } : null;
              } catch (error) {
                console.error(`Error fetching user ${participantId}:`, error);
                return null;
              }
            });
            
            const users = (await Promise.all(userPromises)).filter(user => user !== null);
            
            return {
              ...room.toObject(),
              users: users
            };
          })
        );
        
        res.json({ rooms: roomsWithUsers });
      } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Get global messages
    this.app.get('/api/messages/global', async (req, res) => {
      try {
        const Message = this.getMessageModel();
        const messages = await Message.find({ type: 'global' })
          .sort({ timestamp: 1 })
          .limit(100); // Limit to last 100 messages
        
        console.log(`📥 Fetched ${messages.length} global messages from database`);
        
        // Debug: Check messages with media
        const messagesWithMedia = messages.filter(msg => msg.media && msg.media.length > 0);
        console.log(`📥 Messages with media: ${messagesWithMedia.length}`);
        if (messagesWithMedia.length > 0) {
          console.log(`📥 Sample message with media:`, JSON.stringify(messagesWithMedia[0].toObject(), null, 2));
        }
        
        // Transform messages to include both _id and id for frontend compatibility
        const transformedMessages = messages.map(msg => {
          const messageObj = msg.toObject();
          
          // Ensure media attachments maintain proper structure
          const structuredMedia = (messageObj.media || []).map(media => {
            if (typeof media === 'string') {
              // If media is just a URL string, create a basic structure
              console.log('⚠️ Converting retrieved string media to structured format:', media);
              return {
                id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'file',
                url: media,
                name: media.split('/').pop() || 'unknown',
                size: 0,
                mimeType: 'application/octet-stream'
              };
            }
            return media;
          });
          
          return {
            ...messageObj,
            id: msg._id.toString(),
            media: structuredMedia
          };
        });
        
        res.json({ messages: transformedMessages });
      } catch (error) {
        console.error('Error fetching global messages:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Get room messages
    this.app.get('/api/messages/room/:roomId', async (req, res) => {
      try {
        const { roomId } = req.params;
        const Message = this.getMessageModel();
        const messages = await Message.find({ 
          roomId: new mongoose.Types.ObjectId(roomId),
          type: 'private'
        })
          .sort({ timestamp: 1 })
          .limit(100); // Limit to last 100 messages
        
        console.log(`📥 Fetched ${messages.length} room messages for room ${roomId}`);
        
        // Transform messages to include both _id and id for frontend compatibility
        const transformedMessages = messages.map(msg => {
          const messageObj = msg.toObject();
          
          // Ensure media attachments maintain proper structure
          const structuredMedia = (messageObj.media || []).map(media => {
            if (typeof media === 'string') {
              // If media is just a URL string, create a basic structure
              console.log('⚠️ Converting retrieved string media to structured format:', media);
              return {
                id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'file',
                url: media,
                name: media.split('/').pop() || 'unknown',
                size: 0,
                mimeType: 'application/octet-stream'
              };
            }
            return media;
          });
          
          return {
            ...messageObj,
            id: msg._id.toString(),
            media: structuredMedia
          };
        });
        
        res.json({ messages: transformedMessages });
      } catch (error) {
        console.error('Error fetching room messages:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Get all users
    this.app.get('/api/users', async (req, res) => {
      try {
        const User = this.getUserModel();
        const users = await User.find({}, 'username name avatarUrl');
        
        console.log('🔍 Backend - All users in database:');
        users.forEach((user, index) => {
          console.log(`  ${index + 1}. ID: ${user._id}, Name: ${user.name || user.username}, Username: ${user.username}`);
        });
        
        res.json({ users });
      } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Get specific user by ID
    this.app.get('/api/users/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        console.log('🔍 Backend - Fetching user with ID:', userId);
        
        const User = this.getUserModel();
        const user = await User.findById(userId, 'username name avatarUrl');
        
        console.log('🔍 Backend - User found:', user ? 'YES' : 'NO');
        if (user) {
          console.log('🔍 Backend - User details:', { id: user._id, name: user.name, username: user.username });
        }
        
        if (!user) {
          console.log('❌ Backend - User not found in database');
          return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ user });
      } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Create new room
    this.app.post('/api/rooms', async (req, res) => {
      try {
        const { name, participants } = req.body;
        const Room = this.getRoomModel();
        const room = new Room({ name, participants });
        await room.save();
        res.status(201).json(room);
      } catch (error) {
        console.error('Error creating room:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Create a private room
    this.app.post('/api/rooms/private', async (req, res) => {
      try {
        const { userId1, userId2 } = req.body;
        
        console.log('🚨 BACKEND PRIVATE CHAT DEBUG:');
        console.log('🚨 Received userId1:', userId1);
        console.log('🚨 Received userId2:', userId2);
        console.log('🚨 Request body:', req.body);
        
        if (!userId1 || !userId2) {
          console.log('❌ Missing user IDs');
          return res.status(400).json({ error: 'Both userId1 and userId2 are required' });
        }

        const Room = this.getRoomModel();
        
        // Check if room already exists
        const existingRoom = await Room.findOne({
          participants: { $all: [userId1, userId2] },
          type: 'private'
        });

        console.log('🔍 Checking for existing room with participants:', [userId1, userId2]);
        console.log('🔍 Existing room found:', existingRoom ? 'YES' : 'NO');
        if (existingRoom) {
          console.log('🔍 Existing room ID:', existingRoom._id);
          console.log('🔍 Existing room participants:', existingRoom.participants);
          return res.json({ room: existingRoom });
        }

        // Create new private room
        const room = new Room({
          name: `Private Chat`,
          participants: [userId1, userId2],
          type: 'private',
          messages: []
        });

        await room.save();
        console.log(`💬 Created private room: ${room._id} between ${userId1} and ${userId2}`);
        
        res.status(201).json({ room });
      } catch (error) {
        console.error('Error creating private room:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // General file upload endpoint
    this.app.post('/api/upload', this.upload.array('files', 10), async (req, res) => {
      try {
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({ error: 'No files uploaded' });
        }
        
        const uploadedFiles = req.files.map(file => ({
          id: randomUUID(),
          name: file.originalname,
          url: `/uploads/${file.filename}`,
          type: file.mimetype.startsWith('image/') ? 'image' : 
                file.mimetype.startsWith('video/') ? 'video' : 
                file.mimetype.startsWith('audio/') ? 'audio' : 'file',
          size: file.size,
          mimeType: file.mimetype
        }));
        
        console.log(`📁 Uploaded ${uploadedFiles.length} files:`, uploadedFiles.map(f => f.name));
        
        res.json({ 
          success: true, 
          files: uploadedFiles 
        });
      } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ error: 'Upload failed. Please try again.' });
      }
    });

    // Upload avatar
    this.app.post('/api/users/avatar', this.upload.single('avatar'), async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const avatarUrl = `/uploads/${req.file.filename}`;
        
        // Update user avatar
        const userId = req.body.userId;
        const User = this.getUserModel();
        await User.findByIdAndUpdate(userId, { avatarUrl });
        
        res.json({ avatarUrl });
      } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Serve uploaded files
    this.app.use('/uploads', express.static('public/uploads'));

    // Error handling middleware
    this.app.use((error, req, res, next) => {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  // Database schemas
  getUserSchema() {
    return new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      avatarUrl: { type: String, default: '' },
      createdAt: { type: Date, default: Date.now }
    });
  }

  // Get or create User model
  getUserModel() {
    try {
      return mongoose.model('User');
    } catch (error) {
      return mongoose.model('User', this.getUserSchema());
    }
  }

  // Get or create Room model
  getRoomModel() {
    try {
      return mongoose.model('Room');
    } catch (error) {
      return mongoose.model('Room', this.getRoomSchema());
    }
  }

  getRoomSchema() {
    return new mongoose.Schema({
      name: { type: String, required: true },
      participants: [{ type: String }], // Changed from ObjectId to String for flexibility
      type: { type: String, enum: ['global', 'private'], default: 'private' },
      messages: [{
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
      }],
      createdAt: { type: Date, default: Date.now }
    });
  }

  getMessageSchema() {
    return new mongoose.Schema({
      text: { type: String, required: false, default: '' },
      senderId: { type: String, required: true }, // Changed to String to handle both ObjectIds and string IDs
      senderName: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      media: [{
        id: { type: String, required: true },
        type: { type: String, enum: ['image', 'video', 'audio', 'file'], required: true },
        url: { type: String, required: true },
        name: { type: String, required: true },
        size: { type: Number, required: true },
        mimeType: { type: String, required: true },
        thumbnail: { type: String }
      }],
      type: { type: String, enum: ['global', 'private'], default: 'global' },
      roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
      reactions: [{
        emoji: { type: String, required: true },
        userId: { type: String, required: true },
        userName: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
      }],
      status: { type: String, enum: ['sending', 'sent', 'delivered', 'read'], default: 'sent' },
      readBy: [{
        userId: { type: String, required: true },
        userName: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
      }]
    });
  }

  getMessageModel() {
    try {
      return mongoose.model('Message');
    } catch (error) {
      return mongoose.model('Message', this.getMessageSchema());
    }
  }

  // Setup Socket.IO
  setupSocketIO(server, serverType = 'HTTPS') {
    this.io = socketIo(server, {
      cors: {
        origin: (origin, callback) => {
          // Allow no-origin and LAN origins for development/mobile
          if (!origin) return callback(null, true);
          const allowed = [
            'http://localhost:3000', 'https://localhost:3000',
            'http://localhost:9443', 'https://localhost:9443',
            'http://127.0.0.1:3000', 'https://127.0.0.1:3000',
            'http://127.0.0.1:9443', 'https://127.0.0.1:9443',
          ];
          const lanPatterns = [
            /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
            /^https:\/\/192\.168\.\d+\.\d+:\d+$/,
            /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
            /^https:\/\/10\.\d+\.\d+\.\d+:\d+$/
          ];
          const ok = allowed.includes(origin) || lanPatterns.some(rx => rx.test(origin));
          callback(ok ? null : new Error('Not allowed by CORS'), ok);
        },
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true,
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Store user data with sockets
    const connectedUsers = new Map();
    
    // Custom socket tracking system (more reliable than Socket.IO's internal tracking)
    const activeSockets = new Map(); // socketId -> socket object

    this.io.on('connection', (socket) => {
      console.log(`🔌 ${serverType} Socket connected:`, socket.id);
      
      // Track socket in our custom system
      activeSockets.set(socket.id, socket);
      console.log(`📊 Active sockets: ${activeSockets.size}`);
      
      // Join room
      socket.on('join_room', (roomId) => {
        socket.join(roomId);
        console.log(`👥 User ${socket.id} joined room ${roomId}`);
        socket.to(roomId).emit('user_joined', { userId: socket.id, roomId });
      });
      
      // Leave room
      socket.on('leave_room', (roomId) => {
        socket.leave(roomId);
        console.log(`👋 User ${socket.id} left room ${roomId}`);
        socket.to(roomId).emit('user_left', { userId: socket.id, roomId });
      });
      
      // Send message
      socket.on('send_message', (data) => {
        console.log(`💬 Message sent in room ${data.roomId} by ${socket.id}`);
        socket.to(data.roomId).emit('receive_message', {
          ...data,
          timestamp: new Date().toISOString(),
          socketId: socket.id
        });
      });

      // Private message
      socket.on('sendMessage', async (data) => {
        console.log(`💬 Private message sent by ${socket.id}:`, data);
        
        try {
          // Save message to database
          const Message = this.getMessageModel();
          console.log('📝 Creating private message model...');
          
          // Ensure media attachments are properly structured
          const structuredMedia = (data.media || []).map(media => {
            if (typeof media === 'string') {
              // If media is just a URL string, create a basic structure
              console.log('⚠️ Converting string media to structured format:', media);
              return {
                id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'file',
                url: media,
                name: media.split('/').pop() || 'unknown',
                size: 0,
                mimeType: 'application/octet-stream'
              };
            }
            return media;
          });
          
          console.log('📎 Structured media for private message:', structuredMedia);
          
          const message = new Message({
            text: data.content,
            senderId: data.senderId,
            senderName: data.senderName,
            timestamp: new Date(),
            media: structuredMedia,
            type: 'private',
            roomId: data.roomId ? new mongoose.Types.ObjectId(data.roomId) : null
          });
          
          console.log('📝 Private message object created:', message);
          console.log('📝 Attempting to save private message...');
          
          await message.save();
          console.log(`💾 Private message saved to database with ID: ${message._id}`);
          
          // Broadcast to all connected clients
          const messageData = {
            ...data,
            _id: message._id,
            timestamp: message.timestamp.toISOString(),
            socketId: socket.id
          };
          
          socket.broadcast.emit('newMessage', messageData);
          // Also emit back to sender for confirmation
          socket.emit('newMessage', messageData);
          
        } catch (error) {
          console.error('❌ Error saving private message:', error);
          console.error('❌ Error details:', error.message);
          console.error('❌ Error stack:', error.stack);
          // Still broadcast even if save fails
          socket.broadcast.emit('newMessage', {
            ...data,
            timestamp: new Date().toISOString(),
            socketId: socket.id
          });
          socket.emit('newMessage', {
            ...data,
            timestamp: new Date().toISOString(),
            socketId: socket.id
          });
        }
      });

      // Global message
      socket.on('sendGlobalMessage', async (data) => {
        console.log('🚨 BACKEND RECEIVED MESSAGE!');
        console.log('🚨 Socket ID:', socket.id);
        console.log('🚨 Message data:', JSON.stringify(data, null, 2));
        console.log('🚨 Media in data:', data.media);
        console.log('🚨 Media length:', data.media?.length || 0);
        
        console.log(`🌍 Global message sent by ${socket.id}:`, data);
        
        try {
          // Save message to database
          const Message = this.getMessageModel();
          console.log('📝 Creating message model...');
          
          // Ensure media attachments are properly structured
          const structuredMedia = (data.media || []).map(media => {
            if (typeof media === 'string') {
              // If media is just a URL string, create a basic structure
              console.log('⚠️ Converting string media to structured format:', media);
              return {
                id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'file',
                url: media,
                name: media.split('/').pop() || 'unknown',
                size: 0,
                mimeType: 'application/octet-stream'
              };
            }
            return media;
          });
          
          console.log('📎 Structured media for global message:', structuredMedia);
          console.log('📎 Structured media length:', structuredMedia.length);
          console.log('📎 Structured media details:', JSON.stringify(structuredMedia, null, 2));
          
          const message = new Message({
            text: data.text,
            senderId: data.senderId,
            senderName: data.senderName,
            timestamp: new Date(),
            media: structuredMedia,
            type: 'global'
          });
          
          console.log('📝 Message object created:', message);
          console.log('📝 Attempting to save message...');
          
          await message.save();
          console.log(`💾 Message saved to database with ID: ${message._id}`);
          console.log(`💾 Saved message media:`, message.media);
          console.log(`💾 Saved message media length:`, message.media?.length || 0);
          console.log(`💾 Saved message details:`, JSON.stringify(message.toObject(), null, 2));
          
          // Broadcast to all connected clients
          const messageData = {
            ...data,
            _id: message._id,
            id: message._id.toString(),
            timestamp: message.timestamp.toISOString(),
            socketId: socket.id,
            reactions: message.reactions || []
          };
          
          socket.broadcast.emit('globalMessage', messageData);
          // Also emit back to sender for confirmation
          socket.emit('globalMessage', messageData);
          
        } catch (error) {
          console.error('❌ Error saving global message:', error);
          console.error('❌ Error details:', error.message);
          console.error('❌ Error stack:', error.stack);
          // Still broadcast even if save fails
          socket.broadcast.emit('globalMessage', {
            ...data,
            timestamp: new Date().toISOString(),
            socketId: socket.id
          });
          socket.emit('globalMessage', {
            ...data,
            timestamp: new Date().toISOString(),
            socketId: socket.id
          });
        }
      });

      // Join global room
      socket.on('joinGlobalRoom', () => {
        console.log(`🌍 User ${socket.id} joined global room`);
        socket.join('global');
      });

      // Join private room
      socket.on('joinPrivateRoom', (data) => {
        console.log(`🔒 User ${socket.id} joined private room between ${data.userId1} and ${data.userId2}`);
        const roomId = `private_${data.userId1}_${data.userId2}`;
        socket.join(roomId);
        socket.to(roomId).emit('userJoinedPrivateRoom', {
          userId: socket.id,
          roomId: roomId
        });
      });

      // User online status
      socket.on('userOnline', (data) => {
        console.log(`👤 User online:`, data);
        
        // Store user data with socket
        connectedUsers.set(socket.id, {
          userId: data.userId,
          name: data.name,
          isOnline: true,
          timestamp: new Date().toISOString()
        });
        
        console.log(`✅ User ${data.userId} (${data.name}) registered as online with socket ${socket.id}`);
        console.log(`🔍 Total connected users: ${connectedUsers.size}`);
        
        socket.broadcast.emit('userStatusUpdate', {
          ...data,
          isOnline: true,
          timestamp: new Date().toISOString()
        });
      });

      // Request current online users
      socket.on('requestOnlineUsers', () => {
        console.log(`📊 Client ${socket.id} requested current online users`);
        // Get all connected sockets and their user data using our custom tracking
        const onlineUsers = [];
        activeSockets.forEach((clientSocket) => {
          const userData = connectedUsers.get(clientSocket.id);
          if (userData) {
            onlineUsers.push({
              userId: userData.userId,
              name: userData.name,
              isOnline: userData.isOnline,
              timestamp: userData.timestamp
            });
          }
        });
        console.log(`📊 Sending ${onlineUsers.length} online users to client`);
        socket.emit('currentOnlineUsers', onlineUsers);
      });

      // Register for video call notifications
      socket.on('registerForVideoCallNotifications', (data) => {
        console.log(`📞 User ${data.userId} (${data.userName}) registered for video call notifications`);
        
        // Check if user already exists (reconnection)
        const existingUser = Array.from(connectedUsers.values()).find(user => user.userId === data.userId);
        if (existingUser) {
          console.log(`🔄 User ${data.userId} reconnecting - updating socket ID from ${existingUser.socketId} to ${socket.id}`);
          // Remove old socket entry
          connectedUsers.delete(existingUser.socketId);
        }
        
        // Store user data with socket for video call targeting
        connectedUsers.set(socket.id, {
          userId: data.userId,
          name: data.userName,
          isOnline: true,
          timestamp: new Date().toISOString(),
          socketId: socket.id
        });
        
        console.log(`✅ User ${data.userId} (${data.userName}) registered for video calls with socket ${socket.id}`);
        console.log(`🔍 Total connected users after video call registration: ${connectedUsers.size}`);
        
        // Also broadcast user status update (like userOnline does)
        socket.broadcast.emit('userStatusUpdate', {
          userId: data.userId,
          name: data.userName,
          isOnline: true,
          timestamp: new Date().toISOString()
        });
        
        // Send current online users list to the newly registered user
        const onlineUsers = [];
        activeSockets.forEach((clientSocket) => {
          const userData = connectedUsers.get(clientSocket.id);
          if (userData) {
            onlineUsers.push({
              userId: userData.userId,
              name: userData.name,
              isOnline: userData.isOnline,
              timestamp: userData.timestamp
            });
          }
        });
        
        console.log(`📊 Sending ${onlineUsers.length} online users to newly registered user ${data.userId}`);
        console.log(`📊 Online users being sent:`, onlineUsers.map(u => ({ userId: u.userId, name: u.name, isOnline: u.isOnline })));
        socket.emit('currentOnlineUsers', onlineUsers);
        
        // Confirm registration
        socket.emit('registrationConfirmed', {
          userId: data.userId,
          userName: data.userName,
          socketId: socket.id
        });
      });

      // Video call signaling
      socket.on('initiateVideoCall', (data) => {
        console.log(`📞 Video call initiated by ${socket.id}:`, data);
        
        // Debug: Log all connected users
        console.log(`🔍 Current connected users:`, Array.from(connectedUsers.entries()).map(([socketId, userData]) => ({
          socketId,
          userId: userData.userId,
          name: userData.name,
          isOnline: userData.isOnline
        })));
        
        // Debug: Log all socket connections
        console.log(`🔍 All socket connections:`, Array.from(this.io.sockets.sockets.keys()));
        
        // Find the recipient's socket using our custom socket tracking
        let recipientSocket = null;
        console.log(`🔍 Looking for recipient: ${data.recipientId}`);
        console.log(`🔍 Connected users map size: ${connectedUsers.size}`);
        console.log(`🔍 Active sockets map size: ${activeSockets.size}`);
        
        // Find the recipient's socket using our reliable custom tracking
        for (const [socketId, userData] of connectedUsers.entries()) {
          console.log(`🔍 Checking socket ${socketId}:`, userData);
          if (userData && userData.userId === data.recipientId) {
            // Use our custom socket tracking instead of Socket.IO's broken system
            recipientSocket = activeSockets.get(socketId);
            if (recipientSocket) {
              console.log(`✅ Found recipient socket: ${socketId} for user: ${data.recipientId}`);
              break;
            } else {
              console.log(`⚠️ Socket ${socketId} not found in our activeSockets map`);
            }
          }
        }
        
        console.log(`🔍 Recipient socket found:`, recipientSocket ? recipientSocket.id : 'null');
        
        if (recipientSocket) {
          console.log(`📞 Sending call invitation to recipient socket: ${recipientSocket.id}`);
          console.log(`📞 Call data being sent:`, {
            ...data,
            fromId: socket.id
          });
          recipientSocket.emit('incomingVideoCall', {
            ...data,
            fromId: socket.id
          });
          console.log(`✅ Call invitation sent successfully`);
        } else {
          console.log(`❌ Recipient ${data.recipientId} not found or not online`);
          console.log(`🔍 Available user IDs:`, Array.from(connectedUsers.values()).map(u => u.userId));
          console.log(`🔍 Available socket IDs:`, Array.from(connectedUsers.keys()));
          socket.emit('callInvitationFailed', {
            recipientId: data.recipientId,
            reason: 'User not online or not found'
          });
        }
      });

      socket.on('acceptVideoCall', (data) => {
        console.log(`✅ Video call accepted by ${socket.id}:`, data);
        
        // Find the caller's socket using our custom socket tracking
        let callerSocket = null;
        for (const [socketId, userData] of connectedUsers.entries()) {
          if (userData && userData.userId === data.callerId) {
            callerSocket = activeSockets.get(socketId);
            if (callerSocket) {
              break;
            }
          }
        }
        
        if (callerSocket) {
          console.log(`✅ Notifying caller socket: ${callerSocket.id}`);
          callerSocket.emit('callAccepted', {
            callId: data.callId,
            recipientId: data.recipientId,
            recipientName: data.recipientName
          });
        } else {
          console.log(`❌ Caller ${data.callerId} not found or not online`);
        }
      });

      socket.on('rejectVideoCall', (data) => {
        console.log(`❌ Video call rejected by ${socket.id}:`, data);
        
        // Find the caller's socket using our custom socket tracking
        let callerSocket = null;
        for (const [socketId, userData] of connectedUsers.entries()) {
          if (userData && userData.userId === data.callerId) {
            callerSocket = activeSockets.get(socketId);
            if (callerSocket) {
              break;
            }
          }
        }
        
        if (callerSocket) {
          console.log(`❌ Notifying caller socket: ${callerSocket.id}`);
          callerSocket.emit('callRejected', {
            callId: data.callId,
            recipientId: data.recipientId,
            recipientName: data.recipientName,
            reason: data.reason
          });
        } else {
          console.log(`❌ Caller ${data.callerId} not found or not online`);
        }
      });

      socket.on('video_call_offer', (data) => {
        console.log(`📹 Video call offer from ${socket.id} to ${data.targetId}`);
        socket.to(data.targetId).emit('video_call_offer', {
          ...data,
          fromId: socket.id
        });
      });

      socket.on('video_call_answer', (data) => {
        console.log(`📹 Video call answer from ${socket.id} to ${data.targetId}`);
        socket.to(data.targetId).emit('video_call_answer', {
          ...data,
          fromId: socket.id
        });
      });

      socket.on('ice_candidate', (data) => {
        socket.to(data.targetId).emit('ice_candidate', {
          ...data,
          fromId: socket.id
        });
      });

      // New chat features
      socket.on('typingStart', (data) => {
        console.log(`⌨️ User ${data.userId} started typing`);
        socket.broadcast.emit('typingStart', data);
      });

      socket.on('typingStop', (data) => {
        console.log(`⌨️ User ${data.userId} stopped typing`);
        socket.broadcast.emit('typingStop', data);
      });

      socket.on('messageReaction', async (data) => {
        console.log(`😀 Message reaction from ${socket.id}:`, data);
        
        try {
          const Message = this.getMessageModel();
          
          // Find the message
          const message = await Message.findById(data.messageId);
          if (!message) {
            console.log(`❌ Message ${data.messageId} not found for reaction`);
            return;
          }
          
          // Check if user already reacted with this emoji
          const existingReactionIndex = message.reactions.findIndex(
            r => r.emoji === data.reaction.emoji && r.userId === data.reaction.userId
          );
          
          if (existingReactionIndex >= 0) {
            // Remove existing reaction
            message.reactions.splice(existingReactionIndex, 1);
            console.log(`😀 Removed reaction ${data.reaction.emoji} from message ${data.messageId}`);
          } else {
            // Add new reaction
            message.reactions.push(data.reaction);
            console.log(`😀 Added reaction ${data.reaction.emoji} to message ${data.messageId}`);
          }
          
          // Save the message
          await message.save();
          console.log(`💾 Message reactions updated and saved`);
          
          // Broadcast the reaction to all clients
          socket.broadcast.emit('messageReaction', data);
          
        } catch (error) {
          console.error('❌ Error handling message reaction:', error);
          // Still broadcast even if save fails
          socket.broadcast.emit('messageReaction', data);
        }
      });

      socket.on('messageStatusUpdate', (data) => {
        console.log(`📊 Message status update from ${socket.id}:`, data);
        socket.broadcast.emit('messageStatusUpdate', data);
      });

      // Handle avatar data synchronization
      socket.on('avatarData', (data) => {
        console.log(`🎭 Avatar data received from ${socket.id} (user: ${data.senderUserId})`);
        
        // Broadcast to all connected users except sender
        console.log(`🎭 Broadcasting avatar data to all users except sender`);
        let sentCount = 0;
        activeSockets.forEach((clientSocket) => {
          if (clientSocket.id !== socket.id) { // Don't send to sender
            clientSocket.emit('avatarData', {
              senderId: socket.id,
              senderUserId: data.senderUserId,
              avatarData: data.avatarData
            });
            sentCount++;
          }
        });
        console.log(`✅ Avatar data broadcasted to ${sentCount} users`);
      });

      // Handle model change synchronization
      socket.on('modelChange', (data) => {
        console.log(`🎭 Model change from ${socket.id}:`, data.modelUrl);
        console.log(`🎭 Active sockets: ${activeSockets.size}`);
        
        // Broadcast to all connected users except sender
        let sentCount = 0;
        activeSockets.forEach((clientSocket, socketId) => {
          if (socketId !== socket.id) {
            console.log(`🎭 Broadcasting to: ${socketId}`);
            clientSocket.emit('modelChange', {
              senderId: socket.id,
              senderUserId: data.senderUserId,
              modelUrl: data.modelUrl
            });
            sentCount++;
          }
        });
        console.log(`🎭 Broadcasted to ${sentCount} users`);
      });

      // Handle voice data for mouth animation (only when WebRTC is connected)
      socket.on('voiceData', (data) => {
        console.log(`🎤 Voice data from ${socket.id}:`, {
          userId: data.userId,
          recipientId: data.recipientId,
          volume: data.volume,
          isSpeaking: data.isSpeaking,
          timestamp: data.timestamp,
          webrtcConnected: data.webrtcConnected || false,
          connectionState: data.connectionState || 'unknown'
        });
        
        // Only broadcast voice data if WebRTC is properly connected
        if (data.webrtcConnected && data.connectionState === 'connected') {
          // Broadcast voice data to all connected users except sender
          let sentCount = 0;
          console.log(`📡 Broadcasting voice data to ${activeSockets.size} active sockets (WebRTC connected)`);
          
          activeSockets.forEach((clientSocket, socketId) => {
            if (socketId !== socket.id) {
              console.log(`📤 Sending voice data to socket ${socketId}`);
              clientSocket.emit('voiceData', {
                userId: data.userId,
                recipientId: data.recipientId,
                volume: data.volume,
                isSpeaking: data.isSpeaking,
                timestamp: data.timestamp
              });
              sentCount++;
            } else {
              console.log(`❌ Skipping sender socket ${socketId}`);
            }
          });
          
          console.log(`🎤 Voice data broadcast complete. Sent to ${sentCount} clients.`);
        } else {
          console.log(`🔇 Not broadcasting voice data - WebRTC not connected:`, {
            webrtcConnected: data.webrtcConnected,
            connectionState: data.connectionState
          });
        }
      });

      // Handle WebRTC signaling
      socket.on('offer', (data) => {
        console.log(`📞 Received offer from ${socket.id} to ${data.recipientId}`);
        // Broadcast offer to recipient
        activeSockets.forEach((clientSocket, socketId) => {
          if (socketId !== socket.id) {
            clientSocket.emit('offer', {
              offer: data.offer,
              userId: data.userId,
              recipientId: data.recipientId
            });
          }
        });
      });

      socket.on('answer', (data) => {
        console.log(`📞 Received answer from ${socket.id} to ${data.recipientId}`);
        // Broadcast answer to recipient
        activeSockets.forEach((clientSocket, socketId) => {
          if (socketId !== socket.id) {
            clientSocket.emit('answer', {
              answer: data.answer,
              userId: data.userId,
              recipientId: data.recipientId
            });
          }
        });
      });

      socket.on('ice-candidate', (data) => {
        console.log(`🧊 Received ICE candidate from ${socket.id} to ${data.recipientId}`);
        // Broadcast ICE candidate to recipient
        activeSockets.forEach((clientSocket, socketId) => {
          if (socketId !== socket.id) {
            clientSocket.emit('ice-candidate', {
              candidate: data.candidate,
              userId: data.userId,
              recipientId: data.recipientId
            });
          }
        });
      });
      
      // Disconnect
      socket.on('disconnect', (reason) => {
        console.log(`🔌 ${serverType} Socket disconnected:`, socket.id, reason);
        
        // Clean up our custom socket tracking
        activeSockets.delete(socket.id);
        console.log(`📊 Active sockets after disconnect: ${activeSockets.size}`);
        
        // Clean up user data and notify others
        const userData = connectedUsers.get(socket.id);
        if (userData) {
          console.log(`👤 User ${userData.name} (${userData.userId}) went offline`);
          connectedUsers.delete(socket.id);
          
          // Check if this user has reconnected with a different socket
          const hasReconnected = Array.from(connectedUsers.values()).some(user => user.userId === userData.userId);
          
          if (!hasReconnected) {
            // Only notify offline if user hasn't reconnected
            socket.broadcast.emit('userStatusUpdate', {
              userId: userData.userId,
              name: userData.name,
              isOnline: false,
              timestamp: new Date().toISOString()
            });
            console.log(`📤 Notified others that ${userData.name} went offline`);
          } else {
            console.log(`🔄 User ${userData.name} has reconnected - skipping offline notification`);
          }
        }
      });
    });
  }

  // Create HTTPS server
  createHttpsServer() {
    try {
      const certPath = path.join(__dirname, '../certs/localhost.pem');
      const keyPath = path.join(__dirname, '../certs/localhost-key.pem');
      
      if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        const httpsOptions = {
          cert: fs.readFileSync(certPath),
          key: fs.readFileSync(keyPath),
          minVersion: 'TLSv1.2',
          maxVersion: 'TLSv1.3',
          ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384',
          honorCipherOrder: true
        };
        
        this.httpsServer = https.createServer(httpsOptions, this.app);
        this.setupSocketIO(this.httpsServer, 'HTTPS');
        
        this.httpsServer.listen(this.PORT, () => {
          console.log(`✅ HTTPS Server running on https://localhost:${this.PORT}`);
          console.log(`🔒 SSL Certificate: Enabled`);
          console.log(`🛡️ Security: Helmet + Rate Limiting`);
        });
        
        return true;
      } else {
        console.log('⚠️ SSL certificates not found, creating HTTP server only');
        return false;
      }
    } catch (error) {
      console.error('❌ Error creating HTTPS server:', error);
      return false;
    }
  }

  // Create HTTP server as fallback
  createHttpServer() {
    const httpPort = this.HTTP_PORT;
    
    this.httpServer = http.createServer(this.app);
    this.setupSocketIO(this.httpServer, 'HTTP');
    
    this.httpServer.listen(httpPort, () => {
      console.log(`✅ HTTP Server running on http://localhost:${httpPort}`);
      console.log(`🔓 HTTP Fallback: Enabled for compatibility`);
    });
  }

  // Start servers
  start() {
    console.log('🚀 Starting modern chat server...');
    
    // Try to create HTTPS server first
    const httpsCreated = this.createHttpsServer();
    
    if (!httpsCreated) {
      console.log('⚠️ HTTPS failed, falling back to HTTP only');
      console.log('💡 Camera access requires HTTPS. Run "node generate-ssl.js" to create certificates.');
    }
    
    // Always create HTTP server as fallback
    this.createHttpServer();
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🔄 Shutting down servers...');
      if (this.httpsServer) this.httpsServer.close();
      if (this.httpServer) this.httpServer.close();
      process.exit(0);
    });
    
    process.on('SIGINT', () => {
      console.log('🔄 Shutting down servers...');
      if (this.httpsServer) this.httpsServer.close();
      if (this.httpServer) this.httpServer.close();
      process.exit(0);
    });
  }
}

// Export the server class
module.exports = ModernChatServer;

// Start server if run directly
if (require.main === module) {
  const server = new ModernChatServer();
  server.start();
} 