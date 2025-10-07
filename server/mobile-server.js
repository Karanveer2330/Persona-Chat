const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server: SocketIOServer } = require('socket.io');

const app = express();
const PORT = process.env.MOBILE_PORT ? Number(process.env.MOBILE_PORT) : 5000;

// CORS configuration for mobile access over local network
app.use(cors({
  origin: [
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
    // Mobile / LAN ranges
    /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
    /^https:\/\/192\.168\.\d+\.\d+:\d+$/,
    /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
    /^https:\/\/10\.\d+\.\d+\.\d+:\d+$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// In-memory storage (for development/testing only)
const users = [];
const globalMessages = [];
const privateRoomMessages = new Map(); // key: roomId -> array of messages
const connectedUsers = new Map(); // key: socket.id -> { userId, name, isOnline }

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// Health/test endpoints
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    service: 'mobile-server',
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/mobile-test', (req, res) => {
  res.json({ status: 'ok', service: 'mobile-server', protocol: req.protocol });
});

// Fetch recent global messages (simple in-memory)
app.get('/api/messages/global', (req, res) => {
  const messages = globalMessages.slice(-100);
  res.json({ messages });
});

// Fetch messages for a private room
app.get('/api/messages/room/:roomId', (req, res) => {
  const { roomId } = req.params;
  const messages = privateRoomMessages.get(roomId) || [];
  res.json({ messages: messages.slice(-100) });
});

// List rooms for a user (robust derivation; if none exist, create a demo room with a sample user)
app.get('/api/rooms/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const normalized = String(userId);
    const rooms = [];

    privateRoomMessages.forEach((msgs, roomId) => {
      const parts = roomId.replace('private_', '').split('_');
      if (parts.includes(normalized)) {
        rooms.push({
          _id: roomId,
          users: parts.map(id => ({ _id: id, id, name: `User ${id}`, avatarUrl: '' }))
        });
      }
    });

    // If user has no rooms yet, return an empty array (frontend supports this)
    return res.json({ rooms });
  } catch (err) {
    console.error('Get rooms error:', err);
    return res.status(200).json({ rooms: [] });
  }
});

// Signup
app.post('/api/users/signup', (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const existing = users.find(u => u.username === username);
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const user = { id: generateId(), username, password, createdAt: new Date().toISOString() };
    users.push(user);
    return res.json({ success: true, user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/api/users/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    return res.json({ success: true, user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create HTTP server and Socket.IO
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: [
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
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
      /^https:\/\/192\.168\.\d+\.\d+:\d+$/,
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
      /^https:\/\/10\.\d+\.\d+\.\d+:\d+$/
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

function getPrivateRoomId(userId1, userId2) {
  const [a, b] = [String(userId1), String(userId2)].sort();
  return `private_${a}_${b}`;
}

io.on('connection', (socket) => {
  console.log('🔌 Mobile socket connected:', socket.id);

  // Global room
  socket.on('joinGlobalRoom', () => {
    socket.join('global');
    console.log(`🌍 ${socket.id} joined global`);
  });

  socket.on('sendGlobalMessage', (data) => {
    const message = {
      _id: Date.now().toString(),
      text: data.text || data.content || '',
      senderId: data.senderId || '',
      senderName: data.senderName || 'Unknown',
      media: data.media || [],
      timestamp: new Date().toISOString(),
      type: 'global'
    };
    globalMessages.push(message);
    io.to('global').emit('globalMessage', message);
  });

  // Private rooms
  socket.on('joinPrivateRoom', ({ userId1, userId2 }) => {
    const roomId = getPrivateRoomId(userId1, userId2);
    socket.join(roomId);
    console.log(`🔒 ${socket.id} joined ${roomId}`);
    socket.to(roomId).emit('userJoinedPrivateRoom', { userId: socket.id, roomId });
  });

  socket.on('sendMessage', (data) => {
    const roomId = data.roomId || getPrivateRoomId(data.senderId, data.recipientId);
    const message = {
      _id: Date.now().toString(),
      text: data.content || data.text || '',
      senderId: data.senderId || '',
      senderName: data.senderName || 'Unknown',
      media: data.media || [],
      timestamp: new Date().toISOString(),
      type: 'private',
      roomId
    };
    if (!privateRoomMessages.has(roomId)) privateRoomMessages.set(roomId, []);
    privateRoomMessages.get(roomId).push(message);
    io.to(roomId).emit('newMessage', message);
    // Some clients also listen to newRoomMessage
    io.to(roomId).emit('newRoomMessage', message);
  });

  // Online status
  socket.on('userOnline', (data) => {
    connectedUsers.set(socket.id, { userId: data.userId, name: data.name || '', isOnline: true });
    socket.broadcast.emit('userStatusUpdate', { userId: data.userId, name: data.name || '', isOnline: true });
  });

  socket.on('requestOnlineUsers', () => {
    const list = [];
    connectedUsers.forEach((value) => list.push({ ...value }));
    socket.emit('currentOnlineUsers', list);
  });

  // Minimal video-call registration ack for clients expecting it
  socket.on('registerForVideoCallNotifications', (data) => {
    socket.emit('registrationConfirmed', { ok: true, userId: data?.userId });
  });

  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    connectedUsers.delete(socket.id);
    if (user) {
      socket.broadcast.emit('userStatusUpdate', { userId: user.userId, name: user.name, isOnline: false });
    }
    console.log('🔌 Mobile socket disconnected:', socket.id);
  });
});

// Start server, listen on all interfaces for mobile access
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 ================================');
  console.log('🌟 MOBILE BACKEND SERVER RUNNING');
  console.log(`🌐 HTTP URL: http://localhost:${PORT}`);
  console.log(`🌐 Network URL: http://<your-ip>:${PORT}`);
  console.log('📱 Mobile Ready: Signup & Login + Socket.IO Chat');
  console.log('✅ Endpoints: /api/test, /api/users/signup, /api/users/login');
  console.log('✅ Socket Events: joinGlobalRoom, sendGlobalMessage, joinPrivateRoom, sendMessage, userOnline');
  console.log('🚀 ================================\n');
});

process.on('uncaughtException', (error) => console.error('❌ Uncaught Exception:', error));
process.on('unhandledRejection', (error) => console.error('❌ Unhandled Rejection:', error));


