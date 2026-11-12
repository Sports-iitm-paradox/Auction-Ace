
'use client';

import React from 'react';
import { Squad, Player } from '@/lib/player-data';
import { User } from 'lucide-react';

interface SquadPosterProps {
  squad: Squad;
  allPlayers: Player[];
}

export const SquadPoster: React.FC<SquadPosterProps> = ({ squad, allPlayers }) => {
  const playerEntries = (squad.playersList || '').split(';').filter(Boolean).map(entry => {
    const parts = entry.split(':');
    if (parts.length < 2) return null;
    
    const name = parts[0].trim();
    const price = parts[1].trim();
    const role = parts[2]?.trim();
    
    const playerInfo = allPlayers.find(p => 
        p.playerName.toLowerCase().replace(/\s+/g, ' ').trim() === 
        name.toLowerCase().replace(/\s+/g, ' ').trim()
    );
    
    return { name, price, role, playerInfo };
  }).filter((e): e is NonNullable<typeof e> => e !== null);

  return (
    <div 
      id={`poster-${squad.id}`}
      className="w-[1080px] h-[1350px] bg-white text-foreground p-0 relative flex flex-col items-stretch overflow-hidden border-[16px] border-foreground"
      style={{ fontFamily: "'Oxanium', cursive" }}
    >
      {/* Header section */}
      <div className="bg-[#0f172a] h-[280px] w-full px-16 flex flex-col justify-center relative">
        <div className="flex justify-between items-start mb-4">
          <span className="text-[12px] font-black uppercase tracking-[0.5em] text-white/40">Official Squad Announcement</span>
          <div className="text-right">
            <span className="block text-[11px] font-black uppercase tracking-[0.3em] text-[#3b82f6]">Session Ledger</span>
            <span className="block text-[28px] font-black uppercase tracking-[0.1em] text-white italic">Margazhi'27</span>
          </div>
        </div>
        <h1 className="text-[110px] font-black italic uppercase tracking-tighter text-white leading-none -mt-4">
          {squad.name}
        </h1>
      </div>

      {/* Blue divider */}
      <div className="h-[24px] w-full bg-[#3b82f6]" />

      {/* Stats bar */}
      <div className="h-[180px] w-full bg-white flex items-center border-b-[6px] border-foreground">
        <div className="flex-1 text-center border-r-[2px] border-foreground/5 py-8">
          <span className="block text-[12px] font-black uppercase tracking-[0.4em] text-foreground/30 mb-2">Total Points</span>
          <span className="text-[72px] font-black italic tracking-tighter leading-none">{squad.totalPoints}</span>
        </div>
        <div className="flex-1 text-center border-r-[2px] border-foreground/5 py-8">
          <span className="block text-[12px] font-black uppercase tracking-[0.4em] text-foreground/30 mb-2">Purse Spent</span>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-[72px] font-black italic tracking-tighter leading-none text-[#3b82f6]">{squad.moneySpent}</span>
            <span className="text-[20px] font-black uppercase italic text-foreground/30">Cr</span>
          </div>
        </div>
        <div className="flex-1 text-center py-8">
          <span className="block text-[12px] font-black uppercase tracking-[0.4em] text-foreground/30 mb-2">Purse Left</span>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-[72px] font-black italic tracking-tighter leading-none">{squad.moneyLeft}</span>
            <span className="text-[20px] font-black uppercase italic text-foreground/30">Cr</span>
          </div>
        </div>
      </div>

      {/* Main Grid area */}
      <div className="flex-1 bg-[#f1f5f9] relative p-16 flex items-center justify-center">
        {/* Side blue bars */}
        <div className="absolute top-[10%] left-0 w-[40px] h-[80%] bg-[#3b82f6]" />
        <div className="absolute top-[10%] right-0 w-[40px] h-[80%] bg-[#3b82f6]" />
        
        <div className="grid grid-cols-4 gap-x-8 gap-y-10 w-full max-w-[940px]">
          {Array.from({ length: 12 }).map((_, idx) => {
            const entry = playerEntries[idx];
            if (entry) {
              return (
                <div key={idx} className="bg-white border-[4px] border-foreground shadow-[10px_10px_0px_rgba(0,0,0,1)] flex flex-col h-[260px] overflow-hidden group">
                   <div className="h-[170px] bg-white relative flex items-center justify-center border-b-[2px] border-foreground/5 overflow-hidden">
                      {entry.playerInfo?.imageUrl ? (
                        <img 
                          src={entry.playerInfo.imageUrl} 
                          alt={entry.name} 
                          className="w-full h-full object-contain p-2" 
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="flex flex-col items-center opacity-5">
                          <User size={60} className="text-foreground" />
                        </div>
                      )}
                   </div>
                   <div className="flex-1 p-4 bg-white flex flex-col justify-between">
                      <p className="text-[11px] font-black uppercase tracking-tight leading-tight truncate text-foreground">{entry.name}</p>
                      <div className="flex items-baseline gap-1">
                         <p className="text-[32px] font-black italic tracking-tighter text-[#3b82f6] leading-none">{entry.price}</p>
                         <p className="text-[12px] font-black uppercase italic text-foreground/20">Cr</p>
                      </div>
                   </div>
                </div>
              );
            }
            return (
              <div key={`empty-${idx}`} className="border-[4px] border-dashed border-foreground/10 flex items-center justify-center h-[260px] bg-white/40">
                <User size={32} className="text-foreground/5" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="h-[100px] w-full bg-white border-t-[6px] border-foreground flex items-center justify-center">
        <p className="text-[12px] font-black uppercase tracking-[1em] text-foreground/20 italic">
          Margazhi'27 // Official Roster Ledger // Live Release
        </p>
      </div>
    </div>
  );
};
