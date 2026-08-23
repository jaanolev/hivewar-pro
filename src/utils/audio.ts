// Generate a short, classy confirm/tick sound for copy actions.
// No voice, no game-ripped audio, just a clean UI tick.

let confirmSound: HTMLAudioElement | null = null;

export function playConfirmSound() {
  // Check localStorage for user preference (default enabled)
  const muted = localStorage.getItem('hivewar-sound-muted') === 'true';
  if (muted) return;

  if (!confirmSound) {
    // Create a short, professional tick sound using Web Audio API
    // This generates a clean, brief "click" without external files
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const sampleRate = audioContext.sampleRate;
    const duration = 0.08; // 80ms tick
    const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Generate a clean click: quick attack + decay envelope with a frequency sweep
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 40); // Fast decay
      const freq = 1200 - (t * 800); // Frequency sweep down
      data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.15;
    }
    
    // Convert buffer to base64 data URL for reuse
    const offlineContext = new OfflineAudioContext(1, buffer.length, sampleRate);
    const source = offlineContext.createBufferSource();
    source.buffer = buffer;
    source.connect(offlineContext.destination);
    source.start();
    
    offlineContext.startRendering().then((renderedBuffer) => {
      // Create audio element from rendered buffer
      confirmSound = new Audio();
      confirmSound.volume = 0.3; // Subtle volume
      
      // Convert to WAV data URL
      const wav = bufferToWave(renderedBuffer);
      const blob = new Blob([wav], { type: 'audio/wav' });
      confirmSound.src = URL.createObjectURL(blob);
    });
  }
  
  // Play the sound (or queue it if still generating)
  setTimeout(() => {
    if (confirmSound) {
      confirmSound.currentTime = 0;
      confirmSound.play().catch(() => {}); // Ignore autoplay errors
    }
  }, 50);
}

// Convert AudioBuffer to WAV format
function bufferToWave(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const data = buffer.getChannelData(0);
  const dataLength = data.length * bytesPerSample;
  const bufferLength = 44 + dataLength;
  
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  
  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  
  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < data.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
  
  return arrayBuffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

export function toggleSoundMute(): boolean {
  const currentMuted = localStorage.getItem('hivewar-sound-muted') === 'true';
  const newMuted = !currentMuted;
  localStorage.setItem('hivewar-sound-muted', String(newMuted));
  return newMuted;
}

export function isSoundMuted(): boolean {
  return localStorage.getItem('hivewar-sound-muted') === 'true';
}
