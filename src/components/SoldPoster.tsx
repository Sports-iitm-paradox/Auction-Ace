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
      {/* Header HUD - Slanted Technical Branding */}
      <div className="bg-[#0f172a] text-white px-16 h-[180px] flex justify-between items-center z-20 relative border-b-[8px] border-[#3b82f6]">
          <div className="flex flex-col text-left">
            <span className="text-[14px] font-black uppercase tracking-[0.5em] mb-2 opacity-50">Official Media Release</span>
            <h1 className="text-[82px] font-black italic tracking-tighter uppercase leading-none">Margazhi'27</h1>
          </div>
          <div className="bg-white text-[#0f172a] px-8 py-3 text-2xl font-black uppercase tracking-widest italic border-2 border-[#0f172a] shadow-[8px_8px_0px_rgba(59,130,246,1)]">
            Lot #{player.playerNumber}
          </div>
      </div>

      {/* Main Content Area - Player Dominance (65%+) */}
      <div className="flex-1 flex flex-row items-stretch z-10 relative bg-white">
          {/* Hero Section: Massive Player Portrait (68% space) */}
          <div className="w-[68%] flex items-center justify-center p-0 relative overflow-hidden bg-white border-r-[4px] border-[#0f172a]/5">
            {player.imageUrl ? (
              <img 
                src={player.imageUrl} 
                alt={player.playerName} 
                className="w-full h-full object-cover z-10" 
                crossOrigin="anonymous"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#f1f5f9]">
                <User className="h-[600px] w-[600px] text-[#0f172a] opacity-5" />
              </div>
            )}
            {/* Visual Frame - Thick White Border */}
            <div className="absolute inset-0 border-[24px] border-white z-20" />
          </div>

          {/* Data Section */}
          <div className="w-[32%] flex flex-col justify-between p-10 pr-14 relative bg-white text-left">
              <div className="mt-8">
                  <h2 className="text-[60px] font-black italic uppercase tracking-tighter leading-[0.9] mb-10 text-[#0f172a] break-words">
                    {player.playerName}
                  </h2>
                  <div className="flex flex-col gap-3 items-start mb-12">
                      <span className="bg-[#0f172a] text-white px-5 py-2 text-[10px] font-black uppercase tracking-widest italic">{player.specialism}</span>
                      <span className="border-2 border-[#0f172a] px-5 py-2 text-[10px] font-black uppercase tracking-widest italic">{player.country}</span>
                      <span className="border-2 border-[#0f172a] px-5 py-2 text-[10px] font-black uppercase tracking-widest italic">{player.cua}</span>
                  </div>

                  {/* Performance Metric */}
                  <div className="flex items-center gap-5 py-6 border-y-2 border-[#0f172a]/10">
                      <div className="h-12 w-[6px] bg-[#3b82f6]" />
                      <div>
                          <span className="block text-[9px] font-black uppercase tracking-[0.3em] text-[#0f172a]/30 mb-1">Performance Metric</span>
                          <span className="text-4xl font-black italic text-[#0f172a] tracking-tighter leading-none">{player.points} PTS</span>
                      </div>
                  </div>
              </div>

              {/* SOLD Box - Optimized for text fit */}
              <div className="mt-8 relative z-30">
                  <div className="bg-[#0f172a] text-white p-8 shadow-[16px_16px_0px_rgba(59,130,246,1)] flex flex-col items-center relative overflow-hidden">
                      <div className="w-full flex justify-between items-center mb-6">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Final Floor Bid</p>
                        <span className="text-[32px] font-black italic text-[#3b82f6] leading-none uppercase tracking-tighter">SOLD</span>
                      </div>
                      <div className="flex items-baseline justify-center">
                          <span className="text-[90px] font-mono font-black italic tracking-tighter leading-none text-white">
                            {bid}
                          </span>
                          <div className="flex flex-col ml-3">
                              <span className="text-2xl font-black italic uppercase text-white/20 leading-none">LAKH</span>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* Footer Ledger Branding */}
      <div className="h-[100px] border-t-[8px] border-[#0f172a] flex items-center justify-center text-center bg-white z-20">
          <p className="text-[12px] font-black uppercase tracking-[1em] text-[#0f172a]/20 leading-none italic">
            Margazhi'27 // Official Broadcast Sync // Live Release
          </p>
      </div>
    </div>
  );
};
