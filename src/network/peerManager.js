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
    this.remoteAudio = document.createElement('audio');
    this.remoteAudio.autoplay = true;
    document.body.appendChild(this.remoteAudio);
  }

  // Initialize Peer connection (Host or Client)
  init(targetRoomId = null) {
    return new Promise((resolve, reject) => {
      // Create Peer with automatic ID
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
        this.myPeerId = id;

        if (targetRoomId) {
          // Client mode: Join Host
          this.isHost = false;
          this.roomId = targetRoomId;
          this.connectToHost(targetRoomId);
        } else {
          // Host mode
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
        console.error('PeerJS Error:', err);
        if (this.onVoiceStatusChange) this.onVoiceStatusChange('error', err.message);
      });
    });
  }

  connectToHost(hostRoomId) {
    this.conn = this.peer.connect(hostRoomId, { reliable: true });
    this.setupConnectionListeners();
  }

  setupConnectionListeners() {
    this.conn.on('open', () => {
      console.log('Peer Data Connection Connected!');
      if (this.onVoiceStatusChange) this.onVoiceStatusChange('connected');
      
      // Auto initiate voice call when connected
      this.startVoiceCall();
    });

    this.conn.on('data', (data) => {
      if (this.onDataReceived) this.onDataReceived(data);
    });

    this.conn.on('close', () => {
      if (this.onVoiceStatusChange) this.onVoiceStatusChange('disconnected');
    });
  }

  // Send packet across WebRTC data channel
  send(action, payload = {}) {
    if (this.conn && this.conn.open) {
      this.conn.send({ action, payload, sender: this.isHost ? 0 : 1 });
    }
  }

  // WebRTC Voice Chat Setup
  async startVoiceCall() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      
      if (this.onVoiceStatusChange) this.onVoiceStatusChange('mic_ready');

      // If we are client calling host
      if (!this.isHost && this.conn && this.conn.peer) {
        this.callPeer(this.conn.peer);
      }
    } catch (err) {
      console.warn('Microphone permission denied or audio device not found:', err);
      if (this.onVoiceStatusChange) this.onVoiceStatusChange('mic_denied');
    }
  }

  callPeer(remoteId) {
    if (!this.localStream || !this.peer) return;

    this.mediaCall = this.peer.call(remoteId, this.localStream);
    this.mediaCall.on('stream', (remoteStream) => {
      this.remoteAudio.srcObject = remoteStream;
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
        call.answer(); // Answer without mic if mic denied
      }

      call.on('stream', (remoteStream) => {
        this.remoteAudio.srcObject = remoteStream;
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
