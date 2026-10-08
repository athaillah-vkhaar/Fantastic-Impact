import * as THREE from 'three';
import {
  CharacterData,
  CharacterId,
  DamageNumber,
  ElementType,
  InventoryItem,
  LocomotionState,
  Quest,
  TeleportWaypoint,
  WeatherType,
  WorldSettings,
} from '../types/game';
import { initialParty } from '../data/characters';
import { initialInventory, initialQuests } from '../data/questsAndItems';
import { createCharacterModel, CharacterMeshGroup } from './characterModels';
import { CameraController } from './cameraController';
import { buildVerdantiaWorld, OpenWorldData } from './terrainBuilder';
import { buildForgottenTemple, DungeonData } from './dungeonBuilder';
import { EnemyManager, EnemyEntity } from './enemyManager';
import { VFXManager } from './vfxManager';
import { soundManager } from '../audio/soundManager';

export class GameDirector {
  public canvas: HTMLCanvasElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public cameraController: CameraController;

  // World and Subterranean Dungeon
  public worldData: OpenWorldData;
  public dungeonData: DungeonData;
  public isInDungeon: boolean = false;

  // Systems
  public enemyManager: EnemyManager;
  public vfxManager: VFXManager;

  // Party State
  public party: Record<CharacterId, CharacterData>;
  public activeCharId: CharacterId = 'kael';
  public characterMeshes: Record<CharacterId, CharacterMeshGroup>;
  public playerGroup: THREE.Group;

  // Movement & Physics
  public playerVelocity: THREE.Vector3 = new THREE.Vector3();
  public locomotionState: LocomotionState = 'IDLE';
  public isGrounded: boolean = true;
  public stamina: number = 100;
  public maxStamina: number = 100;
  public canDoubleJump: boolean = false;
  public isInvincible: boolean = false;

  // Combat State
  public comboStep: number = 0;
  public comboTimer: number = 0;
  public attackCooldown: number = 0;
  public isCharging: boolean = false;
  public chargeTime: number = 0;
  public activeBurstAnimation: number = 0;

  // World Environment
  public timeOfDay: number = 10.0; // 0 to 24 hours
  public weather: WeatherType = 'SUNNY';
  public sunLight: THREE.DirectionalLight;
  public ambientLight: THREE.AmbientLight;
  public skyMesh: THREE.Mesh;

  // Quests & Inventory & Damage Numbers
  public quests: Quest[];
  public inventory: InventoryItem[];
  public waypoints: TeleportWaypoint[];
  public damageNumbers: DamageNumber[] = [];
  public currentInteractionPrompt: string | null = null;
  public interactionCallback: (() => void) | null = null;

  // Settings
  public settings: WorldSettings = {
    graphicsPreset: 'HIGH',
    fpsLimit: 60,
    bloom: true,
    shadows: true,
    motionBlur: true,
    screenShake: true,
    cameraSensitivity: 0.003,
    masterVolume: 0.8,
    musicVolume: 0.6,
    sfxVolume: 0.8,
    timeSpeed: 1.0,
  };

  // Keyboard input state
  public keys: Record<string, boolean> = {};

