
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Player, Projectile, Particle, ShipConfig, Enemy, EnemyType, PowerUp, PowerUpType, Orbital, SummonedShip } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface GameProps {
  onGameOver: (score: number) => void;
  onWin?: (score: number) => void;
  onCheckpoint?: (score: number) => void;
  shipConfig: ShipConfig;
  initialScore?: number;
  initialAbility?: boolean;
  difficulty?: number;
}

interface DashGhost {
  x: number;
  y: number;
  angle: number;
  alpha: number;
  scaleX: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
  twinkle: number;
}

interface BGPlanet {
  id: number;
  x: number;
  y: number;
  radius: number;
  color: string;
  speed: number;
  type: 'ROCKY' | 'GAS_GIANT' | 'ICE' | 'LAVA';
  rotation: number;
  rotationSpeed: number;
  hp: number;
  maxHp: number;
}

const ENEMY_CAP = 10; 
const PARTICLE_CAP = 150; 

const Game: React.FC<GameProps> = ({ 
  onGameOver, 
  onWin,
  onCheckpoint, 
  shipConfig, 
  initialScore = 0,
  initialAbility = false,
  difficulty = 1
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenStarsRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenNebulaRef = useRef<HTMLCanvasElement | null>(null);
  const [dashReady, setDashReady] = useState(true);
  const [abilityReady, setAbilityReady] = useState(initialAbility);
  const [abilityUnlocked, setAbilityUnlocked] = useState(initialAbility);
  const [score, setScore] = useState(initialScore);
  const [survivalTime, setSurvivalTime] = useState(0);
  const [showGodPanel, setShowGodPanel] = useState(false);
  const [activeEffects, setActiveEffects] = useState<Partial<Record<PowerUpType, number>>>({});
  const [bossAlert, setBossAlert] = useState(false);
  const [bossHP, setBossHP] = useState<{current: number, max: number, name: string} | null>(null);
  const [novaUnlocked, setNovaUnlocked] = useState(false);
  const [necromancyUnlocked, setNecromancyUnlocked] = useState(false);
  const [necromancyReady, setNecromancyReady] = useState(true);
  const [necromancyNotification, setNecromancyNotification] = useState(false);
  const [vanguardNotification, setVanguardNotification] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [dialogue, setDialogue] = useState<{text: string, speaker: string} | null>(null);
  
  const gameStateRef = useRef({
    score: initialScore,
    startTime: performance.now(),
    player: { x: window.innerWidth / 2, y: window.innerHeight / 2, radius: 14, color: shipConfig.color, speed: shipConfig.speed, hp: 1, maxHp: 1 } as Player,
    projectiles: [] as Projectile[],
    enemyProjectiles: [] as Projectile[],
    enemies: [] as Enemy[],
    powerUps: [] as PowerUp[],
    particles: [] as Particle[],
    ghosts: [] as DashGhost[],
    stars: [] as Star[],
    activeEffects: {} as Record<string, number>,
    keys: new Set<string>(),
    mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2, pressed: false },
    lastShot: 0,
    lastEnemySpawn: 0,
    lastPowerUpSpawn: performance.now() - 10000,
    firstPowerUpSpawned: initialAbility,
    enemySpawnRate: initialAbility ? 800 : 2000,
    isDashing: false,
    dashTime: 0,
    dashDuration: 200, 
    dashCooldown: 900, 
    lastDash: 0,
    dashVelocity: { x: 0, y: 0 },
    bgOffset: { x: 0, y: 0 },
    screenShake: 0,
    specialAbilityUnlocked: initialAbility,
    lastSpecialAbility: 0,
    specialAbilityCooldown: 2500,
    isGodMode: false,
    timeScale: 1,
    playerTilt: 0,
    bossSpawned: false,
    bossInminent: false,
    bossDefeated: false,
    bossRushIndex: 0,
    blackHoleSpawned: false,
    vanguardSpawned: false,
    chaosBossSpawned: false,
    primordialChaosSpawned: false,
    meteorShowerActive: false,
    lastMeteorSpawn: 0,
    starsCollected: 0,
    lastStarDropTime: 0,
    lastFrameTime: performance.now(),
    playerOrbitals: [] as Orbital[],
    orbitalsUnlocked: false,
    necromancyUnlocked: false,
    necromancyReady: true,
    abilityReady: initialAbility,
    dashReady: true,
    lastNecromancy: 0,
    necromancyCooldown: 17000,
    summonedShips: [] as SummonedShip[],
    screenFlash: 0,
    levelTheme: 'Default',
    bgPlanets: [] as BGPlanet[],
    lastPlanetSpawn: 0,
    isPaused: false,
    godBeam: null as { targetX: number, targetY: number, startTime: number } | null
  });

  const [isPaused, setIsPaused] = useState(false);
  const [starsCollected, setStarsCollected] = useState(0);
  const [novaNotification, setNovaNotification] = useState(false);
  const [orbitalsNotification, setOrbitalsNotification] = useState(false);

  const initStars = useCallback((width: number, height: number) => {
    if (width <= 0 || height <= 0) return;
    
    // Create offscreen canvas for stars
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const octx = offscreen.getContext('2d');
    if (!octx) return;

    const stars: Star[] = [];
    for (let i = 0; i < 200; i++) {
      const s = {
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.8 + 0.2,
        speed: Math.random() * 0.5 + 0.05,
        alpha: Math.random() * 0.7 + 0.1,
        twinkle: Math.random() * Math.PI * 2
      };
      stars.push(s);
      
      // Draw to offscreen
      octx.fillStyle = i % 10 === 0 ? `rgba(147, 197, 253, ${s.alpha})` : `rgba(255, 255, 255, ${s.alpha})`;
      octx.beginPath();
      octx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      octx.fill();
    }
    gameStateRef.current.stars = stars;
    offscreenStarsRef.current = offscreen;
  }, []);

  const initNebula = useCallback((width: number, height: number) => {
    if (width <= 0 || height <= 0) return;
    const offscreen = document.createElement('canvas');
    offscreen.width = width * 1.5; // Larger for movement
    offscreen.height = height * 1.5;
    const octx = offscreen.getContext('2d');
    if (!octx) return;

    const drawNebula = (x: number, y: number, radius: number, color: string) => {
      const grad = octx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'transparent');
      octx.fillStyle = grad;
      octx.globalAlpha = 0.15;
      octx.beginPath();
      octx.arc(x, y, radius, 0, Math.PI * 2);
      octx.fill();
    };

    const getThemeColors = () => {
      return ['#4f46e5', '#7c3aed', '#0ea5e9'];
    };

    const colors = getThemeColors();
    drawNebula(offscreen.width / 2, offscreen.height / 2, 600, colors[0]);
    drawNebula(offscreen.width / 2 + 400, offscreen.height / 2 + 300, 400, colors[1]);
    drawNebula(offscreen.width / 2 - 300, offscreen.height / 2 - 200, 500, colors[2]);
    
    offscreenNebulaRef.current = offscreen;
  }, []);

  const initPlanets = useCallback((width: number, height: number) => {
    const types: BGPlanet['type'][] = ['ROCKY', 'GAS_GIANT', 'ICE', 'LAVA'];
    const planets: BGPlanet[] = [];
    for (let i = 0; i < 3; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const radius = 40 + Math.random() * 100;
      planets.push({
        id: Math.random(),
        x: Math.random() * width,
        y: Math.random() * height,
        radius,
        color: type === 'ROCKY' ? '#94a3b8' : type === 'GAS_GIANT' ? '#f59e0b' : type === 'ICE' ? '#3b82f6' : '#ef4444',
        speed: 0.3 + Math.random() * 0.4,
        type,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.002,
        hp: Math.floor(radius / 2),
        maxHp: Math.floor(radius / 2)
      });
    }
    gameStateRef.current.bgPlanets = planets;
  }, []);

  const handleResize = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
      initStars(window.innerWidth, window.innerHeight);
      initNebula(window.innerWidth, window.innerHeight);
      initPlanets(window.innerWidth, window.innerHeight);
    }
  }, [initStars, initNebula, initPlanets]);

  const createExplosion = (x: number, y: number, color: string, count = 12, type: 'fire' | 'plasma' | 'spark' = 'fire') => {
    const state = gameStateRef.current;
    
    // Performance optimization: Scale down particle count if we have too many
    const currentCount = state.particles.length;
    let actualCount = count;
    if (currentCount > PARTICLE_CAP * 0.8) actualCount = Math.floor(count * 0.5);
    if (currentCount > PARTICLE_CAP) actualCount = Math.floor(count * 0.2);
    if (actualCount < 1 && count > 0) actualCount = 1;

    // Shockwave effect for larger explosions
    if (actualCount > 10) {
      state.particles.push({
        x, y, radius: 5, color: '#ffffff',
        dx: 0, dy: 0,
        alpha: 0.6, life: 1, size: 10,
        decay: 0.04,
        type: 'plasma'
      });
    }

    for (let i = 0; i < actualCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (type === 'spark' ? 12 : 8) + 1;
      const life = Math.random() * 0.5 + 0.5;
      
      state.particles.push({
        x, y, radius: Math.random() * (type === 'spark' ? 1.5 : 4) + 0.5, color,
        dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed,
        alpha: 1, life: life, size: Math.random() * 4 + 1,
        decay: (Math.random() * 0.03 + 0.01) / life,
        type: type === 'spark' ? 'spark' : (Math.random() > 0.4 ? 'fire' : 'smoke')
      });
    }
    
    // Add some high-speed sparks regardless of type
    if (type !== 'spark' && actualCount > 5) {
      for (let i = 0; i < actualCount / 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 15 + 5;
        state.particles.push({
          x, y, radius: 1, color: '#ffffff',
          dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed,
          alpha: 1, life: 0.5, size: 1, decay: 0.1, type: 'spark'
        });
      }
    }

    state.screenShake = Math.max(state.screenShake, count / 2.5);
    
    // Screen flash for massive explosions
    if (count > 40) {
      state.screenFlash = 0.3;
    }
  };

  const createMuzzleFlash = (x: number, y: number, angle: number, color: string) => {
    const state = gameStateRef.current;
    // Core flash
    state.particles.push({
      x, y, radius: 8, color: '#ffffff',
      dx: 0, dy: 0, alpha: 0.8, life: 1, size: 12, decay: 0.2, type: 'plasma'
    });

    for (let i = 0; i < 8; i++) {
      const spread = (Math.random() - 0.5) * 0.8;
      const speed = Math.random() * 6 + 4;
      state.particles.push({
        x, y, radius: Math.random() * 2 + 1, color,
        dx: Math.cos(angle + spread) * speed, dy: Math.sin(angle + spread) * speed,
        alpha: 1, life: 1, size: 2, decay: 0.15, type: 'fire'
      });
    }
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize();

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      gameStateRef.current.keys.add(key);
      if (key === 'e' && (gameStateRef.current.specialAbilityUnlocked || gameStateRef.current.isGodMode)) {
        // La lógica de Nova ahora se maneja en el loop de update para mayor precisión y efectos
      }
      if (key === 'p') {
        gameStateRef.current.isGodMode = !gameStateRef.current.isGodMode;
        if (!gameStateRef.current.isGodMode) setShowGodPanel(false);
      }
      if (key === 'k') {
        if (showCredits) {
          setShowCredits(false);
        } else if (gameStateRef.current.isGodMode) {
          setShowGodPanel(prev => !prev);
        }
      }
      if (key === 'q') {
        gameStateRef.current.isPaused = !gameStateRef.current.isPaused;
        setIsPaused(gameStateRef.current.isPaused);
      }
      if (key === 'v' && gameStateRef.current.isGodMode) {
        const state = gameStateRef.current;
        const boss = state.enemies.find(e => e.type === 'BOSS');
        if (boss) {
          state.godBeam = { targetX: boss.x, targetY: boss.y, startTime: performance.now() };
          boss.hp = 0; // Insta-kill
          state.screenShake = 50;
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => gameStateRef.current.keys.delete(e.key.toLowerCase());
    const handleMouseMove = (e: MouseEvent) => {
      gameStateRef.current.mouse.x = e.clientX;
      gameStateRef.current.mouse.y = e.clientY;
    };
    const handleMouseDown = () => { gameStateRef.current.mouse.pressed = true; };
    const handleMouseUp = () => { gameStateRef.current.mouse.pressed = false; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationId: number;

    const spawnEnemy = (now: number) => {
      const state = gameStateRef.current;
      const elapsed = (now - state.startTime) / 1000;

      // BOSS TRIGGER (60s)
      const triggerTime = 60;
      if (elapsed >= triggerTime && !state.bossSpawned && !state.bossInminent && !state.bossDefeated) {
        state.bossInminent = true;
        setBossAlert(true);
        state.enemies.forEach(e => createExplosion(e.x, e.y, e.color, 15));
        state.enemies = [];
        
        const spawnBoss = (bossName: string) => {
          setBossAlert(false);
          const boss: Enemy = {
            x: canvas.width / 2,
            y: -200,
            radius: 100,
            color: '#64748b',
            type: 'BOSS',
            dx: 0, dy: 1.5,
            hp: 400 * (1 + (difficulty - 1) * 0.2),
            maxHp: 400 * (1 + (difficulty - 1) * 0.2),
            scoreValue: 15000,
            lastShot: 0,
            shootCooldown: 1800,
            phase: 1,
            birthTime: performance.now(),
            theme: 'Default'
          };

          // Customize boss based on name
          if (bossName.includes('Kraken')) { boss.color = '#0ea5e9'; boss.radius = 120; }
          else if (bossName.includes('Ent')) { boss.color = '#10b981'; boss.radius = 110; }
          else if (bossName.includes('Asteroide')) { boss.color = '#78350f'; boss.radius = 130; }
          else if (bossName.includes('Cero')) { boss.color = '#bae6fd'; boss.radius = 90; }
          else if (bossName.includes('Fénix')) { boss.color = '#ef4444'; boss.radius = 100; }
          else if (bossName.includes('Liche')) { boss.color = '#a855f7'; boss.radius = 80; }
          else if (bossName.includes('Guardián')) { boss.color = '#fbbf24'; boss.radius = 150; boss.hp *= 2; boss.maxHp *= 2; }

          state.enemies.push(boss);
          state.bossSpawned = true;
          state.bossInminent = false;
          setBossHP({current: boss.hp, max: boss.maxHp, name: bossName});
        };

        setTimeout(() => {
          spawnBoss('Planeta Errante');
        }, 3000);
        return;
      }

      // METEOR SHOWER LOGIC (Always check if active)
      if (state.meteorShowerActive && now - state.lastMeteorSpawn > 200) {
        state.lastMeteorSpawn = now;
        const x = Math.random() * canvas.width;
        const y = -100;
        const radius = 20 + Math.random() * 30;
        const speed = 5 + Math.random() * 8;
        
        state.enemies.push({
          x, y, radius,
          color: '#78350f',
          type: 'MELEE',
          dx: (Math.random() - 0.5) * 3,
          dy: speed,
          hp: 1,
          maxHp: 1,
          scoreValue: 100,
          theme: 'Meteorito'
        });
      }

      // BLACK HOLE BOSS TRIGGER (120s)
      if (elapsed >= 120 && !state.blackHoleSpawned && !state.bossInminent) {
        state.bossInminent = true;
        setBossAlert(true);
        state.enemies.forEach(e => createExplosion(e.x, e.y, e.color, 15));
        state.enemies = [];
        
        setTimeout(() => {
          setBossAlert(false);
          const boss: Enemy = {
            x: canvas.width / 2,
            y: -200,
            radius: 80,
            color: '#000000',
            type: 'BOSS',
            dx: 0, dy: 1.0,
            hp: 1000 * (1 + (difficulty - 1) * 0.3),
            maxHp: 1000 * (1 + (difficulty - 1) * 0.3),
            scoreValue: 25000,
            lastShot: 0,
            shootCooldown: 4500,
            phase: 1,
            birthTime: performance.now(),
            theme: 'Agujero Negro',
            orbitals: []
          };
          
          // Init orbitals
          for (let i = 0; i < 15; i++) {
            boss.orbitals!.push({
              x: 0, y: 0,
              radius: 12 + Math.random() * 18,
              angle: Math.random() * Math.PI * 2,
              distance: 180 + Math.random() * 300,
              speed: (0.015 + Math.random() * 0.035) * (Math.random() > 0.5 ? 1 : -1),
              color: i % 2 === 0 ? '#6366f1' : '#a855f7'
            });
          }

          state.enemies.push(boss);
          state.blackHoleSpawned = true;
          state.bossSpawned = true;
          state.bossInminent = false;
          setBossHP({current: boss.hp, max: boss.maxHp, name: 'AGUJERO NEGRO'});
        }, 3000);
        return;
      }

      // VANGUARD BOSS TRIGGER (180s)
      if (elapsed >= 180 && !state.vanguardSpawned && !state.bossInminent) {
        state.bossInminent = true;
        setBossAlert(true);
        state.enemies.forEach(e => createExplosion(e.x, e.y, e.color, 15));
        state.enemies = [];
        
        setTimeout(() => {
          setBossAlert(false);
          const bossHPValue = 1500 * (1 + (difficulty - 1) * 0.4);
          const boss: Enemy = {
            x: canvas.width / 2,
            y: -300,
            radius: 90,
            color: '#334155',
            type: 'BOSS',
            dx: 0, dy: 0.8,
            hp: bossHPValue,
            maxHp: bossHPValue,
            scoreValue: 40000,
            lastShot: 0,
            lastWaveTime: 0,
            shootCooldown: 2500,
            phase: 1,
            birthTime: performance.now(),
            theme: 'Vanguardia',
            escortsSpawned: false,
          };

          state.enemies.push(boss);

          state.vanguardSpawned = true;
          state.bossSpawned = true;
          state.bossInminent = false;
          setBossHP({current: boss.hp, max: boss.maxHp, name: 'VANGUARDIA DEL VACÍO'});
        }, 3000);
        return;
      }

      // CHAOS PLANET BOSS TRIGGER (240s)
      if (elapsed >= 240 && !state.chaosBossSpawned && !state.bossInminent) {
        state.bossInminent = true;
        setBossAlert(true);
        state.enemies.forEach(e => createExplosion(e.x, e.y, e.color, 15));
        state.enemies = [];
        
        setTimeout(() => {
          setBossAlert(false);
          const boss: Enemy = {
            x: canvas.width / 2,
            y: -200,
            radius: 120,
            color: '#4ade80',
            type: 'BOSS',
            dx: 0, dy: 1.0,
            hp: 999999, // Inmortal durante el diálogo
            maxHp: 999999,
            scoreValue: 0,
            lastShot: 0,
            shootCooldown: 999999,
            phase: 1,
            birthTime: performance.now(),
            theme: 'Planeta Caos',
            dialogueStep: 0,
            isTransforming: false
          };
          
          state.enemies.push(boss);
          state.chaosBossSpawned = true;
          state.bossSpawned = true;
          state.bossInminent = false;

          // Iniciar secuencia de diálogo
          const lines = [
            { speaker: "PLANETA DEL CAOS", text: "Vaya, vaya... ¿Un pequeño guardián intentando 'limpiar' la galaxia?" },
            { speaker: "PLANETA DEL CAOS", text: "Te queda tan poco tiempo para acabar con el caos... El orden es tan aburrido." },
            { speaker: "PLANETA DEL CAOS", text: "¿Sabes qué? Sin caos, la galaxia es una absoluta mierda." },
            { speaker: "PLANETA DEL CAOS", text: "¡Disfruta de la verdadera entropía! ¡MUuuuuuuuu!" }
          ];

          let currentLine = 0;
          const nextLine = () => {
            if (currentLine < lines.length) {
              setDialogue(lines[currentLine]);
              currentLine++;
              setTimeout(nextLine, 4000);
            } else {
              setDialogue(null);
              // Transformación: El planeta se va y entra la vaca
              boss.dx = 15; // Se va rápido a la derecha
              boss.dy = -15; // Y hacia arriba
              
              setTimeout(() => {
                // Aparece la vaca desde el otro lado
                boss.x = canvas.width / 2;
                boss.y = -300;
                boss.dx = 0;
                boss.dy = 1.2;
                boss.theme = 'Vaca Gigante';
                boss.hp = 2000 * (1 + (difficulty - 1) * 0.5);
                boss.maxHp = boss.hp;
                boss.radius = 150;
                boss.color = '#ffffff';
                boss.shootCooldown = 2000;
                boss.isTransforming = false;
                setBossHP({current: boss.hp, max: boss.maxHp, name: 'LA GRAN VACA CÓSMICA'});
                
                // Iniciar lluvia de meteoritos
                state.meteorShowerActive = true;
                state.lastMeteorSpawn = performance.now();
              }, 1500);
            }
          };
          nextLine();

        }, 3000);
        return;
      }

      // PRIMORDIAL CHAOS BOSS TRIGGER (300s)
      if (elapsed >= 300 && !state.primordialChaosSpawned && !state.bossInminent) {
        state.bossInminent = true;
        setBossAlert(true);
        state.enemies.forEach(e => createExplosion(e.x, e.y, e.color, 15));
        state.enemies = [];
        
        setTimeout(() => {
          setBossAlert(false);
          const boss: Enemy = {
            x: canvas.width / 2,
            y: -400,
            radius: 250, // Much more imposing
            color: '#4ade80',
            type: 'BOSS',
            dx: 0, dy: 0.2, // Slower entry during dialogue
            hp: 999999, // Invulnerable during dialogue
            maxHp: 999999,
            scoreValue: 150000,
            lastShot: 0,
            shootCooldown: 999999,
            phase: 1,
            birthTime: performance.now(),
            theme: 'Caos Primordial'
          };
          
          state.enemies.push(boss);
          state.primordialChaosSpawned = true;
          state.bossSpawned = true;
          state.bossInminent = false;
          
          // Iniciar secuencia de diálogo
          const lines = [
            { speaker: "HERALDO DEL CAOS", text: "¿Creíste que la vaca era el final?" },
            { speaker: "HERALDO DEL CAOS", text: "Ella solo era una manifestación física de mi aburrimiento." },
            { speaker: "HERALDO DEL CAOS", text: "Yo soy el vacío que consume las estrellas. El principio y el fin." },
            { speaker: "HERALDO DEL CAOS", text: "Prepárate, pequeño guardián. El universo volverá a ser nada." }
          ];

          let currentLine = 0;
          const nextLine = () => {
            if (currentLine < lines.length) {
              setDialogue(lines[currentLine]);
              currentLine++;
              setTimeout(nextLine, 4500);
            } else {
              setDialogue(null);
              // Activar combate real
              boss.hp = 6000 * (1 + (difficulty - 1) * 0.7);
              boss.maxHp = boss.hp;
              boss.shootCooldown = 1200;
              boss.dy = 0.4;
              setBossHP({current: boss.hp, max: boss.maxHp, name: 'HERALDO DEL CAOS PRIMORDIAL'});
              
              // Efectos visuales al empezar el combate
              state.screenShake = 100;
              state.screenFlash = 0.8;
            }
          };
          nextLine();

        }, 3000);
        return;
      }

      if (state.bossInminent || state.bossSpawned) return;
      if (state.enemies.length >= ENEMY_CAP) return;

      state.enemySpawnRate = Math.max(400, (2000 - (elapsed * 60)) / (1 + (difficulty - 1) * 0.1));
      if (now - state.lastEnemySpawn < state.enemySpawnRate) return;

      const side = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      const margin = 120;
      if (side === 0) { x = -margin; y = Math.random() * canvas.height; }
      else if (side === 1) { x = canvas.width + margin; y = Math.random() * canvas.height; }
      else if (side === 2) { x = Math.random() * canvas.width; y = -margin; }
      else { x = Math.random() * canvas.width; y = canvas.height + margin; }

      const isRanged = Math.random() > (elapsed > 30 ? 0.4 : 0.7);
      const type: EnemyType = isRanged ? 'RANGED' : 'MELEE';
      
      const theme = 'Default';
      let color = type === 'RANGED' ? '#a855f7' : '#ef4444';
      let radius = type === 'RANGED' ? 20 : 16;
      let hp = (type === 'RANGED' ? 3 : 1) * (1 + Math.floor(difficulty / 3));
      let shootCooldown = (1200 + Math.random() * 1000) / (1 + (difficulty - 1) * 0.05);

      state.enemies.push({
        x, y, 
        radius, 
        type, 
        color, 
        dx: 0, dy: 0,
        hp, 
        maxHp: hp, 
        scoreValue: (type === 'RANGED' ? 300 : 150) * difficulty, 
        lastShot: now + Math.random() * 1500,
        shootCooldown,
        theme
      });
      state.lastEnemySpawn = now;
    };

    // Expose spawnEnemy to window for God Panel
    (window as any).spawnEnemy = () => spawnEnemy(performance.now());

    const spawnPowerUp = (now: number) => {
      const state = gameStateRef.current;
      const types: PowerUpType[] = ['SHIELD', 'TRIPLE_SHOT', 'RAPID_FIRE'];
      const type = types[Math.floor(Math.random() * types.length)];
      const colors = { SHIELD: '#22d3ee', TRIPLE_SHOT: '#fb923c', RAPID_FIRE: '#facc15' };
      
      state.powerUps.push({
        x: Math.random() * (window.innerWidth - 100) + 50,
        y: Math.random() * (window.innerHeight - 100) + 50,
        radius: 18,
        color: colors[type],
        type,
        spawnTime: now,
        duration: 10000,
        collected: false
      });
      state.lastPowerUpSpawn = now;
    };

    (window as any).spawnPowerUp = () => spawnPowerUp(performance.now());

    const drawPlayer = (ctx: CanvasRenderingContext2D, player: Player, timestamp: number, mouseAngle: number, now: number) => {
      const state = gameStateRef.current;
      const isHit = now - (player.hitTime || 0) < 100;
      
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(mouseAngle);
      
      if (state.isGodMode) {
        // DISEÑO SUPREMO DE MODO DEIDAD (Nave Celestial)
        // Reducido shadowBlur para performance
        const glow = Math.sin(timestamp / 100) * 10 + 15;
        ctx.shadowBlur = glow;
        ctx.shadowColor = '#fbbf24';

        // 1. Alas Celestiales de Energía (Dinámicas)
        for (let i = 0; i < 4; i++) {
          const wingScale = 1 + Math.sin(timestamp / 200 + i) * 0.1;
          const offset = i * 15;
          ctx.fillStyle = i % 2 === 0 ? `rgba(251, 191, 36, ${0.3 - i * 0.05})` : `rgba(255, 255, 255, ${0.2 - i * 0.05})`;
          
          ctx.save();
          ctx.scale(wingScale, wingScale);
          // Ala Superior
          ctx.beginPath();
          ctx.moveTo(-10 - offset, -5);
          ctx.bezierCurveTo(-40 - offset, -40 - offset, -80 - offset, -60 - offset, -30 - offset, -5);
          ctx.closePath();
          ctx.fill();
          // Ala Inferior
          ctx.beginPath();
          ctx.moveTo(-10 - offset, 5);
          ctx.bezierCurveTo(-40 - offset, 40 + offset, -80 - offset, 60 + offset, -30 - offset, 5);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // 2. Halos Sagrados Rotatorios (Multi-capa)
        const haloCount = 3;
        for (let i = 0; i < haloCount; i++) {
          ctx.save();
          ctx.rotate(timestamp / (600 + i * 200) * (i % 2 === 0 ? 1 : -1));
          ctx.strokeStyle = i === 0 ? 'rgba(255, 255, 255, 0.8)' : 'rgba(251, 191, 36, 0.4)';
          ctx.lineWidth = 2 - i * 0.5;
          ctx.setLineDash([15, 10, 5, 10]);
          ctx.beginPath();
          ctx.arc(0, 0, 50 + i * 20, 0, Math.PI * 2);
          ctx.stroke();
          
          // Glifos en los halos
          for (let j = 0; j < 4; j++) {
            const glyphAngle = (j * Math.PI) / 2;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(Math.cos(glyphAngle) * (50 + i * 20), Math.sin(glyphAngle) * (50 + i * 20), 3, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        // 3. Cuerpo de la Nave (Geometría Sagrada)
        const bodyGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 40);
        bodyGrad.addColorStop(0, '#ffffff');
        bodyGrad.addColorStop(0.3, '#fef3c7');
        bodyGrad.addColorStop(0.6, '#fbbf24');
        bodyGrad.addColorStop(1, '#d97706');
        ctx.fillStyle = bodyGrad;
        
        ctx.beginPath();
        ctx.moveTo(45, 0); // Proa
        ctx.lineTo(0, -25);
        ctx.lineTo(-35, -35);
        ctx.lineTo(-25, 0);
        ctx.lineTo(-35, 35);
        ctx.lineTo(0, 25);
        ctx.closePath();
        ctx.fill();

        // 4. Núcleo de Singularidad Blanca
        const corePulse = Math.sin(timestamp / 80) * 5 + 10;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#fff';
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(10, 0, corePulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Rayos de luz internos
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        for(let i=0; i<8; i++) {
          const a = (i / 8) * Math.PI * 2 + timestamp / 1000;
          ctx.beginPath();
          ctx.moveTo(10, 0);
          ctx.lineTo(10 + Math.cos(a) * 30, Math.sin(a) * 30);
          ctx.stroke();
        }

        // 5. Fragmentos de Realidad Orbitando
        for (let i = 0; i < 6; i++) {
          const orbitDist = 90 + Math.sin(timestamp / 500 + i) * 10;
          const angle = (timestamp / 400) + (i * Math.PI * 2 / 6);
          const ox = Math.cos(angle) * orbitDist;
          const oy = Math.sin(angle) * orbitDist;
          
          ctx.save();
          ctx.translate(ox, oy);
          ctx.rotate(angle + timestamp / 150);
          ctx.fillStyle = '#fff';
          // Removed shadowBlur from orbiting fragments
          // Forma de diamante
          ctx.beginPath();
          ctx.moveTo(8, 0); ctx.lineTo(0, -12); ctx.lineTo(-8, 0); ctx.lineTo(0, 12);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      } else {
        // Motor / Propulsor - Efecto de calor pulsante (Optimizado: sin shadowBlur)
        const thrusterSize = (state.isDashing ? 60 : 20) + Math.sin(timestamp / 30) * 10;
        const engineGrad = ctx.createLinearGradient(-10, 0, -10 - thrusterSize, 0);
        engineGrad.addColorStop(0, player.color);
        engineGrad.addColorStop(0.5, '#ffffff');
        engineGrad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = engineGrad;
        ctx.beginPath();
        ctx.moveTo(-10, -10);
        ctx.lineTo(-10 - thrusterSize, 0);
        ctx.lineTo(-10, 10);
        ctx.fill();

        // Estelas de partículas del motor
        if (Math.random() > 0.3) {
          state.particles.push({
            x: player.x - Math.cos(mouseAngle) * 15,
            y: player.y - Math.sin(mouseAngle) * 15,
            radius: Math.random() * 2 + 1,
            color: player.color,
            dx: -Math.cos(mouseAngle) * 2 + (Math.random() - 0.5),
            dy: -Math.sin(mouseAngle) * 2 + (Math.random() - 0.5),
            alpha: 0.6, life: 1, size: 2, decay: 0.05, type: 'smoke'
          });
        }

        // Diseño por tipo de nave mejorado (Optimizado: sin shadowBlur)
        if (shipConfig.type === 'INTERCEPTOR') {
          // INTERCEPTOR: Sharp, aerodynamic, sleek
          ctx.fillStyle = isHit ? '#ffffff' : player.color;
          ctx.beginPath();
          ctx.moveTo(30, 0);
          ctx.lineTo(-5, -15);
          ctx.lineTo(-15, -18);
          ctx.lineTo(-12, 0);
          ctx.lineTo(-15, 18);
          ctx.lineTo(-5, 15);
          ctx.closePath();
          ctx.fill();
          
          // Alas laterales
          ctx.fillStyle = isHit ? '#ffffff' : '#1e293b';
          ctx.beginPath();
          ctx.moveTo(5, -10);
          ctx.lineTo(-10, -25);
          ctx.lineTo(-5, -10);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(5, 10);
          ctx.lineTo(-10, 25);
          ctx.lineTo(-5, 10);
          ctx.closePath();
          ctx.fill();

          // Detalles de cabina y fuselaje
          ctx.fillStyle = isHit ? '#ffffff' : '#94a3b8';
          ctx.fillRect(-5, -2, 15, 4);
        } else if (shipConfig.type === 'STRIKER') {
          // STRIKER: Triple-pronged front, high-tech
          ctx.fillStyle = isHit ? '#ffffff' : player.color;
          ctx.beginPath();
          ctx.moveTo(35, 0); // Punta central
          ctx.lineTo(10, -8);
          ctx.lineTo(25, -22); // Punta lateral
          ctx.lineTo(-10, -15);
          ctx.lineTo(-20, -25); // Alerón trasero
          ctx.lineTo(-15, 0);
          ctx.lineTo(-20, 25);
          ctx.lineTo(-10, 15);
          ctx.lineTo(25, 22);
          ctx.lineTo(10, 8);
          ctx.closePath();
          ctx.fill();
          
          // Detalles de energía
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(15, -5); ctx.lineTo(25, -5);
          ctx.moveTo(15, 5); ctx.lineTo(25, 5);
          ctx.stroke();
        } else if (shipConfig.type === 'VANGUARD') {
          // VANGUARD: Heavy, armored, tank-like
          ctx.fillStyle = isHit ? '#ffffff' : player.color;
          // Cuerpo principal
          ctx.roundRect(-22, -24, 44, 48, 6);
          ctx.fill();
          
          // Placas de armadura frontales
          ctx.fillStyle = isHit ? '#ffffff' : '#475569';
          ctx.beginPath();
          ctx.moveTo(22, -24);
          ctx.lineTo(35, -15);
          ctx.lineTo(35, 15);
          ctx.lineTo(22, 24);
          ctx.closePath();
          ctx.fill();
          
          // Cañones pesados laterales
          ctx.fillStyle = isHit ? '#ffffff' : '#1e293b';
          ctx.fillRect(5, -30, 20, 10);
          ctx.fillRect(5, 20, 20, 10);
          
          // Núcleo de energía
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();
        }

        // Brillo en los bordes común
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Cabina común mejorada
        ctx.fillStyle = isHit ? '#ffffff' : 'rgba(30, 41, 59, 0.9)';
        ctx.beginPath();
        ctx.ellipse(10, 0, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      
      ctx.restore();
    };

    const drawBGPlanet = (ctx: CanvasRenderingContext2D, p: BGPlanet) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      // Glow
      const glow = ctx.createRadialGradient(0, 0, p.radius * 0.8, 0, 0, p.radius * 1.5);
      glow.addColorStop(0, p.color + '44');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Body
      const grad = ctx.createRadialGradient(-p.radius * 0.3, -p.radius * 0.3, 0, 0, 0, p.radius);
      grad.addColorStop(0, p.color);
      grad.addColorStop(1, '#000');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();

      // Atmosphere rim
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    };

    const drawEnemy = (ctx: CanvasRenderingContext2D, e: Enemy, now: number, angleToPlayer: number) => {
      const isHit = now - (e.hitTime || 0) < 100;
      const theme = e.theme || 'Default';
      ctx.save();
      ctx.translate(e.x, e.y);

      if (theme === 'Meteorito') {
        ctx.rotate(now / 1000);
        
        // Cuerpo de la roca irregular
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI * 2) / 8;
          const r = e.radius * (0.8 + Math.random() * 0.4);
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fill();
        
        // Cráteres
        ctx.fillStyle = '#451a03';
        for (let i = 0; i < 3; i++) {
          const mx = Math.cos(i * 2) * e.radius * 0.4;
          const my = Math.sin(i * 2) * e.radius * 0.4;
          ctx.beginPath();
          ctx.arc(mx, my, e.radius * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Brillo de fuego/reentrada
        const fireGrad = ctx.createRadialGradient(0, 0, e.radius, 0, 0, e.radius * 2);
        fireGrad.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
        fireGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = fireGrad;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius * 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        return;
      }

      if (e.type === 'BOSS') {
          // BOSS VISUALS BASED ON THEME
          const rotation = now / 5000;
          
          if (theme === 'Planeta Caos') {
            // 1. Atmósfera imponente (Brillo exterior - No rota)
            const atmosphere = ctx.createRadialGradient(0, 0, e.radius * 0.8, 0, 0, e.radius * 1.5);
            atmosphere.addColorStop(0, 'rgba(74, 222, 128, 0.4)');
            atmosphere.addColorStop(0.6, 'rgba(22, 101, 52, 0.2)');
            atmosphere.addColorStop(1, 'transparent');
            ctx.fillStyle = atmosphere;
            ctx.beginPath();
            ctx.arc(0, 0, e.radius * 1.5, 0, Math.PI * 2);
            ctx.fill();

            // 2. Cuerpo del planeta con detalles de superficie (Rota)
            ctx.save();
            ctx.rotate(now / 15000);
            
            const grad = ctx.createRadialGradient(-e.radius * 0.3, -e.radius * 0.3, 0, 0, 0, e.radius);
            grad.addColorStop(0, '#4ade80');
            grad.addColorStop(0.7, '#166534');
            grad.addColorStop(1, '#052e16');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
            ctx.fill();

            // Detalles de superficie (cráteres/manchas de caos)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            for (let i = 0; i < 6; i++) {
              const angle = (i * Math.PI * 2) / 6 + (now / 20000);
              const dist = e.radius * 0.5;
              ctx.beginPath();
              ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, e.radius * 0.2, 0, Math.PI * 2);
              ctx.fill();
            }
            
            // Cicatrices de Energía (Rotan con el planeta)
            for (let i = 0; i < 3; i++) {
              ctx.save();
              ctx.rotate(i * Math.PI / 1.5 + now / 10000);
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(e.radius * 0.5, 0);
              ctx.lineTo(e.radius * 0.9, e.radius * 0.2);
              ctx.lineTo(e.radius * 0.7, e.radius * 0.4);
              ctx.stroke();
              ctx.restore();
            }
            ctx.restore();
            
            // 3. Sistema de Anillos Múltiples (Rotación propia)
            const ringCount = 3;
            for (let i = 0; i < ringCount; i++) {
              ctx.save();
              ctx.rotate((Math.PI / 6) + (i * 0.2) + (now / (5000 + i * 1000)));
              ctx.strokeStyle = i === 1 ? 'rgba(255, 255, 255, 0.6)' : 'rgba(74, 222, 128, 0.3)';
              ctx.lineWidth = 12 - (i * 3);
              ctx.beginPath();
              ctx.ellipse(0, 0, e.radius * (1.6 + i * 0.3), e.radius * (0.3 + i * 0.1), 0, 0, Math.PI * 2);
              ctx.stroke();
              
              if (i === 1) {
                ctx.fillStyle = '#fff';
                for (let j = 0; j < 8; j++) {
                  const a = (j * Math.PI * 2) / 8 + (now / 2000);
                  ctx.beginPath();
                  ctx.arc(Math.cos(a) * e.radius * 1.9, Math.sin(a) * e.radius * 0.4, 2, 0, Math.PI * 2);
                  ctx.fill();
                }
              }
              ctx.restore();
            }
            
            // 4. Cara Imponente (ESTÁTICA, MIRANDO HACIA ABAJO)
            const eyePulse = Math.sin(now / 150) * 0.3 + 0.7;
            
            // Ojo Izquierdo
            ctx.save();
            ctx.translate(-e.radius * 0.4, e.radius * 0.2); // Y positiva para estar abajo
            ctx.rotate(-Math.PI / 8); 
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.ellipse(0, 0, e.radius * 0.2, e.radius * 0.1, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(255, 255, 255, ${eyePulse})`;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#4ade80';
            ctx.beginPath();
            ctx.ellipse(0, 0, e.radius * 0.15, e.radius * 0.04, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Ojo Derecho
            ctx.save();
            ctx.translate(e.radius * 0.4, e.radius * 0.2); // Y positiva para estar abajo
            ctx.rotate(Math.PI / 8);
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.ellipse(0, 0, e.radius * 0.2, e.radius * 0.1, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(255, 255, 255, ${eyePulse})`;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#4ade80';
            ctx.beginPath();
            ctx.ellipse(0, 0, e.radius * 0.15, e.radius * 0.04, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            ctx.shadowBlur = 0;

            // 5. Grieta del Caos (Boca amenazante mirando abajo)
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 8;
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(-e.radius * 0.5, e.radius * 0.5);
            ctx.lineTo(-e.radius * 0.2, e.radius * 0.65);
            ctx.lineTo(0, e.radius * 0.55);
            ctx.lineTo(e.radius * 0.2, e.radius * 0.65);
            ctx.lineTo(e.radius * 0.5, e.radius * 0.5);
            ctx.stroke();

            ctx.strokeStyle = `rgba(74, 222, 128, ${eyePulse})`;
            ctx.lineWidth = 3;
            ctx.stroke();
            
            ctx.restore();
            return;
          }

          if (theme === 'Vaca Gigante') {
            const time = now / 1000;
            const pulse = Math.sin(time * 2) * 5;
            
            // 1. Aura cósmica (Brillo exterior)
            const aura = ctx.createRadialGradient(0, 0, e.radius * 0.8, 0, 0, e.radius * 1.4);
            aura.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
            aura.addColorStop(0.5, 'rgba(244, 114, 182, 0.1)');
            aura.addColorStop(1, 'transparent');
            ctx.fillStyle = aura;
            ctx.beginPath();
            ctx.arc(0, 0, e.radius * 1.4, 0, Math.PI * 2);
            ctx.fill();

            ctx.rotate(Math.sin(now / 800) * 0.05);
            
            // 2. Cuerpo principal con manchas animadas
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(0, 0, e.radius + pulse, (e.radius * 0.7) + pulse, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Manchas negras (que parecen galaxias oscuras)
            ctx.fillStyle = '#0f172a';
            for (let i = 0; i < 6; i++) {
              const angle = (i * Math.PI * 2) / 6 + (now / 5000);
              const mx = Math.cos(angle) * e.radius * 0.5;
              const my = Math.sin(angle) * e.radius * 0.3;
              ctx.beginPath();
              ctx.ellipse(mx, my, 25, 15, angle, 0, Math.PI * 2);
              ctx.fill();
              
              // Pequeñas estrellas dentro de las manchas
              ctx.fillStyle = '#fff';
              ctx.beginPath();
              ctx.arc(mx + Math.sin(now/1000 + i) * 5, my + Math.cos(now/1000 + i) * 5, 1, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#0f172a';
            }
            
            // 3. Cabeza y detalles
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(e.radius * 0.8, -e.radius * 0.2, e.radius * 0.45, 0, Math.PI * 2);
            ctx.fill();
            
            // Hocico rosado brillante
            ctx.fillStyle = '#f472b6';
            ctx.beginPath();
            ctx.ellipse(e.radius * 1.05, -e.radius * 0.1, e.radius * 0.25, e.radius * 0.18, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Ojos láser (brillo intenso)
            const eyeGlow = Math.abs(Math.sin(now / 200)) * 10 + 5;
            ctx.shadowBlur = eyeGlow;
            ctx.shadowColor = '#ef4444';
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(e.radius * 0.95, -e.radius * 0.35, 10, 0, Math.PI * 2);
            ctx.arc(e.radius * 1.25, -e.radius * 0.35, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // Cuernos majestuosos
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 10;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(e.radius * 0.8, -e.radius * 0.55);
            ctx.quadraticCurveTo(e.radius * 0.7, -e.radius * 0.9, e.radius * 0.5, -e.radius * 0.8);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(e.radius * 1.1, -e.radius * 0.55);
            ctx.quadraticCurveTo(e.radius * 1.2, -e.radius * 0.9, e.radius * 1.4, -e.radius * 0.8);
            ctx.stroke();
            
            ctx.restore();
            return;
          }

          ctx.rotate(rotation);
          
          // 1. Brillo atmosférico temático
          const glowColor = theme.includes('Agua') ? 'rgba(14, 165, 233, 0.3)' :
                           theme.includes('Naturaleza') ? 'rgba(16, 185, 129, 0.3)' :
                           theme.includes('Rocas') ? 'rgba(120, 53, 15, 0.3)' :
                           theme.includes('Hielo') ? 'rgba(186, 230, 253, 0.3)' :
                           theme.includes('Fuego') ? 'rgba(239, 68, 68, 0.3)' :
                           theme.includes('Huesos') ? 'rgba(168, 85, 247, 0.3)' :
                           'rgba(59, 130, 246, 0.3)';

          const glow = ctx.createRadialGradient(0, 0, e.radius * 0.8, 0, 0, e.radius + 80);
          glow.addColorStop(0, glowColor);
          glow.addColorStop(0.5, glowColor.replace('0.3', '0.1'));
          glow.addColorStop(1, 'transparent');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(0, 0, e.radius + 80, 0, Math.PI * 2);
          ctx.fill();

            // 2. Estructura Base (No es un simple círculo)
            if (theme !== 'Agujero Negro') {
              // Anillo exterior rotatorio (contrasentido)
              ctx.save();
              ctx.rotate(-rotation * 2.5);
              ctx.strokeStyle = isHit ? '#fff' : e.color;
              ctx.lineWidth = 4;
              ctx.setLineDash([15, 15]);
              ctx.beginPath();
              ctx.arc(0, 0, e.radius * 1.15, 0, Math.PI * 2);
              ctx.stroke();
              
              // Segundo anillo más fino
              ctx.rotate(rotation * 1.5);
              ctx.lineWidth = 2;
              ctx.setLineDash([5, 10]);
              ctx.beginPath();
              ctx.arc(0, 0, e.radius * 1.25, 0, Math.PI * 2);
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.restore();
              
              // Segmentos de escudo flotantes
              for (let i = 0; i < 4; i++) {
                ctx.rotate(Math.PI / 2);
                ctx.strokeStyle = e.color;
                ctx.lineWidth = 6;
                ctx.shadowBlur = 15;
                ctx.shadowColor = e.color;
                ctx.beginPath();
                ctx.arc(0, 0, e.radius * 1.4, -0.4, 0.4);
                ctx.stroke();
                ctx.shadowBlur = 0;
                
                // Pequeños nodos en los escudos
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(e.radius * 1.4, 0, 4, 0, Math.PI * 2);
                ctx.fill();
              }
              
              // Pinchos/Estructuras mecánicas
              for (let i = 0; i < 8; i++) {
                ctx.rotate(Math.PI / 4);
                ctx.fillStyle = isHit ? '#fff' : '#334155';
                ctx.beginPath();
                ctx.moveTo(e.radius * 0.8, -10);
                ctx.lineTo(e.radius * 1.3, 0);
                ctx.lineTo(e.radius * 0.8, 10);
                ctx.closePath();
                ctx.fill();
                
                // Detalles mecánicos en los pinchos
                ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(e.radius * 0.9, -5);
                ctx.lineTo(e.radius * 1.2, 0);
                ctx.lineTo(e.radius * 0.9, 5);
                ctx.stroke();
                
                // Luces en los pinchos
                ctx.fillStyle = e.color;
                ctx.beginPath();
                ctx.arc(e.radius * 1.1, 0, 4, 0, Math.PI * 2);
                ctx.fill();
              }

              // Cuerpo principal (Hexágono o forma compleja)
              ctx.fillStyle = isHit ? '#ffffff' : '#1e293b';
              ctx.beginPath();
              for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2;
                const r = e.radius * (i % 2 === 0 ? 1 : 0.9);
                ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
              }
              ctx.closePath();
              ctx.fill();
              ctx.strokeStyle = isHit ? '#fff' : e.color;
              ctx.lineWidth = 4;
              ctx.stroke();
              
              // Placas de blindaje adicionales
              ctx.fillStyle = '#334155';
              for (let i = 0; i < 4; i++) {
                ctx.rotate(Math.PI / 2);
                ctx.fillRect(e.radius * 0.4, -e.radius * 0.2, e.radius * 0.4, e.radius * 0.4);
                ctx.strokeStyle = e.color;
                ctx.strokeRect(e.radius * 0.4, -e.radius * 0.2, e.radius * 0.4, e.radius * 0.4);
                
                // Cañones en las placas
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(e.radius * 0.7, -5, 15, 10);
                ctx.fillStyle = e.color;
                ctx.beginPath();
                ctx.arc(e.radius * 0.85, 0, 3, 0, Math.PI * 2);
                ctx.fill();
              }
              
              // Arcos de energía internos
              ctx.save();
              ctx.rotate(rotation * 4);
              ctx.strokeStyle = e.color;
              ctx.lineWidth = 3;
              ctx.globalAlpha = 0.7;
              ctx.shadowBlur = 10;
              ctx.shadowColor = e.color;
              for (let i = 0; i < 6; i++) {
                ctx.rotate(Math.PI * 2 / 6);
                ctx.beginPath();
                ctx.moveTo(e.radius * 0.2, 0);
                ctx.quadraticCurveTo(e.radius * 0.5, e.radius * (0.4 * Math.sin(now / 200 + i)), e.radius * 0.7, 0);
                ctx.stroke();
              }
              ctx.restore();

              // Núcleo de energía pulsante
              const corePulse = Math.sin(now / 150) * 0.25 + 0.75;
              const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, e.radius * 0.6);
              coreGrad.addColorStop(0, '#fff');
              coreGrad.addColorStop(0.3, e.color);
              coreGrad.addColorStop(0.7, 'rgba(0,0,0,0.8)');
              coreGrad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = coreGrad;
            ctx.beginPath();
            ctx.arc(0, 0, e.radius * 0.5 * corePulse, 0, Math.PI * 2);
            ctx.fill();
            
            // Rayos de energía del núcleo
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.4 * corePulse;
            for (let i = 0; i < 8; i++) {
              const a = (i / 8) * Math.PI * 2 + (now / 1000);
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(Math.cos(a) * e.radius * 0.8, Math.sin(a) * e.radius * 0.8);
              ctx.stroke();
            }
            
            // Partículas de energía orbitando el núcleo
            ctx.fillStyle = '#fff';
            for (let i = 0; i < 4; i++) {
              const a = (now / 500) + (i * Math.PI / 2);
              const d = e.radius * 0.3;
              ctx.beginPath();
              ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 2, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.globalAlpha = 1.0;
          }

          // Hit flash overlay (si no es agujero negro, ya que este tiene su propio flujo)
          if (isHit && theme !== 'Agujero Negro') {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.beginPath();
            ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

        // Detalles temáticos: AGUJERO NEGRO CÓSMICO (Nebula Vortex)
        if (theme === 'Agujero Negro') {
          ctx.save();
          
          // 1. Gran Vórtice de Nebulosa (Capas rotatorias)
          const nebulaLayers = 5;
          for (let i = 0; i < nebulaLayers; i++) {
            ctx.save();
            // Cada capa rota a una velocidad ligeramente diferente
            ctx.rotate(now / (2000 + i * 500) * (i % 2 === 0 ? 1 : -1));
            
            const layerRadius = e.radius * (1.5 + i * 0.4);
            const nebulaGrad = ctx.createRadialGradient(0, 0, e.radius, 0, 0, layerRadius);
            
            // Colores basados en la imagen: Púrpuras, Azules y Cianes
            if (i % 2 === 0) {
              nebulaGrad.addColorStop(0, 'rgba(147, 51, 234, 0.4)'); // Purple
              nebulaGrad.addColorStop(0.5, 'rgba(79, 70, 229, 0.2)'); // Indigo
            } else {
              nebulaGrad.addColorStop(0, 'rgba(37, 99, 235, 0.3)'); // Blue
              nebulaGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.1)'); // Cyan
            }
            nebulaGrad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = nebulaGrad;
            ctx.globalCompositeOperation = 'lighter';
            
            // Dibujamos una forma irregular para la nebulosa
            ctx.beginPath();
            for (let j = 0; j < 8; j++) {
              const angle = (j / 8) * Math.PI * 2;
              const dist = layerRadius * (0.8 + Math.sin(now / 500 + i + j) * 0.2);
              ctx.lineTo(Math.cos(angle) * dist, Math.sin(angle) * dist);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }

          // 2. Escombros y Asteroides (Debris)
          const debrisCount = 25;
          for (let i = 0; i < debrisCount; i++) {
            const orbitSpeed = 0.001 + (i * 0.0002);
            const angle = (now * orbitSpeed) + (i * 137.5); // Ángulo áureo para distribución
            const orbitDist = e.radius * 1.2 + (i * 4);
            const x = Math.cos(angle) * orbitDist;
            const y = Math.sin(angle) * orbitDist;
            const size = (i % 5 === 0) ? 4 : 2;
            
            ctx.fillStyle = i % 3 === 0 ? '#1e293b' : '#0f172a'; // Rocas oscuras
            ctx.beginPath();
            // Formas irregulares para las rocas
            ctx.rect(x, y, size, size);
            ctx.fill();
            
            // Pequeño brillo en algunas rocas
            if (i % 7 === 0) {
              ctx.fillStyle = '#60a5fa';
              ctx.globalAlpha = 0.5;
              ctx.beginPath();
              ctx.arc(x, y, 1, 0, Math.PI * 2);
              ctx.fill();
              ctx.globalAlpha = 1.0;
            }
          }

          // 3. Horizonte de Sucesos (Centro Negro Absoluto)
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
          ctx.fill();
          
          // 4. Brillo de Borde (Event Horizon Glow)
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, e.radius + 2, 0, Math.PI * 2);
          ctx.stroke();
          
          // 5. Estrellas y Chispas de Energía internas
          for (let i = 0; i < 15; i++) {
            const angle = (now / 1000) + (i * 2);
            const dist = e.radius * (0.5 + Math.random() * 1.5);
            const alpha = 0.3 + Math.sin(now / 300 + i) * 0.3;
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
          
          ctx.restore(); // Restaura el save de la línea 789 (aprox)
        } else if (theme === 'Vanguardia') {
          // VANGUARDIA DEL VACÍO: Nave de Guerra Ultra-Detallada
          ctx.save();
          
          // 1. Alas laterales con motores
          ctx.fillStyle = isHit ? '#fff' : '#1e293b';
          ctx.beginPath();
          // Ala Izquierda
          ctx.moveTo(-e.radius * 0.5, -e.radius * 0.2);
          ctx.lineTo(-e.radius * 1.5, e.radius * 0.5);
          ctx.lineTo(-e.radius * 1.2, e.radius * 0.8);
          ctx.lineTo(-e.radius * 0.3, e.radius * 0.4);
          ctx.fill();
          // Ala Derecha
          ctx.moveTo(e.radius * 0.5, -e.radius * 0.2);
          ctx.lineTo(e.radius * 1.5, e.radius * 0.5);
          ctx.lineTo(e.radius * 1.2, e.radius * 0.8);
          ctx.lineTo(e.radius * 0.3, e.radius * 0.4);
          ctx.fill();

          // Motores en las alas
          const enginePulse = Math.sin(now / 100) * 0.3 + 0.7;
          ctx.fillStyle = '#0ea5e9';
          ctx.beginPath();
          ctx.arc(-e.radius * 1.3, e.radius * 0.6, 10 * enginePulse, 0, Math.PI * 2);
          ctx.arc(e.radius * 1.3, e.radius * 0.6, 10 * enginePulse, 0, Math.PI * 2);
          ctx.fill();

          // 2. Cuerpo Central Blindado
          ctx.fillStyle = isHit ? '#fff' : '#334155';
          ctx.beginPath();
          ctx.moveTo(0, -e.radius * 1.2); // Punta
          ctx.lineTo(e.radius * 0.6, -e.radius * 0.4);
          ctx.lineTo(e.radius * 0.8, e.radius * 0.8);
          ctx.lineTo(-e.radius * 0.8, e.radius * 0.8);
          ctx.lineTo(-e.radius * 0.6, -e.radius * 0.4);
          ctx.closePath();
          ctx.fill();
          
          // Placas de blindaje (detalles de líneas)
          ctx.strokeStyle = 'rgba(255,255,255,0.2)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-e.radius * 0.4, -e.radius * 0.4);
          ctx.lineTo(e.radius * 0.4, -e.radius * 0.4);
          ctx.moveTo(-e.radius * 0.6, 0);
          ctx.lineTo(e.radius * 0.6, 0);
          ctx.stroke();

          // 3. Puente de Mando (Cabina)
          ctx.fillStyle = isHit ? '#fff' : '#0ea5e9';
          ctx.beginPath();
          ctx.ellipse(0, -e.radius * 0.2, 15, 25, 0, 0, Math.PI * 2);
          ctx.fill();
          
          // 4. Cañones de Misiles
          ctx.fillStyle = '#475569';
          ctx.fillRect(-e.radius * 0.5, e.radius * 0.2, 15, 30);
          ctx.fillRect(e.radius * 0.5 - 15, e.radius * 0.2, 15, 30);

          // 5. Núcleo de Energía (Pulsante)
          const coreSize = e.radius * 0.3 * (Math.sin(now / 200) * 0.1 + 0.9);
          const coreGrad = ctx.createRadialGradient(0, e.radius * 0.4, 0, 0, e.radius * 0.4, coreSize);
          coreGrad.addColorStop(0, '#fff');
          coreGrad.addColorStop(0.5, '#0ea5e9');
          coreGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = coreGrad;
          ctx.beginPath();
          ctx.arc(0, e.radius * 0.4, coreSize, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();

          // 3. Escudo de invulnerabilidad (Vanguardia)
          if (theme === 'Vanguardia') {
            const hasEscorts = gameStateRef.current.enemies.some(esc => esc.theme === 'Interceptor de Élite' && esc.hp > 0);
            if (hasEscorts) {
              ctx.save();
              ctx.rotate(now / 500);
              ctx.strokeStyle = '#0ea5e9';
              ctx.lineWidth = 4;
              ctx.shadowBlur = 20;
              ctx.shadowColor = '#0ea5e9';
              ctx.beginPath();
              ctx.arc(0, 0, e.radius * 1.6, 0, Math.PI * 2);
              ctx.stroke();
              
              ctx.setLineDash([10, 5]);
              ctx.beginPath();
              ctx.arc(0, 0, e.radius * 1.5, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
            }
          }
        } else if (theme === 'Interceptor de Élite') {
          // DISEÑO INTERCEPTOR: Nave de asalto rápida y aerodinámica
          ctx.save();
          ctx.rotate(angleToPlayer + Math.PI / 2);
          
          // 1. Alas laterales (Sleek)
          ctx.fillStyle = isHit ? '#fff' : '#1e293b';
          ctx.beginPath();
          // Ala Izquierda
          ctx.moveTo(-e.radius * 0.2, 0);
          ctx.lineTo(-e.radius * 1.2, e.radius * 0.8);
          ctx.lineTo(-e.radius * 0.4, e.radius * 0.4);
          ctx.fill();
          // Ala Derecha
          ctx.moveTo(e.radius * 0.2, 0);
          ctx.lineTo(e.radius * 1.2, e.radius * 0.8);
          ctx.lineTo(e.radius * 0.4, e.radius * 0.4);
          ctx.fill();

          // 2. Cuerpo Central (Puntiagudo)
          ctx.fillStyle = isHit ? '#fff' : '#334155';
          ctx.beginPath();
          ctx.moveTo(0, -e.radius * 1.2); // Punta
          ctx.lineTo(e.radius * 0.4, e.radius * 0.4);
          ctx.lineTo(-e.radius * 0.4, e.radius * 0.4);
          ctx.closePath();
          ctx.fill();

          // 3. Motores de Plasma (Brillo Cian)
          const enginePulse = Math.sin(now / 100) * 0.3 + 0.7;
          ctx.fillStyle = '#22d3ee';
          ctx.shadowBlur = 15; ctx.shadowColor = '#22d3ee';
          ctx.beginPath();
          ctx.arc(-e.radius * 0.6, e.radius * 0.4, 6 * enginePulse, 0, Math.PI * 2);
          ctx.arc(e.radius * 0.6, e.radius * 0.4, 6 * enginePulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // 4. Cabina (Ojo de piloto)
          ctx.fillStyle = '#0ea5e9';
          ctx.beginPath();
          ctx.ellipse(0, -e.radius * 0.2, 4, 8, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        } else if (theme === 'Centinela Prisma') {
          // DISEÑO PRISMA: Diamante Cristalino (Elegante y místico)
          ctx.save();
          ctx.rotate(now / 1500); // Rotación lenta
          
          // 1. Cuerpo de diamante
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, e.radius);
          grad.addColorStop(0, isHit ? '#fff' : '#e0f2fe');
          grad.addColorStop(1, isHit ? '#fff' : '#38bdf8');
          ctx.fillStyle = grad;
          
          ctx.beginPath();
          ctx.moveTo(0, -e.radius * 1.2);
          ctx.lineTo(e.radius * 0.8, 0);
          ctx.lineTo(0, e.radius * 1.2);
          ctx.lineTo(-e.radius * 0.8, 0);
          ctx.closePath();
          ctx.fill();

          // 2. Alas de cristal laterales
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.beginPath();
          ctx.moveTo(e.radius * 0.8, 0);
          ctx.lineTo(e.radius * 1.4, -e.radius * 0.5);
          ctx.lineTo(e.radius * 1.2, e.radius * 0.5);
          ctx.closePath();
          ctx.fill();
          
          ctx.beginPath();
          ctx.moveTo(-e.radius * 0.8, 0);
          ctx.lineTo(-e.radius * 1.4, -e.radius * 0.5);
          ctx.lineTo(-e.radius * 1.2, e.radius * 0.5);
          ctx.closePath();
          ctx.fill();

          // 3. Núcleo cambiante
          const hue = (now / 20) % 360;
          ctx.fillStyle = `hsla(${hue}, 70%, 70%, 0.8)`;
          ctx.shadowBlur = 15; ctx.shadowColor = `hsla(${hue}, 70%, 70%, 1)`;
          ctx.beginPath();
          ctx.arc(0, 0, e.radius * 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.restore();
        } else if (theme === 'Guardián Ónice') {
          // DISEÑO ÓNICE: Esfera de Obsidiana (Pesado y oscuro)
          ctx.save();
          ctx.rotate(-now / 2000);
          
          // 1. Placas exteriores rotatorias
          ctx.strokeStyle = '#1e1b4b';
          ctx.lineWidth = 6;
          for(let i=0; i<4; i++) {
            const a = (now / 1000) + (i * Math.PI / 2);
            ctx.beginPath();
            ctx.arc(0, 0, e.radius * 1.1, a, a + Math.PI / 3);
            ctx.stroke();
          }

          // 2. Cuerpo central (Ónice)
          const grad = ctx.createRadialGradient(-10, -10, 0, 0, 0, e.radius);
          grad.addColorStop(0, isHit ? '#fff' : '#475569');
          grad.addColorStop(1, isHit ? '#fff' : '#0f172a');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
          ctx.fill();

          // 3. Ojo central amenazante
          const pulse = Math.sin(now / 150) * 0.2 + 0.8;
          ctx.fillStyle = '#ef4444';
          ctx.shadowBlur = 20; ctx.shadowColor = '#ef4444';
          ctx.beginPath();
          ctx.ellipse(0, 0, e.radius * 0.5 * pulse, e.radius * 0.2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.restore();
        } else if (theme === 'Escolta Vanguardia') {
          // Fallback para el diseño anterior si fuera necesario
          ctx.strokeStyle = 'rgba(255,255,255,0.2)';
          ctx.lineWidth = 2;
          for(let i=0; i<3; i++) {
            ctx.beginPath();
            ctx.arc(0, 0, e.radius - 10 - i*15, now/1000 + i, now/1000 + i + Math.PI);
            ctx.stroke();
          }
        } else if (theme.includes('Rocas')) {
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          for(let i=0; i<8; i++) {
            const a = i * Math.PI / 4;
            ctx.fillRect(Math.cos(a)*e.radius*0.6, Math.sin(a)*e.radius*0.6, 20, 20);
          }
        } else if (theme.includes('Fuego')) {
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(0, 0, e.radius + 5, 0, Math.PI * 2);
          ctx.stroke();
        }

      } else if (e.type === 'RANGED') {
        // NAVE RANGED: Interceptor de Combate Estilizado
        ctx.rotate(angleToPlayer + Math.PI / 2);
        
        // 1. Alas laterales con alerones
        ctx.fillStyle = isHit ? '#fff' : '#4c1d95';
        ctx.beginPath();
        // Ala Izquierda
        ctx.moveTo(-e.radius * 0.2, 0);
        ctx.lineTo(-e.radius * 1.1, e.radius * 0.7);
        ctx.lineTo(-e.radius * 0.4, e.radius * 0.3);
        ctx.fill();
        // Ala Derecha
        ctx.moveTo(e.radius * 0.2, 0);
        ctx.lineTo(e.radius * 1.1, e.radius * 0.7);
        ctx.lineTo(e.radius * 0.4, e.radius * 0.3);
        ctx.fill();

        // 2. Cuerpo Central Aerodinámico
        ctx.fillStyle = isHit ? '#fff' : '#7c3aed';
        ctx.beginPath();
        ctx.moveTo(0, -e.radius * 1.1); // Punta
        ctx.lineTo(e.radius * 0.5, e.radius * 0.4);
        ctx.lineTo(-e.radius * 0.5, e.radius * 0.4);
        ctx.closePath();
        ctx.fill();
        
        // 3. Cabina / Ojo de IA
        ctx.fillStyle = isHit ? '#fff' : '#c084fc';
        ctx.beginPath();
        ctx.ellipse(0, -e.radius * 0.2, 4, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // 4. Motores de Plasma (Efecto de estela corta)
        const enginePulse = Math.sin(now / 100) * 0.3 + 0.7;
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(-e.radius * 0.5, e.radius * 0.4, 5 * enginePulse, 0, Math.PI * 2);
        ctx.arc(e.radius * 0.5, e.radius * 0.4, 5 * enginePulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Llamas de los motores
        ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
        ctx.beginPath();
        ctx.moveTo(-e.radius * 0.6, e.radius * 0.4);
        ctx.lineTo(-e.radius * 0.5, e.radius * 0.8 * enginePulse);
        ctx.lineTo(-e.radius * 0.4, e.radius * 0.4);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(e.radius * 0.6, e.radius * 0.4);
        ctx.lineTo(e.radius * 0.5, e.radius * 0.8 * enginePulse);
        ctx.lineTo(e.radius * 0.4, e.radius * 0.4);
        ctx.fill();

        // 5. Cañones en las alas
        ctx.fillStyle = '#4c1d95';
        ctx.fillRect(-e.radius * 0.8, e.radius * 0.1, 4, 12);
        ctx.fillRect(e.radius * 0.8 - 4, e.radius * 0.1, 4, 12);

      } else {
        // NAVE MELEE: Trituradora de Plasma (Diseño agresivo y rotatorio)
        const rot = now / 150;
        ctx.rotate(rot);
        
        // 1. Cuchillas rotatorias (Efecto de sierra)
        const blades = 4;
        ctx.fillStyle = isHit ? '#fff' : '#991b1b';
        for (let i = 0; i < blades; i++) {
          ctx.rotate(Math.PI * 2 / blades);
          ctx.beginPath();
          ctx.moveTo(e.radius * 0.4, -e.radius * 0.2);
          ctx.lineTo(e.radius * 1.3, 0);
          ctx.lineTo(e.radius * 0.4, e.radius * 0.2);
          ctx.closePath();
          ctx.fill();
          
          // Filo de la cuchilla
          ctx.strokeStyle = isHit ? '#fff' : '#ef4444';
          ctx.lineWidth = 2;
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(e.radius * 0.4, -e.radius * 0.2);
          ctx.lineTo(e.radius * 1.3, 0);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // 2. Núcleo Central Blindado (Octágono)
        ctx.fillStyle = isHit ? '#fff' : '#450a0a';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          ctx.lineTo(Math.cos(a) * e.radius * 0.7, Math.sin(a) * e.radius * 0.7);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = isHit ? '#fff' : '#991b1b';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 3. Ojo Central Pulsante (Energía inestable)
        const pulse = Math.sin(now / 100) * 0.2 + 0.8;
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, e.radius * 0.4);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.5, '#ef4444');
        grad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius * 0.4 * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // 4. Pequeños escapes de energía
        ctx.rotate(-rot * 2); // Rotación inversa para las chispas
        ctx.fillStyle = '#f87171';
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + (now / 500);
          const d = e.radius * 0.5;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    };

    const drawProjectile = (ctx: CanvasRenderingContext2D, p: Projectile) => {
      ctx.save();
      const angle = Math.atan2(p.dy, p.dx);
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);
      
      const length = p.fromEnemy ? (p.isMissile ? 30 : 15) : 20;
      const width = p.radius * 1.5;
      
      // Removed shadowBlur for performance
      
      if (p.isMissile) {
        // DISEÑO DE METEORITO ÉPICO
        const now = performance.now();
        
        // 1. Estela de fuego multi-capa (Tail)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const tailLength = length * 4;
        const fireGrad = ctx.createLinearGradient(0, 0, -tailLength, 0);
        fireGrad.addColorStop(0, p.color);
        fireGrad.addColorStop(0.3, 'rgba(249, 115, 22, 0.8)'); // Orange
        fireGrad.addColorStop(0.6, 'rgba(239, 68, 68, 0.4)');  // Red
        fireGrad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = fireGrad;
        ctx.beginPath();
        ctx.moveTo(0, -width * 0.8);
        ctx.quadraticCurveTo(-tailLength * 0.5, -width * 1.5, -tailLength, 0);
        ctx.quadraticCurveTo(-tailLength * 0.5, width * 1.5, 0, width * 0.8);
        ctx.fill();
        
        // Chispas en la estela
        for (let i = 0; i < 5; i++) {
          const sparkX = -Math.random() * tailLength;
          const sparkY = (Math.random() - 0.5) * width * 2;
          const sparkSize = Math.random() * 3;
          ctx.fillStyle = '#fff';
          ctx.globalAlpha = Math.random() * 0.5;
          ctx.beginPath();
          ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // 2. Cuerpo Rocoso Irregular
        ctx.fillStyle = '#1c1917'; // Piedra volcánica muy oscura
        ctx.beginPath();
        const segments = 8;
        for (let i = 0; i < segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          // Variación de radio para forma irregular
          const rVar = Math.sin(i * 1.5 + now / 100) * 5;
          const r = p.radius + rVar;
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        
        // Borde de calor
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // 3. Grietas de Magma/Energía
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = '#fde047'; // Amarillo brillante
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const startAngle = (i * Math.PI * 2) / 3;
          ctx.moveTo(Math.cos(startAngle) * p.radius * 0.2, Math.sin(startAngle) * p.radius * 0.2);
          ctx.lineTo(Math.cos(startAngle) * p.radius * 0.8, Math.sin(startAngle) * p.radius * 0.8);
        }
        ctx.stroke();
        ctx.restore();

        // 4. Brillo del Horizonte de Calor (Glow)
        const heatGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, p.radius * 2);
        heatGlow.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        heatGlow.addColorStop(0.5, p.color + '33'); // 20% opacity
        heatGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = heatGlow;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 2, 0, Math.PI * 2);
        ctx.fill();

      } else {
        // Bullet design with bloom
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, length);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.2, p.color);
        grad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = grad;
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.ellipse(0, 0, length, width, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Core
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.ellipse(0, 0, length * 0.6, width * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    };

    const update = (timestamp: number) => {
      const state = gameStateRef.current;
      const player = state.player;
      const keys = state.keys;
      const now = performance.now();
      
      const deltaTime = now - state.lastFrameTime;

      if (state.isPaused) {
        state.lastFrameTime = now;
        state.startTime += deltaTime;
        state.lastShot += deltaTime;
        state.lastEnemySpawn += deltaTime;
        state.lastPowerUpSpawn += deltaTime;
        state.lastDash += deltaTime;
        state.lastSpecialAbility += deltaTime;
        state.lastPlanetSpawn += deltaTime;
        
        // Ajustar expiración de efectos activos
        Object.keys(state.activeEffects).forEach(type => {
          state.activeEffects[type] += deltaTime;
        });

        // Ajustar tiempos de entidades
        state.enemies.forEach(e => {
          if (e.birthTime) e.birthTime += deltaTime;
          if (e.lastShot) e.lastShot += deltaTime;
          if (e.lastMissileShot) e.lastMissileShot += deltaTime;
          if (e.lastWaveTime) e.lastWaveTime += deltaTime;
          if (e.hitTime) e.hitTime += deltaTime;
        });
        state.projectiles.forEach(p => { if (p.spawnTime) p.spawnTime += deltaTime; });
        state.enemyProjectiles.forEach(p => { if (p.spawnTime) p.spawnTime += deltaTime; });
        state.powerUps.forEach(pu => { if (pu.spawnTime) pu.spawnTime += deltaTime; });

        animationId = requestAnimationFrame(update);
        return;
      }
      
      state.lastFrameTime = now;

      // Pausar el tiempo de supervivencia y progresión si hay un boss activo o inminente
      if (state.bossSpawned || state.bossInminent) {
        state.startTime += deltaTime;
      }

      const dropPowerUp = (x: number, y: number, chance = 0.07) => {
        if (Math.random() > chance) return; 
        const types: PowerUpType[] = ['SHIELD', 'TRIPLE_SHOT', 'RAPID_FIRE'];
        const type = types[Math.floor(Math.random() * types.length)];
        const colors = { SHIELD: '#3b82f6', TRIPLE_SHOT: '#f59e0b', RAPID_FIRE: '#ef4444' };
        state.powerUps.push({
          x, y, radius: 15, color: colors[type], type,
          spawnTime: now, duration: 8000, collected: false
        });
      };

      if (state.screenShake > 0) {
        state.screenShake *= 0.9;
        ctx.save();
        ctx.translate((Math.random() - 0.5) * state.screenShake, (Math.random() - 0.5) * state.screenShake);
      }

      // Borrado con fondo animado
      const elapsed = (now - state.startTime) / 1000;
      const bgHue = (elapsed * 0.5) % 360;
      const bgPulse = Math.sin(elapsed / 5) * 0.05 + 0.05;
      
      // Base color shifting
      ctx.fillStyle = `hsl(${bgHue}, 20%, 3%)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Dynamic Nebula Glow
      const bgGrad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.8
      );
      bgGrad.addColorStop(0, `hsla(${(bgHue + 180) % 360}, 30%, 10%, ${0.1 + bgPulse})`);
      bgGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = bgGrad;
      ctx.globalCompositeOperation = 'screen';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';

      // Distant Energy Waves (Space-Time Distortion)
      if (elapsed > 30) {
        ctx.save();
        ctx.globalAlpha = 0.05;
        ctx.strokeStyle = `hsla(${bgHue}, 50%, 50%, 0.5)`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const waveOffset = (elapsed * 50 + i * 200) % (canvas.width * 1.5);
          ctx.beginPath();
          ctx.arc(canvas.width / 2, canvas.height / 2, waveOffset, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // BACKGROUND PLANETS
      if (!state.bossSpawned && !state.bossInminent && now - state.lastPlanetSpawn > 12000) { // Spawn every 12s
        const types: BGPlanet['type'][] = ['ROCKY', 'GAS_GIANT', 'ICE', 'LAVA'];
        const type = types[Math.floor(Math.random() * types.length)];
        const radius = 40 + Math.random() * 120;
        state.bgPlanets.push({
          id: Date.now(),
          x: Math.random() * canvas.width,
          y: -radius * 2.5,
          radius,
          color: type === 'ROCKY' ? '#94a3b8' : type === 'GAS_GIANT' ? '#f59e0b' : type === 'ICE' ? '#3b82f6' : '#ef4444',
          speed: 0.3 + Math.random() * 0.4,
          type,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.002,
          hp: Math.floor(radius / 2),
          maxHp: Math.floor(radius / 2)
        });
        state.lastPlanetSpawn = now;
      }

      // Update background offset for scrolling effect
      state.bgOffset.y += 0.4;

      // NEBULOSAS DE FONDO OPTIMIZADAS
      if (offscreenNebulaRef.current) {
        const nx = (state.bgOffset.x * 0.05) % (canvas.width * 0.5);
        const ny = (state.bgOffset.y * 0.05) % (canvas.height * 0.5);
        ctx.drawImage(offscreenNebulaRef.current, -canvas.width * 0.25 + nx, -canvas.height * 0.25 + ny);
      }

      // ESTRELLAS OPTIMIZADAS (Capa base)
      if (offscreenStarsRef.current) {
        const sx = (state.bgOffset.x * 0.2) % canvas.width;
        const sy = (state.bgOffset.y * 0.2) % canvas.height;
        
        ctx.drawImage(offscreenStarsRef.current, sx, sy);
        ctx.drawImage(offscreenStarsRef.current, sx - canvas.width, sy);
        ctx.drawImage(offscreenStarsRef.current, sx, sy - canvas.height);
        ctx.drawImage(offscreenStarsRef.current, sx - canvas.width, sy - canvas.height);
      }

      // BACKGROUND PLANETS (Drawn over stars but under ships)
      if (state.bossSpawned || state.bossInminent) {
        state.bgPlanets = [];
      }
      
      state.bgPlanets = state.bgPlanets.filter(p => {
        if (p.hp <= 0) {
          // Explode!
          createExplosion(p.x, p.y, p.color, 40, 'plasma');
          state.screenShake = 15;

          // Radial damage to enemies - One hit kill
          const explosionRadius = p.radius * 3;
          state.enemies.forEach(e => {
            const dx = e.x - p.x;
            const dy = e.y - p.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < explosionRadius * explosionRadius) {
              e.hp = 0;
              e.hitTime = now;
            }
          });

          // Create lethal fragments
          const fragmentCount = 12 + Math.floor(p.radius / 10);
          
          // Drop power-up on planet explosion (100% chance)
          dropPowerUp(p.x, p.y, 1.0);
          
          for (let i = 0; i < fragmentCount; i++) {
            const angle = (i / fragmentCount) * Math.PI * 2 + Math.random() * 0.5;
            const speed = 3 + Math.random() * 5;
            state.particles.push({
              x: p.x,
              y: p.y,
              radius: 4 + Math.random() * 6,
              dx: Math.cos(angle) * speed,
              dy: Math.sin(angle) * speed,
              color: p.color,
              alpha: 1,
              life: 100,
              size: 4 + Math.random() * 6,
              decay: 0.01 + Math.random() * 0.01,
              isLethal: true
            });
          }
          return false;
        }
        p.y += p.speed;
        p.rotation += p.rotationSpeed;
        drawBGPlanet(ctx, p);
        return p.y < canvas.height + p.radius * 3;
      });

      spawnEnemy(now);

      const isFrozen = player.frozenUntil && now < player.frozenUntil;
      const isSlowed = player.slowedUntil && now < player.slowedUntil;
      const moveSpeed = player.speed * (isSlowed ? 0.5 : 1) * (isFrozen ? 0 : 1);

      const moveX = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
      const moveY = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);

      if (keys.has(' ') && !state.isDashing && (state.isGodMode || now - state.lastDash > state.dashCooldown)) {
        state.isDashing = true; state.dashTime = now; state.lastDash = now;
        state.dashReady = false;
        
        // Dash en la dirección del movimiento si se están pulsando teclas, si no, hacia el ratón
        let dashAngle = Math.atan2(state.mouse.y - player.y, state.mouse.x - player.x);
        if (moveX !== 0 || moveY !== 0) {
          dashAngle = Math.atan2(moveY, moveX);
        }
        
        state.dashVelocity = { x: Math.cos(dashAngle) * 28, y: Math.sin(dashAngle) * 28 };
        setDashReady(false);
        state.screenShake = 10;
        createExplosion(player.x, player.y, '#ffffff', 8);
      }

      if (state.isDashing) {
        if (now - state.dashTime > state.dashDuration) state.isDashing = false;
        else { 
          player.x += state.dashVelocity.x * state.timeScale; 
          player.y += state.dashVelocity.y * state.timeScale; 
          // Añadir fantasmas de dash
          if (Math.floor(now / 30) > Math.floor((now - 16) / 30)) {
            state.ghosts.push({
              x: player.x, y: player.y, angle: Math.atan2(state.dashVelocity.y, state.dashVelocity.x),
              alpha: 0.5, scaleX: 1
            });
          }
        }
      } else {
        player.x += moveX * moveSpeed * state.timeScale; 
        player.y += moveY * moveSpeed * state.timeScale;
      }

      // Colisión del jugador con planetas (Quitada para evitar daño/colisión)
      /*
      state.bgPlanets.forEach(p => {
        const dx = player.x - p.x;
        const dy = player.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = player.radius + p.radius;
        if (dist < minDist) {
          const angle = Math.atan2(dy, dx);
          player.x = p.x + Math.cos(angle) * minDist;
          player.y = p.y + Math.sin(angle) * minDist;
          // Si estaba dasheando, detener el dash
          if (state.isDashing) state.isDashing = false;
        }
      });
      */

      // HABILIDAD NOVA (Tecla Q o E) - Se desbloquea al matar al boss
      const canUseNova = state.specialAbilityUnlocked || state.isGodMode;
      if ((keys.has('q') || keys.has('e')) && canUseNova && now - state.lastSpecialAbility > state.specialAbilityCooldown) {
        state.lastSpecialAbility = now;
        state.abilityReady = false;
        setAbilityReady(false);
        state.screenShake = 40;
        
        // Función para disparar una oleada de proyectiles
        const fireWave = (speed: number, color: string, radius: number) => {
          const count = 36;
          for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            state.projectiles.push({
              x: player.x, y: player.y, radius: radius, color: color,
              dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed, active: true
            });
          }
        };

        // Primera Oleada (Inmediata)
        fireWave(15, '#ffffff', 10);
        createExplosion(player.x, player.y, '#ffffff', 80, 'plasma');
        createExplosion(player.x, player.y, shipConfig.color, 120, 'fire');
        
        // Segunda Oleada (Pequeño retraso)
        setTimeout(() => {
          fireWave(10, shipConfig.color, 8);
          state.screenShake = 20;
        }, 150);

        // Limpiar proyectiles enemigos cercanos (Defensivo)
        state.enemyProjectiles = state.enemyProjectiles.filter(p => {
          const dx = p.x - player.x;
          const dy = p.y - player.y;
          const distSq = dx * dx + dy * dy;
          return distSq >= 400 * 400;
        });
        
        setScore(state.score);
      }

      // HABILIDAD NIGROMANCIA (Tecla R) - Se desbloquea al matar al tercer boss
      const canUseNecro = state.necromancyUnlocked || state.isGodMode;
      const necroCooldownTrigger = state.isGodMode ? 5000 : state.necromancyCooldown;
      if (keys.has('r') && canUseNecro && now - state.lastNecromancy > necroCooldownTrigger) {
        state.lastNecromancy = now;
        state.necromancyReady = false;
        setNecromancyReady(false);
        state.screenShake = 20;
        state.screenFlash = 0.3;

        // Invocar 2 naves
        for (let i = 0; i < 2; i++) {
          state.summonedShips.push({
            x: player.x + (Math.random() - 0.5) * 100,
            y: player.y + (Math.random() - 0.5) * 100,
            radius: 10,
            color: '#4ade80',
            dx: (Math.random() - 0.5) * 8,
            dy: (Math.random() - 0.5) * 8,
            spawnTime: now,
            duration: 5000,
            lastShot: 0
          });
        }
        createExplosion(player.x, player.y, '#4ade80', 40, 'plasma');
      }

      player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
      player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));

      const hasRapidFire = state.activeEffects['RAPID_FIRE'] > now;
      const hasTripleShot = state.activeEffects['TRIPLE_SHOT'] > now;
      const hasShield = state.activeEffects['SHIELD'] > now;

      const fireRate = state.isGodMode ? 30 : (hasRapidFire ? shipConfig.fireRate * 0.4 : shipConfig.fireRate);
      if (state.mouse.pressed && now - state.lastShot > fireRate) {
        const angle = Math.atan2(state.mouse.y - player.y, state.mouse.x - player.x);
        
        if (state.isGodMode) {
          // 5 RAFAGAS EN MODO DIOS
          for (let i = -2; i <= 2; i++) {
            const spreadAngle = angle + (i * 0.15);
            state.projectiles.push({
              x: player.x + Math.cos(spreadAngle) * 25, 
              y: player.y + Math.sin(spreadAngle) * 25, 
              radius: 6, color: '#fbbf24',
              dx: Math.cos(spreadAngle) * 25, dy: Math.sin(spreadAngle) * 25, active: true
            });
          }
          state.screenShake = 5;
        } else {
          const isTriple = hasTripleShot || shipConfig.type === 'STRIKER';
          if (isTriple) {
            // DISPARO TRIPLE
            for (let i = -1; i <= 1; i++) {
              const spreadAngle = angle + (i * 0.15);
              state.projectiles.push({
                x: player.x + Math.cos(spreadAngle) * 20, 
                y: player.y + Math.sin(spreadAngle) * 20, 
                radius: shipConfig.projectileSize, 
                color: hasTripleShot ? '#f59e0b' : shipConfig.color,
                dx: Math.cos(spreadAngle) * shipConfig.projectileSpeed, 
                dy: Math.sin(spreadAngle) * shipConfig.projectileSpeed, 
                active: true,
                piercing: shipConfig.type === 'VANGUARD'
              });
            }
          } else {
            // DISPARO NORMAL (INTERCEPTOR Y VANGUARD)
            state.projectiles.push({
              x: player.x + Math.cos(angle) * 20, 
              y: player.y + Math.sin(angle) * 20, 
              radius: shipConfig.projectileSize, 
              color: shipConfig.color,
              dx: Math.cos(angle) * shipConfig.projectileSpeed, 
              dy: Math.sin(angle) * shipConfig.projectileSpeed, 
              active: true,
              piercing: shipConfig.type === 'VANGUARD'
            });
          }
        }
        createMuzzleFlash(player.x + Math.cos(angle) * 20, player.y + Math.sin(angle) * 20, angle, state.isGodMode ? '#fbbf24' : shipConfig.color);
        state.lastShot = now;
      }

      // Estrellas con Parallax (Capa dinámica/brillante)
      state.bgOffset.x -= moveX * 0.7;
      state.bgOffset.y -= moveY * 0.7;
      
      // Solo dibujamos unas pocas estrellas dinámicas para el efecto de profundidad extra
      state.stars.slice(0, 50).forEach((s, i) => {
        const parallaxFactor = i % 3 === 0 ? 0.3 : (i % 3 === 1 ? 0.6 : 1.2);
        let sx = ((s.x + state.bgOffset.x * s.speed * parallaxFactor) % canvas.width + canvas.width) % canvas.width;
        let sy = ((s.y + state.bgOffset.y * s.speed * parallaxFactor) % canvas.height + canvas.height) % canvas.height;
        const twinkle = Math.sin(timestamp / 500 + s.twinkle) * 0.4 + 0.6;
        
        ctx.fillStyle = i % 10 === 0 ? `rgba(147, 197, 253, ${s.alpha * twinkle})` : `rgba(255, 255, 255, ${s.alpha * twinkle})`;
        ctx.beginPath(); 
        ctx.arc(sx, sy, s.size * (parallaxFactor > 1 ? 1.5 : 1), 0, Math.PI * 2); 
        ctx.fill();
      });

      // Partículas Optimizadas
      if (state.particles.length > PARTICLE_CAP) {
        state.particles.splice(0, state.particles.length - PARTICLE_CAP);
      }
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.dx; p.y += p.dy;
        p.alpha -= p.decay;
        
        if (p.alpha <= 0) {
          state.particles.splice(i, 1);
          continue;
        }

        // Planet fragment collision with enemies
        if (p.isLethal) {
          for (let j = state.enemies.length - 1; j >= 0; j--) {
            const e = state.enemies[j];
            const dx = p.x - e.x;
            const dy = p.y - e.y;
            const distSq = dx * dx + dy * dy;
            const radiusSum = p.radius + e.radius;
            if (distSq < radiusSum * radiusSum) {
              e.hp = 0; // One-hit kill from fragments
              e.hitTime = now;
              createExplosion(p.x, p.y, p.color, 3, 'spark');
              p.alpha = 0; // Fragment disappears on hit
              break;
            }
          }
        }

        ctx.globalAlpha = p.alpha;
        if (p.type === 'fire' || p.type === 'plasma') {
          ctx.globalCompositeOperation = 'lighter';
          // Daño por fuego solo si es una partícula de peligro (rastro)
          if (p.isHazard) {
            const dx = p.x - player.x;
            const dy = p.y - player.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < (player.radius + p.radius) * (player.radius + p.radius) && !state.isGodMode && !state.isDashing && !hasShield) {
              player.hitTime = now;
              state.screenShake = 10;
              setTimeout(() => onGameOver(state.score), 100);
            }
          }

          // Optimized particle rendering: No gradients or shadowBlur in loop
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * (p.type === 'plasma' ? 2 : 1.5) * (1.5 - p.alpha), 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;

      // Enemigos
      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const e = state.enemies[i];
        const dist = Math.hypot(player.x - e.x, player.y - e.y);
        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        
        if (e.type === 'BOSS') {
          // LÓGICA ESPECIAL AGUJERO NEGRO
          if (e.theme === 'Agujero Negro') {
            // 1. Atracción gravitatoria
            const dx = e.x - player.x;
            const dy = e.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const force = Math.max(0.2, 3.5 - (dist / 400)); // Más fuerte cuanto más cerca
            if (!state.isDashing) {
              player.x += (dx / dist) * force * state.timeScale;
              player.y += (dy / dist) * force * state.timeScale;
            }

            // 2. Actualizar y dibujar orbitales
            if (e.orbitals) {
              e.orbitals.forEach(orb => {
                orb.angle += orb.speed * state.timeScale;
                orb.x = e.x + Math.cos(orb.angle) * orb.distance;
                orb.y = e.y + Math.sin(orb.angle) * orb.distance;

                // Dibujar orbital
                ctx.save();
                ctx.translate(orb.x, orb.y);
                ctx.rotate(orb.angle + Math.PI/2);
                ctx.fillStyle = orb.color;
                
                // Forma de cristal/roca orbitante
                ctx.beginPath();
                ctx.moveTo(0, -orb.radius);
                ctx.lineTo(orb.radius * 0.7, 0);
                ctx.lineTo(0, orb.radius);
                ctx.lineTo(-orb.radius * 0.7, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();

                // Colisión con el jugador
                const dpx = player.x - orb.x;
                const dpy = player.y - orb.y;
                const ddistSq = dpx * dpx + dpy * dpy;
                const dradiusSum = player.radius + orb.radius;
                if (ddistSq < dradiusSum * dradiusSum && !state.isGodMode && !state.isDashing && !hasShield) {
                  onGameOver(state.score);
                } else if (ddistSq < dradiusSum * dradiusSum && hasShield) {
                  createExplosion(orb.x, orb.y, orb.color, 5, 'spark');
                }
              });
            }
          }

          // Movimiento de entrada
          if (e.y < 180) e.y += e.dy * state.timeScale;
          else {
            if (e.theme === 'Vanguardia') {
              // Spawn escorts at 50% HP
              if (e.hp < e.maxHp / 2 && !e.escortsSpawned) {
                e.escortsSpawned = true;
                for (let i = 0; i < 2; i++) {
                  const escort: Enemy = {
                    x: e.x + (i === 0 ? -200 : 200),
                    y: e.y + 100,
                    radius: 35,
                    color: '#0ea5e9',
                    type: 'MELEE',
                    dx: 0, dy: 0,
                    hp: e.maxHp / 10,
                    maxHp: e.maxHp / 10,
                    scoreValue: 6000,
                    theme: 'Interceptor de Élite',
                    birthTime: performance.now()
                  };
                  state.enemies.push(escort);
                }
              }

              // Persecución lenta que aumenta con menos vida
              const hpPercent = e.hp / e.maxHp;
              const chaseSpeed = (0.5 + (1 - hpPercent) * 2.5) * state.timeScale;
              const chaseAngle = Math.atan2(player.y - e.y, player.x - e.x);
              e.x += Math.cos(chaseAngle) * chaseSpeed;
              e.y += Math.sin(chaseAngle) * chaseSpeed;
            } else if (e.theme === 'Interceptor de Élite') {
              // Comportamiento MELEE: Persecución agresiva al jugador
              const chaseAngle = Math.atan2(player.y - e.y, player.x - e.x);
              const speed = 6 * state.timeScale;
              e.x += Math.cos(chaseAngle) * speed;
              e.y += Math.sin(chaseAngle) * speed;
              
              // Rotación visual
              e.wanderAngle = chaseAngle;

              // Repulsión entre ellos para que no se amontonen
              state.enemies.forEach(other => {
                if (other !== e && other.theme === 'Interceptor de Élite') {
                  const dx = e.x - other.x;
                  const dy = e.y - other.y;
                  const dist = Math.hypot(dx, dy);
                  const minDist = e.radius * 2.5;
                  if (dist < minDist) {
                    const angle = Math.atan2(dy, dx);
                    const push = (minDist - dist) * 0.5;
                    e.x += Math.cos(angle) * push;
                    e.y += Math.sin(angle) * push;
                  }
                }
              });

              // Repulsión con el Boss para no atravesarlo
              const boss = state.enemies.find(b => b.theme === 'Vanguardia' && b.type === 'BOSS');
              if (boss) {
                const dxB = e.x - boss.x;
                const dyB = e.y - boss.y;
                const distBoss = Math.hypot(dxB, dyB);
                const minDistB = 260 + e.radius;
                if (distBoss < minDistB) {
                  const angleB = Math.atan2(dyB, dxB);
                  const push = (minDistB - distBoss) * 0.9;
                  e.x += Math.cos(angleB) * push;
                  e.y += Math.sin(angleB) * push;
                }
              }
            } else {
              // Movimiento lateral suave
              e.x += Math.sin(now / 1200) * 2.5 * state.timeScale;
            }
          }

          // ATAQUES MEJORADOS DEL BOSS
          if (e.theme === 'Vanguardia') {
            // Lógica Vanguardia
            if (now - (e.lastShot || 0) > (e.shootCooldown || 2500)) {
              const angleToPlayer = Math.atan2(player.y - e.y, player.x - e.x);
              // Lanzar misiles rastreadores
              for (let j = -1; j <= 1; j++) {
                const spread = angleToPlayer + (j * 0.4);
                state.enemyProjectiles.push({
                  x: e.x + (j * 30), y: e.y + 20, radius: 12, color: '#0ea5e9',
                  dx: Math.cos(spread) * 5, dy: Math.sin(spread) * 5, active: true, fromEnemy: true, isMissile: true, isHoming: true,
                  spawnTime: now
                });
              }
              e.lastShot = now;
              state.screenShake = 15;
            }

            // Onda de parálisis cada 5 segundos
            if (now - (e.lastWaveTime || 0) > 5000) {
              e.lastWaveTime = now;
              state.screenShake = 30;
              createExplosion(e.x, e.y, '#0ea5e9', 100, 'plasma');
              
              // Efecto visual de onda
              state.particles.push({
                x: e.x, y: e.y, radius: 10, color: '#0ea5e9', dx: 0, dy: 0, alpha: 1, life: 1000, decay: 0.02, size: 10, type: 'plasma'
              });

              const distToPlayer = Math.hypot(player.x - e.x, player.y - e.y);
              if (distToPlayer < 600 && !state.isGodMode && !state.isDashing && !hasShield) {
                player.frozenUntil = now + 1000;
                player.slowedUntil = now + 3000; // 1s paralizado + 2s ralentizado (total 3s desde inicio)
                createExplosion(player.x, player.y, '#0ea5e9', 20, 'spark');
              }
            }
          } else if (e.theme !== 'Vaca Gigante' && now - (e.lastShot || 0) > (e.shootCooldown || 1800)) {
            const angleToPlayer = Math.atan2(player.y - e.y, player.x - e.x);
            const isBlackHole = e.theme === 'Agujero Negro';
            
            // 1. Ataque en Espiral (Visualmente impactante)
            // Si es agujero negro, dispara menos proyectiles en espiral
            const spiralCount = isBlackHole ? 4 : 8;
            createMuzzleFlash(e.x, e.y, angleToPlayer, isBlackHole ? '#a855f7' : '#f472b6');
            for (let j = 0; j < spiralCount; j++) {
              const spiralAngle = (now / 500) + (j * Math.PI * 2 / spiralCount);
              state.enemyProjectiles.push({
                x: e.x, y: e.y, radius: 8, color: '#f472b6',
                dx: Math.cos(spiralAngle) * 4, dy: Math.sin(spiralAngle) * 4, active: true, fromEnemy: true
              });
            }

            // 2. Ráfaga dirigida al jugador
            // Si es agujero negro, ráfaga más estrecha
            const spreadCount = isBlackHole ? 1 : 2;
            for (let j = -spreadCount; j <= spreadCount; j++) {
              const spread = angleToPlayer + (j * 0.2);
              state.enemyProjectiles.push({
                x: e.x, y: e.y, radius: 10, color: '#a78bfa',
                dx: Math.cos(spread) * 6, dy: Math.sin(spread) * 6, active: true, fromEnemy: true
              });
            }
            
            // 3. Meteoritos masivos desde los bordes (Solo si no es agujero negro para reducir spam)
            if (!isBlackHole) {
              state.enemyProjectiles.push({
                x: Math.random() * canvas.width, y: -50, radius: 25, color: '#fb923c',
                dx: (Math.random() - 0.5) * 4, dy: 4, active: true, fromEnemy: true, isMissile: true
              });
            }

            e.lastShot = now;
            state.screenShake = isBlackHole ? 5 : 10;
          }
        } else if (e.type === 'MELEE') {
          let speed = 3.6;
          let moveAngle = angle;

          if (e.theme?.includes('Agua')) {
            // Movimiento ondulado
            moveAngle += Math.sin(now / 200) * 0.5;
            speed = 4.0;
          } else if (e.theme?.includes('Naturaleza')) {
            // Zig-zag
            moveAngle += (Math.floor(now / 400) % 2 === 0 ? 0.8 : -0.8);
            speed = 4.5;
          } else if (e.theme?.includes('Rocas')) {
            speed = 2.2; // Lentos pero pesados
          } else if (e.theme?.includes('Hielo')) {
            // Teletransporte corto ocasional
            if (Math.random() > 0.992) {
              e.x += Math.cos(angle) * 100;
              e.y += Math.sin(angle) * 100;
              createExplosion(e.x, e.y, '#bae6fd', 10, 'plasma');
            }
          } else if (e.theme?.includes('Fuego')) {
            if (Math.random() > 0.8) {
              state.particles.push({
                x: e.x, y: e.y, radius: 2, color: '#f97316',
                dx: (Math.random() - 0.5) * 2, dy: (Math.random() - 0.5) * 2,
                alpha: 0.8, life: 1, size: 2, decay: 0.05, type: 'fire',
                isHazard: true
              });
            }
          } else if (e.theme?.includes('Huesos')) {
            speed = 5.0; // Muy rápidos
          }

          e.x += Math.cos(moveAngle) * speed * state.timeScale; 
          e.y += Math.sin(moveAngle) * speed * state.timeScale;
        } else {
          // RANGED behavior
          if (dist > 380) { 
            e.x += Math.cos(angle) * 2.5 * state.timeScale; 
            e.y += Math.sin(angle) * 2.5 * state.timeScale; 
          }
          else if (dist < 280) { 
            e.x -= Math.cos(angle) * 2.5 * state.timeScale; 
            e.y -= Math.sin(angle) * 2.5 * state.timeScale; 
          }
          
          if (now - (e.lastShot || 0) > (e.shootCooldown || 2000)) {
            if (e.theme?.includes('Agua')) {
              // Chorro de agua: 3 proyectiles rápidos en línea
              createMuzzleFlash(e.x, e.y, angle, '#0ea5e9');
              for (let j = 0; j < 3; j++) {
                setTimeout(() => {
                  state.enemyProjectiles.push({
                    x: e.x, y: e.y, radius: 4, color: '#0ea5e9',
                    dx: Math.cos(angle) * 12, dy: Math.sin(angle) * 12, active: true, fromEnemy: true
                  });
                }, j * 100);
              }
            } else if (e.theme?.includes('Naturaleza')) {
              // Espora: Proyectil que se divide (simulado con ráfaga circular pequeña)
              createMuzzleFlash(e.x, e.y, angle, '#10b981');
              for (let j = 0; j < 5; j++) {
                const a = angle + (j - 2) * 0.2;
                state.enemyProjectiles.push({
                  x: e.x, y: e.y, radius: 7, color: '#10b981',
                  dx: Math.cos(a) * 5, dy: Math.sin(a) * 5, active: true, fromEnemy: true
                });
              }
            } else if (e.theme?.includes('Rocas')) {
              // Fragmento masivo
              createMuzzleFlash(e.x, e.y, angle, '#a16207');
              state.enemyProjectiles.push({
                x: e.x, y: e.y, radius: 15, color: '#a16207',
                dx: Math.cos(angle) * 4, dy: Math.sin(angle) * 4, active: true, fromEnemy: true, isMissile: true
              });
            } else if (e.theme?.includes('Hielo')) {
              // Carámbano rápido
              createMuzzleFlash(e.x, e.y, angle, '#bae6fd');
              state.enemyProjectiles.push({
                x: e.x, y: e.y, radius: 5, color: '#bae6fd',
                dx: Math.cos(angle) * 15, dy: Math.sin(angle) * 15, active: true, fromEnemy: true
              });
            } else if (e.theme?.includes('Fuego')) {
              // Bola de fuego explosiva (3 proyectiles en abanico)
              createMuzzleFlash(e.x, e.y, angle, '#f97316');
              for (let j = -1; j <= 1; j++) {
                const a = angle + (j * 0.3);
                state.enemyProjectiles.push({
                  x: e.x, y: e.y, radius: 10, color: '#f97316',
                  dx: Math.cos(a) * 8, dy: Math.sin(a) * 8, active: true, fromEnemy: true
                });
              }
            } else if (e.theme?.includes('Huesos')) {
              // Ráfaga de astillas óseas
              createMuzzleFlash(e.x, e.y, angle, '#f8fafc');
              for (let j = 0; j < 4; j++) {
                const a = angle + (Math.random() - 0.5) * 0.5;
                state.enemyProjectiles.push({
                  x: e.x, y: e.y, radius: 3, color: '#f8fafc',
                  dx: Math.cos(a) * (8 + Math.random() * 4), dy: Math.sin(a) * (8 + Math.random() * 4), active: true, fromEnemy: true
                });
              }
            } else {
              // Default shot
              createMuzzleFlash(e.x, e.y, angle, '#d8b4fe');
              state.enemyProjectiles.push({
                x: e.x, y: e.y, radius: 6, color: '#d8b4fe',
                dx: Math.cos(angle) * 7, dy: Math.sin(angle) * 7, active: true, fromEnemy: true
              });
            }
            e.lastShot = now;
          }
        }

        // Evitar planetas para todos los enemigos
        state.bgPlanets.forEach(p => {
          const dxP = e.x - p.x;
          const dyP = e.y - p.y;
          const distP = Math.sqrt(dxP * dxP + dyP * dyP);
          const minDistP = e.radius + p.radius + 30; // Margen de seguridad
          if (distP < minDistP) {
            const avoidAngle = Math.atan2(dyP, dxP);
            const force = (minDistP - distP) / minDistP;
            e.x += Math.cos(avoidAngle) * force * 5 * state.timeScale;
            e.y += Math.sin(avoidAngle) * force * 5 * state.timeScale;
          }
        });
        
        drawEnemy(ctx, e, now, angle);

        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const distSq = dx * dx + dy * dy;
        const radiusSum = player.radius + e.radius;

        if (distSq < radiusSum * radiusSum) {
          if (!state.isGodMode && !state.isDashing && !hasShield) { 
            onGameOver(state.score); 
            return; 
          } else if (hasShield) {
            // Empujar al enemigo o simplemente no morir
            createExplosion(e.x, e.y, e.color, 5, 'spark');
            state.screenShake = 5;
            // Opcional: dañar al enemigo si chocas con escudo
            e.hp -= 0.5;
          }
        }
      }

      // Proyectiles
      for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const p = state.projectiles[i];
        p.x += p.dx * state.timeScale; 
        p.y += p.dy * state.timeScale;
        
        if (!p.active || p.x < -100 || p.x > canvas.width + 100 || p.y < -100 || p.y > canvas.height + 100) {
          state.projectiles.splice(i, 1);
          continue;
        }
        
        drawProjectile(ctx, p);
        
        // Colisión con planetas
        for (let j = 0; j < state.bgPlanets.length; j++) {
          const planet = state.bgPlanets[j];
          const dx = p.x - planet.x;
          const dy = p.y - planet.y;
          const distSq = dx * dx + dy * dy;
          const radiusSum = p.radius + planet.radius;
          
          if (distSq < radiusSum * radiusSum) {
            p.active = false;
            planet.hp -= 1;
            createExplosion(p.x, p.y, planet.color, 3, 'spark');
            break;
          }
        }
        
        if (!p.active) continue;

        // Colisiones con enemigos (Optimizado con distancia al cuadrado)
        for (let j = state.enemies.length - 1; j >= 0; j--) {
          const e = state.enemies[j];
          const dx = p.x - e.x;
          const dy = p.y - e.y;
          const distSq = dx * dx + dy * dy;
          const radiusSum = p.radius + e.radius;
          
          if (distSq < radiusSum * radiusSum) {
            // Inmunidad del Boss Vanguardia si hay escoltas
            let canDamage = true;
            if (e.theme === 'Vanguardia' && e.type === 'BOSS') {
              const hasEscorts = state.enemies.some(esc => esc.theme === 'Interceptor de Élite' && esc.hp > 0);
              if (hasEscorts) {
                canDamage = false;
                createExplosion(p.x, p.y, '#0ea5e9', 3, 'plasma');
                state.screenShake = 1;
              }
            }
            
            if (canDamage) {
              e.hp -= 1;
              e.hitTime = now;
              
              // Solo desactivar si no es perforante
              if (!p.piercing) {
                p.active = false;
              }
              
              createExplosion(e.x, e.y, e.type === 'RANGED' ? '#7c3aed' : '#ef4444', 5, 'spark');
              
              if (e.type === 'BOSS') {
                setBossHP({current: e.hp, max: e.maxHp, name: bossHP?.name || 'JEFE'});
                state.screenShake = 4;
              }
            } else {
              // Si no puede dañar, el proyectil rebota o desaparece
              if (!p.piercing) p.active = false;
            }

            if (e.hp <= 0) {
              state.score += e.type === 'RANGED' ? 150 : 100;
              setScore(state.score);
              createExplosion(e.x, e.y, e.color, 15, 'fire');
              
              // TRANSICION DE BOSS
              if (e.type === 'BOSS') {
                state.screenShake = 40;
                createExplosion(e.x, e.y, '#ffffff', 50, 'plasma');
                
                // Boss Defeated
                setBossHP(null);
                state.bossSpawned = false;
                state.bossInminent = false;
                state.bossDefeated = true;
                
                // Desbloqueo de habilidades según el boss
                if (e.theme === 'Planeta Errante') {
                  gameStateRef.current.orbitalsUnlocked = true;
                  setOrbitalsNotification(true);
                  setTimeout(() => setOrbitalsNotification(false), 5000);
                  if (gameStateRef.current.playerOrbitals.length === 0) {
                    for (let i = 0; i < 4; i++) {
                      gameStateRef.current.playerOrbitals.push({
                        x: 0, y: 0, radius: 10, angle: (i * Math.PI * 2) / 4,
                        distance: 80, speed: 0.04, color: '#6366f1'
                      });
                    }
                  }
                } else if (e.theme === 'Agujero Negro') {
                  state.specialAbilityUnlocked = true;
                  setAbilityUnlocked(true);
                  setNovaNotification(true);
                  setTimeout(() => setNovaNotification(false), 4000);
                } else if (e.theme === 'Vanguardia') {
                  state.necromancyUnlocked = true;
                  setNecromancyUnlocked(true);
                  setNecromancyNotification(true);
                  setTimeout(() => setNecromancyNotification(false), 5000);
                } else if (e.theme === 'Vaca Gigante') {
                  // Boss 4 Reward
                  state.score += 100000;
                  setScore(state.score);
                  state.meteorShowerActive = false;
                } else if (e.theme === 'Caos Primordial') {
                  // Final Boss Reward
                  state.score += 250000;
                  setScore(state.score);
                  
                  // Trigger Victory Sequence
                  setGameWon(true);
                  state.isPaused = true;
                  state.screenShake = 100;
                  createExplosion(e.x, e.y, '#ffffff', 150, 'plasma');
                  return;
                }

                state.screenShake = 60;
                createExplosion(e.x, e.y, '#facc15', 80, 'plasma');
                
                state.enemies.splice(j, 1);
              } else {
                state.enemies.splice(j, 1);
                state.screenShake = 5;
              }
            }
            break;
          }
        }
      }

      state.enemyProjectiles = state.enemyProjectiles.filter(p => {
        if (p.isHoming && p.active) {
          const age = now - (p.spawnTime || 0);
          // Solo rastrean durante los primeros 2.5 segundos
          if (age < 2500) {
            const targetAngle = Math.atan2(player.y - p.y, player.x - p.x);
            const currentAngle = Math.atan2(p.dy, p.dx);
            // Desviación suave hacia el jugador
            const newAngle = currentAngle + (targetAngle - currentAngle) * 0.03;
            const speed = Math.hypot(p.dx, p.dy);
            p.dx = Math.cos(newAngle) * speed;
            p.dy = Math.sin(newAngle) * speed;
          }
        }
        
        p.x += p.dx * state.timeScale; 
        p.y += p.dy * state.timeScale;
        drawProjectile(ctx, p);
        
        // Colisión con planetas
        for (let j = 0; j < state.bgPlanets.length; j++) {
          const planet = state.bgPlanets[j];
          const dxP = p.x - planet.x;
          const dyP = p.y - planet.y;
          const distSqP = dxP * dxP + dyP * dyP;
          const radiusSumP = p.radius + planet.radius;
          if (distSqP < radiusSumP * radiusSumP) {
            p.active = false;
            createExplosion(p.x, p.y, planet.color, 3, 'spark');
            break;
          }
        }
        if (!p.active) return false;

        const dx = p.x - player.x;
        const dy = p.y - player.y;
        const distSq = dx * dx + dy * dy;
        const radiusSum = p.radius + player.radius;
        
        if (distSq < radiusSum * radiusSum) {
          if (!state.isGodMode && !state.isDashing && !hasShield) { 
            player.hitTime = now;
            state.screenShake = 30;
            createExplosion(player.x, player.y, '#ffffff', 30, 'fire');
            
            // Efecto de congelación si es un carámbano
            if (p.color === '#bae6fd') {
              player.frozenUntil = now + 1500;
            }

            setTimeout(() => onGameOver(state.score), 100);
            return; 
          } else if (hasShield) {
            createExplosion(p.x, p.y, '#3b82f6', 10, 'spark');
            state.screenShake = 2;
          }
          p.active = false;
        }
        return p.active && p.x > -100 && p.x < canvas.width + 100 && p.y > -100 && p.y < canvas.height + 100;
      });

      // Power-up collection
      for (let i = state.powerUps.length - 1; i >= 0; i--) {
        const pu = state.powerUps[i];
        const dx = player.x - pu.x;
        const dy = player.y - pu.y;
        const distSq = dx * dx + dy * dy;
        const radiusSum = player.radius + pu.radius;

        if (distSq < radiusSum * radiusSum) {
          state.activeEffects[pu.type] = now + pu.duration;
          createExplosion(pu.x, pu.y, pu.color, 20);
          state.powerUps.splice(i, 1);
          state.screenShake = 3;
        } else if (now - pu.spawnTime > 15000) {
          state.powerUps.splice(i, 1);
        }
      }

      // PowerUps Rendering
      state.powerUps.forEach(pu => {
        ctx.save();
        const floatY = Math.sin(timestamp / 300) * 10;
        ctx.translate(pu.x, pu.y + floatY);
        ctx.fillStyle = pu.color;
        ctx.shadowBlur = 20; ctx.shadowColor = pu.color;
        ctx.beginPath();
        ctx.arc(0, 0, pu.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        // Inner symbol
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = pu.type === 'SHIELD' ? 'S' : 
                      pu.type === 'TRIPLE_SHOT' ? '3' : 
                      pu.type === 'RAPID_FIRE' ? 'R' : 
                      pu.type === 'STAR' ? '★' : '?';
        ctx.fillText(label, 0, 0);
        ctx.restore();
      });

      // LÓGICA DE ORBITALES DEL JUGADOR
      if (state.orbitalsUnlocked && state.playerOrbitals.length > 0) {
        state.playerOrbitals.forEach(orb => {
          orb.angle += orb.speed * state.timeScale;
          orb.x = player.x + Math.cos(orb.angle) * orb.distance;
          orb.y = player.y + Math.sin(orb.angle) * orb.distance;

          // Dibujar orbital
          ctx.save();
          ctx.translate(orb.x, orb.y);
          ctx.rotate(orb.angle + Math.PI/2);
          ctx.fillStyle = '#6366f1';
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#6366f1';
          
          ctx.beginPath();
          ctx.moveTo(0, -orb.radius);
          ctx.lineTo(orb.radius * 0.7, 0);
          ctx.lineTo(0, orb.radius);
          ctx.lineTo(-orb.radius * 0.7, 0);
          ctx.closePath();
          ctx.fill();
          
          // Brillo interno
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = 0.5;
          ctx.beginPath();
          ctx.arc(0, 0, orb.radius * 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Colisión con enemigos
          for (let i = state.enemies.length - 1; i >= 0; i--) {
            const e = state.enemies[i];
            const dx = orb.x - e.x;
            const dy = orb.y - e.y;
            const distSq = dx * dx + dy * dy;
            const radiusSum = orb.radius + e.radius;

            if (distSq < radiusSum * radiusSum) {
              // Los orbitales no destruyen meteoritos
              if (e.theme === 'Meteorito') continue;

              if (e.type !== 'BOSS') {
                state.score += 100;
                setScore(state.score);
                createExplosion(e.x, e.y, e.color, 15, 'fire');
                state.enemies.splice(i, 1);
              } else {
                // Daño masivo a bosses
                e.hp -= 5;
                e.hitTime = now;
                createExplosion(orb.x, orb.y, '#6366f1', 5, 'spark');
                setBossHP({current: e.hp, max: e.maxHp, name: bossHP?.name || 'JEFE'});
              }
            }
          }

          // Colisión con proyectiles enemigos
          for (let i = state.enemyProjectiles.length - 1; i >= 0; i--) {
            const p = state.enemyProjectiles[i];
            const dx = orb.x - p.x;
            const dy = orb.y - p.y;
            const distSq = dx * dx + dy * dy;
            const radiusSum = orb.radius + p.radius;

            if (distSq < radiusSum * radiusSum) {
              createExplosion(p.x, p.y, p.color, 5, 'spark');
              state.enemyProjectiles.splice(i, 1);
            }
          }
        });
      }

      // LÓGICA DE NIGROMANCIA (Invocación de naves)
      state.summonedShips = state.summonedShips.filter(ship => {
        const age = now - ship.spawnTime;
        if (age > ship.duration) {
          createExplosion(ship.x, ship.y, ship.color, 15, 'fire');
          return false;
        }

        // Movimiento aleatorio suave
        ship.x += ship.dx * state.timeScale;
        ship.y += ship.dy * state.timeScale;

        // Rebotar en los bordes
        if (ship.x < 50 || ship.x > canvas.width - 50) ship.dx *= -1;
        if (ship.y < 50 || ship.y > canvas.height - 50) ship.dy *= -1;

        // Disparar a enemigos cercanos
        if (now - ship.lastShot > 400) {
          let nearestEnemy = null;
          let minDist = 600;
          state.enemies.forEach(e => {
            const d = Math.hypot(e.x - ship.x, e.y - ship.y);
            if (d < minDist) {
              minDist = d;
              nearestEnemy = e;
            }
          });

          if (nearestEnemy) {
            const angle = Math.atan2(nearestEnemy.y - ship.y, nearestEnemy.x - ship.x);
            state.projectiles.push({
              x: ship.x, y: ship.y, radius: 5, color: '#4ade80',
              dx: Math.cos(angle) * 12, dy: Math.sin(angle) * 12, active: true
            });
            ship.lastShot = now;
          }
        }

        // Dibujar nave invocada
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.rotate(Math.atan2(ship.dy, ship.dx));
        ctx.fillStyle = '#4ade80';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#4ade80';
        ctx.beginPath();
        ctx.moveTo(15, 0); ctx.lineTo(-10, -10); ctx.lineTo(-10, 10); ctx.closePath();
        ctx.fill();
        // Brillo de motor
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-12, 0, 4 + Math.sin(now/50)*2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        return true;
      });

      // Ghosts
      state.ghosts = state.ghosts.filter(g => {
        g.alpha -= 0.05;
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.rotate(g.angle);
        ctx.globalAlpha = g.alpha;
        ctx.strokeStyle = shipConfig.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(20, 0); ctx.lineTo(-10, -15); ctx.lineTo(-10, 15); ctx.closePath();
        ctx.stroke();
        ctx.restore();
        return g.alpha > 0;
      });

      // Nave
      drawPlayer(ctx, player, timestamp, Math.atan2(state.mouse.y - player.y, state.mouse.x - player.x), now);

      // Efecto visual de congelación
      if (isFrozen) {
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.beginPath();
        ctx.arc(0, 0, player.radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#bae6fd';
        ctx.fill();
        ctx.restore();
      }

      // Escudo Visual
      if (hasShield) {
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.beginPath();
        ctx.arc(0, 0, player.radius + 15, 0, Math.PI * 2);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = -timestamp / 50;
        ctx.stroke();
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
        ctx.restore();
      }

      // Rayo de Dios (God Beam)
      if (state.godBeam) {
        const elapsed = now - state.godBeam.startTime;
        if (elapsed < 500) {
          const alpha = 1 - (elapsed / 500);
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(player.x, player.y);
          ctx.lineTo(state.godBeam.targetX, state.godBeam.targetY);
          
          // Outer glow
          ctx.strokeStyle = `rgba(251, 191, 36, ${alpha * 0.5})`;
          ctx.lineWidth = 30;
          ctx.lineCap = 'round';
          ctx.stroke();
          
          // Inner beam
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.lineWidth = 10;
          ctx.stroke();
          
          // Sparkles at target
          for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 50;
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(state.godBeam.targetX + Math.cos(angle) * dist, state.godBeam.targetY + Math.sin(angle) * dist, 2, 0, Math.PI * 2);
            ctx.fill();
          }
          
          ctx.restore();
        } else {
          state.godBeam = null;
        }
      }

      if (state.screenShake > 0) ctx.restore();

      // Screen Flash
      if (state.screenFlash > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${state.screenFlash})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        state.screenFlash -= 0.02;
      }

      if (!state.dashReady && now - state.lastDash > state.dashCooldown) {
        state.dashReady = true;
        setDashReady(true);
      }
      if (!state.abilityReady && (state.isGodMode || now - state.lastSpecialAbility > state.specialAbilityCooldown)) {
        state.abilityReady = true;
        setAbilityReady(true);
      }
      
      const necroCooldownVal = state.isGodMode ? 5000 : state.necromancyCooldown;
      if (!state.necromancyReady && now - state.lastNecromancy > necroCooldownVal) {
        state.necromancyReady = true;
        setNecromancyReady(true);
      }

      if (Math.floor(now/1000) > Math.floor((now-16)/1000)) setSurvivalTime(Math.floor((now - state.startTime)/1000));

      animationId = requestAnimationFrame(update);
    };

    animationId = requestAnimationFrame(update);
    return () => { 
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize, onGameOver, shipConfig]);

  return (
    <div className="fixed inset-0 w-full h-full bg-black z-50 overflow-hidden">
      <div className="absolute inset-0 p-6 flex justify-between items-start pointer-events-none z-[60]">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Puntos</span>
          <span className="font-orbitron text-2xl font-bold text-yellow-400">{score.toLocaleString()}</span>
          
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex flex-col">
              <span className="text-[8px] text-blue-400 font-bold uppercase">Dash</span>
              <div className="h-1 w-32 bg-slate-800 rounded-full overflow-hidden mt-1">
                <div className={`h-full transition-all ${dashReady ? 'bg-blue-500 w-full' : 'bg-slate-700 w-0'}`} />
              </div>
            </div>
            {abilityUnlocked && (
              <div className="flex flex-col">
                <span className="text-[8px] text-fuchsia-400 font-bold uppercase">Nova</span>
                <div className="h-1 w-32 bg-slate-800 rounded-full overflow-hidden mt-1">
                  <div className={`h-full transition-all ${abilityReady ? 'bg-fuchsia-500 w-full' : 'bg-slate-700 w-0'}`} />
                </div>
              </div>
            )}
            {necromancyUnlocked && (
              <div className="flex flex-col">
                <span className="text-[8px] text-emerald-400 font-bold uppercase">Nigromancia</span>
                <div className="h-1 w-32 bg-slate-800 rounded-full overflow-hidden mt-1">
                  <div className={`h-full transition-all ${necromancyReady ? 'bg-emerald-500 w-full' : 'bg-slate-700 w-0'}`} />
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="text-center">
          {gameStateRef.current.isGodMode && (
            <div className="mb-2 animate-pulse">
              <span className="bg-yellow-500 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">Modo Deidad Activo</span>
            </div>
          )}
          <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Misión en Curso</span>
          <div className="text-4xl font-orbitron font-bold text-white">
            {Math.floor(survivalTime / 60).toString().padStart(2, '0')}:{(survivalTime % 60).toString().padStart(2, '0')}
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Integridad</span>
          <div className="text-3xl font-orbitron font-bold text-red-500">1 / 1 HP</div>
        </div>
      </div>

      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full block bg-black" />

      {/* Alerta de Boss */}
      <AnimatePresence>
        {bossAlert && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="fixed inset-0 flex items-center justify-center z-[70] pointer-events-none"
          >
            <div className="bg-red-950/80 border-y-4 border-red-500 w-full py-12 text-center backdrop-blur-md">
              <h2 className="text-white text-6xl font-orbitron font-black tracking-[0.3em] animate-pulse">JEFE INMINENTE</h2>
              <p className="text-red-400 font-bold mt-4 uppercase tracking-[0.5em]">Firma de energía colosal detectada</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notificación de Nova Desbloqueada */}
      <AnimatePresence>
        {novaNotification && (
          <motion.div 
            initial={{ opacity: 0, y: 100, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="fixed inset-0 flex items-center justify-center z-[75] pointer-events-none"
          >
            <div className="bg-fuchsia-600/20 border-2 border-fuchsia-500 p-8 rounded-3xl backdrop-blur-xl shadow-[0_0_50px_rgba(217,70,239,0.3)] text-center">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <h2 className="text-fuchsia-400 text-5xl font-orbitron font-black tracking-tighter mb-2">¡NOVA DESBLOQUEADA!</h2>
                <div className="h-1 w-full bg-fuchsia-500/30 rounded-full mb-4" />
                <p className="text-white font-bold text-xl uppercase tracking-widest">Presiona <span className="bg-white text-fuchsia-600 px-3 py-1 rounded-lg mx-1">Q</span> o <span className="bg-white text-fuchsia-600 px-3 py-1 rounded-lg mx-1">E</span></p>
                <p className="text-fuchsia-300/70 text-sm mt-4 font-medium italic">Aniquilación total de área disponible</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notificación de Nigromancia Desbloqueada */}
      <AnimatePresence>
        {necromancyNotification && (
          <motion.div 
            initial={{ opacity: 0, y: 100, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="fixed inset-0 flex items-center justify-center z-[75] pointer-events-none"
          >
            <div className="bg-emerald-600/20 border-2 border-emerald-500 p-8 rounded-3xl backdrop-blur-xl shadow-[0_0_50px_rgba(16,185,129,0.3)] text-center">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <h2 className="text-emerald-400 text-5xl font-orbitron font-black tracking-tighter mb-2">¡NIGROMANCIA DESBLOQUEADA!</h2>
                <div className="h-1 w-full bg-emerald-500/30 rounded-full mb-4" />
                <p className="text-white font-bold text-xl uppercase tracking-widest">Presiona <span className="bg-white text-emerald-600 px-3 py-1 rounded-lg mx-1">R</span></p>
                <p className="text-emerald-300/70 text-sm mt-4 font-medium italic">Invocación de naves aliadas disponible</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notificación de Orbitales Desbloqueados */}
      <AnimatePresence>
        {orbitalsNotification && (
          <motion.div 
            initial={{ opacity: 0, y: 100, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="fixed inset-0 flex items-center justify-center z-[75] pointer-events-none"
          >
            <div className="bg-indigo-600/20 border-2 border-indigo-500 p-8 rounded-3xl backdrop-blur-xl shadow-[0_0_50px_rgba(79,70,229,0.3)] text-center">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <h2 className="text-indigo-400 text-5xl font-orbitron font-black tracking-tighter mb-2">¡ESCUDO ORBITAL!</h2>
                <div className="h-1 w-full bg-indigo-500/30 rounded-full mb-4" />
                <p className="text-white font-bold text-xl uppercase tracking-widest">Asteroides protectores activados</p>
                <p className="text-indigo-300/70 text-sm mt-4 font-medium italic">Defensa automática contra enemigos y proyectiles</p>
              </motion.div>
            </div>
          </motion.div>
        )}

        {vanguardNotification && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="fixed inset-0 flex items-center justify-center z-[75] pointer-events-none"
          >
            <div className="bg-cyan-600/20 border-2 border-cyan-500 p-8 rounded-3xl backdrop-blur-xl shadow-[0_0_50px_rgba(6,182,212,0.3)] text-center">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <h2 className="text-cyan-400 text-5xl font-orbitron font-black tracking-tighter mb-2">¡VANGUARDIA DESTRUIDA!</h2>
                <div className="h-1 w-full bg-cyan-500/30 rounded-full mb-4" />
                <p className="text-white font-bold text-xl uppercase tracking-widest">Tecnología de Vanguardia asimilada</p>
                <p className="text-cyan-300/70 text-sm mt-4 font-medium italic">Has superado la prueba de fuego</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Créditos Finales */}
      <AnimatePresence>
        {showCredits && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center overflow-hidden"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: "-150%" }}
              transition={{ duration: 25, ease: "linear" }}
              onAnimationComplete={() => setShowCredits(false)}
              className="text-center space-y-20 py-20"
            >
              <div className="space-y-4">
                <h2 className="text-blue-500 font-orbitron font-black text-xl uppercase tracking-[0.5em]">Director</h2>
                <p className="text-white text-5xl font-black uppercase tracking-tighter">YO</p>
              </div>
              <div className="space-y-4">
                <h2 className="text-blue-500 font-orbitron font-black text-xl uppercase tracking-[0.5em]">Programador Principal</h2>
                <p className="text-white text-5xl font-black uppercase tracking-tighter">YO</p>
              </div>
              <div className="space-y-4">
                <h2 className="text-blue-500 font-orbitron font-black text-xl uppercase tracking-[0.5em]">Diseño de Arte</h2>
                <p className="text-white text-5xl font-black uppercase tracking-tighter">YO</p>
              </div>
              <div className="space-y-4">
                <h2 className="text-blue-500 font-orbitron font-black text-xl uppercase tracking-[0.5em]">Efectos Visuales</h2>
                <p className="text-white text-5xl font-black uppercase tracking-tighter">YO</p>
              </div>
              <div className="space-y-4">
                <h2 className="text-blue-500 font-orbitron font-black text-xl uppercase tracking-[0.5em]">Diseño de Niveles</h2>
                <p className="text-white text-5xl font-black uppercase tracking-tighter">YO</p>
              </div>
              <div className="space-y-4">
                <h2 className="text-blue-500 font-orbitron font-black text-xl uppercase tracking-[0.5em]">Música y Sonido</h2>
                <p className="text-white text-5xl font-black uppercase tracking-tighter">YO</p>
              </div>
              <div className="space-y-4">
                <h2 className="text-blue-500 font-orbitron font-black text-xl uppercase tracking-[0.5em]">Control de Calidad</h2>
                <p className="text-white text-5xl font-black uppercase tracking-tighter">YO</p>
              </div>
              <div className="space-y-4">
                <h2 className="text-blue-500 font-orbitron font-black text-xl uppercase tracking-[0.5em]">Agradecimientos Especiales</h2>
                <p className="text-white text-5xl font-black uppercase tracking-tighter">YO</p>
              </div>
              <div className="pt-40">
                <h1 className="text-blue-400 font-orbitron font-black text-6xl uppercase tracking-tighter mb-4">GRACIAS POR JUGAR</h1>
                <p className="text-blue-200/50 text-sm uppercase tracking-widest">Un juego creado íntegramente por YO</p>
              </div>
            </motion.div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-500 text-[10px] uppercase font-black tracking-widest animate-pulse">
              Presiona <span className="text-blue-400">K</span> para saltar
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barra de Vida del Boss */}
      <AnimatePresence>
        {gameWon && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-2xl overflow-hidden"
          >
            {/* Background Light Effects */}
            <motion.div 
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.3, 0.6, 0.3],
                rotate: [0, 180, 360]
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute w-[800px] h-[800px] bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-emerald-500/20 rounded-full blur-[120px]"
            />

            <div className="relative z-10 text-center px-6">
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 1 }}
              >
                <h1 className="text-7xl md:text-9xl font-orbitron font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-blue-200 to-blue-500 tracking-tighter mb-4 drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                  VICTORIA
                </h1>
                <h2 className="text-2xl md:text-4xl font-orbitron font-bold text-blue-300 uppercase tracking-[0.3em] mb-12">
                  GALAXIA SALVADA
                </h2>
              </motion.div>

              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1.2, type: "spring", stiffness: 100 }}
                className="mb-12"
              >
                <div className="inline-block p-1 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500">
                  <div className="bg-black px-12 py-6 rounded-full">
                    <p className="text-slate-400 uppercase text-xs font-black tracking-widest mb-1">Puntuación Final</p>
                    <p className="text-5xl font-mono font-black text-white">{score.toLocaleString()}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 2, duration: 0.8 }}
                className="space-y-6"
              >
                <p className="text-blue-100/60 max-w-lg mx-auto text-lg font-medium leading-relaxed">
                  Has derrotado al Heraldo del Caos Primordial y restaurado el equilibrio en el cosmos. 
                  Tu nombre será recordado entre las estrellas por toda la eternidad.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                  <button
                    onClick={() => window.location.reload()}
                    className="px-12 py-5 bg-white text-black font-black rounded-2xl hover:bg-blue-400 hover:text-white transition-all transform hover:scale-110 active:scale-95 uppercase tracking-widest shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                  >
                    Volver al Inicio
                  </button>
                  <button
                    onClick={() => setShowCredits(true)}
                    className="px-12 py-5 bg-blue-600/20 border-2 border-blue-500 text-blue-400 font-black rounded-2xl hover:bg-blue-600/40 transition-all transform hover:scale-110 active:scale-95 uppercase tracking-widest"
                  >
                    Ver Créditos
                  </button>
                </div>
              </motion.div>
            </div>

            {/* Particle Rain Effect */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(30)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ 
                    x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000), 
                    y: -20, 
                    opacity: Math.random(),
                    scale: Math.random() * 0.5 + 0.5
                  }}
                  animate={{ 
                    y: (typeof window !== 'undefined' ? window.innerHeight : 1000) + 20,
                  }}
                  transition={{ 
                    duration: Math.random() * 3 + 2, 
                    repeat: Infinity, 
                    ease: "linear",
                    delay: Math.random() * 5
                  }}
                  className="absolute w-1 h-1 bg-blue-400 rounded-full"
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dialogue && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 w-[90%] max-w-3xl z-[80] pointer-events-none"
          >
            <div className="bg-black/80 border-2 border-green-500 p-6 rounded-2xl backdrop-blur-xl shadow-[0_0_30px_rgba(34,197,94,0.3)]">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500 flex items-center justify-center">
                  <span className="text-green-400 font-black text-xl">!</span>
                </div>
                <span className="text-green-400 font-orbitron font-bold text-sm uppercase tracking-widest">{dialogue.speaker}</span>
              </div>
              <p className="text-white font-medium text-lg leading-relaxed">
                {dialogue.text}
              </p>
              <div className="mt-4 flex justify-end">
                <div className="h-1 w-24 bg-green-500/30 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-green-500"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 4, ease: "linear" }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bossHP && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 w-[80%] max-w-2xl z-[65] pointer-events-none"
          >
            <div className="flex justify-between items-end mb-2">
              <span className="text-red-500 font-orbitron font-bold text-xs uppercase tracking-widest">
                {bossHP.name}
              </span>
              <span className="text-red-400 font-mono text-xs">{Math.ceil((bossHP.current / bossHP.max) * 100)}%</span>
            </div>
            <div className="h-4 bg-slate-900/80 border border-red-900/50 rounded-full overflow-hidden backdrop-blur-sm shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <motion.div 
                className="h-full bg-gradient-to-r from-red-800 via-red-500 to-red-400"
                initial={{ width: "100%" }}
                animate={{ width: `${(bossHP.current / bossHP.max) * 100}%` }}
                transition={{ type: "spring", stiffness: 50, damping: 15 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Menú de Pausa */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900/90 border-2 border-indigo-500/50 p-10 rounded-3xl shadow-[0_0_50px_rgba(79,70,229,0.3)] max-w-sm w-full text-center"
            >
              <h2 className="text-4xl font-orbitron font-black text-white mb-2 tracking-tighter">PAUSA</h2>
              <div className="h-1 w-20 bg-indigo-500 mx-auto mb-8 rounded-full" />
              
              <div className="space-y-4">
                <button
                  onClick={() => {
                    gameStateRef.current.isPaused = false;
                    setIsPaused(false);
                  }}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all uppercase tracking-widest shadow-lg shadow-indigo-600/20"
                >
                  Continuar
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all uppercase tracking-widest border border-slate-700"
                >
                  Reiniciar
                </button>

                <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest pt-4">
                  Pulsa <span className="text-indigo-400">Q</span> para reanudar
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cinematic Vignette */}
      <div className="fixed inset-0 pointer-events-none z-[55] shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />
      
      {/* Damage Flash */}
      <AnimatePresence>
        {gameStateRef.current.player.hp < gameStateRef.current.player.maxHp && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.2, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="fixed inset-0 bg-red-600 pointer-events-none z-[56]"
          />
        )}
      </AnimatePresence>

      {/* GOD PANEL */}
      {showGodPanel && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900/95 border-2 border-yellow-500 p-8 rounded-3xl z-[100] backdrop-blur-xl w-[90%] max-w-4xl shadow-[0_0_50px_rgba(234,179,8,0.3)]">
          <h2 className="text-3xl font-orbitron font-bold text-yellow-500 mb-2 text-center uppercase tracking-widest">Panel de Deidad</h2>
          <p className="text-[10px] text-yellow-500/60 text-center mb-8 uppercase font-black tracking-widest">Presiona <span className="text-white">V</span> para lanzar Rayo Divino</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Boss Skips */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">Saltos de Boss</h3>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    const now = performance.now();
                    gameStateRef.current.startTime = now - (60 * 1000);
                    setSurvivalTime(60);
                    gameStateRef.current.enemies = [];
                    setShowGodPanel(false);
                  }}
                  className="bg-orange-600/20 border border-orange-500 text-orange-400 py-3 rounded-xl text-xs font-bold hover:bg-orange-600/40 transition-all uppercase"
                >
                  Boss 1: Planeta Errante
                </button>
                <button 
                  onClick={() => {
                    const now = performance.now();
                    gameStateRef.current.startTime = now - (120 * 1000);
                    setSurvivalTime(120);
                    gameStateRef.current.enemies = [];
                    setShowGodPanel(false);
                  }}
                  className="bg-indigo-600/20 border border-indigo-500 text-indigo-400 py-3 rounded-xl text-xs font-bold hover:bg-indigo-600/40 transition-all uppercase"
                >
                  Boss 2: Agujero Negro
                </button>
                <button 
                  onClick={() => {
                    const now = performance.now();
                    gameStateRef.current.startTime = now - (180 * 1000);
                    setSurvivalTime(180);
                    gameStateRef.current.blackHoleSpawned = true;
                    gameStateRef.current.enemies = [];
                    setShowGodPanel(false);
                  }}
                  className="bg-purple-600/20 border border-purple-500 text-purple-400 py-3 rounded-xl text-xs font-bold hover:bg-purple-600/40 transition-all uppercase"
                >
                  Boss 3: Vanguardia
                </button>
                <button 
                  onClick={() => {
                    const now = performance.now();
                    gameStateRef.current.startTime = now - (240 * 1000);
                    setSurvivalTime(240);
                    gameStateRef.current.blackHoleSpawned = true;
                    gameStateRef.current.vanguardSpawned = true;
                    gameStateRef.current.enemies = [];
                    setShowGodPanel(false);
                  }}
                  className="bg-emerald-600/20 border border-emerald-500 text-emerald-400 py-3 rounded-xl text-xs font-bold hover:bg-emerald-600/40 transition-all uppercase"
                >
                  Boss 4: Vaca Gigante
                </button>
                <button 
                  onClick={() => {
                    const now = performance.now();
                    gameStateRef.current.startTime = now - (300 * 1000);
                    setSurvivalTime(300);
                    gameStateRef.current.blackHoleSpawned = true;
                    gameStateRef.current.vanguardSpawned = true;
                    gameStateRef.current.chaosBossSpawned = true;
                    gameStateRef.current.enemies = [];
                    setShowGodPanel(false);
                  }}
                  className="bg-red-600/20 border border-red-500 text-red-400 py-3 rounded-xl text-xs font-bold hover:bg-red-600/40 transition-all uppercase"
                >
                  Boss 5: Caos Primordial
                </button>
              </div>
            </div>

            {/* Right Column: Other Controls */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">Control de Tiempo</h3>
                <div className="flex gap-2">
                  {[0.5, 1, 2, 5].map(v => (
                    <button 
                      key={v}
                      onClick={() => { gameStateRef.current.timeScale = v; }}
                      className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${gameStateRef.current.timeScale === v ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                    >
                      {v}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">Acciones y Desbloqueos</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => {
                      if ((window as any).spawnEnemy) {
                        for(let i=0; i<5; i++) (window as any).spawnEnemy();
                      }
                    }}
                    className="bg-red-600/20 border border-red-500 text-red-400 py-3 rounded-xl text-[10px] font-bold hover:bg-red-600/40 transition-all uppercase"
                  >
                    +5 Enemigos
                  </button>
                  <button 
                    onClick={() => {
                      if ((window as any).spawnPowerUp) {
                        (window as any).spawnPowerUp();
                      }
                    }}
                    className="bg-cyan-600/20 border border-cyan-500 text-cyan-400 py-3 rounded-xl text-[10px] font-bold hover:bg-cyan-600/40 transition-all uppercase"
                  >
                    +1 Mejora
                  </button>
                  <button 
                    onClick={() => {
                      gameStateRef.current.enemies = [];
                    }}
                    className="bg-slate-800 border border-slate-600 text-slate-300 py-3 rounded-xl text-[10px] font-bold hover:bg-slate-700 transition-all uppercase"
                  >
                    Limpiar Mapa
                  </button>
                  <button 
                    onClick={() => {
                      setAbilityUnlocked(true);
                      gameStateRef.current.specialAbilityUnlocked = true;
                    }}
                    className="bg-fuchsia-600/20 border border-fuchsia-500 text-fuchsia-400 py-3 rounded-xl text-[10px] font-bold hover:bg-fuchsia-600/40 transition-all uppercase"
                  >
                    Nova
                  </button>
                  <button 
                    onClick={() => {
                      setNecromancyUnlocked(true);
                      gameStateRef.current.necromancyUnlocked = true;
                      setNecromancyNotification(true);
                      setTimeout(() => setNecromancyNotification(false), 5000);
                    }}
                    className="bg-green-600/20 border border-green-500 text-green-400 py-3 rounded-xl text-[10px] font-bold hover:bg-green-600/40 transition-all uppercase"
                  >
                    Nigromancia
                  </button>
                  <button 
                    onClick={() => {
                      gameStateRef.current.orbitalsUnlocked = true;
                      setOrbitalsNotification(true);
                      setTimeout(() => setOrbitalsNotification(false), 5000);
                      if (gameStateRef.current.playerOrbitals.length === 0) {
                        for (let i = 0; i < 4; i++) {
                          gameStateRef.current.playerOrbitals.push({
                            x: 0, y: 0, radius: 10, angle: (i * Math.PI * 2) / 4,
                            distance: 80, speed: 0.04, color: '#6366f1'
                          });
                        }
                      }
                    }}
                    className="bg-indigo-600/20 border border-indigo-500 text-indigo-400 py-3 rounded-xl text-[10px] font-bold hover:bg-indigo-600/40 transition-all uppercase"
                  >
                    Orbitales
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setShowGodPanel(false)}
            className="w-full bg-slate-100 text-black py-4 rounded-2xl text-sm font-black uppercase mt-8 hover:bg-white transition-all shadow-lg"
          >
            Cerrar Panel (K)
          </button>
        </div>
      )}
    </div>
  );
};

export default Game;
