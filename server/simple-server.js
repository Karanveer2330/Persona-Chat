const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

// In-memory storage for development
const rooms = new Map();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3443',
      'https://localhost:3443'
    ],
    methods: ['GET', 'POST'],
    credentials: true,
    allowEIO3: true
  },
  transports: ['websocket', 'polling']
});

// CORS setup for Express
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:9443',
    'https://localhost:9443',
    'http://localhost:3443',
    'https://localhost:3443'
  ],
  credentials: true
}));

app.use(express.json());

// Test endpoint for connection testing
app.get('/api/test', (req, res) => {
  console.log('🧪 Test endpoint hit');
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    server: 'simple-server'
  });
});

// Create/find private room
app.post('/api/rooms/private', (req, res) => {
  console.log('📝 Received request to create private room:', req.body);
  try {
    const { userId1, userId2 } = req.body;

    if (!userId1 || !userId2) {
      console.error('❌ Missing user IDs:', { userId1, userId2 });
      return res.status(400).json({ error: 'Both userId1 and userId2 are required' });
    }

    // Check for existing room
    const roomId = Array.from(rooms.entries()).find(([_, room]) => {
      const participants = room.participants;
      return participants.includes(userId1) && participants.includes(userId2);
    })?.[0];

    if (roomId) {
      return res.json({ room: { _id: roomId, ...rooms.get(roomId) } });
    }

    // Create new room
    const newRoomId = uuidv4();
    const room = {
      participants: [userId1, userId2],
      type: 'private',
      messages: [],
      createdAt: new Date()
    };

    rooms.set(newRoomId, room);
    console.log(`💬 Created private room: ${newRoomId} between ${userId1} and ${userId2}`);

    return res.status(201).json({ room: { _id: newRoomId, ...room } });
  } catch (error) {
    console.error('Error in /api/rooms/private:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get room details
app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  res.json({ room: { _id: roomId, ...room } });
});

// Get all private rooms for a user (alternative endpoint)
app.get('/api/rooms/:userId', (req, res) => {
  const { userId } = req.params;
  console.log('📝 Fetching rooms for user (alternative endpoint):', userId);
  
  try {
    const userRooms = [];
    
    // Find all rooms where the user is a participant
    for (const [roomId, room] of rooms.entries()) {
      if (room.participants && room.participants.includes(userId)) {
        // Get the other participant's info
        const otherParticipantId = room.participants.find(id => id !== userId);
        
        userRooms.push({
          _id: roomId,
          type: room.type,
          participants: room.participants,
          createdAt: room.createdAt,
          lastMessage: room.messages && room.messages.length > 0 ? room.messages[room.messages.length - 1] : null,
          otherParticipantId: otherParticipantId
        });
      }
    }
    
    console.log(`✅ Found ${userRooms.length} rooms for user ${userId} (alternative endpoint)`);
    res.json({ rooms: userRooms });
    
  } catch (error) {
    console.error('❌ Error fetching user rooms (alternative endpoint):', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all private rooms for a user
app.get('/api/users/:userId/rooms', (req, res) => {
  const { userId } = req.params;
  console.log('📝 Fetching rooms for user:', userId);
  
  try {
    const userRooms = [];
    
    // Find all rooms where the user is a participant
    for (const [roomId, room] of rooms.entries()) {
      if (room.participants && room.participants.includes(userId)) {
        // Get the other participant's info
        const otherParticipantId = room.participants.find(id => id !== userId);
        
        userRooms.push({
          _id: roomId,
          type: room.type,
          participants: room.participants,
          createdAt: room.createdAt,
          lastMessage: room.messages && room.messages.length > 0 ? room.messages[room.messages.length - 1] : null,
          otherParticipantId: otherParticipantId
        });
      }
    }
    
    console.log(`✅ Found ${userRooms.length} rooms for user ${userId}`);
    res.json({ rooms: userRooms });
    
  } catch (error) {
    console.error('❌ Error fetching user rooms:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users (mock data for development)
app.get('/api/users', (req, res) => {
  const mockUsers = [
    { 
      _id: '1', 
      name: 'John Doe', 
      username: 'johndoe', 
      email: 'john@example.com', 
      isOnline: true,
      displayName: 'John Doe'
    },
    { 
      _id: '2', 
      name: 'Jane Smith', 
      username: 'janesmith', 
      email: 'jane@example.com', 
      isOnline: false,
      displayName: 'Jane Smith'
    },
    { 
      _id: '3', 
      name: 'Alice Johnson', 
      username: 'alicej', 
      email: 'alice@example.com', 
      isOnline: true,
      displayName: 'Alice Johnson'
    }
  ];
  
  console.log('📝 Sending mock users data');
  res.json({ users: mockUsers });
});

// Get individual user by ID
app.get('/api/users/:userId', (req, res) => {
  const { userId } = req.params;
  console.log('📝 Fetching user:', userId);
  
  // Mock user data - in production this would come from a database
  const mockUsers = {
    '1': { 
      _id: '1', 
      name: 'John Doe', 
      username: 'johndoe', 
      email: 'john@example.com', 
      isOnline: true, 
      avatarUrl: '',
      displayName: 'John Doe'
    },
    '2': { 
      _id: '2', 
      name: 'Jane Smith', 
      username: 'janesmith', 
      email: 'jane@example.com', 
      isOnline: false, 
      avatarUrl: '',
      displayName: 'Jane Smith'
    },
    '3': { 
      _id: '3', 
      name: 'Alice Johnson', 
      username: 'alicej', 
      email: 'alice@example.com', 
      isOnline: true, 
      avatarUrl: '',
      displayName: 'Alice Johnson'
    }
  };
  
  let user = mockUsers[userId];
  
  // If user not found in mock data, create a dynamic user (for UUIDs)
  if (!user && userId.length > 10) { // UUIDs are typically longer than simple IDs
    const shortId = userId.substring(0, 8);
    user = {
      _id: userId,
      name: `User ${shortId}`,
      username: `user_${shortId}`,
      email: `user_${shortId}@example.com`,
      isOnline: true,
      avatarUrl: '',
      displayName: `User ${shortId}`
    };
    console.log('🆕 Created dynamic user for UUID:', userId);
  }
  
  if (!user) {
    console.log('❌ User not found:', userId);
    return res.status(404).json({ error: 'User not found' });
  }
  
  console.log('✅ User found:', user.name, 'Username:', user.username);
  res.json({ user });
});

// Get messages for a specific room
app.get('/api/messages/room/:roomId', (req, res) => {
  const { roomId } = req.params;
  console.log('📝 Fetching messages for room:', roomId);
  
  const room = rooms.get(roomId);
  if (!room) {
    console.log('❌ Room not found:', roomId);
    return res.status(404).json({ error: 'Room not found' });
  }
  
  // Transform messages to match frontend expected format
  const messages = (room.messages || []).map((msg, index) => ({
    _id: msg.id || `msg_${index}`,
    sender: msg.senderId || msg.sender,
    senderId: msg.senderId || msg.sender,
    senderName: msg.senderName || 'Unknown',
    content: msg.text || msg.content || msg.content || '',
    text: msg.text || msg.content || msg.content || '',
    timestamp: msg.timestamp || new Date(),
    type: msg.type || 'text',
    senderAvatarUrl: msg.senderAvatarUrl || '',
    media: msg.media || [],
    recipientId: msg.recipientId || null
  }));
  
  console.log(`✅ Found ${messages.length} messages for room ${roomId}`);
  res.json({ messages });
});

// Send a message to a room
app.post('/api/messages/send', (req, res) => {
  try {
    const { roomId, senderId, senderName, content, type = 'text' } = req.body;
    console.log('📨 API: Sending message:', { roomId, senderId, content });
    
    if (!roomId || !senderId || !content) {
      return res.status(400).json({ error: 'Missing required fields: roomId, senderId, content' });
    }
    
    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Create message object
    const message = {
      id: uuidv4(),
      senderId,
      senderName: senderName || 'Unknown',
      content,
      type,
      timestamp: new Date(),
      roomId
    };
    
    // Store message in room
    if (!room.messages) {
      room.messages = [];
    }
    room.messages.push(message);
    
    console.log(`💬 Message stored via API in room ${roomId}:`, message.content);
    
    // Broadcast message to all connected clients in the room
    io.to(roomId).emit('newMessage', message);
    
    res.json({ 
      success: true, 
      message: message,
      messageId: message.id 
    });
    
  } catch (error) {
    console.error('❌ Error sending message via API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Socket.IO event handling
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`👥 User ${socket.id} joined room ${roomId}`);
  });

  socket.on('leaveRoom', (roomId) => {
    socket.leave(roomId);
    console.log(`👋 User ${socket.id} left room ${roomId}`);
  });

  // Handle private messages
  socket.on('sendMessage', (data) => {
    try {
      console.log('📨 Received message:', data);
      
      // Handle both frontend and API message formats
      const { 
        roomId, 
        senderId, 
        senderName, 
        content, 
        type = 'text',
        recipientId, // Frontend format
        senderAvatarUrl, // Frontend format
        timestamp, // Frontend format
        media // Frontend format
      } = data;
      
      // Use roomId from data or construct from recipientId if needed
      const actualRoomId = roomId || data.roomId;
      
      if (!actualRoomId || !senderId || !content) {
        console.error('❌ Missing required message data:', { actualRoomId, senderId, content });
        return;
      }

      const room = rooms.get(actualRoomId);
      if (!room) {
        console.error('❌ Room not found:', actualRoomId);
        return;
      }

      // Create message object with frontend-compatible format
      const message = {
        id: uuidv4(),
        senderId,
        senderName: senderName || 'Unknown',
        content,
        type,
        timestamp: timestamp || new Date(),
        roomId: actualRoomId,
        senderAvatarUrl: senderAvatarUrl || '',
        media: media || [],
        recipientId: recipientId || null
      };

      // Store message in room
      if (!room.messages) {
        room.messages = [];
      }
      room.messages.push(message);

      console.log(`💬 Message stored in room ${actualRoomId}:`, message.content);

      // Broadcast message to all users in the room
      io.to(actualRoomId).emit('newMessage', message);
      
      // Confirm message was sent
      socket.emit('messageSent', { success: true, messageId: message.id });
      
    } catch (error) {
      console.error('❌ Error handling message:', error);
      socket.emit('messageError', 'Failed to send message');
    }
  });

  // Handle joining private rooms
  socket.on('joinPrivateRoom', (data) => {
    try {
      console.log('🏠 Joining private room:', data);
      const { roomId, userId } = data;
      
      if (roomId && userId) {
        socket.join(roomId);
        console.log(`✅ User ${userId} joined private room ${roomId}`);
        
        // Notify other users in the room
        socket.to(roomId).emit('userJoinedRoom', { userId, roomId });
      }
    } catch (error) {
      console.error('❌ Error joining private room:', error);
    }
  });

  // Handle user online status
  socket.on('userOnline', (data) => {
    try {
      console.log('🟢 User online:', data);
      socket.broadcast.emit('userOnline', data);
    } catch (error) {
      console.error('❌ Error updating user status:', error);
    }
  });

  // Handle global message sending (for compatibility)
  socket.on('sendGlobalMessage', (data) => {
    try {
      console.log('📨 Global message received:', data);
      // Broadcast to all connected clients
      io.emit('newGlobalMessage', data);
    } catch (error) {
      console.error('❌ Error handling global message:', error);
    }
  });

  // Handle private message sending (alternative format)
  socket.on('sendPrivateMessage', (data) => {
    try {
      console.log('📨 Private message received:', data);
      const { roomId, senderId, senderName, content, recipientId } = data;
      
      if (!roomId || !senderId || !content) {
        console.error('❌ Missing required data for private message');
        return;
      }
      
      // Create and store message
      const message = {
        id: uuidv4(),
        senderId,
        senderName: senderName || 'Unknown',
        content,
        timestamp: new Date(),
        roomId,
        recipientId
      };
      
      const room = rooms.get(roomId);
      if (room) {
        if (!room.messages) room.messages = [];
        room.messages.push(message);
        
        // Broadcast to room
        io.to(roomId).emit('newMessage', message);
        console.log(`💬 Private message stored and broadcast to room ${roomId}`);
      }
      
    } catch (error) {
      console.error('❌ Error handling private message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('👋 User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3443;

server.listen(PORT, () => {
  console.log(`⚡ Development server running on http://localhost:${PORT}`);
  console.log('📝 Using in-memory storage for development');
  console.log('🔌 WebSocket server enabled');
});
