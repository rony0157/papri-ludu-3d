// Web Audio Synthesizer with iOS Safari Unlock Support

class SoundManager {
  constructor() {
    this.ctx = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.isMuted = false;
    this.isPlayingMusic = false;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    
    this.ctx = new AudioCtx();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();

    this.musicGain.gain.value = 0.15;
    this.sfxGain.gain.value = 0.35;

    this.musicGain.connect(this.ctx.destination);
    this.sfxGain.connect(this.ctx.destination);
  }

  // Mandatory for iOS Safari to unlock audio context on touch
  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  startRomanticMusic() {
    this.resume();
    if (this.isPlayingMusic || !this.ctx) return;

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
      
      currentChord.forEach((freq) => {
        try {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
          
          gain.gain.setValueAtTime(0, this.ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.04, this.ctx.currentTime + 0.8);
          gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 3.8);

          osc.connect(gain);
          gain.connect(this.musicGain);

          osc.start(this.ctx.currentTime);
          osc.stop(this.ctx.currentTime + 4);
        } catch(e) {}
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
    this.resume();
    if (!this.ctx) return;

    try {
      const bufferSize = this.ctx.sampleRate * 0.25;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      noise.start();
    } catch(e) {}
  }

  playStep() {
    this.resume();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(960, this.ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.11);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.11);
    } catch(e) {}
  }

  playCapture() {
    this.resume();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, index) => {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + index * 0.08);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime + index * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + index * 0.08 + 0.3);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(this.ctx.currentTime + index * 0.08);
        osc.stop(this.ctx.currentTime + index * 0.08 + 0.3);
      } catch(e) {}
    });
  }

  playRoseReaction() {
    this.resume();
    if (!this.ctx) return;

    const harpNotes = [440, 554.37, 659.25, 830.61, 1108.73, 1318.51];
    harpNotes.forEach((freq, i) => {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.06);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + i * 0.06 + 0.5);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(this.ctx.currentTime + i * 0.06);
        osc.stop(this.ctx.currentTime + i * 0.06 + 0.5);
      } catch(e) {}
    });
  }

  playKissReaction() {
    this.resume();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1400, this.ctx.currentTime + 0.16);

      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.18);
    } catch(e) {}
  }

  playWinFanfare() {
    this.resume();
    if (!this.ctx) return;

    const melody = [
      { note: 523.25, dur: 0.2, time: 0 },
      { note: 659.25, dur: 0.2, time: 0.2 },
      { note: 783.99, dur: 0.2, time: 0.4 },
      { note: 1046.50, dur: 0.6, time: 0.6 },
    ];

    melody.forEach(item => {
      try {
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
      } catch(e) {}
    });
  }
}

export const soundManager = new SoundManager();
