import { Peer } from 'peerjs';

export class PeerManager {
  constructor(onDataReceived, onVoiceStatusChange) {
    this.peer = null;
    this.conn = null;
    this.mediaCall = null;
    this.localStream = null;
    this.remoteAudio = null;
    this.isHost = true;
    this.roomId = null;
    this.myPeerId = null;
    this.isMicMuted = false;
    this.retryCount = 0;
    this.onDataReceived = onDataReceived;
    this.onVoiceStatusChange = onVoiceStatusChange;

    this.initAudioElement();
  }

  initAudioElement() {
    if (document.getElementById('remote-audio-player')) {
      this.remoteAudio = document.getElementById('remote-audio-player');
      return;
    }
    this.remoteAudio = document.createElement('audio');
    this.remoteAudio.id = 'remote-audio-player';
    this.remoteAudio.autoplay = true;
    this.remoteAudio.playsInline = true;
    this.remoteAudio.setAttribute('playsinline', '');
    this.remoteAudio.setAttribute('webkit-playsinline', '');
    this.remoteAudio.style.display = 'none';
    document.body.appendChild(this.remoteAudio);
  }

  unlockiOSAudio() {
    if (this.remoteAudio) {
      this.remoteAudio.play().catch(() => {});
    }
  }

  init(targetRoomId = null) {
    return new Promise((resolve) => {
      let isResolved = false;

      const generatedRoomId = targetRoomId || `papri-${Math.random().toString(36).substring(2, 7)}`;
      this.roomId = generatedRoomId;
      this.isHost = !targetRoomId;

      const fallbackTimer = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          resolve({ isHost: this.isHost, roomId: this.roomId, peerId: 'local' });
        }
      }, 4500);

      try {
        const peerOptions = {
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        };

        // Host registers custom Peer ID on PeerJS cloud server; Client gets auto ID
        this.peer = this.isHost ? new Peer(generatedRoomId, peerOptions) : new Peer(peerOptions);

        this.peer.on('open', (id) => {
          if (isResolved) return;
          isResolved = true;
          clearTimeout(fallbackTimer);

          this.myPeerId = id;

          if (!this.isHost && targetRoomId) {
            this.connectToHost(targetRoomId);
          }

          this.setupMediaListeners();
          resolve({ isHost: this.isHost, roomId: this.roomId, peerId: this.myPeerId });
        });

        this.peer.on('connection', (conn) => {
          this.conn = conn;
          this.setupConnectionListeners();
        });

        this.peer.on('error', (err) => {
          console.warn('PeerJS Error/Warning:', err);
          
          // Retry connection if client fails to find host initially
          if (!this.isHost && targetRoomId && this.retryCount < 3) {
            this.retryCount++;
            setTimeout(() => this.connectToHost(targetRoomId), 1200);
            return;
          }

          if (!isResolved) {
            isResolved = true;
            clearTimeout(fallbackTimer);
            resolve({ isHost: this.isHost, roomId: this.roomId, peerId: 'local' });
          }
        });
      } catch (e) {
        console.warn('PeerJS Exception:', e);
        if (!isResolved) {
          isResolved = true;
          clearTimeout(fallbackTimer);
          resolve({ isHost: this.isHost, roomId: this.roomId, peerId: 'local' });
        }
      }
    });
  }

  connectToHost(hostRoomId) {
    if (!this.peer || this.peer.destroyed) return;
    try {
      this.conn = this.peer.connect(hostRoomId, { reliable: true });
      this.setupConnectionListeners();
    } catch(e) {
      console.warn('Connect to host retry:', e);
    }
  }

  setupConnectionListeners() {
    if (!this.conn) return;

    this.conn.on('open', () => {
      console.log('Peer Data Channel Connected to Host!');
      if (this.onVoiceStatusChange) this.onVoiceStatusChange('connected');
      this.startVoiceCall();
    });

    this.conn.on('data', (data) => {
      if (this.onDataReceived) this.onDataReceived(data);
    });

    this.conn.on('close', () => {
      if (this.onVoiceStatusChange) this.onVoiceStatusChange('disconnected');
    });

    this.conn.on('error', (err) => {
      console.warn('Connection Error:', err);
    });
  }

  send(action, payload = {}) {
    if (this.conn && this.conn.open) {
      this.conn.send({ action, payload, sender: this.isHost ? 0 : 1 });
    }
  }

  async startVoiceCall() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      
      if (this.onVoiceStatusChange) this.onVoiceStatusChange('mic_ready');

      if (!this.isHost && this.conn && this.conn.peer) {
        this.callPeer(this.conn.peer);
      }
    } catch (err) {
      console.warn('Microphone status:', err);
      if (this.onVoiceStatusChange) this.onVoiceStatusChange('mic_denied');
    }
  }

  callPeer(remoteId) {
    if (!this.localStream || !this.peer) return;

    this.mediaCall = this.peer.call(remoteId, this.localStream);
    this.mediaCall.on('stream', (remoteStream) => {
      if (this.remoteAudio) {
        this.remoteAudio.srcObject = remoteStream;
        this.remoteAudio.play().catch(() => {});
      }
      if (this.onVoiceStatusChange) this.onVoiceStatusChange('voice_active');
    });
  }

  setupMediaListeners() {
    if (!this.peer) return;

    this.peer.on('call', (call) => {
      this.mediaCall = call;
      if (this.localStream) {
        call.answer(this.localStream);
      } else {
        call.answer();
      }

      call.on('stream', (remoteStream) => {
        if (this.remoteAudio) {
          this.remoteAudio.srcObject = remoteStream;
          this.remoteAudio.play().catch(() => {});
        }
        if (this.onVoiceStatusChange) this.onVoiceStatusChange('voice_active');
      });
    });
  }

  toggleMic() {
    if (!this.localStream) return false;
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      this.isMicMuted = !audioTrack.enabled;
      return !this.isMicMuted;
    }
    return false;
  }
}
