import * as THREE from 'three';

export interface DungeonMechanism {
  id: string;
  type: 'EMBER' | 'AQUA' | 'VOLT';
  isActivated: boolean;
  position: THREE.Vector3;
  mesh: THREE.Group;
  indicatorMesh: THREE.Mesh;
}

export interface DungeonData {
  dungeonGroup: THREE.Group;
  mechanisms: DungeonMechanism[];
  gateMesh: THREE.Mesh;
  exitPortalMesh: THREE.Group;
  relicChestMesh: THREE.Group;
  isGateOpened: boolean;
  isCleared: boolean;
}

export function buildForgottenTemple(scene: THREE.Scene): DungeonData {
  const dungeonGroup = new THREE.Group();
  dungeonGroup.position.set(0, -200, 0); // Positioned in subterranean coordinate space

  const wallMat = new THREE.MeshToonMaterial({ color: 0x212121 });
  const floorMat = new THREE.MeshToonMaterial({ color: 0x37474f });
  const pillarMat = new THREE.MeshToonMaterial({ color: 0x263238 });
  const goldAccentMat = new THREE.MeshStandardMaterial({ color: 0xffb300, metalness: 0.8, roughness: 0.3 });

  // --- Grand Chamber Floor ---
  const floorGeom = new THREE.BoxGeometry(60, 2, 80);
  const floor = new THREE.Mesh(floorGeom, floorMat);
  floor.position.y = -1;
  floor.receiveShadow = true;
  dungeonGroup.add(floor);

  // --- High Ceiling ---
  const ceiling = new THREE.Mesh(floorGeom, wallMat);
  ceiling.position.y = 20;
  dungeonGroup.add(ceiling);

  // --- Chamber Walls ---
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(60, 20, 2), wallMat);
  backWall.position.set(0, 10, -40);
  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(60, 20, 2), wallMat);
  frontWall.position.set(0, 10, 40);
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(2, 20, 80), wallMat);
  leftWall.position.set(-30, 10, 0);
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(2, 20, 80), wallMat);
  rightWall.position.set(30, 10, 0);
  dungeonGroup.add(backWall, frontWall, leftWall, rightWall);

  // --- Grand Temple Pillars ---
  for (let z = -25; z <= 25; z += 16) {
    for (const x of [-16, 16]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 20, 8), pillarMat);
      pillar.position.set(x, 10, z);
      pillar.castShadow = true;

      // Golden ring
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.2, 6, 16), goldAccentMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, 6, z);

      dungeonGroup.add(pillar, ring);
    }
  }

  // --- Ancient Inner Gate (Blocks the Sanctum) ---
  const gateGeom = new THREE.BoxGeometry(18, 14, 1.5);
  const gateMat = new THREE.MeshToonMaterial({ color: 0x455a64 });
  const gateMesh = new THREE.Mesh(gateGeom, gateMat);
  gateMesh.position.set(0, 7, -20);
  dungeonGroup.add(gateMesh);

  // --- 3 Elemental Mechanisms ---
  // 1. Ember Brazier (left)
  // 2. Aqua Basin (center)
  // 3. Volt Conduit (right)
  const mechanisms: DungeonMechanism[] = [];

  const makeMechanism = (id: string, type: 'EMBER' | 'AQUA' | 'VOLT', pos: THREE.Vector3) => {
    const g = new THREE.Group();
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 2.0, 8), pillarMat);
    pedestal.position.y = 1.0;

    let col = 0xff5722;
    if (type === 'AQUA') col = 0x00bcd4;
    if (type === 'VOLT') col = 0x9c27b0;

    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 12), new THREE.MeshBasicMaterial({ color: 0x555555 }));
    orb.position.y = 2.6;

    g.add(pedestal, orb);
    g.position.copy(pos);
    dungeonGroup.add(g);

    mechanisms.push({
      id,
      type,
      isActivated: false,
      position: pos.clone().add(dungeonGroup.position),
      mesh: g,
      indicatorMesh: orb,
    });
  };

  makeMechanism('mech-ember', 'EMBER', new THREE.Vector3(-10, 0, 5));
  makeMechanism('mech-aqua', 'AQUA', new THREE.Vector3(0, 0, 5));
  makeMechanism('mech-volt', 'VOLT', new THREE.Vector3(10, 0, 5));

  // --- Exit Portal back to Verdantia ---
  const exitPortalMesh = new THREE.Group();
  const exitRing = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.4, 8, 20), goldAccentMat);
  exitRing.position.y = 2.5;
  const exitGlow = new THREE.Mesh(new THREE.CircleGeometry(2.2, 20), new THREE.MeshBasicMaterial({ color: 0x00e676, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  exitGlow.position.y = 2.5;
  exitPortalMesh.add(exitRing, exitGlow);
  exitPortalMesh.position.set(0, 0, 32);
  dungeonGroup.add(exitPortalMesh);

  // --- Sanctum Relic Chest (Behind gate) ---
  const relicChestMesh = new THREE.Group();
  const rChestBody = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 1.4), goldAccentMat);
  rChestBody.position.y = 0.6;
  const rChestLid = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 1.4), goldAccentMat);
  rChestLid.position.y = 1.4;
  relicChestMesh.add(rChestBody, rChestLid);
  relicChestMesh.position.set(0, 0, -32);
  dungeonGroup.add(relicChestMesh);

  // Ambient Dungeon Lighting inside group
  const dungeonLight = new THREE.PointLight(0xffeedd, 1.5, 50);
  dungeonLight.position.set(0, 15, 0);
  dungeonGroup.add(dungeonLight);

  scene.add(dungeonGroup);

  return {
    dungeonGroup,
    mechanisms,
    gateMesh,
    exitPortalMesh,
    relicChestMesh,
    isGateOpened: false,
    isCleared: false,
  };
}
