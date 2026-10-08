import * as THREE from 'three';
import { TeleportWaypoint } from '../types/game';

export interface ChestData {
  id: string;
  position: THREE.Vector3;
  rarity: 'COMMON' | 'EXQUISITE' | 'PRECIOUS';
  isOpened: boolean;
  mesh: THREE.Group;
  lidMesh: THREE.Mesh;
}

export interface ResourceNode {
  id: string;
  name: string;
  position: THREE.Vector3;
  type: 'HERB' | 'ORE' | 'FRUIT';
  isCollected: boolean;
  mesh: THREE.Group;
}

export interface TorchPuzzle {
  id: string;
  torches: { id: string; position: THREE.Vector3; isLit: boolean; mesh: THREE.Group }[];
  isSolved: boolean;
  rewardChestId: string;
}

export interface OpenWorldData {
  terrainMesh: THREE.Mesh;
  waterMesh: THREE.Mesh;
  waypoints: TeleportWaypoint[];
  waypointMeshes: { id: string; group: THREE.Group; crystal: THREE.Mesh }[];
  chests: ChestData[];
  resources: ResourceNode[];
  torchPuzzle: TorchPuzzle;
  dungeonPortalMesh: THREE.Group;
  bossArenaCenter: THREE.Vector3;
  getTerrainHeight: (x: number, z: number) => number;
}

