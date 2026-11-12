'use client';

import React from 'react';
import { Player } from '@/lib/player-data';
import { User } from 'lucide-react';

interface SoldPosterProps {
  player: Player;
  bid: number;
}

export const SoldPoster: React.FC<SoldPosterProps> = ({ player, bid }) => {
  return (
    <div 
      id={`sold-poster-${player.id}`}
      className="w-[1080px] h-[1080px] bg-white text-foreground p-0 relative flex flex-col overflow-hidden border-[20px] border-[#0f172a]"
      style={{
        fontFamily: "'Oxanium', cursive",
      }}
    >
      {/* Header HUD */}
      <div className="bg-[#0f172a] text-white px-16 py-12 flex justify-between items-center z-10 box-border border-b-[8px] border-[#3b82f6]">
          <div>
            <h2 className="text-[14px] font-black uppercase tracking-[0.5em] mb-2 opacity-50">Official Media Release</h2>
            <h1 className="text-[64px] font-black italic tracking-tighter uppercase leading-none">Margazhi'27</h1>
          </div>
          <div className="text-right">
              <span className="bg-white text-[#0f172a] px-6 py-2 text-xl font-black uppercase tracking-widest italic border-2 border-[#0f172a] shadow-[6px_6px_0px_rgba(59,130,246,1)]">Lot #{player.playerNumber}</span>
          </div>
      </div>

      <div className="flex-1 flex flex-row items-stretch z-10 relative">
          {/* Left Column: Player Visual (Dominant) */}
          <div className="w-[45%] flex items-center justify-center p-12 bg-white relative">
            {/* Side Blue Accent Left */}
            <div className="absolute top-[20%] left-0 w-[40px] h-[60%] bg-[#3b82f6]" />
            
            <div className="w-full aspect-[3/4] relative bg-white border-[6px] border-[#0f172a] shadow-[24px_24px_0px_rgba(0,0,0,1)] overflow-hidden flex items-center justify-center bg-white z-10">
                {player.imageUrl ? (
                  <img 
                    src={player.imageUrl} 
                    alt={player.playerName} 
                    className="w-full h-full object-contain p-4 scale-110" 
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center opacity-5">
                    <User className="h-64 w-64 text-[#0f172a]" />
                  </div>
                )}
            </div>
          </div>

          {/* Right Column: Data & Bid */}
          <div className="flex-1 flex flex-col justify-center p-16 relative">
              {/* Side Blue Accent Right */}
              <div className="absolute top-[20%] right-0 w-[40px] h-[60%] bg-[#3b82f6]" />

              <div className="mb-auto">
                  <h2 className="text-[96px] font-black italic uppercase tracking-tighter leading-[0.85] mb-12 text-[#0f172a]">
                    {player.playerName}
                  </h2>
                  <div className="flex gap-4 flex-wrap mb-10">
                      <span className="bg-[#0f172a] text-white px-5 py-2 text-sm font-black uppercase tracking-widest">{player.specialism}</span>
                      <span className="border-2 border-[#0f172a] px-5 py-2 text-sm font-black uppercase tracking-widest">{player.country}</span>
                      <span className="border-2 border-[#0f172a] px-5 py-2 text-sm font-black uppercase tracking-widest">{player.cua}</span>
                  </div>

                  <div className="flex items-center gap-8 py-8 border-y-2 border-[#0f172a]/10">
                      <div className="h-16 w-[4px] bg-[#3b82f6]" />
                      <div>
                          <span className="block text-[12px] font-black uppercase tracking-[0.4em] text-[#0f172a]/30 mb-2">Performance Metric</span>
                          <span className="text-6xl font-black italic text-[#0f172a] tracking-tighter leading-none">{player.points} POINTS</span>
                      </div>
                  </div>
              </div>

              <div className="mt-8">
                  <div className="bg-[#0f172a] text-white p-12 shadow-[20px_20px_0px_rgba(59,130,246,1)] relative">
                      <div className="flex justify-between items-start mb-6">
                        <p className="text-[12px] font-black uppercase tracking-[0.5em] opacity-40">Final Floor Bid</p>
                        <span className="text-[54px] font-black italic text-[#3b82f6] leading-none uppercase">SOLD</span>
                      </div>
                      <div className="flex items-baseline justify-center">
                          <span className="text-[180px] font-mono font-black italic tracking-tighter leading-none">{bid}</span>
                          <span className="text-5xl font-black italic uppercase opacity-20 ml-4">Lakh</span>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* Footer Branding */}
      <div className="p-12 border-t-[8px] border-[#0f172a] flex items-center justify-center text-center bg-white z-10 box-border">
          <p className="text-[12px] font-black uppercase tracking-[1em] text-[#0f172a]/30 leading-none italic">
            Margazhi'27 // Official Live Ledger Announcement
          </p>
      </div>
    </div>
  );
};
