const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const authRoutes = require('./users/auth');
const User = require('./users/user');
const Message = require('./message');
const Room = require('./users/room');

const app = express();

app.use(cors({
  origin: ['http://localhost:5000', 'http://localhost:9002'],
  credentials: true
}));
app.use(express.json());
app.use('/api/users', authRoutes);

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, audio, and common file types
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|avi|mov|mp3|wav|pdf|doc|docx|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/globalchat', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

// --- FILE UPLOAD ENDPOINT ---
app.post('/api/upload', upload.array('files', 10), (req, res) => {
  try {
    console.log('Upload request received, files:', req.files?.length || 0);
    if (!req.files || req.files.length === 0) {
      console.log('No files in upload request');
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = req.files.map(file => {
      const fileType = getFileType(file.mimetype);
      console.log(`Uploaded file: ${file.originalname} (${fileType})`);
      return {
        id: uuidv4(),
        type: fileType,
        url: `http://localhost:5000/uploads/${file.filename}`,
        name: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        filename: file.filename
      };
    });

    console.log('Upload successful, returning:', uploadedFiles.length, 'files');
    res.json({ files: uploadedFiles });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Helper function to determine file type
function getFileType(mimeType) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'file';
}

// --- GET USER BY ID (for private chat) ---
app.get('/api/users/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let user = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id);
    }
    // Try also by "id" field if not found by _id
    if (!user) {
      user = await User.findOne({ id });
    }
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// --- GET ROOMS FOR USER ---
app.get('/api/rooms/:userId', async (req, res) => {
  try {
    // userId is always a string now
    const userId = req.params.userId.toString();
    const rooms = await Room.find({ users: userId });
    
    // Manually populate user data since users are stored as strings, not ObjectIds
    const populatedRooms = await Promise.all(
      rooms.map(async (room) => {
        const userDocs = await Promise.all(
          room.users.map(async (userIdStr) => {
            // Try to find by both _id and string id
            let user = null;
            if (mongoose.Types.ObjectId.isValid(userIdStr)) {
              user = await User.findById(userIdStr);
            }
            if (!user) {
              user = await User.findOne({ id: userIdStr });
            }
            // Return user data or fallback
            return user ? {
              _id: user._id,
              id: user.id || user._id,
              name: user.name || user.username || user.email,
              username: user.username,
              email: user.email,
              avatarUrl: user.avatarUrl,
              isOnline: user.isOnline
            } : {
              _id: userIdStr,
              id: userIdStr,
              name: userIdStr,
              username: userIdStr,
              email: null,
              avatarUrl: null,
              isOnline: false
            };
          })
        );
        
        return {
          ...room.toObject(),
          users: userDocs
        };
      })
    );
    
    res.json({ rooms: populatedRooms });
  } catch (err) {
    console.error('Error fetching rooms:', err);
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
});

// --- NEW: Create or get a private room between two users ---
app.post('/api/rooms/private', async (req, res) => {
  try {
    const { userId1, userId2 } = req.body;
    if (!userId1 || !userId2) {
      return res.status(400).json({ error: "Missing user IDs" });
    }
    const ids = [userId1.toString(), userId2.toString()].sort();
    if (ids.length !== 2) {
      return res.status(400).json({ error: "Room must have exactly 2 users" });
    }
    // --- FIX: Accept both _id and id for user lookup ---
    const users = await User.find({
      $or: [
        { _id: { $in: ids.filter(mongoose.Types.ObjectId.isValid) } },
        { id: { $in: ids } }
      ]
    });
    if (users.length !== 2) {
      return res.status(404).json({ error: "One or both users not found" });
    }
    let room = await Room.findOneAndUpdate(
      { users: ids },
      { $setOnInsert: { users: ids } },
      { new: true, upsert: true }
    );
    
    // Manually populate user data since users are stored as strings
    const userDocs = await Promise.all(
      room.users.map(async (userIdStr) => {
        let user = null;
        if (mongoose.Types.ObjectId.isValid(userIdStr)) {
          user = await User.findById(userIdStr);
        }
        if (!user) {
          user = await User.findOne({ id: userIdStr });
        }
        return user ? {
          _id: user._id,
          id: user.id || user._id,
          name: user.name || user.username || user.email,
          username: user.username,
          email: user.email,
          avatarUrl: user.avatarUrl,
          isOnline: user.isOnline
        } : {
          _id: userIdStr,
          id: userIdStr,
          name: userIdStr,
          username: userIdStr,
          email: null,
          avatarUrl: null,
          isOnline: false
        };
      })
    );
    
    const roomWithUsers = {
      ...room.toObject(),
      users: userDocs
    };
    
    res.json({ room: roomWithUsers });
  } catch (err) {
    console.error("Error in /api/rooms/private:", err);
    res.status(500).json({ error: "Failed to get or create room" });
  }
});

// --- GET MESSAGES FOR ROOM ---
app.get('/api/messages/room/:roomId', async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.roomId }).sort({ timestamp: 1 });
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// --- GET GLOBAL MESSAGES ---
app.get('/api/messages/global', async (req, res) => {
  try {
    const messages = await Message.find({ chatId: 'global' }).sort({ timestamp: 1 });
    const normalized = messages.map(msg => ({
      _id: msg._id,
      text: msg.content,
      timestamp: msg.timestamp,
      senderId: msg.sender,
      senderName: msg.senderName,
      avatarUrl: msg.avatarUrl,
      media: msg.media || []
    }));
    res.json({ messages: normalized });
  } catch (err) {
    console.error('Error fetching global messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// --- SOCKET.IO LOGIC ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5000', 'http://localhost:9002'],
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Add general message listener for debugging
  socket.onAny((eventName, data) => {
    console.log(`Received event: ${eventName}`, data ? (typeof data === 'object' ? JSON.stringify(data, null, 2).substring(0, 200) + '...' : data) : 'no data');
  });

  // GLOBAL CHAT
  socket.on('joinGlobalRoom', () => {
    socket.join('global');
    console.log('User joined global chat room');
  });

  socket.on('sendGlobalMessage', async (data) => {
    try {
      console.log('Global message received:', { 
        text: data.text, 
        senderId: data.senderId, 
        mediaCount: data.media?.length || 0 
      });
      
      // Ensure we have either content or media
      if ((!data.text || data.text.trim() === '') && (!data.media || data.media.length === 0)) {
        console.log('Rejecting message: no content or media');
        socket.emit('messageError', 'Message must have content or media');
        return;
      }
      
      const msg = new Message({
        chatId: 'global',
        content: data.text || '',
        sender: data.senderId,
        senderName: data.senderName,
        avatarUrl: data.avatarUrl || undefined,
        timestamp: data.timestamp || new Date(),
        media: data.media || []
      });
      
      console.log('Message object before save:', {
        content: msg.content,
        sender: msg.sender,
        senderName: msg.senderName,
        mediaCount: msg.media.length,
        media: msg.media
      });
      
      await msg.save();
      console.log('Global message saved with ID:', msg._id);
      console.log('Saved message media:', msg.media);

      const messageForClient = {
        _id: msg._id,
        text: msg.content,
        timestamp: msg.timestamp,
        senderId: msg.sender,
        senderName: msg.senderName,
        avatarUrl: msg.avatarUrl,
        media: msg.media
      };
      
      console.log('Broadcasting global message to room');
      console.log('Message for client:', JSON.stringify(messageForClient, null, 2));
      io.to('global').emit('globalMessage', messageForClient);
    } catch (err) {
      console.error('Global message save error:', err);
      socket.emit('messageError', 'Failed to send global message');
    }
  });

  // PRIVATE CHAT (room is based on both user IDs sorted)
  socket.on('joinPrivateRoom', ({ userId1, userId2 }) => {
    if (!userId1 || !userId2) return;
    const ids = [userId1.toString(), userId2.toString()].sort();
    const roomName = `private:${ids[0]}:${ids[1]}`;
    socket.join(roomName);
    console.log(`User joined private room: ${roomName}`);
  });

  // --- ONLY ONE sendMessage HANDLER ---
  socket.on('sendMessage', async (messageData) => {
    try {
      const { senderId, recipientId, senderName, senderAvatarUrl, content, media } = messageData;
      // Defensive: Check for missing IDs
      if (!senderId || !recipientId) {
        console.error('sendMessage missing senderId or recipientId:', { senderId, recipientId });
        socket.emit('messageError', 'Missing sender or recipient ID');
        return;
      }
      
      // Ensure we have either content or media
      if (!content && (!media || media.length === 0)) {
        socket.emit('messageError', 'Message must have content or media');
        return;
      }
      
      // Always use string IDs for room users
      const ids = [String(senderId), String(recipientId)].sort();

      // Use upsert to avoid duplicate key error
      let room = await Room.findOneAndUpdate(
        { users: ids },
        { $setOnInsert: { users: ids } },
        { new: true, upsert: true }
      );
      if (!room) {
        console.error('Room creation failed for users:', ids);
        socket.emit('messageError', 'Room creation failed');
        return;
      }
      const roomName = `private:${ids[0]}:${ids[1]}`;

      const newMessage = new Message({
        content: content || '',
        sender: senderId,
        recipient: recipientId,
        senderName,
        senderAvatarUrl,
        timestamp: new Date(),
        room: room._id,
        media: media || []
      });

      const savedMessage = await newMessage.save();

      const messageForClient = {
        _id: savedMessage._id,
        content: savedMessage.content,
        senderId: savedMessage.sender,
        recipientId: savedMessage.recipient,
        senderName: savedMessage.senderName,
        senderAvatarUrl: savedMessage.senderAvatarUrl,
        timestamp: savedMessage.timestamp,
        room: savedMessage.room,
        media: savedMessage.media
      };

      io.to(roomName).emit('newMessage', messageForClient);
    } catch (error) {
      console.error('Message save error:', error);
      socket.emit('messageError', 'Failed to send message');
    }
  });

  // ...other handlers if needed...
});

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});