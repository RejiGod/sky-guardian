
export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER'
}

export type ShipType = 'INTERCEPTOR' | 'STRIKER' | 'VANGUARD';
export type EnemyType = 'MELEE' | 'RANGED' | 'BOSS' | 'CANNON' | 'PHANTOM';
export type PowerUpType = 'SHIELD' | 'TRIPLE_SHOT' | 'RAPID_FIRE' | 'STAR';

export interface ShipConfig {
  type: ShipType;
  name: string;
  color: string;
  speed: number;
  fireRate: number;
  projectileSize: number;
  projectileSpeed: number;
  description: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  dx: number;
  dy: number;
}

export interface Entity extends Position {
  radius: number;
  color: string;
}

export interface Player extends Entity {
  speed: number;
  hp: number;
  maxHp: number;
  hitTime?: number;
  frozenUntil?: number;
  slowedUntil?: number;
}

export interface Projectile extends Entity, Velocity {
  active: boolean;
  fromEnemy?: boolean;
  isMissile?: boolean;
  isHoming?: boolean;
  piercing?: boolean;
  spawnTime?: number;
}

export interface Orbital extends Position {
  radius: number;
  angle: number;
  distance: number;
  speed: number;
  color: string;
}

export interface Enemy extends Entity, Velocity {
  type: EnemyType;
  hp: number;
  maxHp: number;
  scoreValue: number;
  lastShot?: number;
  lastMissileShot?: number;
  lastWaveTime?: number;
  shootCooldown?: number;
  phase?: number;
  birthTime?: number;
  hitTime?: number;
  theme?: string;
  wanderAngle?: number;
  lastDirectionChange?: number;
  orbitals?: Orbital[];
  escortsSpawned?: boolean;
  dialogueStep?: number;
  isTransforming?: boolean;
  meteorShowerActive?: boolean;
}

export interface PowerUp extends Entity {
  type: PowerUpType;
  spawnTime: number;
  duration: number;
  collected: boolean;
}

export interface Particle extends Entity, Velocity {
  alpha: number;
  life: number;
  type?: 'spark' | 'smoke' | 'fire' | 'plasma';
  size: number;
  decay: number;
  isHazard?: boolean;
  isLethal?: boolean;
}

export interface SummonedShip extends Entity, Velocity {
  spawnTime: number;
  duration: number;
  lastShot: number;
}
