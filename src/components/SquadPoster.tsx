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
      {/* Background Element */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-accent/10 rounded-full blur-[200px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      {/* Header HUD */}
      <div className="bg-foreground text-white px-16 py-16 flex justify-between items-end z-10 border-b-[12px] border-primary">
        <div>
          <h2 className="text-[12px] font-black uppercase tracking-[0.8em] mb-4 opacity-40">Official Squad Announcement</h2>
          <h1 className="text-8xl font-black italic tracking-tighter uppercase leading-none">{squad.name}</h1>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-black uppercase tracking-[0.5em] text-primary italic mb-2">Session Ledger</p>
          <p className="text-2xl font-black uppercase tracking-[0.3em] opacity-30 italic">Margazhi'27</p>
        </div>
      </div>

      {/* Stats Block */}
      <div className="bg-white px-16 py-12 flex gap-16 border-b-[10px] border-foreground z-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-foreground/40 mb-2">Total Points</p>
          <p className="text-5xl font-black italic tracking-tighter leading-none">{squad.totalPoints}</p>
        </div>
        <div className="w-[2px] bg-foreground/10 h-12 self-center" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-foreground/40 mb-2">Purse Spent</p>
          <div className="flex items-baseline gap-2">
            <p className="text-5xl font-black italic tracking-tighter leading-none text-primary">{squad.moneySpent}</p>
            <p className="text-xl font-black uppercase italic text-foreground/20">CR</p>
          </div>
        </div>
        <div className="w-[2px] bg-foreground/10 h-12 self-center" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-foreground/40 mb-2">Purse Left</p>
          <div className="flex items-baseline gap-2">
            <p className="text-5xl font-black italic tracking-tighter leading-none">{squad.moneyLeft}</p>
            <p className="text-xl font-black uppercase italic text-foreground/20">CR</p>
          </div>
        </div>
      </div>

      {/* Players Grid */}
      <div className="flex-1 grid grid-cols-4 gap-8 p-16 bg-accent/5 z-10 relative overflow-hidden">
        {playerEntries.map((entry, idx) => (
          <div key={idx} className="bg-white border-[6px] border-foreground flex flex-col shadow-[12px_12px_0px_rgba(0,0,0,1)] relative overflow-hidden group hover:-translate-x-1 hover:-translate-y-1 transition-transform">
             <div className="w-full aspect-[3/4] relative bg-accent/20 border-b-[6px] border-foreground flex items-center justify-center overflow-hidden">
                {entry.playerInfo?.imageUrl ? (
                  <img 
                    src={entry.playerInfo.imageUrl} 
                    alt={entry.name} 
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                    crossOrigin="anonymous"
                  />
                ) : (
                  <User className="h-20 w-20 text-foreground/5" />
                )}
                <div className="absolute top-2 left-2">
                   <span className="text-[8px] font-black bg-foreground text-white px-2 py-0.5 uppercase tracking-widest italic shadow-md">{entry.role}</span>
                </div>
             </div>
             <div className="p-4 bg-white flex-1 flex flex-col justify-between">
                <p className="text-[12px] font-black uppercase tracking-tight leading-tight mb-3 line-clamp-2">{entry.name}</p>
                <div className="flex items-baseline gap-2 pt-2 border-t border-foreground/5">
                   <p className="text-2xl font-black italic tracking-tighter text-primary">{entry.price}</p>
                   <p className="text-[10px] font-black uppercase italic text-foreground/20">CR</p>
                </div>
             </div>
          </div>
        ))}
        {/* Fill empty slots with placeholder vector boxes */}
        {playerEntries.length < 12 && Array.from({ length: 12 - playerEntries.length }).map((_, i) => (
           <div key={`empty-${i}`} className="bg-white/50 border-[6px] border-dashed border-foreground/10 flex flex-col items-center justify-center opacity-20 aspect-[3/4.5]">
              <div className="w-12 h-12 border-2 border-foreground/20 rounded-full flex items-center justify-center">
                 <User className="h-6 w-6 text-foreground/20" />
              </div>
           </div>
        ))}
      </div>

      {/* Footer Branding */}
      <div className="p-12 border-t-[12px] border-foreground bg-white z-10 flex items-center justify-center text-center">
        <p className="text-[11px] font-black uppercase tracking-[1.2em] text-foreground/20 leading-none italic">
          IIT Madras Paradox // Sports Department // Official Document
        </p>
      </div>

      {/* Vertical Accents */}
      <div className="absolute top-1/2 left-0 w-12 h-[400px] bg-primary -translate-y-1/2" />
      <div className="absolute top-1/2 right-0 w-12 h-[400px] bg-primary -translate-y-1/2" />
    </div>
  );
};
