
import React, { useState, useEffect } from 'react';
import { GameState, ShipType, ShipConfig } from './types';
import Game from './components/Game';
import StartMenu from './components/StartMenu';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';

const SHIPS: Record<ShipType, ShipConfig> = {
  INTERCEPTOR: {
    type: 'INTERCEPTOR',
    name: 'Interceptor',
    color: '#60a5fa',
    speed: 5.5,
    fireRate: 60, // Muy rápido
    projectileSize: 4,
    projectileSpeed: 18,
    description: 'Cadencia de fuego ultra-rápida para abrumar al enemigo.'
  },
  STRIKER: {
    type: 'STRIKER',
    name: 'Striker',
    color: '#4ade80',
    speed: 7.5,
    fireRate: 250, // Más despacio
    projectileSize: 3,
    projectileSpeed: 22,
    description: 'Disparo triple de alta precisión y gran velocidad.'
  },
  VANGUARD: {
    type: 'VANGUARD',
    name: 'Vanguard',
    color: '#fb923c',
    speed: 4,
    fireRate: 180, // Velocidad media
    projectileSize: 12,
    projectileSpeed: 12,
    description: 'Proyectiles de plasma pesado que atraviesan a los enemigos.'
  }
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [selectedShip, setSelectedShip] = useState<ShipConfig>(SHIPS.INTERCEPTOR);
  const [score, setScore] = useState(0);
  const [lastScore, setLastScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [checkpoint, setCheckpoint] = useState<{ active: boolean; score: number } | null>(null);
  const [isResuming, setIsResuming] = useState(false);
  const [aiMessage, setAiMessage] = useState<string>("¡El hangar está listo, Piloto!");

  useEffect(() => {
    const saved = localStorage.getItem('sky-guardian-highscore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  const handleStartGame = (resume: boolean = false) => {
    setIsResuming(resume);
    setScore(resume ? (checkpoint?.score || 0) : 0);
    setGameState(GameState.PLAYING);
  };

  const handleCheckpoint = (currentScore: number) => {
    setCheckpoint({ active: true, score: currentScore });
  };

  const handleWin = (finalScore: number) => {
    handleGameOver(finalScore, true);
  };

  const handleGameOver = async (finalScore: number, isWin: boolean = false) => {
    setScore(finalScore);
    setLastScore(finalScore);
    const isNewRecord = finalScore > highScore;
    
    if (isNewRecord) {
      setHighScore(finalScore);
      localStorage.setItem('sky-guardian-highscore', finalScore.toString());
    }
    
    setGameState(GameState.MENU);
    setAiMessage(isWin ? "¡Misión cumplida! Sector asegurado." : "Analizando restos de la nave...");

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = isWin 
        ? `El jugador ha COMPLETADO una misión en 'Sky Guardian'. Puntuación: ${finalScore}. Genera un mensaje corto de felicitación militar.`
        : `El jugador ha perdido en el juego 'Sky Guardian'. 
      Puntuación final: ${finalScore}. Nave utilizada: ${selectedShip.name}. ${isNewRecord ? "¡Es un NUEVO RÉCORD!" : `Récord actual: ${highScore}`}.
      Genera un mensaje muy corto (máximo 10 palabras) de un comandante espacial evaluando el desempeño. 
      Sé conciso y militar.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      
      if (response.text) {
        setAiMessage(response.text.trim());
      }
    } catch (error) {
      setAiMessage(isNewRecord ? "¡Récord batido! Eres el as de la galaxia." : "Misión fallida. Reparando sistemas.");
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-white">
      {/* Global Scanline Effect */}
      <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
      
      <AnimatePresence mode="wait">
        {gameState === GameState.MENU && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ 
              opacity: 0, 
              scale: 1.5, 
              filter: 'blur(40px) brightness(2)',
              transition: { duration: 0.8, ease: "circIn" }
            }}
            className="w-full h-full"
          >
            <StartMenu 
              onStart={() => handleStartGame(false)} 
              onResume={checkpoint?.active ? () => handleStartGame(true) : undefined}
              highScore={highScore}
              lastScore={lastScore}
              aiMessage={aiMessage}
              selectedShip={selectedShip}
              onSelectShip={(type) => setSelectedShip(SHIPS[type])}
              ships={SHIPS}
              checkpointScore={checkpoint?.score}
            />
          </motion.div>
        )}
        
        {gameState === GameState.PLAYING && (
          <motion.div
            key="game"
            initial={{ opacity: 0, scale: 0.8, filter: 'brightness(0)' }}
            animate={{ opacity: 1, scale: 1, filter: 'brightness(1)' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "backOut" }}
            className="w-full h-full"
          >
            <Game 
              onGameOver={(score) => handleGameOver(score, false)} 
              onWin={handleWin}
              onCheckpoint={handleCheckpoint}
              shipConfig={selectedShip} 
              initialScore={isResuming ? checkpoint?.score : 0}
              initialAbility={isResuming}
              difficulty={1}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
