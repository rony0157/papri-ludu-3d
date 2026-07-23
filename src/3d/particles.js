import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.petals = [];
    this.hearts = [];
    this.createRosePetals();
    this.createBokehHearts();
  }

  // Create 3D Rose Petal particles (100 Petals Rain)
  createRosePetals() {
    const petalCount = 100;
    const geometry = new THREE.PlaneGeometry(0.35, 0.45);
    
    // Canvas texture for glowing red rose petal
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, '#ff1a40');
    grad.addColorStop(0.7, '#e60039');
    grad.addColorStop(1, 'rgba(150, 0, 30, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.petalGroup = new THREE.Group();

    for (let i = 0; i < petalCount; i++) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        (Math.random() - 0.5) * 22,
        Math.random() * 16 + 2,
        (Math.random() - 0.5) * 22
      );
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      const speedY = 0.02 + Math.random() * 0.03;
      const rotSpeedX = (Math.random() - 0.5) * 0.03;
      const rotSpeedY = (Math.random() - 0.5) * 0.04;

      this.petals.push({ mesh, speedY, rotSpeedX, rotSpeedY, initialX: mesh.position.x });
      this.petalGroup.add(mesh);
    }

    this.scene.add(this.petalGroup);
  }

  // Create Bokeh Heart Sparkles (60 Hearts)
  createBokehHearts() {
    const heartCount = 60;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Draw Heart shape
    ctx.fillStyle = '#ff6b8b';
    ctx.beginPath();
    ctx.moveTo(32, 48);
    ctx.bezierCurveTo(32, 48, 12, 34, 12, 22);
    ctx.bezierCurveTo(12, 12, 22, 10, 32, 20);
    ctx.bezierCurveTo(42, 10, 52, 12, 52, 22);
    ctx.bezierCurveTo(52, 34, 32, 48, 32, 48);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    this.heartGroup = new THREE.Group();

    for (let i = 0; i < heartCount; i++) {
      const sprite = new THREE.Sprite(material);
      sprite.position.set(
        (Math.random() - 0.5) * 18,
        Math.random() * 12 - 2,
        (Math.random() - 0.5) * 18
      );
      const scale = 0.25 + Math.random() * 0.4;
      sprite.scale.set(scale, scale, 1);

      this.hearts.push({
        sprite,
        baseScale: scale,
        speedY: 0.01 + Math.random() * 0.02,
        phase: Math.random() * Math.PI * 2
      });
      this.heartGroup.add(sprite);
    }

    this.scene.add(this.heartGroup);
  }

  // Heavy Rose Rain Shower Effect on Reaction Click!
  triggerRoseShower() {
    this.petals.forEach(p => {
      p.speedY += 0.04; // Temporarily speed up falling
      p.mesh.position.y += Math.random() * 4;
    });

    setTimeout(() => {
      this.petals.forEach(p => {
        p.speedY = 0.02 + Math.random() * 0.03;
      });
    }, 3000);
  }

  // Update particles on frame
  update(time) {
    this.petals.forEach(p => {
      p.mesh.position.y -= p.speedY;
      p.mesh.position.x = p.initialX + Math.sin(time * 2.5 + p.mesh.position.y) * 0.9;
      p.mesh.rotation.x += p.rotSpeedX;
      p.mesh.rotation.y += p.rotSpeedY;

      if (p.mesh.position.y < -3) {
        p.mesh.position.y = 16;
        p.mesh.position.x = (Math.random() - 0.5) * 22;
        p.initialX = p.mesh.position.x;
      }
    });

    this.hearts.forEach(h => {
      h.sprite.position.y += h.speedY;
      const scalePulse = h.baseScale * (1 + Math.sin(time * 3 + h.phase) * 0.3);
      h.sprite.scale.set(scalePulse, scalePulse, 1);

      if (h.sprite.position.y > 13) {
        h.sprite.position.y = -3;
        h.sprite.position.x = (Math.random() - 0.5) * 18;
      }
    });
  }

  triggerLoveBurst(color = '#ff1a53') {
    const burstCount = 35;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(burstCount * 3);
    const velocities = [];

    for (let i = 0; i < burstCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2;
      positions[i * 3 + 1] = 1 + Math.random() * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;

      velocities.push({
        x: (Math.random() - 0.5) * 0.12,
        y: 0.06 + Math.random() * 0.1,
        z: (Math.random() - 0.5) * 0.12
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: new THREE.Color(color),
      size: 0.45,
      transparent: true,
      opacity: 1
    });

    const pSystem = new THREE.Points(geometry, material);
    this.scene.add(pSystem);

    let frame = 0;
    const animateBurst = () => {
      frame++;
      const posArr = pSystem.geometry.attributes.position.array;

      for (let i = 0; i < burstCount; i++) {
        posArr[i * 3] += velocities[i].x;
        posArr[i * 3 + 1] += velocities[i].y;
        posArr[i * 3 + 2] += velocities[i].z;
      }

      pSystem.geometry.attributes.position.needsUpdate = true;
      material.opacity -= 0.02;

      if (frame < 50 && material.opacity > 0) {
        requestAnimationFrame(animateBurst);
      } else {
        this.scene.remove(pSystem);
        pSystem.geometry.dispose();
        material.dispose();
      }
    };

    animateBurst();
  }
}
