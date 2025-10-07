const mongoose = require('mongoose');
const User = require('./users/user');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/globalchat', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected for migration');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

async function migrateUsers() {
  try {
    console.log('Starting user migration...');
    
    // Find all users
    const users = await User.find({});
    console.log(`Found ${users.length} users to migrate`);
    
    for (const user of users) {
      let updated = false;
      
      // Add missing fields
      if (user.name === undefined) {
        user.name = user.username || 'Unknown';
        updated = true;
      }
      
      if (user.isOnline === undefined) {
        user.isOnline = false;
        updated = true;
      }
      
      if (user.lastSeen === undefined) {
        user.lastSeen = new Date();
        updated = true;
      }
      
      if (user.id === undefined) {
        user.id = user._id.toString();
        updated = true;
      }
      
      if (updated) {
        await user.save();
        console.log(`Updated user: ${user.username} (${user._id})`);
      }
    }
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateUsers();
