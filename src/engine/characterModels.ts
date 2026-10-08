import * as THREE from 'three';
import { CharacterId, ElementType } from '../types/game';

export interface CharacterMeshGroup extends THREE.Group {
  characterId: CharacterId;
  weaponMesh: THREE.Group;
  gliderMesh: THREE.Group;
  parts: {
    head: THREE.Mesh;
    hair: THREE.Group;
    torso: THREE.Mesh;
    cape?: THREE.Mesh;
    leftArm: THREE.Group;
    rightArm: THREE.Group;
    leftLeg: THREE.Group;
    rightLeg: THREE.Group;
  };
  updatePose: (state: string, progress: number, isMoving: boolean) => void;
}

export function createCharacterModel(characterId: CharacterId): CharacterMeshGroup {
  const group = new THREE.Group() as CharacterMeshGroup;
  group.characterId = characterId;

  // Cel-shading / Anime Stylized Materials
  const skinMat = new THREE.MeshToonMaterial({
    color: 0xffdfc4,
  });

  let primaryColor = 0xc0392b; // Kael Ember Red
  let secondaryColor = 0x2c3e50; // Dark coat
  let hairColor = 0x8b0000; // Deep crimson hair
  let accentColor = 0xf39c12; // Gold/Ember

  if (characterId === 'lyra') {
    primaryColor = 0x16a085; // Lyra Aqua Teal
    secondaryColor = 0xecf0f1; // Pure White / Silver
    hairColor = 0x1abc9c; // Bright Cyan/Aqua hair
    accentColor = 0x3498db; // Sky Blue
  } else if (characterId === 'orion') {
    primaryColor = 0x4a235a; // Orion Volt Deep Violet
    secondaryColor = 0x17202a; // Obsidian Armor
    hairColor = 0xf1c40f; // Electric Gold/Spiky Blonde
    accentColor = 0x9b59b6; // Neon Amethyst
  }

  const primaryMat = new THREE.MeshToonMaterial({ color: primaryColor });
  const secondaryMat = new THREE.MeshToonMaterial({ color: secondaryColor });
  const hairMat = new THREE.MeshToonMaterial({ color: hairColor });
  const accentMat = new THREE.MeshToonMaterial({ color: accentColor });
  const metallicMat = new THREE.MeshStandardMaterial({
    color: 0xd5d8dc,
    metalness: 0.85,
    roughness: 0.25,
  });

  // --- Torso ---
  const torsoGeom = new THREE.CylinderGeometry(0.24, 0.18, 0.7, 8);
  const torso = new THREE.Mesh(torsoGeom, primaryMat);
  torso.position.y = 1.05;
  torso.castShadow = true;
  group.add(torso);

  // Belt / Accent waist
  const beltGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 8);
  const belt = new THREE.Mesh(beltGeom, accentMat);
  belt.position.y = 0.75;
  group.add(belt);

  // Cape or Ribbons
  let cape: THREE.Mesh | undefined;
  if (characterId === 'kael' || characterId === 'orion') {
    const capeGeom = new THREE.PlaneGeometry(0.48, 0.85, 4, 4);
    capeGeom.translate(0, -0.42, 0);
    cape = new THREE.Mesh(capeGeom, secondaryMat);
    cape.position.set(0, 1.35, -0.18);
    cape.rotation.x = 0.15;
    cape.castShadow = true;
    group.add(cape);
  }

  // --- Head ---
  const headGeom = new THREE.SphereGeometry(0.19, 12, 12);
  const head = new THREE.Mesh(headGeom, skinMat);
  head.position.y = 1.55;
  head.castShadow = true;
  group.add(head);

  // Eyes (stylized anime eyes)
  const eyeGeom = new THREE.PlaneGeometry(0.04, 0.06);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a252f });
  const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
  leftEye.position.set(0.065, 1.55, 0.18);
  const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
  rightEye.position.set(-0.065, 1.55, 0.18);
  group.add(leftEye, rightEye);

  // Anime Hair
  const hairGroup = new THREE.Group();
  hairGroup.position.y = 1.55;

  const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), hairMat);
  hairTop.position.set(0, 0.05, -0.04);
  hairGroup.add(hairTop);

  // Spikes / Ponytail / Bangs
  for (let i = -2; i <= 2; i++) {
    const bangGeom = new THREE.ConeGeometry(0.05, 0.18, 5);
    const bang = new THREE.Mesh(bangGeom, hairMat);
    bang.rotation.x = 2.4;
    bang.rotation.z = i * 0.25;
    bang.position.set(i * 0.05, 0.08, 0.16);
    hairGroup.add(bang);
  }

  if (characterId === 'lyra') {
    // Twin tails
    const p1 = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.45, 6), hairMat);
    p1.position.set(0.18, -0.15, -0.1);
    p1.rotation.z = -0.3;
    const p2 = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.45, 6), hairMat);
    p2.position.set(-0.18, -0.15, -0.1);
    p2.rotation.z = 0.3;
    hairGroup.add(p1, p2);
  } else if (characterId === 'kael') {
    // Flowing wild warrior locks
    const backHair = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 6), hairMat);
    backHair.position.set(0, -0.15, -0.18);
    backHair.rotation.x = -0.4;
    hairGroup.add(backHair);
  }
  group.add(hairGroup);

  // --- Limbs Setup with Joint Pivot Groups ---
  // Left Arm
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(0.3, 1.35, 0);
  const leftUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.35, 6), secondaryMat);
  leftUpperArm.position.y = -0.175;
  leftUpperArm.castShadow = true;
  leftArmGroup.add(leftUpperArm);
  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), skinMat);
  leftHand.position.y = -0.36;
  leftArmGroup.add(leftHand);
  group.add(leftArmGroup);

  // Right Arm (Weapon Hand)
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(-0.3, 1.35, 0);
  const rightUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.35, 6), secondaryMat);
  rightUpperArm.position.y = -0.175;
  rightUpperArm.castShadow = true;
  rightArmGroup.add(rightUpperArm);
  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), skinMat);
  rightHand.position.y = -0.36;
  rightArmGroup.add(rightHand);
  group.add(rightArmGroup);

  // Left Leg
  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(0.13, 0.7, 0);
  const leftLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.7, 6), secondaryMat);
  leftLegMesh.position.y = -0.35;
  leftLegMesh.castShadow = true;
  leftLegGroup.add(leftLegMesh);
  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.22), primaryMat);
  leftBoot.position.set(0, -0.68, 0.04);
  leftLegGroup.add(leftBoot);
  group.add(leftLegGroup);

  // Right Leg
  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(-0.13, 0.7, 0);
  const rightLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.7, 6), secondaryMat);
  rightLegMesh.position.y = -0.35;
  rightLegMesh.castShadow = true;
  rightLegGroup.add(rightLegMesh);
  const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.22), primaryMat);
  rightBoot.position.set(0, -0.68, 0.04);
  rightLegGroup.add(rightBoot);
  group.add(rightLegGroup);

  // --- Weapons ---
  const weaponGroup = new THREE.Group();
  if (characterId === 'kael') {
    // Ember Longsword
    const bladeGeom = new THREE.BoxGeometry(0.07, 0.95, 0.02);
    const blade = new THREE.Mesh(bladeGeom, metallicMat);
    blade.position.y = 0.45;

    // Glowing core
    const coreGeom = new THREE.BoxGeometry(0.02, 0.7, 0.03);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xff3d00 });
    const core = new THREE.Mesh(coreGeom, coreMat);
    core.position.y = 0.45;

    // Guard & Hilt
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.06), accentMat);
    guard.position.y = 0.02;
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.25, 6), secondaryMat);
    hilt.position.y = -0.12;

    weaponGroup.add(blade, core, guard, hilt);
    weaponGroup.position.set(0, -0.36, 0.1);
    weaponGroup.rotation.x = Math.PI / 2;
    rightHand.add(weaponGroup);
  } else if (characterId === 'lyra') {
    // Twin Aqua Daggers
    const makeDagger = () => {
      const g = new THREE.Group();
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.5, 4), metallicMat);
      blade.position.y = 0.25;
      blade.scale.set(0.6, 1, 0.15);
      const edge = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.45, 4), new THREE.MeshBasicMaterial({ color: 0x00e5ff }));
      edge.position.y = 0.25;
      edge.scale.set(0.7, 1, 0.18);
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 6), accentMat);
      hilt.position.y = -0.05;
      g.add(blade, edge, hilt);
      return g;
    };

    const d1 = makeDagger();
    d1.position.set(0, -0.36, 0.05);
    d1.rotation.x = Math.PI / 2;
    rightHand.add(d1);

    const d2 = makeDagger();
    d2.position.set(0, -0.36, 0.05);
    d2.rotation.x = Math.PI / 2;
    leftHand.add(d2);

    weaponGroup.add(d1);
  } else if (characterId === 'orion') {
    // Volt Greatsword (Massive)
    const bladeGeom = new THREE.BoxGeometry(0.18, 1.35, 0.04);
    const blade = new THREE.Mesh(bladeGeom, metallicMat);
    blade.position.y = 0.65;

    // Electric Runes
    const rune = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.0, 0.05), new THREE.MeshBasicMaterial({ color: 0xffea00 }));
    rune.position.y = 0.65;

    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.06, 0.08), accentMat);
    guard.position.y = 0.03;
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.35, 6), secondaryMat);
    hilt.position.y = -0.15;

    weaponGroup.add(blade, rune, guard, hilt);
    weaponGroup.position.set(0, -0.36, 0.15);
    weaponGroup.rotation.x = Math.PI / 2;
    rightHand.add(weaponGroup);
  }

  // --- Aeravian Wind Glider ---
  const gliderGroup = new THREE.Group();
  const gliderWingMat = new THREE.MeshToonMaterial({
    color: 0x34495e,
    side: THREE.DoubleSide,
  });
  const wingAccentMat = new THREE.MeshBasicMaterial({
    color: primaryColor,
    side: THREE.DoubleSide,
  });

  const leftWingGeom = new THREE.BufferGeometry();
  const leftWingVertices = new Float32Array([
    0, 0, 0,
    1.4, 0.3, -0.4,
    1.1, -0.5, -0.2,
    0, 0, 0,
    1.1, -0.5, -0.2,
    0.5, -0.6, -0.1,
  ]);
  leftWingGeom.setAttribute('position', new THREE.BufferAttribute(leftWingVertices, 3));
  leftWingGeom.computeVertexNormals();

  const leftWing = new THREE.Mesh(leftWingGeom, gliderWingMat);
  const rightWingGeom = leftWingGeom.clone();
  rightWingGeom.scale(-1, 1, 1);
  const rightWing = new THREE.Mesh(rightWingGeom, gliderWingMat);

  gliderGroup.add(leftWing, rightWing);
  gliderGroup.position.set(0, 1.45, -0.25);
  gliderGroup.visible = false;
  group.add(gliderGroup);

  group.weaponMesh = weaponGroup;
  group.gliderMesh = gliderGroup;
  group.parts = {
    head,
    hair: hairGroup,
    torso,
    cape,
    leftArm: leftArmGroup,
    rightArm: rightArmGroup,
    leftLeg: leftLegGroup,
    rightLeg: rightLegGroup,
  };

  // --- Animation Blend State Machine ---
  group.updatePose = (state: string, progress: number, isMoving: boolean) => {
    const t = performance.now() * 0.005;

    if (state === 'GLIDE') {
      gliderGroup.visible = true;
      leftArmGroup.rotation.set(-1.4, 0, 1.2);
      rightArmGroup.rotation.set(-1.4, 0, -1.2);
      leftLegGroup.rotation.set(0.3, 0, 0.15);
      rightLegGroup.rotation.set(0.3, 0, -0.15);
      torso.rotation.x = 0.5;
      if (cape) cape.rotation.x = 0.8 + Math.sin(t * 4) * 0.1;
      return;
    } else {
      gliderGroup.visible = false;
    }

    if (state === 'CLIMB') {
      torso.rotation.x = -0.1;
      leftArmGroup.rotation.set(-2.2 + Math.sin(t * 3) * 0.5, 0, 0.3);
      rightArmGroup.rotation.set(-2.2 - Math.sin(t * 3) * 0.5, 0, -0.3);
      leftLegGroup.rotation.set(0.5 + Math.cos(t * 3) * 0.4, 0, 0);
      rightLegGroup.rotation.set(0.5 - Math.cos(t * 3) * 0.4, 0, 0);
      return;
    }

    if (state === 'SWIM') {
      torso.rotation.x = 1.3;
      leftArmGroup.rotation.set(-1.2 + Math.sin(t * 4) * 0.6, 0, 0.4);
      rightArmGroup.rotation.set(-1.2 - Math.sin(t * 4) * 0.6, 0, -0.4);
      leftLegGroup.rotation.set(0.2 + Math.cos(t * 4) * 0.4, 0, 0);
      rightLegGroup.rotation.set(0.2 - Math.cos(t * 4) * 0.4, 0, 0);
      return;
    }

    if (state === 'JUMP' || state === 'FALL') {
      leftArmGroup.rotation.set(-1.8, 0, 0.4);
      rightArmGroup.rotation.set(-1.8, 0, -0.4);
      leftLegGroup.rotation.set(0.5, 0, 0.2);
      rightLegGroup.rotation.set(-0.3, 0, -0.2);
      if (cape) cape.rotation.x = 0.6;
      return;
    }

    if (state === 'ATTACK' || state === 'CHARGED' || state === 'SKILL' || state === 'BURST') {
      // Dynamic combat slash motion
      const swing = Math.sin(progress * Math.PI);
      rightArmGroup.rotation.set(-1.5 - swing * 1.8, 0, -swing * 1.2);
      leftArmGroup.rotation.set(swing * 0.8, 0, 0.4);
      torso.rotation.y = -swing * 1.4;
      if (cape) cape.rotation.x = 0.4 + swing * 0.5;
      return;
    }

    if (state === 'DODGE') {
      torso.rotation.x = 0.4;
      torso.position.y = 0.85;
      rightArmGroup.rotation.set(0.8, 0, -0.4);
      leftArmGroup.rotation.set(0.8, 0, 0.4);
      leftLegGroup.rotation.set(0.6, 0, 0);
      rightLegGroup.rotation.set(-0.6, 0, 0);
      return;
    }

    torso.position.y = 1.05;
    torso.rotation.set(0, 0, 0);

    if (isMoving) {
      // Walk / Run / Sprint locomotion cycle
      const speedMult = state === 'SPRINT' ? 14 : state === 'RUN' ? 10 : 6;
      const legAngle = Math.sin(t * speedMult) * (state === 'SPRINT' ? 1.0 : 0.65);
      const armAngle = -legAngle * 0.85;

      leftLegGroup.rotation.set(legAngle, 0, 0);
      rightLegGroup.rotation.set(-legAngle, 0, 0);

      leftArmGroup.rotation.set(armAngle, 0, 0.1);
      rightArmGroup.rotation.set(-armAngle, 0, -0.1);

      torso.rotation.y = Math.sin(t * speedMult) * 0.12;
      torso.rotation.x = state === 'SPRINT' ? 0.25 : 0.08;

      if (cape) {
        cape.rotation.x = (state === 'SPRINT' ? 0.6 : 0.25) + Math.sin(t * speedMult) * 0.1;
      }
    } else {
      // Idle breathing
      const breath = Math.sin(t * 2) * 0.03;
      leftArmGroup.rotation.set(breath, 0, 0.08);
      rightArmGroup.rotation.set(breath, 0, -0.08);
      leftLegGroup.rotation.set(0, 0, 0);
      rightLegGroup.rotation.set(0, 0, 0);
      head.position.y = 1.55 + breath * 0.5;
      if (cape) cape.rotation.x = 0.15 + breath;
    }
  };

  return group;
}
