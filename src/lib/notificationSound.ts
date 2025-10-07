// Simple notification sound generator for incoming calls
// This creates a pleasant notification sound using Web Audio API

export function createNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a pleasant notification sound
    const createTone = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, startTime);
      oscillator.type = 'sine';
      
      // Fade in and out
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    
    // Create a pleasant notification melody
    const now = audioContext.currentTime;
    createTone(800, now, 0.2);      // First tone
    createTone(1000, now + 0.3, 0.2); // Second tone
    createTone(1200, now + 0.6, 0.3); // Third tone
    
  } catch (error) {
    console.log('Could not create notification sound:', error);
  }
}

// Export for use in components
export default createNotificationSound;

