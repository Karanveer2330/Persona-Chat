const mongoose = require('mongoose');
const path = require('path');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/persona3d-chat', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define the new message schema with structured media
const messageSchema = new mongoose.Schema({
  text: { type: String, required: true },
  senderId: { type: String, required: true },
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

const Message = mongoose.model('Message', messageSchema);

async function migrateMediaAttachments() {
  try {
    console.log('🔄 Starting media attachment migration...');
    
    // Find all messages that have media attachments
    const messages = await Message.find({ 
      media: { $exists: true, $ne: [] } 
    });
    
    console.log(`📥 Found ${messages.length} messages with media attachments`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const message of messages) {
      let needsUpdate = false;
      const structuredMedia = [];
      
      for (const media of message.media) {
        if (typeof media === 'string') {
          // Convert string URL to structured media object
          const fileName = media.split('/').pop() || 'unknown';
          const fileExtension = path.extname(fileName).toLowerCase();
          
          // Determine media type based on file extension
          let mediaType = 'file';
          let mimeType = 'application/octet-stream';
          
          if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(fileExtension)) {
            mediaType = 'image';
            mimeType = `image/${fileExtension.slice(1)}`;
          } else if (['.mp4', '.webm', '.avi', '.mov'].includes(fileExtension)) {
            mediaType = 'video';
            mimeType = `video/${fileExtension.slice(1)}`;
          } else if (['.mp3', '.wav', '.ogg', '.aac'].includes(fileExtension)) {
            mediaType = 'audio';
            mimeType = `audio/${fileExtension.slice(1)}`;
          }
          
          const structuredMediaItem = {
            id: `migrated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: mediaType,
            url: media,
            name: fileName,
            size: 0, // We don't have the original size
            mimeType: mimeType
          };
          
          structuredMedia.push(structuredMediaItem);
          needsUpdate = true;
          
          console.log(`🔄 Converting: ${media} -> ${JSON.stringify(structuredMediaItem)}`);
        } else if (media && typeof media === 'object') {
          // Media is already structured, keep it as is
          structuredMedia.push(media);
        }
      }
      
      if (needsUpdate) {
        message.media = structuredMedia;
        await message.save();
        migratedCount++;
        console.log(`✅ Migrated message ${message._id}`);
      } else {
        skippedCount++;
        console.log(`⏭️ Skipped message ${message._id} (already structured)`);
      }
    }
    
    console.log(`\n🎉 Migration completed!`);
    console.log(`✅ Migrated: ${migratedCount} messages`);
    console.log(`⏭️ Skipped: ${skippedCount} messages`);
    console.log(`📊 Total processed: ${messages.length} messages`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the migration
migrateMediaAttachments();






