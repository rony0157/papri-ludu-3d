import * as THREE from 'three';

export class TokenManager {
  constructor(scene, board) {
    this.scene = scene;
    this.board = board;
    this.tokens = { 0: [], 1: [] };
    this.createTokens();
  }

  createTokens() {
    const colors = {
      0: { main: 0xff0044, crown: 0xff6699 }, // Papri Red-Pink
      1: { main: 0x00cc88, crown: 0x66ffcc }  // Lover Emerald
    };

    [0, 1].forEach(playerIdx => {
      const baseSpots = this.board.basePositions[playerIdx] || [];

      for (let tIdx = 0; tIdx < 4; tIdx++) {
        const spot = baseSpots[tIdx] || { x: 0, y: 0.25, z: 0 };

        const tokenGroup = new THREE.Group();

        // Base disc
        const baseGeo = new THREE.CylinderGeometry(0.3, 0.32, 0.12, 16);
        const baseMat = new THREE.MeshLambertMaterial({ color: colors[playerIdx].main });
        const baseMesh = new THREE.Mesh(baseGeo, baseMat);
        baseMesh.position.y = 0.06;
        tokenGroup.add(baseMesh);

        // Body cone
        const bodyGeo = new THREE.CylinderGeometry(0.12, 0.26, 0.45, 16);
        const bodyMesh = new THREE.Mesh(bodyGeo, baseMat);
        bodyMesh.position.y = 0.34;
        tokenGroup.add(bodyMesh);

        // Top Sphere / Crown
        const topGeo = new THREE.SphereGeometry(0.16, 12, 12);
        const topMat = new THREE.MeshBasicMaterial({ color: colors[playerIdx].crown });
        const topMesh = new THREE.Mesh(topGeo, topMat);
        topMesh.position.y = 0.62;
        tokenGroup.add(topMesh);

        // Selection Ring
        const auraGeo = new THREE.RingGeometry(0.34, 0.42, 16);
        const auraMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0
        });
        const auraMesh = new THREE.Mesh(auraGeo, auraMat);
        auraMesh.rotation.x = Math.PI / 2;
        auraMesh.position.y = 0.02;
        tokenGroup.add(auraMesh);

        tokenGroup.position.set(spot.x, spot.y, spot.z);
        if (this.scene) this.scene.add(tokenGroup);

        this.tokens[playerIdx].push({
          mesh: tokenGroup,
          aura: auraMesh,
          playerIdx,
          tIdx,
          currentPos: spot,
          isMoving: false
        });
      }
    });
  }

  highlightTokens(playerIdx, tokenIndices) {
    [0, 1].forEach(p => {
      this.tokens[p].forEach((t, i) => {
        if (p === playerIdx && tokenIndices.includes(i)) {
          t.aura.material.opacity = 0.85;
          t.mesh.position.y = t.currentPos.y + 0.1;
        } else {
          t.aura.material.opacity = 0;
          if (!t.isMoving) t.mesh.position.y = t.currentPos.y;
        }
      });
    });
  }

  animateMove(playerIdx, tIdx, targetCoords, onComplete) {
    const token = this.tokens[playerIdx][tIdx];
    if (!token) {
      if (onComplete) onComplete();
      return;
    }

    token.isMoving = true;
    token.aura.material.opacity = 0;

    let stepIndex = 0;
    const totalSteps = targetCoords.length;
    if (totalSteps === 0) {
      token.isMoving = false;
      if (onComplete) onComplete();
      return;
    }

    const animateStep = () => {
      if (stepIndex >= totalSteps) {
        token.isMoving = false;
        token.currentPos = targetCoords[totalSteps - 1];
        if (onComplete) onComplete();
        return;
      }

      const startPos = { ...token.mesh.position };
      const targetPos = targetCoords[stepIndex];
      const duration = 180;
      const startTime = performance.now();

      const updatePosition = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        token.mesh.position.x = THREE.MathUtils.lerp(startPos.x, targetPos.x, progress);
        token.mesh.position.z = THREE.MathUtils.lerp(startPos.z, targetPos.z, progress);

        const jumpHeight = 0.6 * Math.sin(progress * Math.PI);
        token.mesh.position.y = THREE.MathUtils.lerp(startPos.y, targetPos.y, progress) + jumpHeight;

        if (progress < 1) {
          requestAnimationFrame(updatePosition);
        } else {
          stepIndex++;
          animateStep();
        }
      };

      requestAnimationFrame(updatePosition);
    };

    animateStep();
  }
}
