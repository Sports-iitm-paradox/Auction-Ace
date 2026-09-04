
'use client';

import React from 'react';
import { Squad, Player } from '@/lib/player-data';
import { Trophy, Shield } from 'lucide-react';

interface SquadPosterProps {
  squad: Squad;
  allPlayers: Player[];
}

export const SquadPoster: React.FC<SquadPosterProps> = ({ squad, allPlayers }) => {
  // Parse the player list robustly
  const playerEntries = (squad.playersList || '').split(';').filter(Boolean).map(entry => {
    const parts = entry.split(':');
    if (parts.length < 2) return null;
    
    const name = parts[0].trim();
    const price = parts[1].trim();
    
    // Exact matching with fallback for spacing
    const playerInfo = allPlayers.find(p => p.playerName.toLowerCase().trim() === name.toLowerCase());
    
    return { name, price, playerInfo };
  }).filter((e): e is NonNullable<typeof e> => e !== null);

  return (
    <div 
      id={`poster-${squad.id}`}
      className="w-[1080px] h-[1350px] bg-[#1a0202] text-white p-12 relative flex flex-col items-center justify-between overflow-hidden"
      style={{
        backgroundImage: 'radial-gradient(circle at center, #3a0505 0%, #1a0202 100%)',
      }}
    >
      {/* Decorative Borders */}
      <div className="absolute inset-4 border-4 border-primary/40 pointer-events-none" />
      <div className="absolute inset-8 border border-primary/20 pointer-events-none" />
      
      {/* Header */}
      <div className="text-center z-10 w-full">
        <div className="flex justify-center mb-6">
          <Trophy className="h-20 w-20 text-primary drop-shadow-[0_0_20px_rgba(255,215,0,0.5)]" />
        </div>
        <h1 className="text-7xl font-serif font-black text-primary uppercase tracking-[0.2em] mb-2 italic">
          {squad.name}
        </h1>
        <div className="h-1 w-64 bg-primary mx-auto mb-4" />
        <p className="text-xl font-serif text-white/60 tracking-[0.5em] uppercase">
          Official SAAVAN '26 Squad
        </p>
      </div>

      {/* Stats Summary */}
      <div className="flex gap-12 z-10">
        <div className="text-center border-l-2 border-primary/40 pl-8">
          <p className="text-xs font-black uppercase tracking-widest text-primary/60 mb-1">Total Points</p>
          <p className="text-6xl font-mono font-black text-white">{squad.totalPoints}</p>
        </div>
        <div className="text-center border-l-2 border-primary/40 pl-8">
          <p className="text-xs font-black uppercase tracking-widest text-primary/60 mb-1">Purse Remaining</p>
          <p className="text-6xl font-mono font-black text-primary">{squad.moneyLeft} Cr</p>
        </div>
      </div>

      {/* Players Grid */}
      <div className="w-full grid grid-cols-4 gap-6 z-10 flex-1 py-12">
        {playerEntries.map((entry, idx) => (
          <div key={idx} className="bg-black/60 border border-primary/30 p-4 flex flex-col items-center text-center relative shadow-2xl">
             <div className="w-full aspect-[3/4] relative bg-black/80 mb-3 border border-primary/10 overflow-hidden flex items-center justify-center">
                {entry.playerInfo?.imageUrl ? (
                  <img src={entry.playerInfo.imageUrl} alt={entry.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center opacity-20">
                    <Shield className="h-16 w-16 text-primary" />
                  </div>
                )}
             </div>
             <p className="text-[14px] font-serif font-black truncate w-full uppercase text-white tracking-wider">{entry.name}</p>
             <div className="mt-1 bg-primary/20 border border-primary/40 px-3 py-0.5">
                <p className="text-[10px] font-mono text-primary font-black uppercase tracking-tighter">{entry.price}L</p>
             </div>
          </div>
        ))}
        {/* Fill the remaining grid with placeholders only if squad is very small */}
        {playerEntries.length < 12 && Array.from({ length: 12 - playerEntries.length }).map((_, i) => (
           <div key={`empty-${i}`} className="bg-black/20 border border-white/5 p-4 flex flex-col items-center justify-center opacity-30">
              <Shield className="h-12 w-12 text-white/10" />
           </div>
        ))}
      </div>

      {/* Footer Branding */}
      <div className="w-full text-center z-10 border-t border-primary/20 pt-8 mt-4">
        <p className="text-sm font-black text-white/40 tracking-[0.8em] uppercase">
          IIT Madras Paradox • Sports Department
        </p>
      </div>
      
      {/* Texture Overlays */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay bg-[url('https://picsum.photos/seed/texture/1000/1000')] bg-repeat" />
    </div>
  );
};
