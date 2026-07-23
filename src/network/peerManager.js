import { Peer } from 'peerjs';

export class PeerManager {
  constructor(onDataReceived, onVoiceStatusChange) {
    this.peer = null;
    this.conn = null;
    this.mediaCall = null;
    this.localStream = null;
    this.remoteAudio = null;
    this.isHost = false;
    this.roomId = null;
    this.myPeerId = null;
    this.isMicMuted = false;
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

  // init(targetRoomId, fixedRoomId)
  // If fixedRoomId is provided: try to register as HOST with that ID.
  // If that fails (ID already taken = someone else is host), become CLIENT and connect to that host.
  init(targetRoomId, fixedRoomId) {
    return new Promise((resolve) => {
      let isResolved = false;

      const roomId = fixedRoomId || targetRoomId || `papri-${Math.random().toString(36).substring(2, 7)}`;
      this.roomId = roomId;

      const peerOptions = {
        debug: 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      };

      const done = (host, pid) => {
        if (isResolved) return;
        isResolved = true;
        this.isHost = host;
        this.myPeerId = pid;
        resolve({ isHost: host, roomId: this.roomId, peerId: pid });
      };

      // Timeout fallback — if PeerJS cloud is slow, still resolve
      setTimeout(() => done(true, 'local'), 6000);

      // STRATEGY: Try to register as HOST with the fixed room ID
      try {
        this.peer = new Peer(roomId, peerOptions);

        this.peer.on('open', (id) => {
          // Successfully registered as host!
          this.isHost = true;
          this.setupMediaListeners();

          // Listen for incoming connections from client
          this.peer.on('connection', (conn) => {
            this.conn = conn;
            this.setupConnectionListeners();
          });

          done(true, id);
        });

        this.peer.on('error', (err) => {
          const errType = err.type || '';
          console.log('PeerJS:', errType, err.message);

          // 'unavailable-id' means someone else already registered this room ID = they are HOST
          // So WE become CLIENT
          if (errType === 'unavailable-id') {
            this.peer.destroy();
            this.becomeClient(roomId, peerOptions, done);
          } else if (errType === 'peer-unavailable') {
            // Trying to connect to host but host not found — retry
            setTimeout(() => {
              if (!isResolved) this.connectToHost(roomId);
            }, 2000);
          } else {
            done(true, 'local');
          }
        });
      } catch (e) {
        console.warn('PeerJS Exception:', e);
        done(true, 'local');
      }
    });
  }

  becomeClient(hostRoomId, peerOptions, done) {
    // Create a new peer with auto-generated ID (client)
    this.peer = new Peer(peerOptions);

    this.peer.on('open', (id) => {
      this.isHost = false;
      this.setupMediaListeners();
      this.connectToHost(hostRoomId);
      done(false, id);
    });

    this.peer.on('error', (err) => {
      console.warn('Client PeerJS Error:', err);
      if (err.type === 'peer-unavailable') {
        // Host may not be ready yet, retry
        setTimeout(() => this.connectToHost(hostRoomId), 2000);
      }
    });
  }

  connectToHost(hostRoomId) {
    if (!this.peer || this.peer.destroyed) return;
    try {
      this.conn = this.peer.connect(hostRoomId, { reliable: true });
      this.setupConnectionListeners();
    } catch(e) {
      console.warn('Connect error:', e);
    }
  }

  setupConnectionListeners() {
    if (!this.conn) return;

    this.conn.on('open', () => {
      console.log('P2P Data Channel Connected!');
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
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false
      });

      if (this.onVoiceStatusChange) this.onVoiceStatusChange('mic_ready');

      if (!this.isHost && this.conn && this.conn.peer) {
        this.callPeer(this.conn.peer);
      }
    } catch (err) {
      console.warn('Mic:', err);
      if (this.onVoiceStatusChange) this.onVoiceStatusChange('mic_denied');
    }
  }

  callPeer(remoteId) {
    if (!this.localStream || !this.peer) return;
    this.mediaCall = this.peer.call(remoteId, this.localStream);
    if (this.mediaCall) {
      this.mediaCall.on('stream', (stream) => {
        if (this.remoteAudio) {
          this.remoteAudio.srcObject = stream;
          this.remoteAudio.play().catch(() => {});
        }
        if (this.onVoiceStatusChange) this.onVoiceStatusChange('voice_active');
      });
    }
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
      call.on('stream', (stream) => {
        if (this.remoteAudio) {
          this.remoteAudio.srcObject = stream;
          this.remoteAudio.play().catch(() => {});
        }
        if (this.onVoiceStatusChange) this.onVoiceStatusChange('voice_active');
      });
    });
  }

  toggleMic() {
    if (!this.localStream) return false;
    const track = this.localStream.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      this.isMicMuted = !track.enabled;
      return track.enabled;
    }
    return false;
  }
}
