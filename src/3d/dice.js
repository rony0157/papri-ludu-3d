import * as THREE from 'three';

export class LudoDice {
  constructor(scene) {
    this.scene = scene;
    this.diceGroup = new THREE.Group();
    this.isRolling = false;

    this.createDice();
  }

  createDice() {
    const size = 1.0;
    const geometry = new THREE.BoxGeometry(size, size, size);

    const materials = [];
    const facePips = [1, 6, 2, 5, 3, 4];

    facePips.forEach(val => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');

      const grad = ctx.createLinearGradient(0, 0, 128, 128);
      grad.addColorStop(0, '#fff5f7');
      grad.addColorStop(1, '#ffd1dc');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);

      ctx.strokeStyle = '#e60039';
      ctx.lineWidth = 6;
      ctx.strokeRect(4, 4, 120, 120);

      const drawHeart = (x, y) => {
        ctx.fillStyle = '#ff1a53';
        ctx.beginPath();
        ctx.moveTo(x, y + 10);
        ctx.bezierCurveTo(x, y + 10, x - 12, y - 4, x - 12, y - 12);
        ctx.bezierCurveTo(x - 12, y - 18, x - 4, y - 20, x, y - 12);
        ctx.bezierCurveTo(x + 4, y - 20, x + 12, y - 18, x + 12, y - 12);
        ctx.bezierCurveTo(x + 12, y - 4, x, y + 10, x, y + 10);
        ctx.fill();
      };

      const positions = {
        1: [[64, 64]],
        2: [[36, 36], [92, 92]],
        3: [[36, 36], [64, 64], [92, 92]],
        4: [[36, 36], [92, 36], [36, 92], [92, 92]],
        5: [[36, 36], [92, 36], [64, 64], [36, 92], [92, 92]],
        6: [[36, 32], [92, 32], [36, 64], [92, 64], [36, 96], [92, 96]]
      };

      if (positions[val]) {
        positions[val].forEach(pos => drawHeart(pos[0], pos[1]));
      }

      const texture = new THREE.CanvasTexture(canvas);
      materials.push(new THREE.MeshLambertMaterial({ map: texture }));
    });

    this.mesh = new THREE.Mesh(geometry, materials);
    this.diceGroup.add(this.mesh);
    this.diceGroup.position.set(0, 0.6, 0);

    if (this.scene) this.scene.add(this.diceGroup);

    this.faceRotations = {
      1: { x: 0, z: -Math.PI / 2 },
      6: { x: 0, z: Math.PI / 2 },
      2: { x: -Math.PI / 2, z: 0 },
      5: { x: Math.PI / 2, z: 0 },
      3: { x: 0, z: 0 },
      4: { x: Math.PI, z: 0 }
    };
  }

  roll(finalValue, onComplete) {
    if (this.isRolling) return;
    this.isRolling = true;

    const startPos = { ...this.diceGroup.position };
    const duration = 1000;
    const startTime = performance.now();

    const targetRot = this.faceRotations[finalValue] || { x: 0, z: 0 };
    const extraSpinX = Math.PI * 6;
    const extraSpinY = Math.PI * 4;
    const extraSpinZ = Math.PI * 6;

    const animateRoll = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      this.mesh.rotation.x = THREE.MathUtils.lerp(0, targetRot.x + extraSpinX, progress);
      this.mesh.rotation.y = THREE.MathUtils.lerp(0, extraSpinY, progress);
      this.mesh.rotation.z = THREE.MathUtils.lerp(0, targetRot.z + extraSpinZ, progress);

      const bounce = Math.sin(progress * Math.PI) * 2.2;
      this.diceGroup.position.y = startPos.y + bounce;

      if (progress < 1) {
        requestAnimationFrame(animateRoll);
      } else {
        this.mesh.rotation.set(targetRot.x, 0, targetRot.z);
        this.diceGroup.position.y = startPos.y;
        this.isRolling = false;
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animateRoll);
  }
}
