const mongoose = require('mongoose');
const RoomSchema = new mongoose.Schema({
  users: [{ type: String, required: true }],
});
RoomSchema.index({ users: 1 }, { unique: true }); // Ensures unique user pairs
module.exports = mongoose.model('Room', RoomSchema);