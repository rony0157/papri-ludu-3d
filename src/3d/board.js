import * as THREE from 'three';

export class LudoBoard {
  constructor(scene) {
    this.scene = scene;
    this.boardGroup = new THREE.Group();
    this.trackPositions = []; // 52 track cell 3D coordinates
    this.homePaths = {        // Home paths for players
      0: [], // Red (Papri)
      1: [], // Green (Lover)
      2: [], // Yellow
      3: []  // Blue
    };
    this.basePositions = {    // Initial 4 home base spots per player
      0: [],
      1: [],
      2: [],
      3: []
    };

    this.createBoard();
  }

  createBoard() {
    // 1. Outer Board Base Box
    const baseGeo = new THREE.BoxGeometry(13.2, 0.4, 13.2);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1f172b, // Dark velvet / midnight purple
      roughness: 0.3,
      metalness: 0.2
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -0.2;
    baseMesh.receiveShadow = true;
    this.boardGroup.add(baseMesh);

    // Rose Gold Outer Rim Frame
    const rimGeo = new THREE.BoxGeometry(13.6, 0.5, 13.6);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xe6a1b0, // Rose Gold
      metalness: 0.8,
      roughness: 0.2
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.position.y = -0.26;
    this.boardGroup.add(rimMesh);

    // 2. Generate 15x15 Ludo Grid
    const cellSize = 0.8;
    const gridOffset = -5.6;

    const getCoord = (col, row) => ({
      x: gridOffset + col * cellSize,
      y: 0.05,
      z: gridOffset + row * cellSize
    });

    const createCell = (col, row, color, isRaised = false, hasHeart = false) => {
      const coord = getCoord(col, row);
      const cellGeo = new THREE.BoxGeometry(cellSize * 0.92, isRaised ? 0.2 : 0.08, cellSize * 0.92);
      const cellMat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.4,
        metalness: 0.1
      });
      const cellMesh = new THREE.Mesh(cellGeo, cellMat);
      cellMesh.position.set(coord.x, isRaised ? 0.1 : 0.04, coord.z);
      cellMesh.receiveShadow = true;
      cellMesh.castShadow = true;
      this.boardGroup.add(cellMesh);

      if (hasHeart) {
        const heartGeo = new THREE.OctahedronGeometry(0.15, 0);
        const heartMat = new THREE.MeshStandardMaterial({
          color: 0xff3366,
          emissive: 0xff0044,
          emissiveIntensity: 0.6
        });
        const heartMesh = new THREE.Mesh(heartGeo, heartMat);
        heartMesh.position.set(coord.x, 0.16, coord.z);
        heartMesh.rotation.y = Math.PI / 4;
        this.boardGroup.add(heartMesh);
      }

