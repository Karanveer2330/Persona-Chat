const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String }, // Display name
  email: { type: String }, // Email address
  avatarUrl: { type: String }, // Profile picture URL
  isOnline: { type: Boolean, default: false }, // Online status
  lastSeen: { type: Date, default: Date.now }, // Last seen timestamp
  id: { type: String }, // Custom ID field for compatibility
}, {
  timestamps: true // Adds createdAt and updatedAt
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);