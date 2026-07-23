import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { LudoBoard } from './3d/board.js';
import { TokenManager } from './3d/tokens.js';
import { LudoDice } from './3d/dice.js';
import { ParticleSystem } from './3d/particles.js';
import { LuduEngine } from './logic/luduEngine.js';
import { PeerManager } from './network/peerManager.js';
import { soundManager } from './audio/soundManager.js';

class App {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.engine = new LuduEngine();
    this.myPlayerIdx = 0; // Default 0 (Host / Papri)
    
    this.initThree();
    this.initGame3D();
    this.initNetwork();
    this.initUIListeners();
    this.animate();
  }

  // 1. Setup Three.js 3D Scene, Camera & Lights
  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f0a17);
    this.scene.fog = new THREE.FogExp2(0x0f0a17, 0.035);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 11, 11);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xfff0f5, 0.85);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffe6ee, 1.2);
    sunLight.position.set(8, 14, 8);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    this.scene.add(sunLight);

    const pinkLight = new THREE.PointLight(0xff1a53, 1.5, 12);
    pinkLight.position.set(-5, 4, -5);
    this.scene.add(pinkLight);

    const greenLight = new THREE.PointLight(0x00cc88, 1.5, 12);
    greenLight.position.set(5, 4, 5);
    this.scene.add(greenLight);

    window.addEventListener('resize', () => this.onResize());
  }

  // 2. Initialize 3D Objects
  initGame3D() {
    this.board = new LudoBoard(this.scene);
    this.tokens = new TokenManager(this.scene, this.board);
    this.dice = new LudoDice(this.scene);
    this.particles = new ParticleSystem(this.scene);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.container.addEventListener('pointerdown', (e) => this.onPointerDown(e));
  }

  // 3. Initialize PeerJS P2P Network
  initNetwork() {
    this.peerMgr = new PeerManager(
      (packet) => this.handleNetworkPacket(packet),
      (status, msg) => this.updateVoiceHUD(status, msg)
    );

    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');

    if (roomParam) {
      document.getElementById('input-room-code').value = roomParam;
      this.joinRoom(roomParam);
    }
  }

  // Instant Game Start / Play Together
  startGameInstant() {
    document.getElementById('room-modal').classList.add('hidden');
    soundManager.startRomanticMusic();
    this.updateUI();
    this.showLovePopup(`Welcome Papri & Lover! ❤️ Game Started!`);
    
    // Background init peer connection
    this.peerMgr.init(null);
  }

  async createRoom() {
    document.getElementById('room-modal').classList.add('hidden');
    soundManager.startRomanticMusic();
    this.updateUI();

    const res = await this.peerMgr.init(null);
    this.myPlayerIdx = 0; // Host is Papri (Red)

    const roomUrl = `${window.location.origin}${window.location.pathname}?room=${res.roomId}`;
    this.showLovePopup(`Room Created! Code: ${res.roomId}`);
  }

  async joinRoom(code) {
    if (!code) {
      alert('Please enter a valid room code!');
      return;
    }
    document.getElementById('room-modal').classList.add('hidden');
    soundManager.startRomanticMusic();
    this.updateUI();

    const res = await this.peerMgr.init(code.trim());
    this.myPlayerIdx = 1; // Client is My Love (Green)
    this.showLovePopup(`Joined Room with Papri! ❤️`);
  }

  // 4. UI Listeners
  initUIListeners() {
    document.getElementById('btn-start-game').addEventListener('click', () => this.startGameInstant());
    document.getElementById('btn-create-room').addEventListener('click', () => this.createRoom());
    document.getElementById('btn-join-room').addEventListener('click', () => {
      const code = document.getElementById('input-room-code').value;
      this.joinRoom(code);
    });

    document.getElementById('btn-roll-dice').addEventListener('click', () => this.handleRollDice());

    document.getElementById('btn-toggle-mic').addEventListener('click', () => {
      const isLive = this.peerMgr.toggleMic();
      document.getElementById('btn-toggle-mic').innerHTML = isLive
        ? '🎙️ Mic On'
        : '🔇 Mic Off';
    });

    document.getElementById('btn-share-room').addEventListener('click', () => {
      if (this.peerMgr.roomId) {
        const roomUrl = `${window.location.origin}${window.location.pathname}?room=${this.peerMgr.roomId}`;
        navigator.clipboard.writeText(roomUrl);
        alert(`Room Link Copied! Share with Papri:\n${roomUrl}`);
      } else {
        const fallbackUrl = `${window.location.origin}${window.location.pathname}?room=papri-love-room`;
        navigator.clipboard.writeText(fallbackUrl);
        alert(`Room Link Copied! Share with Papri:\n${fallbackUrl}`);
      }
    });

    // Preset Love Messages Buttons
    document.querySelectorAll('.btn-msg').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const msg = e.target.getAttribute('data-msg');
        this.sendLoveMessage(msg);
      });
    });

    // Reaction Buttons
    document.querySelectorAll('.btn-react').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.target.getAttribute('data-reaction');
        this.triggerReaction(type, true);
      });
    });
  }

  sendLoveMessage(msg) {
    soundManager.playRoseReaction();
    this.showLovePopup(msg);
    this.peerMgr.send('CHAT_MSG', { msg });
  }

  handleRollDice() {
    if (this.engine.turn !== this.myPlayerIdx || this.engine.diceRolled || this.engine.winner !== null) {
      return;
    }

    const val = this.engine.rollDice();
    if (!val) return;

    soundManager.playDiceRoll();
    this.peerMgr.send('DICE_ROLL', { val });

    this.dice.roll(val, () => {
      const validMoves = this.engine.getValidTokenMoves();

      if (validMoves.length === 0) {
        setTimeout(() => {
          this.engine.passTurn();
          this.peerMgr.send('PASS_TURN', {});
          this.updateUI();
        }, 800);
      } else if (validMoves.length === 1) {
        this.handleMoveToken(validMoves[0]);
      } else {
        this.tokens.highlightTokens(this.engine.turn, validMoves);
        this.updateUI();
      }
    });
  }

  handleMoveToken(tokenId) {
    const moveRes = this.engine.moveToken(tokenId);
    if (!moveRes) return;

    this.peerMgr.send('MOVE_TOKEN', { tokenId });

    const coords = moveRes.trajectory.map(pos => {
      if (pos.type === 'TRACK') return this.board.trackPositions[pos.idx];
      if (pos.type === 'HOME_PATH') return this.board.homePaths[this.engine.turn][pos.idx];
      return { x: 0, y: 0.5, z: 0 };
    });

    soundManager.playStep();

    this.tokens.animateMove(moveRes.playerIdx, tokenId, coords, () => {
      if (moveRes.capturedToken) {
        soundManager.playCapture();
        const cap = moveRes.capturedToken;
        const baseSpot = this.board.basePositions[cap.playerIdx][cap.tokenId];
        this.tokens.tokens[cap.playerIdx][cap.tokenId].mesh.position.set(baseSpot.x, baseSpot.y, baseSpot.z);
        this.tokens.tokens[cap.playerIdx][cap.tokenId].currentPos = baseSpot;
      }

      this.tokens.highlightTokens(-1, []);

      if (moveRes.winner !== null) {
        this.handleVictory(moveRes.winner);
      } else {
        this.updateUI();
      }
    });
  }

  onPointerDown(event) {
    if (this.engine.turn !== this.myPlayerIdx || !this.engine.diceRolled) return;

    const validMoves = this.engine.getValidTokenMoves();
    if (validMoves.length === 0) return;

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshesToIntersect = [];

    validMoves.forEach(tIdx => {
      meshesToIntersect.push(this.tokens.tokens[this.myPlayerIdx][tIdx].mesh);
    });

    const intersects = this.raycaster.intersectObjects(meshesToIntersect, true);

    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj.parent && !obj.parent.isGroup) {
        obj = obj.parent;
      }

      const playerTokens = this.tokens.tokens[this.myPlayerIdx];
      const clickedTokenIndex = playerTokens.findIndex(t => t.mesh === obj || t.mesh === obj.parent);

      if (clickedTokenIndex !== -1 && validMoves.includes(clickedTokenIndex)) {
        this.handleMoveToken(clickedTokenIndex);
      }
    }
  }

  handleNetworkPacket(packet) {
    const { action, payload } = packet;

    if (action === 'DICE_ROLL') {
      this.engine.diceValue = payload.val;
      this.engine.diceRolled = true;
      soundManager.playDiceRoll();

      this.dice.roll(payload.val, () => {
        this.updateUI();
      });
    } else if (action === 'MOVE_TOKEN') {
      this.handleMoveToken(payload.tokenId);
    } else if (action === 'PASS_TURN') {
      this.engine.passTurn();
      this.updateUI();
    } else if (action === 'REACTION') {
      this.triggerReaction(payload.type, false);
    } else if (action === 'CHAT_MSG') {
      soundManager.playRoseReaction();
      this.showLovePopup(payload.msg);
    }
  }

  triggerReaction(type, broadcast = false) {
    if (broadcast) {
      this.peerMgr.send('REACTION', { type });
    }

    if (type === 'rose') {
      soundManager.playRoseReaction();
      this.particles.triggerRoseShower(); // Heavy rose rain shower!
      this.particles.triggerLoveBurst('#ff1a40');
      this.showLovePopup('🌹 Rose Rain Shower for Papri!');
    } else if (type === 'kiss') {
      soundManager.playKissReaction();
      this.particles.triggerLoveBurst('#ff6699');
      this.showLovePopup('💋 Kisses Sent With Love!');
    } else if (type === 'hug') {
      soundManager.playKissReaction();
      this.showLovePopup('🤗 Warm Hugs for Papri!');
    } else if (type === 'love') {
      soundManager.playRoseReaction();
      this.particles.triggerLoveBurst('#ff0055');
      this.showLovePopup('❤️ I Love You Papri Forever!');
    }
  }

  showLovePopup(msg) {
    const popup = document.createElement('div');
    popup.className = 'love-popup-msg';
    popup.innerText = msg;
    document.body.appendChild(popup);

    setTimeout(() => popup.remove(), 2500);
  }

  updateVoiceHUD(status, msg) {
    const hud = document.getElementById('voice-status-text');
    if (status === 'connected') hud.innerText = 'Online Connected';
    else if (status === 'voice_active') hud.innerText = 'Voice Call Live 🎙️';
    else if (status === 'mic_denied') hud.innerText = 'Voice (Muted)';
    else if (status === 'disconnected') hud.innerText = 'Disconnected';
  }

  updateUI() {
    const turn = this.engine.turn;
    const isMyTurn = (turn === this.myPlayerIdx);

    document.getElementById('player-card-0').classList.toggle('active-turn', turn === 0);
    document.getElementById('player-card-1').classList.toggle('active-turn', turn === 1);

    const rollBtn = document.getElementById('btn-roll-dice');
    rollBtn.disabled = !isMyTurn || this.engine.diceRolled || this.engine.winner !== null;

    const banner = document.getElementById('turn-banner-text');
    if (this.engine.winner !== null) {
      banner.innerText = 'Game Over!';
    } else if (isMyTurn) {
      banner.innerText = `❤️ It's Your Turn! Roll the Dice!`;
      banner.style.color = '#ff6699';
    } else {
      banner.innerText = `Waiting for Papri / Lover's roll...`;
      banner.style.color = '#ffffff';
    }
  }

  handleVictory(winnerIdx) {
    soundManager.playWinFanfare();
    confetti({ particleCount: 180, spread: 90, origin: { y: 0.6 } });

    const winModal = document.getElementById('win-modal');
    const winnerText = document.getElementById('win-winner-text');
    
    winnerText.innerText = winnerIdx === 0 ? 'Papri Wins! 🌹' : 'My Love Wins! 💖';
    winModal.classList.remove('hidden');
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate(time = 0) {
    requestAnimationFrame((t) => this.animate(t));

    const sec = time * 0.001;
    if (this.particles) this.particles.update(sec);

    this.camera.position.x = Math.sin(sec * 0.3) * 0.4;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
