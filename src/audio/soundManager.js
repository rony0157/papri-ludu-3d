// Web Audio API Synthesizer for Romantic Ludo Sounds & Music

class SoundManager {
  constructor() {
    this.ctx = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.isMuted = false;
    this.isPlayingMusic = false;
    this.musicOscillators = [];
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    
    this.ctx = new AudioCtx();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();

    this.musicGain.gain.value = 0.15;
    this.sfxGain.gain.value = 0.3;

    this.musicGain.connect(this.ctx.destination);
    this.sfxGain.connect(this.ctx.destination);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Romantic ambient chord loop
  startRomanticMusic() {
    this.init();
    this.resume();
    if (this.isPlayingMusic) return;

    this.isPlayingMusic = true;
    const chords = [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [196.00, 246.94, 293.66, 349.23]  // G7
    ];

    let step = 0;
    const playChord = () => {
      if (!this.isPlayingMusic || !this.ctx) return;
      const currentChord = chords[step % chords.length];
      
      currentChord.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.04, this.ctx.currentTime + 1);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 3.8);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 4);
      });

      step++;
      this.musicTimeout = setTimeout(playChord, 4000);
    };

    playChord();
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.musicTimeout) clearTimeout(this.musicTimeout);
  }

  playDiceRoll() {
    this.init();
    this.resume();
    if (!this.ctx) return;

    // Noise buffer for dice rattle
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start();
  }

  playStep() {
    this.init();
    this.resume();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playCapture() {
    this.init();
    this.resume();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + index * 0.08);

      gain.gain.setValueAtTime(0.25, this.ctx.currentTime + index * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + index * 0.08 + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(this.ctx.currentTime + index * 0.08);
      osc.stop(this.ctx.currentTime + index * 0.08 + 0.3);
    });
  }

  playRoseReaction() {
    this.init();
    this.resume();
    if (!this.ctx) return;

    // Magic harp arpeggio
    const harpNotes = [440, 554.37, 659.25, 830.61, 1108.73, 1318.51];
    harpNotes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.06);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + i * 0.06 + 0.5);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(this.ctx.currentTime + i * 0.06);
      osc.stop(this.ctx.currentTime + i * 0.06 + 0.5);
    });
  }

  playKissReaction() {
    this.init();
    this.resume();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.18);
  }

  playWinFanfare() {
    this.init();
    this.resume();
    if (!this.ctx) return;

    const melody = [
      { note: 523.25, dur: 0.2, time: 0 },
      { note: 659.25, dur: 0.2, time: 0.2 },
      { note: 783.99, dur: 0.2, time: 0.4 },
      { note: 1046.50, dur: 0.6, time: 0.6 },
    ];

    melody.forEach(item => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(item.note, this.ctx.currentTime + item.time);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime + item.time);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + item.time + item.dur);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(this.ctx.currentTime + item.time);
      osc.stop(this.ctx.currentTime + item.time + item.dur);
    });
  }
}

export const soundManager = new SoundManager();
