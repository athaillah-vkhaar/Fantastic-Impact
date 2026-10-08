export type ElementType = 'EMBER' | 'AQUA' | 'VOLT' | 'GALE' | 'TERRA' | 'FROST' | 'PHYSICAL';

export type WeaponType = 'LONGSWORD' | 'TWIN_BLADES' | 'GREATSWORD';

export type CharacterId = 'kael' | 'lyra' | 'orion';

export interface CharacterStats {
  level: number;
  maxHp: number;
  currentHp: number;
  atk: number;
  def: number;
  elementalPower: number;
  critRate: number; // e.g. 0.20 for 20%
  critDmg: number; // e.g. 1.5 for 150%
  energyRecharge: number; // e.g. 1.0 for 100%
  currentEnergy: number; // 0 to maxEnergy
  maxEnergy: number;
  exp: number;
  expToNextLevel: number;
  ascension: number;
}

export interface WeaponData {
  id: string;
  name: string;
  type: WeaponType;
  baseAtk: number;
  subStat: string;
  subStatValue: string;
  rarity: 3 | 4 | 5;
  level: number;
  description: string;
  passiveName: string;
  passiveDesc: string;
}

export interface CharacterData {
  id: CharacterId;
  name: string;
  title: string;
  element: ElementType;
  weaponType: WeaponType;
  equippedWeapon: WeaponData;
  role: string;
  lore: string;
  stats: CharacterStats;
  skillName: string;
  skillDesc: string;
  skillCooldown: number; // in seconds
  currentSkillCooldown: number;
  burstName: string;
  burstDesc: string;
  passiveName: string;
  passiveDesc: string;
  color: string;
  accentColor: string;
  portraitIcon: string;
}

export type ElementalReactionType =
  | 'STEAM BURST'
  | 'OVERLOAD'
  | 'ELECTROSHOCK'
  | 'FREEZE'
  | 'ELEMENTAL VORTEX'
  | 'CRYSTAL GUARD'
  | 'NONE';

export interface DamageNumber {
  id: number;
  damage: number;
  x: number;
  y: number;
  element: ElementType;
  isCrit: boolean;
  reaction?: ElementalReactionType;
  timestamp: number;
}

export type EnemyType =
  | 'SLIME'
  | 'HOUND'
  | 'BANDIT'
  | 'BRUTE'
  | 'WISP'
  | 'SENTINEL'
  | 'MOSS_GOLEM'
  | 'COLOSSUS';

export interface EnemyStats {
  id: string;
  name: string;
  type: EnemyType;
  level: number;
  maxHp: number;
  currentHp: number;
  atk: number;
  def: number;
  element: ElementType;
  afflictedElement: ElementType | null;
  afflictedTimer: number;
  isBoss: boolean;
  isMiniBoss: boolean;
  phase?: number;
  staggerMeter: number;
  maxStagger: number;
  shield?: number;
  maxShield?: number;
}

export type LocomotionState =
  | 'IDLE'
  | 'WALK'
  | 'RUN'
  | 'SPRINT'
  | 'JUMP'
  | 'DOUBLE_JUMP'
  | 'FALL'
  | 'GLIDE'
  | 'CLIMB'
  | 'SWIM'
  | 'ATTACK'
  | 'CHARGED'
  | 'SKILL'
  | 'BURST'
  | 'DODGE'
  | 'STAGGER';

export interface InventoryItem {
  id: string;
  name: string;
  category: 'WEAPONS' | 'MATERIALS' | 'FOOD' | 'QUEST' | 'CONSUMABLES';
  rarity: 1 | 2 | 3 | 4 | 5;
  count: number;
  description: string;
  effectText?: string;
  icon: string;
}

export interface Quest {
  id: string;
  title: string;
  category: 'MAIN' | 'SIDE' | 'WORLD';
  description: string;
  objective: string;
  currentCount: number;
  targetCount: number;
  isCompleted: boolean;
  rewards: {
    exp: number;
    gold: number;
    items?: { name: string; count: number }[];
  };
}

export interface TeleportWaypoint {
  id: string;
  name: string;
  region: string;
  position: [number, number, number];
  isUnlocked: boolean;
}

export interface WorldSettings {
  graphicsPreset: 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';
  fpsLimit: 30 | 60 | 120;
  bloom: boolean;
  shadows: boolean;
  motionBlur: boolean;
  screenShake: boolean;
  cameraSensitivity: number;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  timeSpeed: number; // 1x, 2x, etc.
}

export type WeatherType = 'SUNNY' | 'RAIN' | 'THUNDERSTORM' | 'MIST';