      return coord;
    };

    // Colors
    const COLOR_RED = 0xff2a55;    // Papri Red
    const COLOR_GREEN = 0x00cc88;  // Lover Green
    const COLOR_YELLOW = 0xffcc00;
    const COLOR_BLUE = 0x3399ff;
    const COLOR_TRACK = 0x2d223d;
    const COLOR_SAFE = 0x5a3e75;

    // 3. Draw Home Base Quadrants (6x6 cells each)
    // Red Base (Top-Left: col 0..5, row 0..5)
    this.createBaseArea(0, 0, 5, 5, COLOR_RED, 0, getCoord);
    // Yellow Base (Top-Right: col 9..14, row 0..5)
    this.createBaseArea(9, 0, 14, 5, COLOR_YELLOW, 2, getCoord);
    // Blue Base (Bottom-Left: col 0..5, row 9..14)
    this.createBaseArea(0, 9, 5, 14, COLOR_BLUE, 3, getCoord);
    // Green Base (Bottom-Right: col 9..14, row 9..14)
    this.createBaseArea(9, 9, 14, 14, COLOR_GREEN, 1, getCoord);

    // 4. Center Home Triangle / Trophy (col 6..8, row 6..8)
    const centerCoord = getCoord(7, 7);
    const trophyGeo = new THREE.ConeGeometry(1.2, 1.0, 4);
    const trophyMat = new THREE.MeshStandardMaterial({
      color: 0xff0055,
      emissive: 0xff0044,
      emissiveIntensity: 0.5,
      roughness: 0.1,
      metalness: 0.9
    });
    const trophyMesh = new THREE.Mesh(trophyGeo, trophyMat);
    trophyMesh.position.set(centerCoord.x, 0.5, centerCoord.z);
    trophyMesh.rotation.y = Math.PI / 4;
    this.boardGroup.add(trophyMesh);

    // Glowing Heart on top of Center Trophy
    const topHeartGeo = new THREE.SphereGeometry(0.35, 16, 16);
    topHeartGeo.scale(1, 1.2, 0.8);
    const topHeartMat = new THREE.MeshStandardMaterial({
      color: 0xff3366,
      emissive: 0xff1a53,
      emissiveIntensity: 0.8
    });
    const topHeart = new THREE.Mesh(topHeartGeo, topHeartMat);
    topHeart.position.set(centerCoord.x, 1.1, centerCoord.z);
    this.boardGroup.add(topHeart);

    // 5. Map 52 Standard Track Cell Positions
    const pathCoords = [
      [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
      [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
      [7, 0],
      [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
      [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
      [14, 7],
      [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
      [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
      [7, 14],
      [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
      [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
      [0, 7],
      [0, 6]
    ];

    const safeIndices = [0, 8, 13, 21, 26, 34, 39, 47];

    pathCoords.forEach((pt, idx) => {
      const isRedStart = (idx === 0);
      const isGreenStart = (idx === 26);
      const isSafe = safeIndices.includes(idx);
      
      let color = COLOR_TRACK;
      if (isRedStart) color = COLOR_RED;
      else if (isGreenStart) color = COLOR_GREEN;
      else if (isSafe) color = COLOR_SAFE;

      const coord = createCell(pt[0], pt[1], color, false, isSafe);
      this.trackPositions.push(coord);
    });

    // 6. Home Paths Leading to Center Trophy
    for (let c = 1; c <= 6; c++) {
      this.homePaths[0].push(createCell(c, 7, COLOR_RED, true));
    }
    for (let c = 13; c >= 8; c--) {
      this.homePaths[1].push(createCell(c, 7, COLOR_GREEN, true));
    }

    this.scene.add(this.boardGroup);
  }

  createBaseArea(startCol, startRow, endCol, endRow, mainColor, playerIdx, getCoord) {
    const centerCol = (startCol + endCol) / 2;
    const centerRow = (startRow + endRow) / 2;
    const coordCenter = getCoord(centerCol, centerRow);

    const baseGeo = new THREE.BoxGeometry(4.6, 0.18, 4.6);
    const baseMat = new THREE.MeshStandardMaterial({
      color: mainColor,
      roughness: 0.3,
      metalness: 0.3
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.set(coordCenter.x, 0.09, coordCenter.z);
    this.boardGroup.add(baseMesh);

    // Inner White Pocket
    const innerGeo = new THREE.BoxGeometry(3.6, 0.22, 3.6);
    const innerMat = new THREE.MeshStandardMaterial({ color: 0xfff0f5 });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    innerMesh.position.set(coordCenter.x, 0.11, coordCenter.z);
    this.boardGroup.add(innerMesh);

    // 4 Spot circles for tokens inside base
    const offsets = [
      [-1, -1], [1, -1],
      [-1, 1],  [1, 1]
    ];

    offsets.forEach(off => {
      const posX = coordCenter.x + off[0] * 1.0;
      const posZ = coordCenter.z + off[1] * 1.0;

      const spotGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.24, 16);
      const spotMat = new THREE.MeshStandardMaterial({ color: mainColor });
      const spotMesh = new THREE.Mesh(spotGeo, spotMat);
      spotMesh.position.set(posX, 0.12, posZ);
      this.boardGroup.add(spotMesh);

      if (this.basePositions && this.basePositions[playerIdx]) {
        this.basePositions[playerIdx].push({ x: posX, y: 0.25, z: posZ });
      }
    });
  }
}
