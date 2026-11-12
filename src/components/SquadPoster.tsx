
'use client';

import React from 'react';
import { Squad, Player } from '@/lib/player-data';
import { User } from 'lucide-react';

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
    const role = parts[2]?.trim();
    
    // Find matching image from full player pool
    const playerInfo = allPlayers.find(p => 
        p.playerName.toLowerCase().replace(/\s+/g, ' ').trim() === 
        name.toLowerCase().replace(/\s+/g, ' ').trim()
    );
    
    return { name, price, role, playerInfo };
  }).filter((e): e is NonNullable<typeof e> => e !== null);

  return (
    <div 
      id={`poster-${squad.id}`}
      className="w-[1080px] h-[1350px] bg-white text-foreground p-0 relative flex flex-col items-stretch overflow-hidden border-[20px] border-foreground"
      style={{ fontFamily: "'Oxanium', cursive" }}
    >
      {/* Header HUD */}
      <div className="bg-foreground text-white px-12 py-12 flex justify-between items-center z-10">
        <div>
          <h2 className="text-[12px] font-black uppercase tracking-[0.6em] mb-2 opacity-50">Official Squad Announcement</h2>
          <h1 className="text-6xl font-black italic tracking-tighter uppercase leading-none">{squad.name}</h1>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40">Margazhi '27 Paradox</span>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-primary text-white px-12 py-6 flex gap-12 border-b-[10px] border-foreground z-10">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Total Points</p>
          <p className="text-4xl font-black italic tracking-tighter leading-none">{squad.totalPoints}</p>
        </div>
        <div className="h-10 w-px bg-white/20" />
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Purse Spent</p>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-black italic tracking-tighter leading-none">{squad.moneySpent}</p>
            <p className="text-xs font-black uppercase italic opacity-40">CR</p>
          </div>
        </div>
        <div className="h-10 w-px bg-white/20" />
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Status</p>
          <p className="text-2xl font-black italic uppercase tracking-widest leading-none">{squad.budgetStatus}</p>
        </div>
      </div>

      {/* Players Grid */}
      <div className="flex-1 grid grid-cols-5 gap-6 p-12 bg-accent/10 z-10 relative">
        {playerEntries.map((entry, idx) => (
          <div key={idx} className="bg-white border-[6px] border-foreground flex flex-col shadow-[10px_10px_0px_rgba(0,0,0,1)] relative overflow-hidden group">
             <div className="w-full aspect-[3/4] relative bg-accent/20 border-b-[6px] border-foreground flex items-center justify-center overflow-hidden">
                {entry.playerInfo?.imageUrl ? (
                  <img 
                    src={entry.playerInfo.imageUrl} 
                    alt={entry.name} 
                    className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                    crossOrigin="anonymous"
                  />
                ) : (
                  <User className="h-12 w-12 text-foreground/10" />
                )}
                <div className="absolute bottom-2 right-2">
                   <span className="text-[8px] font-black bg-foreground text-white px-2 py-0.5 uppercase tracking-widest">{entry.role}</span>
                </div>
             </div>
             <div className="p-3 bg-white flex-1 flex flex-col justify-between">
                <p className="text-[10px] font-black uppercase tracking-tight leading-tight mb-2 line-clamp-2">{entry.name}</p>
                <div className="flex items-baseline gap-1">
                   <p className="text-lg font-black italic tracking-tighter text-primary">{entry.price}</p>
                   <p className="text-[8px] font-black uppercase italic text-foreground/30">CR</p>
                </div>
             </div>
          </div>
        ))}
        {/* Placeholder slots for empty spots */}
        {playerEntries.length < 15 && Array.from({ length: 15 - playerEntries.length }).map((_, i) => (
           <div key={`empty-${i}`} className="bg-white/40 border-[6px] border-dashed border-foreground/10 flex items-center justify-center opacity-20 aspect-[3/4.5]">
              <User className="h-10 w-10 text-foreground" />
           </div>
        ))}
      </div>

      {/* Footer Branding */}
      <div className="p-10 border-t-[10px] border-foreground bg-white z-10 flex items-center justify-center text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.8em] text-foreground/40 leading-none">
          IIT Madras Paradox • Sports Department // Official Media Release
        </p>
      </div>

      {/* Aesthetic Accents */}
      <div className="absolute top-1/2 left-0 w-8 h-[300px] bg-primary -translate-y-1/2" />
      <div className="absolute top-1/2 right-0 w-8 h-[300px] bg-primary -translate-y-1/2" />
    </div>
  );
};
