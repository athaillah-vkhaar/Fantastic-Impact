import * as THREE from 'three';
import { ElementType, EnemyStats, EnemyType, ElementalReactionType } from '../types/game';
import { VFXManager } from './vfxManager';
import { soundManager } from '../audio/soundManager';

export interface EnemyEntity {
  stats: EnemyStats;
  mesh: THREE.Group;
  velocity: THREE.Vector3;
  targetPosition: THREE.Vector3;
  attackCooldown: number;
  isAttacking: boolean;
  attackTimer: number;
  isDead: boolean;
  deathTimer: number;
  updateAI: (dt: number, playerPos: THREE.Vector3, vfx: VFXManager, getTerrainHeight: (x: number, z: number) => number) => void;
  takeDamage: (amount: number, element: ElementType, isCrit: boolean, vfx: VFXManager) => { actualDmg: number; reaction: ElementalReactionType };
}

export class EnemyManager {
  private scene: THREE.Scene;
  public enemies: EnemyEntity[] = [];
  public activeBoss: EnemyEntity | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public spawnEnemy(
    type: EnemyType,
    position: THREE.Vector3,
    level: number = 5
  ): EnemyEntity {
    const mesh = new THREE.Group();
    let maxHp = 500;
    let atk = 45;
    let def = 20;
    let name = 'Verdant Slime';
    let baseElement: ElementType = 'GALE';
    let isBoss = false;
    let isMiniBoss = false;

    // Build specific 3D model according to enemy type
    if (type === 'SLIME') {
      name = 'Verdant Slime';
      maxHp = 420;
      atk = 35;
      baseElement = 'AQUA';
      const bodyMat = new THREE.MeshToonMaterial({ color: 0x26a69a, transparent: true, opacity: 0.85 });
      const slimeBody = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 10), bodyMat);
      slimeBody.position.y = 0.8;
      slimeBody.scale.set(1.1, 0.9, 1.1);
      // Cute eyes
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x004d40 });
      const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), eyeMat);
      e1.position.set(0.3, 0.85, 0.7);
      const e2 = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), eyeMat);
      e2.position.set(-0.3, 0.85, 0.7);
      mesh.add(slimeBody, e1, e2);
    } else if (type === 'HOUND') {
      name = 'Thorn Hound';
      maxHp = 680;
      atk = 55;
      baseElement = 'PHYSICAL';
      const houndMat = new THREE.MeshToonMaterial({ color: 0x4e342e });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 1.8), houndMat);
      body.position.y = 0.8;
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.9, 6), houndMat);
      head.position.set(0, 1.1, 1.1);
      head.rotation.x = Math.PI / 2;
      mesh.add(body, head);
    } else if (type === 'BANDIT') {
      name = 'Shadow Bandit';
      maxHp = 750;
      atk = 60;
      baseElement = 'PHYSICAL';
      const banditMat = new THREE.MeshToonMaterial({ color: 0x37474f });
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 1.0, 6), banditMat);
      torso.position.y = 1.1;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), new THREE.MeshToonMaterial({ color: 0xffcc80 }));
      head.position.y = 1.8;
      mesh.add(torso, head);
    } else if (type === 'BRUTE') {
      name = 'Bandit Brute';
      maxHp = 1400;
      atk = 90;
      baseElement = 'PHYSICAL';
      const bruteMat = new THREE.MeshToonMaterial({ color: 0x8d6e63 });
      const torso = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.9), bruteMat);
      torso.position.y = 1.4;
      const club = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 1.8, 6), new THREE.MeshToonMaterial({ color: 0x3e2723 }));
      club.position.set(0.8, 1.2, 0.6);
      club.rotation.x = Math.PI / 4;
      mesh.add(torso, club);
    } else if (type === 'WISP') {
      name = 'Gale Wisp';
      maxHp = 500;
      atk = 48;
      baseElement = 'GALE';
      const wispMat = new THREE.MeshBasicMaterial({ color: 0x00e676, transparent: true, opacity: 0.8 });
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), wispMat);
      core.position.y = 1.5;
      const halo = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.9, 12), new THREE.MeshBasicMaterial({ color: 0xa7ffeb, side: THREE.DoubleSide }));
      halo.position.y = 1.5;
      halo.rotation.x = Math.PI / 2;
      mesh.add(core, halo);
    } else if (type === 'SENTINEL') {
      name = 'Ruin Sentinel';
      maxHp = 2200;
      atk = 110;
      def = 40;
      isMiniBoss = true;
      baseElement = 'TERRA';
      const sentMat = new THREE.MeshToonMaterial({ color: 0x424242 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.0, 1.8, 8), sentMat);
      body.position.y = 1.8;
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff3d00 }));
      eye.position.set(0, 2.0, 1.1);
      mesh.add(body, eye);
    } else if (type === 'MOSS_GOLEM') {
      name = 'Moss Crag Golem';
      maxHp = 3500;
      atk = 135;
      def = 55;
      isMiniBoss = true;
      baseElement = 'TERRA';
      const golemMat = new THREE.MeshToonMaterial({ color: 0x2e7d32 });
      const torso = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.5, 2.0), golemMat);
      torso.position.y = 2.4;
      const armL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.2, 0.8), golemMat);
      armL.position.set(1.8, 2.0, 0);
      const armR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.2, 0.8), golemMat);
      armR.position.set(-1.8, 2.0, 0);
      mesh.add(torso, armL, armR);
    } else if (type === 'COLOSSUS') {
      // THE ANCIENT COLOSSUS - Major World Boss!
      name = 'The Ancient Colossus';
      maxHp = 8500;
      atk = 180;
      def = 70;
      isBoss = true;
      baseElement = 'TERRA';

      const colMat = new THREE.MeshToonMaterial({ color: 0x263238 });
      const runeMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });

      // Huge Colossus Torso
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 3.2, 7.0, 8), colMat);
      torso.position.y = 7.5;

      // Colossus Core / Heart
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.4, 0), runeMat);
      core.position.set(0, 7.5, 3.6);

      // Shoulders & Stone Fists
      const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), colMat);
      shoulderL.position.set(4.8, 9.5, 0);
      const fistL = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 2.8), colMat);
      fistL.position.set(4.8, 4.0, 1.5);

      const shoulderR = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), colMat);
      shoulderR.position.set(-4.8, 9.5, 0);
      const fistR = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 2.8), colMat);
      fistR.position.set(-4.8, 4.0, 1.5);

      // Crown / Head
      const head = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), colMat);
      head.position.set(0, 12.2, 0);

      mesh.add(torso, core, shoulderL, fistL, shoulderR, fistR, head);
    }

    mesh.position.copy(position);
    this.scene.add(mesh);

    const stats: EnemyStats = {
      id: `enemy-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name,
      type,
      level,
      maxHp,
      currentHp: maxHp,
      atk,
      def,
      element: baseElement,
      afflictedElement: null,
      afflictedTimer: 0,
      isBoss,
      isMiniBoss,
      phase: isBoss ? 1 : undefined,
      staggerMeter: 0,
      maxStagger: isBoss ? 300 : 100,
      shield: isBoss ? 2000 : undefined,
      maxShield: isBoss ? 2000 : undefined,
    };

    const entity: EnemyEntity = {
      stats,
      mesh,
      velocity: new THREE.Vector3(),
      targetPosition: position.clone(),
      attackCooldown: 2.5 + Math.random() * 2,
      isAttacking: false,
      attackTimer: 0,
      isDead: false,
      deathTimer: 0,

      updateAI: (dt: number, playerPos: THREE.Vector3, vfx: VFXManager, getTerrainHeight: (x: number, z: number) => number) => {
        if (entity.isDead) {
          entity.deathTimer += dt;
          mesh.position.y -= 0.5 * dt;
          return;
        }

        // Elemental affliction decay
        if (stats.afflictedTimer > 0) {
          stats.afflictedTimer -= dt;
          if (stats.afflictedTimer <= 0) {
            stats.afflictedElement = null;
          }
        }

        const dist = mesh.position.distanceTo(playerPos);
        const aggroRange = stats.isBoss ? 45 : stats.isMiniBoss ? 28 : 18;

        if (dist < aggroRange) {
          // Face player
          const lookTarget = playerPos.clone();
          lookTarget.y = mesh.position.y;
          mesh.lookAt(lookTarget);

          // Attack timer
          entity.attackCooldown -= dt;
          const attackRange = stats.isBoss ? 12 : stats.type === 'WISP' ? 14 : 3.0;

          if (dist > attackRange) {
            // Chase player
            const dir = playerPos.clone().sub(mesh.position).normalize();
            const moveSpeed = stats.isBoss ? 3.0 : stats.type === 'HOUND' ? 6.5 : 3.5;
            mesh.position.addScaledVector(dir, moveSpeed * dt);
          } else if (entity.attackCooldown <= 0) {
            // Execute telegraphed attack
            entity.attackCooldown = stats.isBoss ? 3.5 : 2.5;
            entity.isAttacking = true;
            entity.attackTimer = 0.8;

            if (stats.isBoss) {
              soundManager.playBossRoar();
              vfx.spawnRing(playerPos, 0xff0000, 16, 1.2); // Telegraphed red slam circle on player
            } else {
              vfx.spawnHitSparks(mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), 4);
            }
          }
        }

        // Clamp to ground unless flying wisp
        const groundY = getTerrainHeight(mesh.position.x, mesh.position.z);
        if (stats.type === 'WISP') {
          mesh.position.y = groundY + 2.5 + Math.sin(performance.now() * 0.003) * 0.4;
        } else {
          mesh.position.y = groundY;
        }
      },

      takeDamage: (amount: number, incomingElement: ElementType, isCrit: boolean, vfx: VFXManager) => {
        let reaction: ElementalReactionType = 'NONE';
        let reactionMultiplier = 1.0;

        // --- 6 ORIGINAL ELEMENTAL REACTIONS SYSTEM ---
        if (stats.afflictedElement) {
          const e1 = stats.afflictedElement;
          const e2 = incomingElement;

          if ((e1 === 'EMBER' && e2 === 'AQUA') || (e1 === 'AQUA' && e2 === 'EMBER')) {
            reaction = 'STEAM BURST';
            reactionMultiplier = 2.0;
            vfx.spawnReactionVFX(mesh.position, 'STEAM BURST');
            soundManager.playReactionSound('STEAM BURST');
            stats.afflictedElement = null; // consumed
          } else if ((e1 === 'EMBER' && e2 === 'VOLT') || (e1 === 'VOLT' && e2 === 'EMBER')) {
            reaction = 'OVERLOAD';
            reactionMultiplier = 1.8;
            vfx.spawnReactionVFX(mesh.position, 'OVERLOAD');
            soundManager.playReactionSound('OVERLOAD');
            stats.afflictedElement = null;
          } else if ((e1 === 'AQUA' && e2 === 'VOLT') || (e1 === 'VOLT' && e2 === 'AQUA')) {
            reaction = 'ELECTROSHOCK';
            reactionMultiplier = 1.6;
            vfx.spawnReactionVFX(mesh.position, 'ELECTROSHOCK');
            soundManager.playReactionSound('ELECTROSHOCK');
            stats.afflictedElement = 'VOLT'; // lingers
          } else if ((e1 === 'AQUA' && e2 === 'FROST') || (e1 === 'FROST' && e2 === 'AQUA')) {
            reaction = 'FREEZE';
            reactionMultiplier = 1.5;
            vfx.spawnReactionVFX(mesh.position, 'FREEZE');
            soundManager.playReactionSound('FREEZE');
          } else if (e2 === 'GALE' && e1 !== 'PHYSICAL') {
            reaction = 'ELEMENTAL VORTEX';
            reactionMultiplier = 1.4;
            vfx.spawnReactionVFX(mesh.position, 'ELEMENTAL VORTEX');
          } else if (e2 === 'TERRA') {
            reaction = 'CRYSTAL GUARD';
            reactionMultiplier = 1.3;
          }
        } else if (incomingElement !== 'PHYSICAL') {
          // Apply element aura
          stats.afflictedElement = incomingElement;
          stats.afflictedTimer = 8.0; // lasts 8 seconds
        }

        // Calculate defense reduction
        const damageReduction = stats.def / (stats.def + 100);
        let finalDmg = Math.round(amount * (1 - damageReduction) * reactionMultiplier);
        if (isCrit) finalDmg = Math.round(finalDmg * 1.5);

        // Colossus phase transition logic
        if (stats.isBoss) {
          const hpRatio = (stats.currentHp - finalDmg) / stats.maxHp;
          if (hpRatio < 0.35 && stats.phase !== 3) {
            stats.phase = 3; // Enraged Phase 3!
            stats.atk = 240;
            vfx.spawnRing(mesh.position, 0xff0055, 35, 1.5);
            soundManager.playBossRoar();
          } else if (hpRatio < 0.7 && stats.phase === 1) {
            stats.phase = 2; // Phase 2 Elemental cores active!
            vfx.spawnRing(mesh.position, 0x00e5ff, 25, 1.2);
            soundManager.playBossRoar();
          }
        }

        stats.currentHp = Math.max(0, stats.currentHp - finalDmg);

        if (stats.currentHp <= 0 && !entity.isDead) {
          entity.isDead = true;
          soundManager.playReactionSound('DEFEAT');
          vfx.spawnRing(mesh.position, 0xffd700, 15, 0.8);
        }

        return { actualDmg: finalDmg, reaction };
      },
    };

    this.enemies.push(entity);
    if (isBoss) {
      this.activeBoss = entity;
    }
    return entity;
  }

  public populateVerdantiaEnemies(getTerrainHeight: (x: number, z: number) => number) {
    // Beginner Slimes around Whispering Plains
    this.spawnEnemy('SLIME', new THREE.Vector3(-40, 0, 70), 3);
    this.spawnEnemy('SLIME', new THREE.Vector3(-20, 0, 100), 3);
    this.spawnEnemy('SLIME', new THREE.Vector3(40, 0, 80), 4);

    // Forest Thorn Hounds
    this.spawnEnemy('HOUND', new THREE.Vector3(-110, 0, 120), 5);
    this.spawnEnemy('HOUND', new THREE.Vector3(-80, 0, 140), 5);

    // Bandit Camp near Ancient Ruins
    this.spawnEnemy('BANDIT', new THREE.Vector3(20, 0, -110), 6);
    this.spawnEnemy('BANDIT', new THREE.Vector3(45, 0, -100), 6);
    this.spawnEnemy('BRUTE', new THREE.Vector3(30, 0, -125), 7);

    // Gale Wisps overlooking the Lake
    this.spawnEnemy('WISP', new THREE.Vector3(120, 0, 10), 6);
    this.spawnEnemy('WISP', new THREE.Vector3(160, 0, 40), 7);

    // Elite Ruin Sentinel guarding the Temple Entrance
    this.spawnEnemy('SENTINEL', new THREE.Vector3(40, 0, -65), 10);

    // Mini-Boss: Moss Crag Golem in the eastern grove
    this.spawnEnemy('MOSS_GOLEM', new THREE.Vector3(180, 0, -50), 12);

    // Major World Boss: THE ANCIENT COLOSSUS in northern sanctuary arena
    this.spawnEnemy('COLOSSUS', new THREE.Vector3(0, 28, -280), 15);
  }

  public update(dt: number, playerPos: THREE.Vector3, vfx: VFXManager, getTerrainHeight: (x: number, z: number) => number) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.updateAI(dt, playerPos, vfx, getTerrainHeight);

      if (e.isDead && e.deathTimer > 2.0) {
        this.scene.remove(e.mesh);
        if (this.activeBoss === e) this.activeBoss = null;
        this.enemies.splice(i, 1);
      }
    }
  }
}