export function buildVerdantiaWorld(scene: THREE.Scene): OpenWorldData {
  const WORLD_SIZE = 800;
  const SEGMENTS = 160;

  // Procedural Height Function for Verdantia:
  // - High northern mountains (z: -350 to -200)
  // - Central rolling meadows (x: -150 to 150, z: -100 to 150)
  // - Lake basin (x: 100 to 250, z: 0 to 150) with water level at y = 1.0
  // - Colossus Arena at (x: 0, z: -280) plateau at y = 26
  // - Oakhaven village at (x: -80, z: 40) at y = 4 to 8
  const getTerrainHeight = (x: number, z: number): number => {
    // Distance from world center
    const d = Math.sqrt(x * x + z * z);
    if (d > WORLD_SIZE * 0.5) return 40; // steep world boundary mountains

    // Base hills
    let h = Math.sin(x * 0.015) * 6 + Math.cos(z * 0.015) * 6;
    h += Math.sin(x * 0.04 + z * 0.03) * 2.5;

    // Northern Mountain Range
    if (z < -120) {
      const northFactor = THREE.MathUtils.clamp((-120 - z) / 140, 0, 1);
      h += northFactor * 35;
      h += Math.sin(x * 0.06) * 8 * northFactor;
    }

    // Colossus Arena Plateau
    const distToColossus = Math.hypot(x - 0, z - (-280));
    if (distToColossus < 45) {
      h = 28 + Math.cos(distToColossus * 0.08) * 0.8;
    } else if (distToColossus < 70) {
      const blend = (distToColossus - 45) / 25;
      h = THREE.MathUtils.lerp(28, h, blend);
    }

    // Lake Basin Depression
    const distToLake = Math.hypot(x - 140, z - 70);
    if (distToLake < 90) {
      const lakeDepth = Math.cos((distToLake / 90) * (Math.PI / 2)) * 8.5;
      h -= lakeDepth;
    }

    // Oakhaven Gentle Valley
    const distToVillage = Math.hypot(x - (-80), z - 40);
    if (distToVillage < 70) {
      h = THREE.MathUtils.lerp(5.0, h, distToVillage / 70);
    }

    return h;
  };

  // Build Terrain Geometry
  const terrainGeom = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, SEGMENTS, SEGMENTS);
  terrainGeom.rotateX(-Math.PI / 2);

  const posAttr = terrainGeom.attributes.position;
  const colors = new Float32Array(posAttr.count * 3);

  // Stylized Color Palette
  const grassColor = new THREE.Color(0x48bb78); // Lush Anime Green
  const darkGrassColor = new THREE.Color(0x2f855a); // Shadow Green
  const rockColor = new THREE.Color(0x718096); // Slate Rock
  const sandColor = new THREE.Color(0xf6e05e); // Sandy Beach
  const snowColor = new THREE.Color(0xf7fafc); // Mountain peaks

  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const vy = getTerrainHeight(vx, vz);
    posAttr.setY(i, vy);

    // Color by height and slope
    let c = grassColor.clone();
    if (vy < 2.2) {
      c.lerp(sandColor, 0.7);
    } else if (vy > 30) {
      c.lerp(snowColor, Math.min(1, (vy - 30) / 15));
    } else if (vy > 18) {
      c.lerp(rockColor, 0.55);
    } else {
      c.lerp(darkGrassColor, (Math.sin(vx * 0.1) + Math.cos(vz * 0.1) + 2) * 0.2);
    }

    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  terrainGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeom.computeVertexNormals();

  const terrainMat = new THREE.MeshToonMaterial({
    vertexColors: true,
  });
  const terrainMesh = new THREE.Mesh(terrainGeom, terrainMat);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  // --- Water Surface ---
  const waterGeom = new THREE.CircleGeometry(110, 48);
  waterGeom.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x00b4d8,
    transparent: true,
    opacity: 0.75,
    roughness: 0.1,
    metalness: 0.3,
  });
  const waterMesh = new THREE.Mesh(waterGeom, waterMat);
  waterMesh.position.set(140, 1.2, 70);
  scene.add(waterMesh);

  // --- Foliage & Trees Generation ---
  const treeTrunkMat = new THREE.MeshToonMaterial({ color: 0x5d4037 });
  const foliageMat1 = new THREE.MeshToonMaterial({ color: 0x2e7d32 });
  const foliageMat2 = new THREE.MeshToonMaterial({ color: 0x388e3c });
  const rockMat = new THREE.MeshToonMaterial({ color: 0x78909c });

  const trunkGeom = new THREE.CylinderGeometry(0.35, 0.5, 4.5, 6);
  const canopyGeom1 = new THREE.DodecahedronGeometry(2.4, 1);
  const canopyGeom2 = new THREE.DodecahedronGeometry(1.8, 1);

  // Plant 140 stylized trees
  for (let i = 0; i < 140; i++) {
    const rx = (Math.random() - 0.5) * 650;
    const rz = (Math.random() - 0.5) * 650;
    const ry = getTerrainHeight(rx, rz);

    // Skip in water or on high cliffs or in village square
    if (ry < 1.5 || ry > 26) continue;
    if (Math.hypot(rx - (-80), rz - 40) < 40) continue; // village clearing
    if (Math.hypot(rx - 0, rz - (-280)) < 55) continue; // boss arena

    const treeGroup = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeom, treeTrunkMat);
    trunk.position.y = 2.25;
    trunk.castShadow = true;

    const foliage1 = new THREE.Mesh(canopyGeom1, i % 2 === 0 ? foliageMat1 : foliageMat2);
    foliage1.position.y = 4.8;
    foliage1.castShadow = true;

    const foliage2 = new THREE.Mesh(canopyGeom2, foliageMat1);
    foliage2.position.set(0.6, 5.8, -0.4);
    foliage2.castShadow = true;

    treeGroup.add(trunk, foliage1, foliage2);
    treeGroup.position.set(rx, ry, rz);
    const s = 0.8 + Math.random() * 0.6;
    treeGroup.scale.set(s, s, s);
    scene.add(treeGroup);
  }

  // Scatter 60 Rocks & Boulders
  const rockGeom = new THREE.DodecahedronGeometry(1.5, 0);
  for (let i = 0; i < 60; i++) {
    const rx = (Math.random() - 0.5) * 650;
    const rz = (Math.random() - 0.5) * 650;
    const ry = getTerrainHeight(rx, rz);
    if (ry < 1.0) continue;

    const rock = new THREE.Mesh(rockGeom, rockMat);
    rock.position.set(rx, ry + 0.6, rz);
    rock.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    const s = 0.7 + Math.random() * 1.5;
    rock.scale.set(s, s * 0.7, s);
    rock.castShadow = true;
    scene.add(rock);
  }

  // --- Oakhaven Village Buildings ---
  const woodMat = new THREE.MeshToonMaterial({ color: 0x795548 });
  const roofMat = new THREE.MeshToonMaterial({ color: 0x8d6e63 });
  const stoneBaseMat = new THREE.MeshToonMaterial({ color: 0x9e9e9e });

  const createCottage = (cx: number, cz: number, angle: number) => {
    const cy = getTerrainHeight(cx, cz);
    const house = new THREE.Group();

    // Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(6, 3.5, 5), stoneBaseMat);
    base.position.y = 1.75;
    base.castShadow = true;

    // Roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.8, 2.5, 4), roofMat);
    roof.position.y = 4.6;
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.1, 1, 0.9);
    roof.castShadow = true;

    // Door
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.2), woodMat);
    door.position.set(0, 1.1, 2.55);

    // Chimney
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.5, 0.8), stoneBaseMat);
    chimney.position.set(1.8, 4.0, 0);

    house.add(base, roof, door, chimney);
    house.position.set(cx, cy, cz);
    house.rotation.y = angle;
    scene.add(house);
  };

  createCottage(-70, 30, 0.3);
  createCottage(-90, 50, -0.6);
  createCottage(-85, 20, 1.2);
  createCottage(-60, 55, 2.4);

  // Village Center Fountain
  const vfy = getTerrainHeight(-80, 40);
  const fountainBase = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.8, 1.0, 16), stoneBaseMat);
  fountainBase.position.set(-80, vfy + 0.5, 40);
  const fountainWater = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.4, 16), waterMat);
  fountainWater.position.set(-80, vfy + 0.9, 40);
  const fountainPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 3.0, 8), stoneBaseMat);
  fountainPillar.position.set(-80, vfy + 2.0, 40);
  scene.add(fountainBase, fountainWater, fountainPillar);

  // --- Teleport Waypoints (4 Strategic Locations) ---
  const waypoints: TeleportWaypoint[] = [
    { id: 'wp-oakhaven', name: 'Oakhaven Crossroads', region: 'Verdantia', position: [-70, getTerrainHeight(-70, 45) + 0.2, 45], isUnlocked: true },
    { id: 'wp-lake', name: 'Whispering Lake Sanctuary', region: 'Verdantia', position: [90, getTerrainHeight(90, 40) + 0.2, 40], isUnlocked: false },
    { id: 'wp-ruins', name: 'Ancient Temple Ruins', region: 'Verdantia', position: [30, getTerrainHeight(30, -120) + 0.2, -120], isUnlocked: false },
    { id: 'wp-colossus', name: 'Colossus High Plateau', region: 'Verdantia', position: [-35, 28.2, -280], isUnlocked: false },
  ];

  const waypointMeshes: { id: string; group: THREE.Group; crystal: THREE.Mesh }[] = [];
  const wpPillarMat = new THREE.MeshToonMaterial({ color: 0x37474f });
  const crystalActiveMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
  const crystalInactiveMat = new THREE.MeshBasicMaterial({ color: 0xb0bec5 });

  waypoints.forEach((wp) => {
    const wpGroup = new THREE.Group();

    // Ornate Pedestal
    const basePillar = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 2.8, 8), wpPillarMat);
    basePillar.position.y = 1.4;
    basePillar.castShadow = true;

    // Floating Crystal
    const crystalGeom = new THREE.OctahedronGeometry(0.7, 0);
    const crystal = new THREE.Mesh(crystalGeom, wp.isUnlocked ? crystalActiveMat : crystalInactiveMat);
    crystal.position.y = 3.6;

    // Glowing halo ring
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.1, 16), new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide, transparent: true, opacity: 0.6 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 3.6;

    wpGroup.add(basePillar, crystal, ring);
    wpGroup.position.set(wp.position[0], wp.position[1], wp.position[2]);
    scene.add(wpGroup);

    waypointMeshes.push({ id: wp.id, group: wpGroup, crystal });
  });

  // --- Treasure Chests ---
  const chests: ChestData[] = [];
  const chestWoodMat = new THREE.MeshToonMaterial({ color: 0x5d4037 });
  const chestGoldMat = new THREE.MeshToonMaterial({ color: 0xffb300 });

  const createChest = (id: string, x: number, z: number, rarity: 'COMMON' | 'EXQUISITE' | 'PRECIOUS') => {
    const y = getTerrainHeight(x, z);
    const chestGroup = new THREE.Group();

    // Box body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.9), rarity === 'COMMON' ? chestWoodMat : chestGoldMat);
    body.position.y = 0.35;
    body.castShadow = true;

    // Hinged Lid
    const lidGeom = new THREE.CylinderGeometry(0.48, 0.48, 1.22, 12, 1, false, 0, Math.PI);
    lidGeom.rotateZ(Math.PI / 2);
    const lid = new THREE.Mesh(lidGeom, rarity === 'COMMON' ? chestWoodMat : chestGoldMat);
    lid.position.set(0, 0.7, -0.45);
    lid.castShadow = true;

    chestGroup.add(body, lid);
    chestGroup.position.set(x, y, z);
    scene.add(chestGroup);

    chests.push({
      id,
      position: new THREE.Vector3(x, y, z),
      rarity,
      isOpened: false,
      mesh: chestGroup,
      lidMesh: lid,
    });
  };

  createChest('chest-village', -60, 45, 'COMMON');
  createChest('chest-lake', 150, 20, 'EXQUISITE');
  createChest('chest-ruins-puzzle', 45, -135, 'EXQUISITE');
  createChest('chest-mountain', 10, -220, 'PRECIOUS');

  // --- Collectible Resources ---
  const resources: ResourceNode[] = [];
  const herbMat = new THREE.MeshToonMaterial({ color: 0x00e676 });
  const fruitMat = new THREE.MeshToonMaterial({ color: 0xff3d00 });
  const oreMat = new THREE.MeshToonMaterial({ color: 0x7c4dff });

  const addResource = (id: string, name: string, x: number, z: number, type: 'HERB' | 'ORE' | 'FRUIT') => {
    const y = getTerrainHeight(x, z);
    const resGroup = new THREE.Group();

    if (type === 'HERB') {
      const plant = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 5), herbMat);
      plant.position.y = 0.4;
      resGroup.add(plant);
    } else if (type === 'FRUIT') {
      const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), fruitMat);
      fruit.position.y = 0.35;
      resGroup.add(fruit);
    } else {
      const ore = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4, 0), oreMat);
      ore.position.y = 0.4;
      resGroup.add(ore);
    }

    resGroup.position.set(x, y, z);
    scene.add(resGroup);
    resources.push({ id, name, position: new THREE.Vector3(x, y, z), type, isCollected: false, mesh: resGroup });
  };

  addResource('res-mint-1', 'Verdant Mint', -55, 35, 'HERB');
  addResource('res-mint-2', 'Verdant Mint', 20, 80, 'HERB');
  addResource('res-fruit-1', 'Sunsettia Fruit', -75, 60, 'FRUIT');
  addResource('res-fruit-2', 'Sunsettia Fruit', 80, 50, 'FRUIT');
  addResource('res-ore-1', 'Luminescent Crystal', 25, -90, 'ORE');
  addResource('res-ore-2', 'Luminescent Crystal', -20, -200, 'ORE');

  // --- Torch Puzzle in Ancient Ruins ---
  const torchPillarMat = new THREE.MeshToonMaterial({ color: 0x455a64 });
  const torchFlameMat = new THREE.MeshBasicMaterial({ color: 0xff3d00 });

  const torchPositions: [number, number][] = [
    [40, -130],
    [50, -135],
    [42, -142],
  ];

  const torches = torchPositions.map(([tx, tz], idx) => {
    const ty = getTerrainHeight(tx, tz);
    const g = new THREE.Group();
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 1.8, 6), torchPillarMat);
    pillar.position.y = 0.9;
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), torchFlameMat);
    flame.position.y = 1.9;
    flame.visible = false; // unlit initially!
    g.add(pillar, flame);
    g.position.set(tx, ty, tz);
    scene.add(g);
    return {
      id: `torch-${idx + 1}`,
      position: new THREE.Vector3(tx, ty, tz),
      isLit: false,
      mesh: g,
    };
  });

  const torchPuzzle: TorchPuzzle = {
    id: 'ruins-torch-puzzle',
    torches,
    isSolved: false,
    rewardChestId: 'chest-ruins-puzzle',
  };

  // --- Dungeon Portal: The Forgotten Temple Entrance ---
  const dungeonPortalMesh = new THREE.Group();
  const portalArchMat = new THREE.MeshToonMaterial({ color: 0x263238 });
  const portalVortexMat = new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
  });

  const portalArch = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.7, 8, 24, Math.PI), portalArchMat);
  portalArch.position.y = 3.5;
  const portalVortex = new THREE.Mesh(new THREE.CircleGeometry(2.8, 24), portalVortexMat);
  portalVortex.position.y = 2.8;

  dungeonPortalMesh.add(portalArch, portalVortex);
  const dpx = 50, dpz = -70;
  dungeonPortalMesh.position.set(dpx, getTerrainHeight(dpx, dpz), dpz);
  dungeonPortalMesh.rotation.y = -Math.PI / 4;
  scene.add(dungeonPortalMesh);

  // --- Boss Arena Dais ---
  const bossArenaCenter = new THREE.Vector3(0, 28, -280);
  const arenaDais = new THREE.Mesh(new THREE.CylinderGeometry(32, 34, 1.5, 24), new THREE.MeshToonMaterial({ color: 0x37474f }));
  arenaDais.position.copy(bossArenaCenter).sub(new THREE.Vector3(0, 0.75, 0));
  scene.add(arenaDais);

  // Totem pillars around boss arena
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const px = Math.cos(angle) * 30;
    const pz = -280 + Math.sin(angle) * 30;
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(2.0, 7.0, 2.0), new THREE.MeshToonMaterial({ color: 0x263238 }));
    pillar.position.set(px, 28 + 3.5, pz);
    pillar.castShadow = true;
    scene.add(pillar);
  }

  return {
    terrainMesh,
    waterMesh,
    waypoints,
    waypointMeshes,
    chests,
    resources,
    torchPuzzle,
    dungeonPortalMesh,
    bossArenaCenter,
    getTerrainHeight,
  };
}
