
import React from 'react';

interface GameOverProps {
  score: number;
  highScore: number;
  onRestart: () => void;
  message: string;
}

const GameOver: React.FC<GameOverProps> = ({ score, highScore, onRestart, message }) => {
  const isNewRecord = score >= highScore && score > 0;

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md px-4 text-center">
      <h2 className="text-5xl md:text-7xl font-orbitron font-bold text-red-500 mb-2">MISIÓN FALLIDA</h2>
      
      <p className="text-xl text-indigo-300 italic mb-10 max-w-md">"{message}"</p>

      <div className="flex flex-col md:flex-row gap-8 mb-12">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-48">
          <p className="text-slate-500 text-xs uppercase font-bold tracking-widest mb-1">Puntuación</p>
          <p className="text-4xl font-orbitron text-white">{score.toLocaleString()}</p>
        </div>
        
        <div className={`bg-slate-900 border p-6 rounded-2xl w-48 ${isNewRecord ? 'border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'border-slate-800'}`}>
          <p className="text-slate-500 text-xs uppercase font-bold tracking-widest mb-1">Mejor Marca</p>
          <p className={`text-4xl font-orbitron ${isNewRecord ? 'text-yellow-400' : 'text-slate-300'}`}>{highScore.toLocaleString()}</p>
        </div>
      </div>

      <button
        onClick={onRestart}
        className="px-10 py-4 text-xl font-orbitron font-bold text-white bg-indigo-600 rounded-full hover:bg-indigo-500 transition-all shadow-lg hover:shadow-indigo-500/30"
      >
        REINTENTAR
      </button>
    </div>
  );
};

export default GameOver;
