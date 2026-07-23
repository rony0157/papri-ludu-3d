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
    this.myPlayerIdx = 0; // Will be set: 0 = first opener (Papri), 1 = second opener (Lover)
    this.isOnlineMode = true; // Always online
    this.peerMgr = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.board = null;
    this.tokens = null;
    this.dice = null;
    this.particles = null;
    this.raycaster = null;
    this.mouse = null;

    // STEP 1: Build 3D scene FIRST — this is the most important thing
    this.init3DScene();

    // STEP 2: Setup UI button listeners
    this.initUIListeners();

    // STEP 3: iOS audio unlock
    window.addEventListener('pointerdown', () => {
      soundManager.resume();
      if (this.peerMgr) this.peerMgr.unlockiOSAudio();
    }, { once: true });

    // STEP 4: Start render loop IMMEDIATELY so board is visible
    this.animate();

    // STEP 5: Connect to fixed room (auto — no button needed)
    // Small delay to let first render frame paint the board
    setTimeout(() => this.autoConnect(), 800);

    // Start music
    try { soundManager.startRomanticMusic(); } catch(e) {}

    this.updateUI();
  }

  // ===================== 3D SCENE SETUP =====================
  init3DScene() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x160d29);
    this.scene.fog = new THREE.FogExp2(0x160d29, 0.035);

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Attach canvas to DOM
    if (this.container) {
      this.container.appendChild(this.renderer.domElement);
    }

    // Lights
    this.scene.add(new THREE.AmbientLight(0xfff0f5, 1.0));
    const sun = new THREE.DirectionalLight(0xffe6ee, 1.4);
    sun.position.set(6, 12, 6);
    this.scene.add(sun);
    const pinkL = new THREE.PointLight(0xff1a53, 1.8, 14);
    pinkL.position.set(-5, 4, -5);
    this.scene.add(pinkL);
    const greenL = new THREE.PointLight(0x00cc88, 1.8, 14);
    greenL.position.set(5, 4, 5);
    this.scene.add(greenL);

    // Camera position
    this.fitCamera();

    // Board + Tokens + Dice + Particles
    this.board = new LudoBoard(this.scene);
    this.tokens = new TokenManager(this.scene, this.board);
    this.dice = new LudoDice(this.scene);
    this.particles = new ParticleSystem(this.scene);

    // Raycaster for token picking
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    if (this.container) {
      this.container.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    }

    window.addEventListener('resize', () => {
      this.fitCamera();
    });
  }

  fitCamera() {
    if (!this.camera || !this.renderer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    this.camera.aspect = aspect;

    if (aspect < 1.0) {
      // Portrait mobile / iPhone
      const dist = 14 / aspect;
      this.camera.position.set(0, dist, dist);
    } else {
      this.camera.position.set(0, 11, 11);
    }

    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // ===================== AUTO CONNECT =====================
  // FIXED room ID — first person = host, second = client. NO room creation needed!
  autoConnect() {
    const FIXED_ROOM = 'papri-love-game-2024';

    this.peerMgr = new PeerManager(
      (packet) => this.handleNetworkPacket(packet),
      (status) => this.updateVoiceHUD(status)
    );

    // Try to be HOST first (register with fixed room ID)
    this.peerMgr.init(null, FIXED_ROOM).then((res) => {
      if (res.isHost) {
        this.myPlayerIdx = 0; // Host = Papri (Red)
        this.showPopup('You are Papri ❤️ (Red)\nWaiting for your Love to join...');
      } else {
        this.myPlayerIdx = 1; // Client = My Love (Green)
        this.showPopup('You are My Love 💖 (Green)\nConnected! Let\'s play!');
      }
      this.updateUI();
    });
  }

  // ===================== UI LISTENERS =====================
  initUIListeners() {
    const btnRoll = document.getElementById('btn-roll-dice');
    if (btnRoll) btnRoll.addEventListener('click', () => this.handleRollDice());

    const btnMic = document.getElementById('btn-toggle-mic');
    if (btnMic) {
      btnMic.addEventListener('click', () => {
        if (this.peerMgr) {
          const isLive = this.peerMgr.toggleMic();
          btnMic.innerHTML = isLive ? '🎙️ Mic On' : '🔇 Muted';
        }
      });
    }

    const btnShare = document.getElementById('btn-share-room');
    if (btnShare) {
      btnShare.addEventListener('click', () => {
        const url = window.location.origin + window.location.pathname;
        navigator.clipboard.writeText(url).catch(() => {});
        alert('Link copied! Send to Papri:\n' + url);
      });
    }

    document.querySelectorAll('.btn-msg').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const msg = e.target.getAttribute('data-msg');
        if (msg) this.sendChat(msg);
      });
    });

    document.querySelectorAll('.btn-react').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.target.getAttribute('data-reaction');
        if (type) this.triggerReaction(type, true);
      });
    });
  }

  sendChat(msg) {
    try { soundManager.playRoseReaction(); } catch(e) {}
    this.showPopup(msg);
    if (this.particles) this.particles.triggerFullKissExplosion('💖');
    if (this.peerMgr) this.peerMgr.send('CHAT_MSG', { msg });
  }

  // ===================== DICE ROLL =====================
  handleRollDice() {
    if (this.engine.turn !== this.myPlayerIdx) return;
    if (this.engine.diceRolled || this.engine.winner !== null) return;

    const val = this.engine.rollDice();
    if (!val) return;

    try { soundManager.playDiceRoll(); } catch(e) {}
    if (this.peerMgr) this.peerMgr.send('DICE_ROLL', { val });

    if (this.dice) {
      this.dice.roll(val, () => this.afterDiceAnimation());
    }
  }

  afterDiceAnimation() {
    const moves = this.engine.getValidTokenMoves();
    if (moves.length === 0) {
      setTimeout(() => {
        this.engine.passTurn();
        if (this.peerMgr) this.peerMgr.send('PASS_TURN', {});
        this.updateUI();
      }, 600);
    } else if (moves.length === 1) {
      this.doMove(moves[0], true);
    } else {
      if (this.tokens) this.tokens.highlightTokens(this.engine.turn, moves);
      this.updateUI();
    }
  }

  // ===================== MOVE TOKEN =====================
  doMove(tokenId, broadcast) {
    const res = this.engine.moveToken(tokenId);
    if (!res) return;

    if (broadcast && this.peerMgr) this.peerMgr.send('MOVE_TOKEN', { tokenId });

    const coords = res.trajectory.map(pos => {
      if (pos.type === 'TRACK') return this.board.trackPositions[pos.idx];
      if (pos.type === 'HOME_PATH') return this.board.homePaths[res.playerIdx][pos.idx];
      return { x: 0, y: 0.5, z: 0 };
    });

    try { soundManager.playStep(); } catch(e) {}

    if (this.tokens) {
      this.tokens.animateMove(res.playerIdx, tokenId, coords, () => {
        if (res.capturedToken) {
          try { soundManager.playCapture(); } catch(e) {}
          const c = res.capturedToken;
          const base = this.board.basePositions[c.playerIdx][c.tokenId];
          if (this.tokens.tokens[c.playerIdx][c.tokenId]) {
            const t = this.tokens.tokens[c.playerIdx][c.tokenId];
            t.mesh.position.set(base.x, base.y, base.z);
            t.currentPos = base;
          }
        }
        this.tokens.highlightTokens(-1, []);
        if (res.winner !== null) {
          this.handleVictory(res.winner);
        } else {
          this.updateUI();
        }
      });
    }
  }

  // ===================== TOKEN CLICK =====================
  onPointerDown(event) {
    if (this.engine.turn !== this.myPlayerIdx) return;
    if (!this.engine.diceRolled) return;

    const moves = this.engine.getValidTokenMoves();
    if (moves.length === 0) return;

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = moves.map(i => this.tokens.tokens[this.engine.turn][i].mesh).filter(Boolean);
    const hits = this.raycaster.intersectObjects(meshes, true);

    if (hits.length > 0) {
      let obj = hits[0].object;
      while (obj.parent && !obj.parent.isGroup) obj = obj.parent;

      const idx = this.tokens.tokens[this.engine.turn].findIndex(t => t.mesh === obj || t.mesh === obj.parent);
      if (idx !== -1 && moves.includes(idx)) {
        this.doMove(idx, true);
      }
    }
  }

  // ===================== NETWORK PACKETS =====================
  handleNetworkPacket(packet) {
    const { action, payload } = packet;

    if (action === 'DICE_ROLL') {
      this.engine.diceValue = payload.val;
      this.engine.diceRolled = true;
      if (payload.val === 6) this.engine.hasExtraTurn = true;

      try { soundManager.playDiceRoll(); } catch(e) {}
      if (this.dice) {
        this.dice.roll(payload.val, () => this.updateUI());
      }

    } else if (action === 'MOVE_TOKEN') {
      this.doMove(payload.tokenId, false);

    } else if (action === 'PASS_TURN') {
      this.engine.passTurn();
      this.updateUI();

    } else if (action === 'REACTION') {
      this.triggerReaction(payload.type, false);

    } else if (action === 'CHAT_MSG') {
      try { soundManager.playRoseReaction(); } catch(e) {}
      if (this.particles) this.particles.triggerFullKissExplosion('💖');
      this.showPopup(payload.msg);
    }
  }

  // ===================== REACTIONS =====================
  triggerReaction(type, broadcast) {
    if (broadcast && this.peerMgr) this.peerMgr.send('REACTION', { type });

    const fx = {
      rose: { s: 'playRoseReaction', e: '🌹', m: '🌹 Rose Shower!', b: '#ff1a40', sh: true },
      kiss: { s: 'playKissReaction', e: '💋', m: '💋 Kisses!', b: '#ff6699' },
      hug:  { s: 'playKissReaction', e: '🤗', m: '🤗 Hugs!' },
      love: { s: 'playRoseReaction', e: '❤️', m: '❤️ Love!', b: '#ff0055' }
    }[type];
    if (!fx) return;

    try { soundManager[fx.s](); } catch(e) {}
    if (this.particles) {
      if (fx.sh) this.particles.triggerRoseShower();
      if (fx.b) this.particles.triggerLoveBurst(fx.b);
      this.particles.triggerFullKissExplosion(fx.e);
    }
    this.showPopup(fx.m);
  }

  // ===================== UI =====================
  showPopup(msg) {
    const el = document.createElement('div');
    el.className = 'love-popup-msg';
    el.innerText = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }

  updateVoiceHUD(status) {
    const el = document.getElementById('voice-status-text');
    if (!el) return;
    const map = {
      connected: 'Online Connected ✅',
      voice_active: 'Voice Live 🎙️',
      mic_ready: 'Mic Ready',
      mic_denied: 'No Mic',
      disconnected: 'Offline'
    };
    el.innerText = map[status] || status;
  }

  updateUI() {
    const turn = this.engine.turn;
    const mine = turn === this.myPlayerIdx;

    const p0 = document.getElementById('player-card-0');
    const p1 = document.getElementById('player-card-1');
    if (p0) p0.classList.toggle('active-turn', turn === 0);
    if (p1) p1.classList.toggle('active-turn', turn === 1);

    const btn = document.getElementById('btn-roll-dice');
    if (btn) btn.disabled = !mine || this.engine.diceRolled || this.engine.winner !== null;

    const banner = document.getElementById('turn-banner-text');
    if (banner) {
      if (this.engine.winner !== null) {
        banner.innerText = '🎉 Game Over!';
      } else if (mine) {
        banner.innerText = `❤️ Your Turn! Roll 🎲`;
        banner.style.color = '#ff6699';
      } else {
        banner.innerText = "Waiting for partner...";
        banner.style.color = '#fff';
      }
    }
  }

  handleVictory(winner) {
    try { soundManager.playWinFanfare(); } catch(e) {}
    try { confetti({ particleCount: 180, spread: 90, origin: { y: 0.6 } }); } catch(e) {}
    const modal = document.getElementById('win-modal');
    const text = document.getElementById('win-winner-text');
    if (text) text.innerText = winner === 0 ? 'Papri Wins! 🌹' : 'My Love Wins! 💖';
    if (modal) { modal.style.display = 'flex'; modal.classList.remove('hidden'); }
  }

  // ===================== RENDER LOOP =====================
  animate(time = 0) {
    requestAnimationFrame((t) => this.animate(t));
    const sec = time * 0.001;
    if (this.particles) this.particles.update(sec);
    if (this.camera && this.renderer && this.scene) {
      this.camera.position.x = Math.sin(sec * 0.3) * 0.4;
      this.camera.lookAt(0, 0, 0);
      this.renderer.render(this.scene, this.camera);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
