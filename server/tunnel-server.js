const express = require('express');
const https = require('https');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// CORS configuration for tunnel compatibility
app.use(cors({
    origin: [
        'https://localhost:9443',
        'http://localhost:9443',
        'https://127.0.0.1:9443',
        'http://127.0.0.1:9443',
        /^https:\/\/.*\.ngrok\.io$/,
        /^https:\/\/.*\.localtunnel\.me$/,
        /^https:\/\/.*\.cloudflare\.com$/
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// In-memory storage
let users = [];
let globalMessages = [];
let privateRooms = [];
let roomMessages = {};

// Helper functions
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function findUserById(id) {
    return users.find(u => u.id === id) || { id, username: 'Unknown User' };
}

function findOrCreateRoom(userId1, userId2) {
    let room = privateRooms.find(r => 
        (r.users[0].id === userId1 && r.users[1].id === userId2) ||
        (r.users[0].id === userId2 && r.users[1].id === userId1)
    );
    
    if (!room) {
        const user1 = findUserById(userId1);
        const user2 = findUserById(userId2);
        room = {
            _id: generateId(),
            users: [user1, user2],
            createdAt: new Date().toISOString()
        };
        privateRooms.push(room);
        roomMessages[room._id] = [];
    }
    
    return room;
}

// API Routes
app.post('/api/users/register', (req, res) => {
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
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

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

app.get('/api/users/:id', (req, res) => {
    try {
        const user = findUserById(req.params.id);
        res.json({ user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/messages/global', (req, res) => {
    try {
        res.json({ messages: globalMessages });
    } catch (error) {
        console.error('Get global messages error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/messages/room/:roomId', (req, res) => {
    try {
        const messages = roomMessages[req.params.roomId] || [];
        res.json({ messages });
    } catch (error) {
        console.error('Get room messages error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/rooms/:userId', (req, res) => {
    try {
        const userRooms = privateRooms.filter(room => 
            room.users.some(user => user.id === req.params.userId)
        );
        res.json({ rooms: userRooms });
    } catch (error) {
        console.error('Get rooms error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/rooms/create', (req, res) => {
    try {
        const { userId1, userId2 } = req.body;
        
        if (!userId1 || !userId2) {
            return res.status(400).json({ error: 'Both user IDs required' });
        }
        
        const room = findOrCreateRoom(userId1, userId2);
        res.json({ success: true, room });
    } catch (error) {
        console.error('Create room error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Serve the main HTML file for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Create HTTPS server
let server;
try {
    const key = fs.readFileSync(path.join(__dirname, '..', 'certs', 'localhost-key.pem'));
    const cert = fs.readFileSync(path.join(__dirname, '..', 'certs', 'localhost.pem'));
    
    server = https.createServer({ key, cert }, app);
    console.log('✅ HTTPS server created with SSL certificates');
} catch (error) {
    console.log('⚠️ SSL certificates not found, falling back to HTTP');
    server = http.createServer(app);
}

// Socket.IO setup
const io = socketIo(server, {
    cors: {
        origin: [
            'https://localhost:9443',
            'http://localhost:9443',
            'https://127.0.0.1:9443',
            'http://127.0.0.1:9443',
            /^https:\/\/.*\.ngrok\.io$/,
            /^https:\/\/.*\.localtunnel\.me$/,
            /^https:\/\/.*\.cloudflare\.com$/
        ],
        credentials: true,
        methods: ['GET', 'POST']
    }
});

// Socket event handlers
io.on('connection', (socket) => {
    console.log('📱 User connected:', socket.id);
    
    // Global message sending
    socket.on('sendGlobalMessage', (data) => {
        try {
            console.log('🌍 Global message received:', data);
            
            const message = {
                id: generateId(),
                content: data.content,
                senderId: data.senderId,
                senderName: data.senderName,
                timestamp: data.timestamp || Date.now(),
                type: 'global'
            };
            
            globalMessages.push(message);
            
            // Broadcast to all connected clients
            io.emit('globalMessage', message);
            io.emit('new-message', message);
            
            socket.emit('message-sent', { success: true });
            console.log('✅ Global message sent successfully');
        } catch (error) {
            console.error('❌ Error sending global message:', error);
            socket.emit('messageError', 'Failed to send message');
        }
    });
    
    // Private message sending
    socket.on('sendMessage', (data) => {
        try {
            console.log('💬 Private message received:', data);
            
            if (!data.senderId || !data.recipientId) {
                socket.emit('messageError', 'Sender ID and Recipient ID required');
                return;
            }
            
            // Find or create room
            const room = findOrCreateRoom(data.senderId, data.recipientId);
            
            const message = {
                id: generateId(),
                content: data.content,
                senderId: data.senderId,
                senderName: data.senderName,
                timestamp: data.timestamp || Date.now(),
                chatId: room._id,
                type: 'private'
            };
            
            // Store message in room
            if (!roomMessages[room._id]) {
                roomMessages[room._id] = [];
            }
            roomMessages[room._id].push(message);
            
            // Send to room participants
            io.emit('newMessage', message);
            
            socket.emit('message-sent', { success: true });
            console.log('✅ Private message sent successfully');
        } catch (error) {
            console.error('❌ Error sending private message:', error);
            socket.emit('messageError', 'Failed to send private message');
        }
    });
    
    // Join private room
    socket.on('joinPrivateRoom', (data) => {
        try {
            console.log('🏠 Joining private room:', data);
            const room = findOrCreateRoom(data.userId1, data.userId2);
            socket.join(room._id);
            console.log('✅ User joined room:', room._id);
        } catch (error) {
            console.error('❌ Error joining room:', error);
        }
    });
    
    // User online status
    socket.on('userOnline', (data) => {
        try {
            console.log('🟢 User online:', data);
            socket.broadcast.emit('userOnline', data);
        } catch (error) {
            console.error('❌ Error updating user status:', error);
        }
    });
    
    // Video call events
    socket.on('video-call-offer', (data) => {
        try {
            console.log('📹 Video call offer:', data);
            socket.to(data.roomId).emit('video-call-offer', data);
        } catch (error) {
            console.error('❌ Error handling video call offer:', error);
        }
    });
    
    socket.on('video-call-answer', (data) => {
        try {
            console.log('📹 Video call answer:', data);
            socket.to(data.roomId).emit('video-call-answer', data);
        } catch (error) {
            console.error('❌ Error handling video call answer:', error);
        }
    });
    
    socket.on('video-call-ice-candidate', (data) => {
        try {
            console.log('📹 ICE candidate:', data);
            socket.to(data.roomId).emit('video-call-ice-candidate', data);
        } catch (error) {
            console.error('❌ Error handling ICE candidate:', error);
        }
    });
    
    socket.on('disconnect', () => {
        console.log('📱 User disconnected:', socket.id);
    });
});

// Start server
const PORT = 3444;
server.listen(PORT, () => {
    console.log('\n🚀 ================================');
    console.log('🌟 TUNNEL SERVER RUNNING!');
    console.log('🌐 HTTPS URL: https://localhost:3444');
    console.log('📱 Mobile Ready: Tunnel Compatible');
    console.log('✅ Features: Login, Chat, Video, Rooms');
    console.log('🚀 ================================\n');
});

// Error handling
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Rejection:', error);
});

module.exports = { app, server, io };
