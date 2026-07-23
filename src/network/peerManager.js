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
    this.onDataReceived = onDataReceived;
    this.onVoiceStatusChange = onVoiceStatusChange;

    this.initAudioElement();
  }

  initAudioElement() {
    if (document.getElementById('remote-audio-player')) return;
    this.remoteAudio = document.createElement('audio');
    this.remoteAudio.id = 'remote-audio-player';
    this.remoteAudio.autoplay = true;
    document.body.appendChild(this.remoteAudio);
  }

  // Safe non-blocking Peer connection init with timeout
  init(targetRoomId = null) {
    return new Promise((resolve) => {
      let isResolved = false;

      // 3-second safety fallback timeout so game modal NEVER hangs!
      const fallbackTimer = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          this.isHost = !targetRoomId;
          this.roomId = targetRoomId || `papri-ludu-${Math.random().toString(36).substring(2, 8)}`;
          resolve({ isHost: this.isHost, roomId: this.roomId, peerId: 'local' });
        }
      }, 3500);

      try {
        this.peer = new Peer({
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        });

        this.peer.on('open', (id) => {
          if (isResolved) return;
          isResolved = true;
          clearTimeout(fallbackTimer);

          this.myPeerId = id;

          if (targetRoomId) {
            this.isHost = false;
            this.roomId = targetRoomId;
            this.connectToHost(targetRoomId);
          } else {
            this.isHost = true;
            this.roomId = `papri-ludu-${Math.random().toString(36).substring(2, 8)}`;
          }

          this.setupMediaListeners();
          resolve({ isHost: this.isHost, roomId: this.roomId, peerId: this.myPeerId });
        });

        this.peer.on('connection', (conn) => {
          this.conn = conn;
          this.setupConnectionListeners();
        });

        this.peer.on('error', (err) => {
          console.warn('PeerJS Error (falling back to offline/local mode):', err);
          if (!isResolved) {
            isResolved = true;
            clearTimeout(fallbackTimer);
            this.isHost = !targetRoomId;
            this.roomId = targetRoomId || `papri-ludu-local`;
            resolve({ isHost: this.isHost, roomId: this.roomId, peerId: 'local' });
          }
        });
      } catch (e) {
        console.warn('PeerJS Exception:', e);
        if (!isResolved) {
          isResolved = true;
          clearTimeout(fallbackTimer);
          this.isHost = !targetRoomId;
          this.roomId = targetRoomId || `papri-ludu-local`;
          resolve({ isHost: this.isHost, roomId: this.roomId, peerId: 'local' });
        }
      }
    });
  }

  connectToHost(hostRoomId) {
    if (!this.peer) return;
    this.conn = this.peer.connect(hostRoomId, { reliable: true });
    this.setupConnectionListeners();
  }

  setupConnectionListeners() {
    if (!this.conn) return;

    this.conn.on('open', () => {
      console.log('Peer Data Channel Connected!');
      if (this.onVoiceStatusChange) this.onVoiceStatusChange('connected');
      this.startVoiceCall();
    });

    this.conn.on('data', (data) => {
      if (this.onDataReceived) this.onDataReceived(data);
    });

    this.conn.on('close', () => {
      if (this.onVoiceStatusChange) this.onVoiceStatusChange('disconnected');
    });
  }

  send(action, payload = {}) {
    if (this.conn && this.conn.open) {
      this.conn.send({ action, payload, sender: this.isHost ? 0 : 1 });
    }
  }

  async startVoiceCall() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (this.onVoiceStatusChange) this.onVoiceStatusChange('mic_ready');

      if (!this.isHost && this.conn && this.conn.peer) {
        this.callPeer(this.conn.peer);
      }
    } catch (err) {
      console.warn('Microphone permission info:', err);
      if (this.onVoiceStatusChange) this.onVoiceStatusChange('mic_denied');
    }
  }

  callPeer(remoteId) {
    if (!this.localStream || !this.peer) return;

    this.mediaCall = this.peer.call(remoteId, this.localStream);
    this.mediaCall.on('stream', (remoteStream) => {
      if (this.remoteAudio) this.remoteAudio.srcObject = remoteStream;
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
        if (this.remoteAudio) this.remoteAudio.srcObject = remoteStream;
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
