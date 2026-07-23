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
    this.myPlayerIdx = 0;
    this.autoStartSeconds = 5;
    this.isOnlineMode = false;
    this.isJoiningRoom = false; // Flag: are we auto-joining via URL ?room= param

    // Check URL for room param FIRST before anything else
    const urlParams = new URLSearchParams(window.location.search);
    this.roomParamFromURL = urlParams.get('room');
    if (this.roomParamFromURL) {
      this.isJoiningRoom = true; // Prevent auto-start countdown
    }

    this.initUIListeners();

    window.addEventListener('pointerdown', () => {
      soundManager.resume();
      if (this.peerMgr) this.peerMgr.unlockiOSAudio();
    }, { once: true });

    try {
      this.initThree();
      this.initGame3D();
    } catch (err) {
      console.warn('Three.js Init Error:', err);
    }

    try {
      this.initNetwork();
    } catch (err) {
      console.warn('Network Init Error:', err);
    }

    this.updateUI();

    // Only start auto-countdown if NOT joining from a room link
    if (!this.isJoiningRoom) {
      this.startAutoStartCountdown();
    }

    this.animate();
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x160d29);
    this.scene.fog = new THREE.FogExp2(0x160d29, 0.035);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    if (this.container) {
      this.container.appendChild(this.renderer.domElement);
    }

    this.scene.add(new THREE.AmbientLight(0xfff0f5, 1.0));

    const sunLight = new THREE.DirectionalLight(0xffe6ee, 1.4);
    sunLight.position.set(6, 12, 6);
    this.scene.add(sunLight);

    const pinkLight = new THREE.PointLight(0xff1a53, 1.8, 14);
    pinkLight.position.set(-5, 4, -5);
    this.scene.add(pinkLight);

    const greenLight = new THREE.PointLight(0x00cc88, 1.8, 14);
    greenLight.position.set(5, 4, 5);
    this.scene.add(greenLight);

    this.updateCameraAspect();
    window.addEventListener('resize', () => this.onResize());
  }

  updateCameraAspect() {
    if (!this.camera || !this.renderer) return;
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.aspect = aspect;

    if (aspect < 1.0) {
      const dist = 14 / aspect;
      this.camera.position.set(0, dist, dist);
    } else {
      this.camera.position.set(0, 11, 11);
    }

    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  initGame3D() {
    this.board = new LudoBoard(this.scene);
    this.tokens = new TokenManager(this.scene, this.board);
    this.dice = new LudoDice(this.scene);
    this.particles = new ParticleSystem(this.scene);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    if (this.container) {
      this.container.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    }
  }

  initNetwork() {
    this.peerMgr = new PeerManager(
      (packet) => this.handleNetworkPacket(packet),
      (status) => this.updateVoiceHUD(status)
    );

    if (this.roomParamFromURL) {
      const input = document.getElementById('input-room-code');
      if (input) input.value = this.roomParamFromURL;
      // Wait for 3D to render first, then auto-join
      setTimeout(() => this.joinRoom(this.roomParamFromURL), 500);
    }
  }

  startAutoStartCountdown() {
    const timerText = document.getElementById('auto-start-timer');
    if (!timerText) return;

    this.countdownInterval = setInterval(() => {
      this.autoStartSeconds--;
      timerText.innerText = `(Auto starting in ${this.autoStartSeconds}s...)`;

      if (this.autoStartSeconds <= 0) {
        clearInterval(this.countdownInterval);
        this.startGameInstant();
      }
    }, 1000);
  }

  hideModal() {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    const modal = document.getElementById('room-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.add('hidden');
    }
  }

  startGameInstant() {
    this.hideModal();
    try { soundManager.startRomanticMusic(); } catch(e){}
    this.updateUI();
    this.showLovePopup('Welcome Papri & Lover! ❤️ Game Started!');
  }

  createRoom() {
    this.hideModal();
    try { soundManager.startRomanticMusic(); } catch(e){}
    this.isOnlineMode = true;
    this.myPlayerIdx = 0; // Host = Red = Papri
    this.updateUI();

    if (this.peerMgr) {
      this.peerMgr.init(null).then((res) => {
        const roomUrl = `${window.location.origin}${window.location.pathname}?room=${res.roomId}`;
        navigator.clipboard.writeText(roomUrl).catch(() => {});
        this.showLovePopup(`✨ Room: ${res.roomId}\nLink Copied! Send to Papri!`);
      });
    }
  }

  joinRoom(code) {
    if (!code) {
      const input = document.getElementById('input-room-code');
      code = input ? input.value : '';
    }
    if (!code) return;

    this.hideModal();
    try { soundManager.startRomanticMusic(); } catch(e){}
    this.isOnlineMode = true;
    this.myPlayerIdx = 1; // Client = Green = My Love
    this.updateUI();

    if (this.peerMgr) {
      this.peerMgr.init(code.trim()).then(() => {
        this.showLovePopup(`Joined Room: ${code.trim()}! ❤️`);
      });
    }
  }

  initUIListeners() {
    // Global inline handlers for HTML onclick fallback
    window.startGameDirect = () => this.startGameInstant();
    window.createRoomDirect = () => this.createRoom();
    window.joinRoomDirect = () => {
      const input = document.getElementById('input-room-code');
      this.joinRoom(input ? input.value : '');
    };

    const btnStart = document.getElementById('btn-start-game');
    if (btnStart) btnStart.addEventListener('click', () => this.startGameInstant());

    const btnCreate = document.getElementById('btn-create-room');
    if (btnCreate) btnCreate.addEventListener('click', () => this.createRoom());

    const btnJoin = document.getElementById('btn-join-room');
    if (btnJoin) btnJoin.addEventListener('click', () => {
      const input = document.getElementById('input-room-code');
      this.joinRoom(input ? input.value : '');
    });

    const btnRoll = document.getElementById('btn-roll-dice');
    if (btnRoll) btnRoll.addEventListener('click', () => this.handleRollDice());

    const btnMic = document.getElementById('btn-toggle-mic');
    if (btnMic) {
      btnMic.addEventListener('click', () => {
        if (this.peerMgr) {
          const isLive = this.peerMgr.toggleMic();
          btnMic.innerHTML = isLive ? '🎙️ Mic On' : '🔇 Mic Off';
        }
      });
    }

    const btnShare = document.getElementById('btn-share-room');
    if (btnShare) {
      btnShare.addEventListener('click', () => {
        const roomId = (this.peerMgr && this.peerMgr.roomId) ? this.peerMgr.roomId : 'papri-room';
        const roomUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
        navigator.clipboard.writeText(roomUrl).catch(() => {});
        alert(`Room Link Copied!\n${roomUrl}`);
      });
    }

    document.querySelectorAll('.btn-msg').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const msg = e.target.getAttribute('data-msg');
        if (msg) this.sendLoveMessage(msg);
      });
    });

    document.querySelectorAll('.btn-react').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.target.getAttribute('data-reaction');
        if (type) this.triggerReaction(type, true);
      });
    });
  }

  sendLoveMessage(msg) {
    try { soundManager.playRoseReaction(); } catch(e){}
    this.showLovePopup(msg);
    if (this.particles) this.particles.triggerFullKissExplosion('💖');
    if (this.peerMgr) this.peerMgr.send('CHAT_MSG', { msg });
  }

  // ===== DICE ROLL (LOCAL PLAYER) =====
  handleRollDice() {
    // In online mode, only roll if it's actually my turn
    if (this.isOnlineMode && this.engine.turn !== this.myPlayerIdx) return;
    if (this.engine.diceRolled || this.engine.winner !== null) return;

    const val = this.engine.rollDice();
    if (!val) return;

    try { soundManager.playDiceRoll(); } catch(e){}

    // Send dice value to remote player
    if (this.peerMgr && this.isOnlineMode) {
      this.peerMgr.send('DICE_ROLL', { val });
    }

    if (this.dice) {
      this.dice.roll(val, () => {
        this.afterDiceRollAnimation();
      });
    }
  }

  // Called after dice animation finishes — handles auto-move / highlight / pass
  afterDiceRollAnimation() {
    const validMoves = this.engine.getValidTokenMoves();

    if (validMoves.length === 0) {
      // No valid moves — auto pass turn after short delay
      setTimeout(() => {
        this.engine.passTurn();
        if (this.peerMgr && this.isOnlineMode) {
          this.peerMgr.send('PASS_TURN', {});
        }
        this.updateUI();
      }, 600);
    } else if (validMoves.length === 1) {
      // Only one valid token — auto move it
      this.doMoveToken(validMoves[0], true);
    } else {
      // Multiple valid tokens — highlight them and wait for click
      if (this.tokens) this.tokens.highlightTokens(this.engine.turn, validMoves);
      this.updateUI();
    }
  }

  // ===== MOVE TOKEN (splits local broadcast from remote receive) =====
  // `broadcast` = true means I did this move locally and need to tell remote
  doMoveToken(tokenId, broadcast) {
    const moveRes = this.engine.moveToken(tokenId);
    if (!moveRes) return;

    // Only send to remote if this is a LOCAL action
    if (broadcast && this.peerMgr && this.isOnlineMode) {
      this.peerMgr.send('MOVE_TOKEN', { tokenId });
    }

    const coords = moveRes.trajectory.map(pos => {
      if (pos.type === 'TRACK') return this.board.trackPositions[pos.idx];
      if (pos.type === 'HOME_PATH') return this.board.homePaths[moveRes.playerIdx][pos.idx];
      return { x: 0, y: 0.5, z: 0 };
    });

    try { soundManager.playStep(); } catch(e){}

    if (this.tokens) {
      this.tokens.animateMove(moveRes.playerIdx, tokenId, coords, () => {
        if (moveRes.capturedToken) {
          try { soundManager.playCapture(); } catch(e){}
          const cap = moveRes.capturedToken;
          const baseSpot = this.board.basePositions[cap.playerIdx][cap.tokenId];
          if (this.tokens.tokens[cap.playerIdx][cap.tokenId]) {
            this.tokens.tokens[cap.playerIdx][cap.tokenId].mesh.position.set(baseSpot.x, baseSpot.y, baseSpot.z);
            this.tokens.tokens[cap.playerIdx][cap.tokenId].currentPos = baseSpot;
          }
        }

        this.tokens.highlightTokens(-1, []);

        if (moveRes.winner !== null) {
          this.handleVictory(moveRes.winner);
        } else {
          this.updateUI();
        }
      });
    }
  }

  // ===== CLICK ON 3D TOKEN =====
  onPointerDown(event) {
    // Only allow clicking tokens if it's my turn AND dice has been rolled
    if (this.isOnlineMode && this.engine.turn !== this.myPlayerIdx) return;
    if (!this.engine.diceRolled) return;

    const validMoves = this.engine.getValidTokenMoves();
    if (validMoves.length === 0) return;

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    if (this.raycaster && this.camera && this.tokens) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const meshes = [];

      validMoves.forEach(tIdx => {
        if (this.tokens.tokens[this.engine.turn][tIdx]) {
          meshes.push(this.tokens.tokens[this.engine.turn][tIdx].mesh);
        }
      });

      const intersects = this.raycaster.intersectObjects(meshes, true);

      if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj.parent && !obj.parent.isGroup) {
          obj = obj.parent;
        }

        const playerTokens = this.tokens.tokens[this.engine.turn];
        const clickedIdx = playerTokens.findIndex(t => t.mesh === obj || t.mesh === obj.parent);

        if (clickedIdx !== -1 && validMoves.includes(clickedIdx)) {
          this.doMoveToken(clickedIdx, true); // true = broadcast to remote
        }
      }
    }
  }

  // ===== RECEIVE NETWORK PACKETS FROM REMOTE PLAYER =====
  handleNetworkPacket(packet) {
    const { action, payload } = packet;

    if (action === 'DICE_ROLL') {
      // Remote player rolled dice — apply to our engine
      this.engine.diceValue = payload.val;
      this.engine.diceRolled = true;

      try { soundManager.playDiceRoll(); } catch(e){}

      if (this.dice) {
        this.dice.roll(payload.val, () => {
          // After animation, process the remote player's valid moves
          const validMoves = this.engine.getValidTokenMoves();

          if (validMoves.length === 0) {
            // Remote player has no moves — we wait for their PASS_TURN message
            // (They will send it from their side)
          } else if (validMoves.length === 1) {
            // Remote has exactly 1 valid move — they will auto-move and send MOVE_TOKEN
            // We just wait for it
          } else {
            // Remote has multiple choices — they will click and send MOVE_TOKEN
            // We just wait for it
          }

          this.updateUI();
        });
      }

    } else if (action === 'MOVE_TOKEN') {
      // Remote player moved a token — apply to our engine (broadcast=false: don't echo back!)
      this.doMoveToken(payload.tokenId, false);

    } else if (action === 'PASS_TURN') {
      // Remote player passed turn — apply to our engine
      this.engine.passTurn();
      this.updateUI();

    } else if (action === 'REACTION') {
      this.triggerReaction(payload.type, false);

    } else if (action === 'CHAT_MSG') {
      try { soundManager.playRoseReaction(); } catch(e){}
      if (this.particles) this.particles.triggerFullKissExplosion('💖');
      this.showLovePopup(payload.msg);
    }
  }

  triggerReaction(type, broadcast = false) {
    if (broadcast && this.peerMgr && this.isOnlineMode) {
      this.peerMgr.send('REACTION', { type });
    }

    const effects = {
      rose:  { sound: 'playRoseReaction', emoji: '🌹', msg: '🌹 Rose Shower!', burst: '#ff1a40', shower: true },
      kiss:  { sound: 'playKissReaction', emoji: '💋', msg: '💋 Kisses!', burst: '#ff6699' },
      hug:   { sound: 'playKissReaction', emoji: '🤗', msg: '🤗 Warm Hugs!' },
      love:  { sound: 'playRoseReaction', emoji: '❤️', msg: '❤️ Full Love!', burst: '#ff0055' }
    };

    const fx = effects[type];
    if (!fx) return;

    try { soundManager[fx.sound](); } catch(e){}
    if (this.particles) {
      if (fx.shower) this.particles.triggerRoseShower();
      if (fx.burst) this.particles.triggerLoveBurst(fx.burst);
      this.particles.triggerFullKissExplosion(fx.emoji);
    }
    this.showLovePopup(fx.msg);
  }

  showLovePopup(msg) {
    const popup = document.createElement('div');
    popup.className = 'love-popup-msg';
    popup.innerText = msg;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 2500);
  }

  updateVoiceHUD(status) {
    const hud = document.getElementById('voice-status-text');
    if (!hud) return;
    const labels = {
      connected: 'Online Connected ✅',
      voice_active: 'Voice Call Live 🎙️',
      mic_ready: 'Mic Ready',
      mic_denied: 'Voice (Muted)',
      disconnected: 'Disconnected'
    };
    hud.innerText = labels[status] || status;
  }

  updateUI() {
    const turn = this.engine.turn;
    const isMyTurn = this.isOnlineMode ? (turn === this.myPlayerIdx) : true;

    const p0 = document.getElementById('player-card-0');
    const p1 = document.getElementById('player-card-1');
    if (p0) p0.classList.toggle('active-turn', turn === 0);
    if (p1) p1.classList.toggle('active-turn', turn === 1);

    const rollBtn = document.getElementById('btn-roll-dice');
    if (rollBtn) {
      rollBtn.disabled = !isMyTurn || this.engine.diceRolled || this.engine.winner !== null;
    }

    const banner = document.getElementById('turn-banner-text');
    if (banner) {
      if (this.engine.winner !== null) {
        banner.innerText = '🎉 Game Over!';
      } else if (isMyTurn) {
        const name = turn === 0 ? 'Papri ❤️' : 'My Love 💖';
        banner.innerText = `❤️ ${name}'s Turn! Roll the Dice 🎲`;
        banner.style.color = '#ff6699';
      } else {
        banner.innerText = "Waiting for Partner's roll...";
        banner.style.color = '#ffffff';
      }
    }
  }

  handleVictory(winnerIdx) {
    try { soundManager.playWinFanfare(); } catch(e){}
    try { confetti({ particleCount: 180, spread: 90, origin: { y: 0.6 } }); } catch(e){}

    const winModal = document.getElementById('win-modal');
    const winnerText = document.getElementById('win-winner-text');

    if (winnerText) winnerText.innerText = winnerIdx === 0 ? 'Papri Wins! 🌹' : 'My Love Wins! 💖';
    if (winModal) {
      winModal.style.display = 'flex';
      winModal.classList.remove('hidden');
    }
  }

  onResize() {
    this.updateCameraAspect();
  }

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
