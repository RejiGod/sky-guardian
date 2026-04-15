
import React, { useEffect, useState } from 'react';
import { ShipType, ShipConfig } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface StartMenuProps {
  onStart: () => void;
  onResume?: () => void;
  highScore: number;
  lastScore?: number;
  aiMessage?: string;
  selectedShip: ShipConfig;
  onSelectShip: (type: ShipType) => void;
  ships: Record<ShipType, ShipConfig>;
  checkpointScore?: number;
}

const StartMenu: React.FC<StartMenuProps> = ({ 
  onStart, 
  onResume, 
  highScore, 
  lastScore, 
  aiMessage, 
  selectedShip, 
  onSelectShip, 
  ships
}) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [debris, setDebris] = useState<any[]>([]);
  const [showGodModeInfo, setShowGodModeInfo] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 30,
        y: (e.clientY / window.innerHeight - 0.5) * 30,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Sistema de Absorción de Escombros Espaciales
  useEffect(() => {
    const spawnDebris = () => {
      const types = ['PLANET', 'STAR', 'SHIP'];
      const type = types[Math.floor(Math.random() * types.length)];
      const angle = Math.random() * Math.PI * 2;
      const distance = 800 + Math.random() * 400;
      
      const planetTypes = ['ROCKY', 'GAS_GIANT', 'ICE', 'LAVA'];
      const planetType = type === 'PLANET' ? planetTypes[Math.floor(Math.random() * planetTypes.length)] : null;
      
      const newDebris = {
        id: Date.now() + Math.random(),
        type,
        planetType,
        angle,
        distance,
        size: type === 'PLANET' ? 40 + Math.random() * 60 : type === 'SHIP' ? 15 + Math.random() * 15 : 4 + Math.random() * 6,
        color: type === 'PLANET' 
          ? (planetType === 'ROCKY' ? '#94a3b8' : planetType === 'GAS_GIANT' ? '#f59e0b' : planetType === 'ICE' ? '#3b82f6' : '#ef4444')
          : type === 'SHIP' ? '#94a3b8' : '#ffffff',
        speed: 0.001 + Math.random() * 0.002,
        rotationSpeed: (Math.random() - 0.5) * 2
      };

      setDebris(prev => [...prev.slice(-15), newDebris]);
    };

    const interval = setInterval(spawnDebris, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex flex-col lg:flex-row items-center justify-center w-full h-full gap-12 bg-[#020205] px-8 py-12 z-50 overflow-hidden">
      
      {/* AGUJERO NEGRO CINEMÁTICO ULTRA-REALISTA */}
      <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden pointer-events-none">
        
        {/* Fondo de Nebulosa Profunda */}
        <motion.div 
          animate={{ 
            x: -mousePos.x * 0.5,
            y: -mousePos.y * 0.5,
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-[150%] h-[150%] opacity-30 mix-blend-screen"
          style={{
            background: 'radial-gradient(circle at 50% 50%, #1e1b4b 0%, #020617 70%)',
          }}
        />

        {/* Brillo Gravitacional Externo (Lensing) */}
        <div className="absolute w-[1400px] h-[1400px] rounded-full bg-indigo-500/5 blur-[150px]" />
        
        {/* OBJETOS SIENDO ABSORBIDOS (Planetas, Estrellas, Naves) con efecto Vórtice Acelerado */}
        <AnimatePresence>
          {debris.map((item) => (
            <motion.div
              key={item.id}
              initial={{ 
                rotate: (item.angle * 180) / Math.PI,
                opacity: 0
              }}
              animate={{ 
                rotate: (item.angle * 180) / Math.PI + 720 * (item.id % 2 === 0 ? 1 : -1), // Giro orbital más pronunciado
                opacity: [0, 1, 1, 0]
              }}
              transition={{ 
                duration: 10 + Math.random() * 5,
                ease: "easeIn" // Aceleración orbital al acercarse
              }}
              className="absolute flex items-center justify-center"
              style={{ width: 0, height: 0 }}
            >
              {/* Movimiento Radial: Se acerca al centro con aceleración gravitatoria extrema */}
              <motion.div
                initial={{ x: item.distance }}
                animate={{ x: 0 }}
                transition={{ 
                  duration: 7 + Math.random() * 3,
                  ease: "circIn" // Aceleración máxima al final (curva circular)
                }}
              >
                {/* Espaguetización: Estiramiento radial y aplanamiento tangencial progresivo */}
                <motion.div
                  animate={{
                    scaleX: [1, 1.1, 1.5, 3, 0], 
                    scaleY: [1, 0.95, 0.8, 0.4, 0], 
                    scale: [0, 1, 1, 1, 0]
                  }}
                  transition={{ 
                    duration: 10 + Math.random() * 5,
                    ease: "easeIn"
                  }}
                >
                  {/* Giro interno del objeto */}
                  <motion.div
                    animate={{ rotate: 720 * (item.id % 2 === 0 ? 1 : -1) }}
                    transition={{ 
                      duration: 10 + Math.random() * 5,
                      ease: "linear"
                    }}
                  >
                    {item.type === 'PLANET' && (
                      <div 
                        className="relative rounded-full overflow-hidden"
                        style={{ 
                          width: item.size, 
                          height: item.size, 
                          backgroundColor: item.color,
                          boxShadow: `0 0 40px ${item.color}44, inset -10px -10px 20px rgba(0,0,0,0.8)`
                        }}
                      >
                        {/* Textura de Superficie / Bandas Atmosféricas */}
                        <div 
                          className="absolute inset-0 opacity-40"
                          style={{
                            background: item.planetType === 'GAS_GIANT' 
                              ? `repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(0,0,0,0.2) 10px, rgba(0,0,0,0.2) 20px)`
                              : `radial-gradient(circle at 50% 50%, transparent 40%, rgba(0,0,0,0.3) 100%)`,
                            mixBlendMode: 'overlay'
                          }}
                        />
                        
                        {/* Manchas / Continentes / Cráteres (Simulados con gradientes) */}
                        <div 
                          className="absolute inset-0 opacity-30"
                          style={{
                            background: `
                              radial-gradient(circle at 20% 30%, rgba(255,255,255,0.2) 0%, transparent 40%),
                              radial-gradient(circle at 70% 60%, rgba(0,0,0,0.4) 0%, transparent 50%),
                              radial-gradient(circle at 40% 80%, rgba(255,255,255,0.1) 0%, transparent 30%)
                            `
                          }}
                        />

                        {/* Brillo Atmosférico / Lensing */}
                        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.4)_0%,transparent_60%)]" />
                        
                        {/* Sombra Proyectada (Efecto 3D) */}
                        <div className="absolute inset-0 rounded-full shadow-[inset_-15px_-15px_30px_rgba(0,0,0,0.9)]" />

                        {/* Anillos (Opcional para algunos planetas) */}
                        {item.planetType === 'GAS_GIANT' && (
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180%] h-[15%] border-[2px] border-white/10 rounded-full rotate-[25deg] blur-[1px]" />
                        )}
                        {item.planetType === 'GAS_GIANT' && (
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] h-[10%] border-[1px] border-white/5 rounded-full rotate-[25deg]" />
                        )}
                      </div>
                    )}
                    {item.type === 'SHIP' && (
                      <div className="relative" style={{ width: item.size, height: item.size }}>
                        <svg viewBox="0 0 40 40" className="w-full h-full" style={{ fill: item.color }}>
                          <path d="M20 5 L35 30 L20 26 L5 30 Z" />
                        </svg>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-cyan-400 animate-pulse rounded-full shadow-[0_0_10px_#22d3ee]" />
                      </div>
                    )}
                    {item.type === 'STAR' && (
                      <div 
                        className="rounded-full blur-[1px]"
                        style={{ 
                          width: item.size, 
                          height: item.size, 
                          backgroundColor: '#fff',
                          boxShadow: '0 0 15px #fff, 0 0 30px #fff'
                        }}
                      />
                    )}
                  </motion.div>
                </motion.div>
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Disco de Acreción - Capa 4 (Externa, Muy Lenta) */}
        <motion.div 
          animate={{ rotate: 360, x: mousePos.x * 0.2, y: mousePos.y * 0.2 }}
          transition={{ rotate: { duration: 60, repeat: Infinity, ease: "linear" } }}
          className="absolute w-[1100px] h-[1100px] rounded-full opacity-10"
          style={{
            background: 'conic-gradient(from 0deg, transparent, #4338ca, transparent, #312e81, transparent)',
            filter: 'blur(100px)'
          }}
        />

        {/* Disco de Acreción - Capa 3 (Media) */}
        <motion.div 
          animate={{ rotate: -360, x: mousePos.x * 0.4, y: mousePos.y * 0.4 }}
          transition={{ rotate: { duration: 40, repeat: Infinity, ease: "linear" } }}
          className="absolute w-[850px] h-[850px] rounded-full opacity-20"
          style={{
            background: 'conic-gradient(from 90deg, transparent, #6366f1, transparent, #4f46e5, transparent)',
            filter: 'blur(60px)'
          }}
        />
        
        {/* Disco de Acreción - Capa 2 (Interna, Rápida) */}
        <motion.div 
          animate={{ rotate: 720, x: mousePos.x * 0.6, y: mousePos.y * 0.6 }}
          transition={{ rotate: { duration: 25, repeat: Infinity, ease: "linear" } }}
          className="absolute w-[600px] h-[600px] rounded-full opacity-40"
          style={{
            background: 'conic-gradient(from 180deg, transparent, #818cf8, #c084fc, transparent, #818cf8)',
            filter: 'blur(30px)'
          }}
        />

        {/* Disco de Acreción - Capa 1 (Núcleo de Energía, Muy Rápida) */}
        <motion.div 
          animate={{ rotate: -1080, scale: [1, 1.05, 1] }}
          transition={{ 
            rotate: { duration: 15, repeat: Infinity, ease: "linear" },
            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }}
          className="absolute w-[400px] h-[400px] rounded-full opacity-60 mix-blend-screen"
          style={{
            background: 'conic-gradient(from 270deg, transparent, #ffffff, #818cf8, transparent, #ffffff)',
            filter: 'blur(15px)'
          }}
        />

        {/* Jets Relativistas (Efecto Vertical de Energía) */}
        <motion.div 
          animate={{ opacity: [0.1, 0.4, 0.1], scaleY: [1, 1.3, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute w-2 h-[130vh] bg-gradient-to-b from-transparent via-cyan-400/40 to-transparent blur-2xl" 
        />
        <motion.div 
          animate={{ opacity: [0.2, 0.6, 0.2], scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute w-64 h-64 bg-indigo-500/30 blur-[100px] rounded-full" 
        />

        {/* Warp Ring (Gravitational Lensing Simulation) */}
        <motion.div 
          animate={{ rotate: 360, scale: [1, 1.05, 1] }}
          transition={{ 
            rotate: { duration: 120, repeat: Infinity, ease: "linear" },
            scale: { duration: 10, repeat: Infinity, ease: "easeInOut" }
          }}
          className="absolute w-[1300px] h-[1300px] border-[1px] border-indigo-400/10 rounded-full opacity-20"
          style={{
            boxShadow: '0 0 80px rgba(99, 102, 241, 0.1) inset'
          }}
        />

        {/* Horizonte de Eventos (El Vacío Central) */}
        <motion.div 
          animate={{ 
            scale: [1, 1.03, 1],
            x: mousePos.x * 0.8,
            y: mousePos.y * 0.8,
            boxShadow: [
              '0 0 120px rgba(79,70,229,0.6)',
              '0 0 200px rgba(79,70,229,0.9)',
              '0 0 120px rgba(79,70,229,0.6)'
            ]
          }}
          transition={{ 
            scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
            boxShadow: { duration: 4, repeat: Infinity, ease: "easeInOut" }
          }}
          className="absolute w-72 h-72 bg-black rounded-full z-10 border border-indigo-500/40"
        >
          {/* Efecto de "Succión" Interna */}
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,transparent_50%,rgba(79,70,229,0.3)_100%)]" />
          <motion.div 
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-4 rounded-full border border-indigo-500/20"
          />
        </motion.div>
        
        {/* Esfera de Fotones (Anillo de Luz Crítico) */}
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1], 
            opacity: [0.5, 0.9, 0.5],
            rotate: -360,
            x: mousePos.x * 0.9,
            y: mousePos.y * 0.9
          }}
          transition={{ 
            scale: { duration: 6, repeat: Infinity },
            opacity: { duration: 3, repeat: Infinity },
            rotate: { duration: 30, repeat: Infinity, ease: "linear" }
          }}
          className="absolute w-[310px] h-[310px] border-[4px] border-white/30 rounded-full z-20 blur-[1px]"
          style={{
            boxShadow: '0 0 50px rgba(255, 255, 255, 0.5), inset 0 0 30px rgba(255, 255, 255, 0.3)'
          }}
        />
        
        {/* Partículas de Distorsión Espacial (Efecto de Succión) */}
        {[...Array(60)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: (Math.random() - 0.5) * 1800, 
              y: (Math.random() - 0.5) * 1800,
              opacity: 0,
              scale: Math.random() * 2.5
            }}
            animate={{ 
              x: mousePos.x * 1.5, 
              y: mousePos.y * 1.5, 
              opacity: [0, 1, 0],
              scale: [0, 3, 0],
              rotate: [0, 720]
            }}
            transition={{ 
              duration: 4 + Math.random() * 5, 
              repeat: Infinity, 
              delay: Math.random() * 12,
              ease: "circIn"
            }}
            className="absolute w-1 h-1 bg-indigo-200 rounded-full z-0"
            style={{
              boxShadow: '0 0 15px #a5b4fc'
            }}
          />
        ))}
        
        {/* Starfield Distorsionado con Parallax */}
        <motion.div 
          animate={{ x: mousePos.x * 0.1, y: mousePos.y * 0.1 }}
          className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-screen" 
        />
      </div>

      {/* Contenido del Menú */}
      <motion.div 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6 max-w-xl"
      >
        <div className="relative">
          <motion.h1 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-6xl md:text-8xl font-orbitron font-bold text-white tracking-tighter drop-shadow-[0_0_30px_rgba(99,102,241,0.8)]"
          >
            SKY GUARDIAN
          </motion.h1>
          <motion.div 
            initial={{ rotate: -20, opacity: 0 }}
            animate={{ rotate: 12, opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute -right-8 -top-4 bg-indigo-600 text-white text-[12px] font-black px-3 py-1 rounded shadow-lg shadow-indigo-500/50"
          >
            ULTRA v3.5
          </motion.div>
        </div>
        
        <AnimatePresence>
          {lastScore !== undefined && lastScore > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="w-full bg-slate-900/60 border-l-4 border-indigo-500 p-5 rounded-r-xl shadow-lg shadow-indigo-500/10 backdrop-blur-xl"
            >
              <p className="text-[10px] uppercase tracking-widest text-indigo-400 font-black mb-1">Informe del Comandante:</p>
              <p className="text-sm text-slate-200 italic font-medium leading-relaxed">"{aiMessage}"</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="flex-1 bg-slate-900/40 p-4 rounded-2xl border border-slate-800 backdrop-blur-md"
          >
            <p className="text-[8px] uppercase tracking-widest text-slate-500 mb-1 font-bold">Récord de la Flota</p>
            <p className="text-3xl font-orbitron text-yellow-400">{highScore.toLocaleString()}</p>
          </motion.div>
          
          <div className="flex-1 flex flex-col justify-center bg-slate-900/40 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
            <p className="text-[8px] uppercase tracking-widest text-slate-500 mb-2 font-bold">Controles de Vuelo</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-slate-400 font-bold uppercase">Mover</span>
                <span className="text-[9px] text-white font-black bg-slate-700 px-1 rounded">WASD</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-slate-400 font-bold uppercase">Dash</span>
                <span className="text-[9px] text-white font-black bg-slate-700 px-1 rounded">SPACE</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-slate-400 font-bold uppercase">Disparar</span>
                <span className="text-[9px] text-white font-black bg-slate-700 px-1 rounded">CLICK</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-slate-400 font-bold uppercase">Nova</span>
                <span className="text-[9px] text-white font-black bg-slate-700 px-1 rounded">E</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full pt-2">
          <motion.button
            whileHover={{ scale: 1.05, backgroundColor: '#4f46e5' }}
            whileTap={{ scale: 0.95 }}
            onClick={onStart}
            className="flex-1 px-8 py-5 font-bold text-white bg-indigo-600 rounded-2xl transition-all font-orbitron uppercase tracking-widest shadow-xl shadow-indigo-900/40 border-b-4 border-indigo-800"
          >
            Supervivencia
          </motion.button>

          {onResume && (
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: '#059669' }}
              whileTap={{ scale: 0.95 }}
              onClick={onResume}
              className="flex-1 px-8 py-5 font-bold text-white bg-emerald-600 rounded-2xl transition-all font-orbitron uppercase tracking-widest shadow-xl shadow-emerald-900/40 border-b-4 border-emerald-800"
            >
              Reanudar
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Selección de Nave */}
      <motion.div 
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
        className="relative z-10 flex flex-col space-y-4 w-full max-w-md"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="text-xl font-orbitron font-bold text-slate-200 uppercase tracking-widest">Unidades Disponibles</h3>
          <span className="text-[10px] text-indigo-400 font-black animate-pulse">HANGAR ACTIVO</span>
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          {(Object.keys(ships) as ShipType[]).map((type, idx) => {
            const ship = ships[type];
            const isSelected = selectedShip.type === type;
            
            return (
              <motion.button
                key={type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + idx * 0.1 }}
                onClick={() => onSelectShip(type)}
                className={`flex items-center gap-5 p-5 rounded-2xl border-2 transition-all relative overflow-hidden group backdrop-blur-md ${
                  isSelected ? 'bg-indigo-900/40 border-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.3)]' : 'bg-slate-900/60 border-slate-800 hover:border-slate-600 hover:bg-slate-800/80'
                }`}
              >
                {/* Holographic Scanline Effect on Selected */}
                {isSelected && (
                  <motion.div 
                    animate={{ y: [-100, 200] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-x-0 h-[1px] bg-indigo-400/30 z-20 pointer-events-none"
                  />
                )}
                
                {isSelected && (
                  <motion.div 
                    layoutId="activeShip"
                    className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-transparent z-0"
                  />
                )}
                <div className={`relative z-10 w-16 h-16 flex items-center justify-center rounded-xl bg-black/60 border border-white/5 transition-all duration-500 ${isSelected ? 'scale-110 rotate-3 shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'group-hover:scale-105 group-hover:-rotate-2'}`}>
                   <svg viewBox="0 0 40 40" className="w-12 h-12 drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]" style={{ fill: ship.color }}>
                      {type === 'INTERCEPTOR' && (
                         <path d="M30 20 L15 10 L10 12 L12 20 L10 28 L15 30 Z M15 15 L10 5 L15 15 Z M15 25 L10 35 L15 25 Z" />
                       )}
                      {type === 'STRIKER' && (
                         <path d="M35 20 L20 15 L28 8 L15 12 L10 5 L12 20 L10 35 L15 28 L28 32 L20 25 Z" />
                       )}
                      {type === 'VANGUARD' && (
                         <path d="M10 10 H30 V30 H10 Z M30 12 L38 20 L30 28 Z M15 5 H25 V10 H15 Z M15 30 H25 V35 H15 Z" />
                       )}
                   </svg>
                </div>
                <div className="relative z-10 flex-1 text-left">
                  <div className={`font-orbitron font-bold tracking-wider transition-all ${isSelected ? 'text-white text-xl' : 'text-slate-300 text-lg'}`}>{ship.name}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-black leading-tight mt-1 tracking-tighter">{ship.description}</div>
                </div>
                {isSelected && (
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: 6 }}
                    className="absolute right-0 top-0 bottom-0 bg-indigo-400 shadow-[0_0_15px_rgba(129,140,248,0.8)]" 
                  />
                )}
              </motion.button>
            );
          })}
        </div>
        
        <motion.div 
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="p-4 bg-slate-900/40 rounded-xl border border-slate-800 text-[10px] text-slate-500 uppercase font-black tracking-widest text-center"
        >
          Sistemas de armamento calibrados y listos
        </motion.div>
      </motion.div>

      {/* Easter Egg: Vaca Espacial */}
      <div 
        className="absolute bottom-4 left-4 z-[60] cursor-pointer group"
        onClick={() => setShowGodModeInfo(prev => !prev)}
      >
        <motion.div
          animate={{ 
            y: [0, -2, 0],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 4, repeat: Infinity }}
          className="text-[32px] opacity-80 hover:opacity-100 transition-opacity filter drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]"
          title="???"
        >
          🐄
        </motion.div>
        
        <AnimatePresence>
          {showGodModeInfo && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.8, originX: 0, originY: 1 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.8 }}
              className="absolute bottom-8 left-0 w-48 bg-slate-900/95 border border-indigo-500/50 p-3 rounded-xl backdrop-blur-xl shadow-2xl shadow-indigo-500/40 z-[70]"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Protocolo: M00-MODE</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center bg-white/5 p-1 rounded">
                  <span className="text-[9px] text-slate-400 font-bold uppercase">Modo Dios</span>
                  <span className="text-[9px] text-white font-black bg-indigo-600 px-1.5 py-0.5 rounded shadow-sm">P</span>
                </div>
                <div className="flex justify-between items-center bg-white/5 p-1 rounded">
                  <span className="text-[9px] text-slate-400 font-bold uppercase">Panel Control</span>
                  <span className="text-[9px] text-white font-black bg-indigo-600 px-1.5 py-0.5 rounded shadow-sm">K</span>
                </div>
              </div>
              <p className="text-[8px] text-slate-500 mt-3 italic text-center border-t border-white/5 pt-2">
                "Muuuuuuuucha suerte, piloto."
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StartMenu;