  // Lifecycle
  private isRunning: boolean = true;
  private lastTime: number = performance.now();
  private damageNumId: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0025);

    // Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Camera
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.cameraController = new CameraController(this.camera);

    // Lighting
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    this.sunLight.position.set(120, 200, 100);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 400;
    this.sunLight.shadow.camera.left = -120;
    this.sunLight.shadow.camera.right = 120;
    this.sunLight.shadow.camera.top = 120;
    this.sunLight.shadow.camera.bottom = -120;
    this.scene.add(this.sunLight);

    // Sky Dome
    const skyGeom = new THREE.SphereGeometry(600, 24, 24);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x87ceeb,
      side: THREE.BackSide,
    });
    this.skyMesh = new THREE.Mesh(skyGeom, skyMat);
    this.scene.add(this.skyMesh);

    // Build World & Dungeon
    this.worldData = buildVerdantiaWorld(this.scene);
    this.dungeonData = buildForgottenTemple(this.scene);

    // Managers
    this.vfxManager = new VFXManager(this.scene);
    this.enemyManager = new EnemyManager(this.scene);
    this.enemyManager.populateVerdantiaEnemies(this.worldData.getTerrainHeight);

    // Player Group & Characters
    this.playerGroup = new THREE.Group();
    // Start at Oakhaven crossroads
    const startY = this.worldData.getTerrainHeight(-65, 40);
    this.playerGroup.position.set(-65, startY, 40);
    this.scene.add(this.playerGroup);

    this.party = JSON.parse(JSON.stringify(initialParty));
    this.characterMeshes = {
      kael: createCharacterModel('kael'),
      lyra: createCharacterModel('lyra'),
      orion: createCharacterModel('orion'),
    };

    Object.values(this.characterMeshes).forEach((mesh) => {
      mesh.visible = false;
      this.playerGroup.add(mesh);
    });
    this.characterMeshes[this.activeCharId].visible = true;

    // Load or initialize state
    this.inventory = JSON.parse(JSON.stringify(initialInventory));
    this.quests = JSON.parse(JSON.stringify(initialQuests));
    this.waypoints = JSON.parse(JSON.stringify(this.worldData.waypoints));

    this.loadSavedState();

    // Event Listeners
    this.setupEventListeners();

    // Start Main Loop
    requestAnimationFrame(this.gameLoop);
  }

  // Mobile Touch Controls State
  public joystickVector = { x: 0, y: 0 };
  public isSprintActive: boolean = false;

  private setupEventListeners() {
    window.addEventListener('resize', this.onWindowResize);
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  public setJoystickInput(x: number, y: number, sprint?: boolean) {
    this.joystickVector.x = x;
    this.joystickVector.y = y;
    if (sprint !== undefined) {
      this.isSprintActive = sprint;
    }
  }

  public setSprintActive(active: boolean) {
    this.isSprintActive = active;
  }

  public rotateCamera(dx: number, dy: number) {
    this.cameraController.handleMouseMove(dx, dy, this.settings.cameraSensitivity);
  }

  public triggerJumpOrGlide() {
    const getTerrain = this.isInDungeon
      ? () => -200
      : this.worldData.getTerrainHeight;
    const currentGroundY = getTerrain(this.playerGroup.position.x, this.playerGroup.position.z);
    const inWater = !this.isInDungeon && currentGroundY < 1.0 && this.playerGroup.position.y <= 1.4;

    if (this.isGrounded && !inWater && this.stamina >= 10) {
      this.playerVelocity.y = 12.0;
      this.isGrounded = false;
      this.canDoubleJump = true;
      this.locomotionState = 'JUMP';
      this.stamina -= 10;
      soundManager.playJump();
    } else if (!this.isGrounded && this.playerVelocity.y < 0 && this.locomotionState !== 'GLIDE' && this.stamina > 5) {
      // Deploy Aeravian Glider!
      this.locomotionState = 'GLIDE';
      soundManager.playGliderDeploy();
    }
  }

  public triggerInteraction() {
    if (this.interactionCallback) {
      this.interactionCallback();
    }
  }

  private onWindowResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  // --- CHARACTER SWITCHING SYSTEM ---
  public switchCharacter(targetId: CharacterId) {
    if (this.activeCharId === targetId) return;

    const prevId = this.activeCharId;
    this.characterMeshes[prevId].visible = false;

    this.activeCharId = targetId;
    const newMesh = this.characterMeshes[targetId];
    newMesh.visible = true;

    // Trigger switch particle and sound
    soundManager.playCharacterSwitch();
    const pos = this.playerGroup.position;
    const elem = this.party[targetId].element;
    this.vfxManager.spawnElementalSkillVFX(pos, elem);

    // Passive bonus on switch
    if (targetId === 'lyra') {
      // Lyra's Flow State: Speed buff!
      this.stamina = Math.min(this.maxStamina, this.stamina + 20);
    }
  }

  // --- COMBAT ACTIONS ---
  public startAttack() {
    if (this.locomotionState === 'GLIDE' || this.locomotionState === 'CLIMB' || this.locomotionState === 'SWIM') return;
    this.isCharging = true;
    this.chargeTime = 0;

    // Normal attack combo trigger
    const now = performance.now();
    if (now - this.comboTimer < 900) {
      this.comboStep = (this.comboStep + 1) % 5;
    } else {
      this.comboStep = 1;
    }
    this.comboTimer = now;

    this.executeNormalAttack(this.comboStep);
  }

  private executeNormalAttack(step: number) {
    this.locomotionState = 'ATTACK';
    this.attackCooldown = 0.35;

    const char = this.party[this.activeCharId];
    const pitch = 0.8 + step * 0.15;
    soundManager.playSwordSwing(pitch);

    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.playerGroup.quaternion);
    const attackOrigin = this.playerGroup.position.clone().add(forward.clone().multiplyScalar(1.2));

    this.vfxManager.spawnSlash(this.playerGroup.position, this.playerGroup.rotation.y, char.element);

    // Hit detection against enemies
    const hitRadius = char.weaponType === 'GREATSWORD' ? 3.8 : 2.6;
    let hitAny = false;

    for (const enemy of this.enemyManager.enemies) {
      if (enemy.isDead) continue;
      const d = enemy.mesh.position.distanceTo(attackOrigin);
      if (d < hitRadius) {
        hitAny = true;
        const isCrit = Math.random() < char.stats.critRate;
        const baseDmg = char.stats.atk * (0.8 + step * 0.2);
        const { actualDmg, reaction } = enemy.takeDamage(baseDmg, char.element, isCrit, this.vfxManager);

        this.addDamageNumber(actualDmg, enemy.mesh.position, char.element, isCrit, reaction);
        soundManager.playHit(isCrit);
        this.vfxManager.spawnHitSparks(enemy.mesh.position, 6);

        // Recharge energy
        char.stats.currentEnergy = Math.min(char.stats.maxEnergy, char.stats.currentEnergy + 4);
      }
    }

    if (this.settings.screenShake && hitAny) {
      this.cameraController.triggerShake(0.18, 0.15);
    }

    // Check quest objectives for defeat
    this.checkDefeatQuests();
  }

  public releaseChargedAttack() {
    this.isCharging = false;
    if (this.chargeTime < 0.35) return; // wasn't held long enough

    if (this.stamina < 20) return;
    this.stamina -= 20;

    const char = this.party[this.activeCharId];
    this.locomotionState = 'CHARGED';
    this.attackCooldown = 0.6;

    soundManager.playSwordSwing(0.65);
    soundManager.playReactionSound('HEAVY');

    this.vfxManager.spawnElementalSkillVFX(this.playerGroup.position, char.element);

    // 360 degree spin hit check
    for (const enemy of this.enemyManager.enemies) {
      if (enemy.isDead) continue;
      const d = enemy.mesh.position.distanceTo(this.playerGroup.position);
      if (d < 5.0) {
        const isCrit = Math.random() < char.stats.critRate + 0.15;
        const heavyDmg = char.stats.atk * 2.4;
        const { actualDmg, reaction } = enemy.takeDamage(heavyDmg, char.element, isCrit, this.vfxManager);
        this.addDamageNumber(actualDmg, enemy.mesh.position, char.element, isCrit, reaction);
        this.vfxManager.spawnHitSparks(enemy.mesh.position, 10);
      }
    }

    if (this.settings.screenShake) {
      this.cameraController.triggerShake(0.35, 0.25);
    }
  }

  public useElementalSkill() {
    const char = this.party[this.activeCharId];
    if (char.currentSkillCooldown > 0) return;

    char.currentSkillCooldown = char.skillCooldown;
    this.locomotionState = 'SKILL';
    this.attackCooldown = 0.55;

    const pos = this.playerGroup.position;
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.playerGroup.quaternion);

    if (char.id === 'kael') {
      // Inferno Dash
      soundManager.playEmberSkill();
      this.playerVelocity.addScaledVector(forward, 18); // swift lunge
      this.vfxManager.spawnElementalSkillVFX(pos, 'EMBER');
    } else if (char.id === 'lyra') {
      // Tidal Spiral
      soundManager.playAquaSkill();
      this.vfxManager.spawnElementalSkillVFX(pos, 'AQUA');
    } else if (char.id === 'orion') {
      // Thunder Crash
      soundManager.playVoltSkill();
      this.vfxManager.spawnElementalSkillVFX(pos, 'VOLT');
    }

    // Hit enemies in skill area
    for (const enemy of this.enemyManager.enemies) {
      if (enemy.isDead) continue;
      const d = enemy.mesh.position.distanceTo(pos);
      if (d < 7.0) {
        const isCrit = Math.random() < char.stats.critRate;
        const skillDmg = char.stats.atk * 2.8;
        const { actualDmg, reaction } = enemy.takeDamage(skillDmg, char.element, isCrit, this.vfxManager);
        this.addDamageNumber(actualDmg, enemy.mesh.position, char.element, isCrit, reaction);

        // Pull smaller enemies towards Lyra's water spiral
        if (char.id === 'lyra' && !enemy.stats.isBoss) {
          const pullDir = pos.clone().sub(enemy.mesh.position).normalize();
          enemy.mesh.position.addScaledVector(pullDir, 2.5);
        }
      }
    }

    // Check torch puzzle trigger in ruins or dungeon
    this.checkPuzzleInteractions(char.element);

    if (this.settings.screenShake) {
      this.cameraController.triggerShake(0.3, 0.2);
    }
  }

  public useElementalBurst() {
    const char = this.party[this.activeCharId];
    if (char.stats.currentEnergy < char.stats.maxEnergy) return;

    char.stats.currentEnergy = 0;
    this.locomotionState = 'BURST';
    this.attackCooldown = 0.9;
    this.activeBurstAnimation = 1.0;

    soundManager.playBurstCinematic();
    this.cameraController.triggerBurstCinematic(3.2);

    const pos = this.playerGroup.position;
    this.vfxManager.spawnBurstCinematicVFX(pos, char.element);

    if (char.id === 'lyra') {
      // Ocean Crown healing buff
      char.stats.currentHp = Math.min(char.stats.maxHp, char.stats.currentHp + 800);
    }

    // Huge Burst AoE hits all nearby enemies
    for (const enemy of this.enemyManager.enemies) {
      if (enemy.isDead) continue;
      const d = enemy.mesh.position.distanceTo(pos);
      if (d < 16.0) {
        const isCrit = Math.random() < char.stats.critRate + 0.25;
        const burstDmg = char.stats.atk * 4.5;
        const { actualDmg, reaction } = enemy.takeDamage(burstDmg, char.element, isCrit, this.vfxManager);
        this.addDamageNumber(actualDmg, enemy.mesh.position, char.element, isCrit, reaction);
      }
    }

    if (this.settings.screenShake) {
      this.cameraController.triggerShake(0.65, 0.45);
    }

    this.checkDefeatQuests();
  }

  public triggerDodge() {
    if (this.stamina < 15 || this.locomotionState === 'DODGE') return;
    this.stamina -= 15;

    this.locomotionState = 'DODGE';
    this.attackCooldown = 0.3;
    soundManager.playDodge();

    // i-frame invincibility
    this.isInvincible = true;
    setTimeout(() => {
      this.isInvincible = false;
    }, 280);

    // Directional dodge thrust
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.playerGroup.quaternion);
    this.playerVelocity.addScaledVector(forward, 14);

    const char = this.party[this.activeCharId];
    this.vfxManager.spawnRing(this.playerGroup.position, char.id === 'kael' ? 0xff4500 : char.id === 'lyra' ? 0x00d2ff : 0xbf00ff, 12, 0.25);
  }

  public toggleLockOn() {
    if (this.cameraController.isLockedOn) {
      this.cameraController.isLockedOn = false;
      this.cameraController.lockedTarget = null;
    } else {
      // Find closest alive enemy
      let closest: EnemyEntity | null = null;
      let closestDist = 25;
      for (const e of this.enemyManager.enemies) {
        if (e.isDead) continue;
        const d = e.mesh.position.distanceTo(this.playerGroup.position);
        if (d < closestDist) {
          closestDist = d;
          closest = e;
        }
      }
      if (closest) {
        this.cameraController.isLockedOn = true;
        this.cameraController.lockedTarget = closest.mesh.position;
      }
    }
  }

  // --- PUZZLE & WORLD INTERACTIONS ---
  private checkPuzzleInteractions(element: ElementType) {
    const pos = this.playerGroup.position;

    // Check Open World Torch Puzzle
    if (element === 'EMBER' && !this.worldData.torchPuzzle.isSolved) {
      for (const t of this.worldData.torchPuzzle.torches) {
        if (!t.isLit && t.position.distanceTo(pos) < 6.0) {
          t.isLit = true;
          (t.mesh.children[1] as THREE.Mesh).visible = true;
          this.vfxManager.spawnRing(t.position, 0xff4500, 10, 0.4);
          soundManager.playReactionSound('IGNITE');

          // Check if all 3 are lit!
          const allLit = this.worldData.torchPuzzle.torches.every((x) => x.isLit);
          if (allLit) {
            this.worldData.torchPuzzle.isSolved = true;
            soundManager.playChestOpen();
            // Complete quest
            const q = this.quests.find((x) => x.id === 'quest-ruins-puzzle');
            if (q) {
              q.currentCount = 3;
              q.isCompleted = true;
            }
          }
        }
      }
    }

    // Check Dungeon Elemental Mechanisms
    if (this.isInDungeon) {
      for (const m of this.dungeonData.mechanisms) {
        if (!m.isActivated && m.type === element && m.position.distanceTo(pos) < 6.0) {
          m.isActivated = true;
          let col = 0xff3d00;
          if (element === 'AQUA') col = 0x00e5ff;
          if (element === 'VOLT') col = 0xbf00ff;
          (m.indicatorMesh.material as THREE.MeshBasicMaterial).color.setHex(col);
          soundManager.playReactionSound('MECHANISM');
          this.vfxManager.spawnRing(m.position, col, 14, 0.6);

          // Check if all 3 activated -> Open Gate!
          const allActivated = this.dungeonData.mechanisms.every((x) => x.isActivated);
          if (allActivated && !this.dungeonData.isGateOpened) {
            this.dungeonData.isGateOpened = true;
            this.dungeonData.gateMesh.position.y += 14; // slide gate open!
            soundManager.playReactionSound('GATE_OPEN');
          }
        }
      }
    }
  }

  private checkDefeatQuests() {
    // Check Colossus defeat
    const boss = this.enemyManager.activeBoss;
    if (boss && boss.isDead) {
      const q = this.quests.find((x) => x.id === 'quest-boss-colossus');
      if (q && !q.isCompleted) {
        q.currentCount = 1;
        q.isCompleted = true;
      }
    }
  }

  // --- DAMAGE NUMBER UTILITY ---
  private addDamageNumber(
    damage: number,
    pos: THREE.Vector3,
    element: ElementType,
    isCrit: boolean,
    reaction?: string
  ) {
    // Project 3D pos to 2D screen coordinate
    const screenPos = pos.clone().project(this.camera);
    const x = ((screenPos.x + 1) * window.innerWidth) / 2;
    const y = ((-screenPos.y + 1) * window.innerHeight) / 2;

    this.damageNumbers.push({
      id: this.damageNumId++,
      damage,
      x: x + (Math.random() - 0.5) * 40,
      y: y + (Math.random() - 0.5) * 40,
      element,
      isCrit,
      reaction: reaction as any,
      timestamp: performance.now(),
    });

    if (this.damageNumbers.length > 25) {
      this.damageNumbers.shift();
    }
  }

  // --- TELEPORT & DUNGEON TRAVEL ---
  public teleportTo(position: [number, number, number]) {
    this.playerGroup.position.set(position[0], position[1] + 1.0, position[2]);
    this.playerVelocity.set(0, 0, 0);
    soundManager.playCharacterSwitch();
  }

  public enterForgottenTemple() {
    this.isInDungeon = true;
    this.playerGroup.position.set(0, -199, 25); // entrance of dungeon
    this.playerVelocity.set(0, 0, 0);
    soundManager.switchMusicTrack('DUNGEON');
    soundManager.playReactionSound('TELEPORT');
  }

  public exitForgottenTemple() {
    this.isInDungeon = false;
    const groundY = this.worldData.getTerrainHeight(55, -60);
    this.playerGroup.position.set(55, groundY + 1.0, -60);
    this.playerVelocity.set(0, 0, 0);
    soundManager.switchMusicTrack('EXPLORATION');
    soundManager.playReactionSound('TELEPORT');
  }

  // --- PERSISTENCE / SAVE SYSTEM ---
  private loadSavedState() {
    try {
      const saved = localStorage.getItem('FANTASTIC_IMPACT_SAVE');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.party) this.party = data.party;
        if (data.inventory) this.inventory = data.inventory;
        if (data.quests) this.quests = data.quests;
        if (data.waypoints) this.waypoints = data.waypoints;
      }
    } catch (e) {
      console.warn('Could not load save data', e);
    }
  }

  public saveState() {
    try {
      const data = {
        party: this.party,
        inventory: this.inventory,
        quests: this.quests,
        waypoints: this.waypoints,
        activeCharId: this.activeCharId,
      };
      localStorage.setItem('FANTASTIC_IMPACT_SAVE', JSON.stringify(data));
    } catch (e) {
      console.warn('Could not save state', e);
    }
  }

  // --- MAIN GAME LOOP ---
  private gameLoop = () => {
    if (!this.isRunning) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) * 0.001, 0.1);
    this.lastTime = now;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.gameLoop);
  };

  private update(dt: number) {
    const char = this.party[this.activeCharId];

    // Skill cooldowns
    if (char.currentSkillCooldown > 0) {
      char.currentSkillCooldown = Math.max(0, char.currentSkillCooldown - dt);
    }
    if (this.attackCooldown > 0) {
      this.attackCooldown -= dt;
    }
    if (this.isCharging) {
      this.chargeTime += dt;
    }

    // Day/Night time progression
    this.timeOfDay = (this.timeOfDay + dt * 0.05 * this.settings.timeSpeed) % 24;
    this.updateDayNightCycle();

    // Damage numbers cleanup (fade out after 1.1s)
    const curTime = performance.now();
    this.damageNumbers = this.damageNumbers.filter((n) => curTime - n.timestamp < 1100);

    // Dynamic music switching based on combat state
    let isNearEnemy = false;
    let isNearBoss = false;
    for (const e of this.enemyManager.enemies) {
      if (e.isDead) continue;
      const d = e.mesh.position.distanceTo(this.playerGroup.position);
      if (d < 30) {
        if (e.stats.isBoss) isNearBoss = true;
        isNearEnemy = true;
      }
    }
    if (!this.isInDungeon) {
      if (isNearBoss) {
        soundManager.switchMusicTrack('BOSS');
      } else if (isNearEnemy) {
        soundManager.switchMusicTrack('COMBAT');
      } else {
        soundManager.switchMusicTrack('EXPLORATION');
      }
    }

    // --- PLAYER MOVEMENT & PHYSICS ---
    this.updatePlayerPhysics(dt);

    // --- ENEMY AI & MANAGERS ---
    const getTerrain = this.isInDungeon
      ? () => -200
      : this.worldData.getTerrainHeight;

    this.enemyManager.update(dt, this.playerGroup.position, this.vfxManager, getTerrain);
    this.vfxManager.update(dt);

    // --- CAMERA ---
    this.cameraController.update(dt, this.playerGroup.position, getTerrain);

    // --- INTERACTION DETECTION ---
    this.updateInteractions();

    // Regenerate Stamina when not sprinting/swimming/climbing
    if (
      this.locomotionState !== 'SPRINT' &&
      this.locomotionState !== 'SWIM' &&
      this.locomotionState !== 'CLIMB' &&
      this.locomotionState !== 'GLIDE' &&
      this.locomotionState !== 'DODGE'
    ) {
      this.stamina = Math.min(this.maxStamina, this.stamina + 22 * dt);
    }

    // Pose Animation for Active Character
    const isMoving = this.playerVelocity.lengthSq() > 0.1;
    this.characterMeshes[this.activeCharId].updatePose(
      this.locomotionState,
      this.attackCooldown > 0 ? (0.4 - this.attackCooldown) / 0.4 : 0,
      isMoving
    );
  }

  private updatePlayerPhysics(dt: number) {
    const getTerrain = this.isInDungeon
      ? () => -200
      : this.worldData.getTerrainHeight;

    const currentGroundY = getTerrain(this.playerGroup.position.x, this.playerGroup.position.z);
    const inWater = !this.isInDungeon && currentGroundY < 1.0 && this.playerGroup.position.y <= 1.4;

    // Movement Input Vector relative to camera yaw from Mobile Joystick
    let moveX = this.joystickVector.x;
    let moveZ = this.joystickVector.y;

    const joyMag = Math.hypot(moveX, moveZ);
    const isSprinting = (this.isSprintActive || joyMag > 0.88) && this.stamina > 5 && joyMag > 0.15;
    let targetSpeed = isSprinting ? 11.5 : (joyMag > 0.5 ? 6.0 : 3.5);

    // Water Swimming check
    if (inWater) {
      this.locomotionState = 'SWIM';
      targetSpeed = 4.0;
      this.stamina = Math.max(0, this.stamina - 6 * dt);
      this.playerGroup.position.y = 1.2; // float on lake surface
      this.playerVelocity.y = 0;
    }

    // Direction calculation
    if (joyMag > 0.08) {
      const inputAngle = Math.atan2(moveX, moveZ);
      const moveAngle = this.cameraController.yaw + inputAngle;

      // Smooth rotate player toward move angle
      this.playerGroup.rotation.y = moveAngle;

      const forwardX = Math.sin(moveAngle) * targetSpeed;
      const forwardZ = Math.cos(moveAngle) * targetSpeed;

      this.playerVelocity.x = THREE.MathUtils.lerp(this.playerVelocity.x, forwardX, 12 * dt);
      this.playerVelocity.z = THREE.MathUtils.lerp(this.playerVelocity.z, forwardZ, 12 * dt);

      if (!inWater && this.isGrounded && this.attackCooldown <= 0) {
        this.locomotionState = isSprinting ? 'SPRINT' : (joyMag > 0.5 ? 'RUN' : 'WALK');
        if (isSprinting) {
          this.stamina = Math.max(0, this.stamina - 14 * dt);
        }
      }
    } else {
      // Decelerate
      this.playerVelocity.x = THREE.MathUtils.lerp(this.playerVelocity.x, 0, 16 * dt);
      this.playerVelocity.z = THREE.MathUtils.lerp(this.playerVelocity.z, 0, 16 * dt);
      if (!inWater && this.isGrounded && this.attackCooldown <= 0) {
        this.locomotionState = 'IDLE';
      }
    }

    // Gliding Physics
    if (this.locomotionState === 'GLIDE') {
      this.playerVelocity.y = -2.2; // slow gliding descent
      this.stamina = Math.max(0, this.stamina - 8 * dt);
      if (this.stamina <= 0) {
        this.locomotionState = 'FALL'; // stamina ran out
      }
    } else if (!this.isGrounded && !inWater) {
      // Normal Gravity
      this.playerVelocity.y -= 28.0 * dt;
      if (this.playerVelocity.y < -3.0) {
        this.locomotionState = 'FALL';
      }
    }

    // Apply Velocity to Position
    this.playerGroup.position.addScaledVector(this.playerVelocity, dt);

    // Ground Collision Check
    const groundHeight = currentGroundY;
    if (this.playerGroup.position.y <= groundHeight) {
      this.playerGroup.position.y = groundHeight;
      this.playerVelocity.y = 0;
      if (!this.isGrounded) {
        soundManager.playLand();
      }
      this.isGrounded = true;
      this.canDoubleJump = false;
      if (this.locomotionState === 'FALL' || this.locomotionState === 'GLIDE') {
        this.locomotionState = 'IDLE';
      }
    } else if (!inWater) {
      this.isGrounded = false;
    }
  }

  private updateInteractions() {
    const pos = this.playerGroup.position;
    this.currentInteractionPrompt = null;
    this.interactionCallback = null;

    // Check Dungeon Portal
    if (!this.isInDungeon) {
      const distToPortal = pos.distanceTo(this.worldData.dungeonPortalMesh.position);
      if (distToPortal < 5.0) {
        this.currentInteractionPrompt = 'Enter The Forgotten Temple';
        this.interactionCallback = () => this.enterForgottenTemple();
        return;
      }
    } else {
      // Check Exit Portal
      const exitPos = this.dungeonData.exitPortalMesh.position.clone().add(this.dungeonData.dungeonGroup.position);
      if (pos.distanceTo(exitPos) < 5.0) {
        this.currentInteractionPrompt = 'Return to Verdantia';
        this.interactionCallback = () => this.exitForgottenTemple();
        return;
      }
    }

    // Check Teleport Waypoints
    for (const wp of this.waypoints) {
      const wpPos = new THREE.Vector3(...wp.position);
      if (pos.distanceTo(wpPos) < 4.5) {
        if (!wp.isUnlocked) {
          this.currentInteractionPrompt = `Attune ${wp.name}`;
          this.interactionCallback = () => {
            wp.isUnlocked = true;
            soundManager.playChestOpen();
            // Update waypoint crystal mesh glow
            const wpMesh = this.worldData.waypointMeshes.find((m) => m.id === wp.id);
            if (wpMesh) {
              (wpMesh.crystal.material as THREE.MeshBasicMaterial).color.setHex(0x00e5ff);
            }
            // Update quest
            const q = this.quests.find((x) => x.id === 'quest-main-1');
            if (q) {
              q.currentCount = this.waypoints.filter((w) => w.isUnlocked).length;
              if (q.currentCount >= q.targetCount) q.isCompleted = true;
            }
          };
          return;
        }
      }
    }

    // Check Treasure Chests
    for (const chest of this.worldData.chests) {
      if (!chest.isOpened && pos.distanceTo(chest.position) < 3.5) {
        this.currentInteractionPrompt = `Open ${chest.rarity} Chest`;
        this.interactionCallback = () => {
          chest.isOpened = true;
          chest.lidMesh.rotation.x = -Math.PI * 0.45; // open lid!
          soundManager.playChestOpen();

          // Add loot
          const expGain = chest.rarity === 'PRECIOUS' ? 300 : 100;
          const char = this.party[this.activeCharId];
          char.stats.exp += expGain;

          this.inventory.push({
            id: `item-drop-${Date.now()}`,
            name: chest.rarity === 'PRECIOUS' ? 'Luminescent Crystal' : 'Sweet Roast Chicken',
            category: chest.rarity === 'PRECIOUS' ? 'MATERIALS' : 'FOOD',
            rarity: chest.rarity === 'PRECIOUS' ? 4 : 2,
            count: 2,
            description: 'Acquired from ancient Verdantian chest.',
            icon: chest.rarity === 'PRECIOUS' ? '💎' : '🍗',
          });
        };
        return;
      }
    }

    // Check Collectible Resources
    for (const res of this.worldData.resources) {
      if (!res.isCollected && pos.distanceTo(res.position) < 3.0) {
        this.currentInteractionPrompt = `Gather ${res.name}`;
        this.interactionCallback = () => {
          res.isCollected = true;
          res.mesh.visible = false;
          soundManager.playUIClick();

          // Add to inventory
          const existing = this.inventory.find((i) => i.name === res.name);
          if (existing) {
            existing.count += 1;
          } else {
            this.inventory.push({
              id: `res-${Date.now()}`,
              name: res.name,
              category: res.type === 'HERB' ? 'MATERIALS' : res.type === 'FRUIT' ? 'FOOD' : 'MATERIALS',
              rarity: 2,
              count: 1,
              description: `A wild ${res.name} harvested from Verdantia.`,
              icon: res.type === 'HERB' ? '🌿' : res.type === 'FRUIT' ? '🍎' : '💎',
            });
          }

          // Check forage quest
          const q = this.quests.find((x) => x.id === 'quest-forage');
          if (q) {
            q.currentCount += 1;
            if (q.currentCount >= q.targetCount) q.isCompleted = true;
          }
        };
        return;
      }
    }
  }

  private updateDayNightCycle() {
    // 0 = Midnight, 6 = Sunrise, 12 = Noon, 18 = Sunset
    const hour = this.timeOfDay;
    const angle = ((hour - 6) / 24) * Math.PI * 2;

    this.sunLight.position.x = Math.cos(angle) * 200;
    this.sunLight.position.y = Math.sin(angle) * 200;
    this.sunLight.position.z = 100;

    let skyCol = 0x87ceeb;
    let lightCol = 0xfffaed;
    let lightIntensity = 1.4;

    if (hour >= 5 && hour < 8) {
      // Golden Morning
      skyCol = 0xffab91;
      lightCol = 0xffcc80;
      lightIntensity = 1.0;
    } else if (hour >= 8 && hour < 17) {
      // Clear Noon
      skyCol = 0x81d4fa;
      lightCol = 0xffffff;
      lightIntensity = 1.5;
    } else if (hour >= 17 && hour < 20) {
      // Dramatic Warm Sunset
      skyCol = 0xff7043;
      lightCol = 0xffa726;
      lightIntensity = 1.2;
    } else {
      // Starry Moonlit Night
      skyCol = 0x0a1128;
      lightCol = 0x90caf9;
      lightIntensity = 0.35;
    }

    (this.skyMesh.material as THREE.MeshBasicMaterial).color.setHex(skyCol);
    this.scene.fog?.color.setHex(skyCol);
    this.sunLight.color.setHex(lightCol);
    this.sunLight.intensity = lightIntensity;
  }

  private render() {
    this.renderer.render(this.scene, this.camera);
  }

  public destroy() {
    this.isRunning = false;
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.dispose();
  }
}
