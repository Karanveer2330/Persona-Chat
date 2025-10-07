// Voice data handler for Socket.IO server
module.exports = function(socket, activeSockets) {
  // Handle voice data
  socket.on('voiceData', (data) => {
    console.log(`🎤 Voice data from ${socket.id}:`, data.volume, data.isSpeaking);
    
    // Broadcast voice data to all connected users except sender
    let sentCount = 0;
    activeSockets.forEach((clientSocket, socketId) => {
      if (socketId !== socket.id) {
        clientSocket.emit('voiceData', {
          userId: data.userId,
          recipientId: data.recipientId,
          volume: data.volume,
          isSpeaking: data.isSpeaking,
          timestamp: data.timestamp
        });
        sentCount++;
      }
    });
    
    console.log(`🎤 Voice data broadcast complete. Sent to ${sentCount} clients.`);
  });
};




