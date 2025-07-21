const mongoose = require('mongoose');

const mediaAttachmentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['image', 'video', 'audio', 'file'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  thumbnail: String
});

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: false // Now optional since we might have media-only messages
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: String,
  senderAvatarUrl: String,
  chatId: String, // 'global' for global chat, or a room/private id
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Not required for global chat
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: false // Not required for global chat
  },
  media: [mediaAttachmentSchema]
});

module.exports = mongoose.model('Message', messageSchema);