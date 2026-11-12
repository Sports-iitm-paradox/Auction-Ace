'use client';

import React from 'react';
import { Player } from '@/lib/player-data';
import { User } from 'lucide-react';

interface SoldPosterProps {
  player: Player;
  bid: number;
  houseName?: string;
}

export const SoldPoster: React.FC<SoldPosterProps> = ({ player, bid, houseName }) => {
  return (
    <div 
      id={`sold-poster-${player.id}`}
      className="w-[1080px] h-[1080px] bg-white text-foreground p-0 relative flex flex-col overflow-hidden border-[20px] border-foreground"
      style={{
        fontFamily: "'Oxanium', cursive",
      }}
    >
      {/* Background Vector Art */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 -rotate-12 translate-x-20 -translate-y-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/5 rotate-12 -translate-x-10 translate-y-10 pointer-events-none" />
      
      {/* Header HUD */}
      <div className="bg-foreground text-white px-12 py-12 flex justify-between items-center z-10 box-border border-b-[10px] border-primary">
          <div>
            <h2 className="text-[12px] font-black uppercase tracking-[0.6em] mb-2 opacity-50">Official Media Release</h2>
            <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">Margazhi '27 Paradox</h1>
          </div>
          <div className="text-right">
              <span className="bg-white text-foreground px-6 py-2 text-lg font-black uppercase tracking-widest italic border-2 border-foreground shadow-[6px_6px_0px_rgba(59,130,246,1)]">Lot #{player.playerNumber}</span>
          </div>
      </div>

      <div className="flex-1 flex flex-row items-stretch z-10 relative">
          {/* Player Visual */}
          <div className="w-[45%] border-r-[10px] border-foreground bg-accent/10 flex items-center justify-center p-16">
            <div className="w-full aspect-[3/4] relative bg-white border-4 border-foreground shadow-[24px_24px_0px_rgba(0,0,0,1)] overflow-hidden flex items-center justify-center">
                {player.imageUrl ? (
                  <img 
                    src={player.imageUrl} 
                    alt={player.playerName} 
                    className="w-full h-full object-contain p-4" 
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center opacity-5">
                    <User className="h-48 w-48 text-foreground" />
                  </div>
                )}
            </div>
          </div>

          {/* Info Side */}
          <div className="flex-1 flex flex-col justify-center p-20">
              <div className="mb-auto">
                  <h2 className="text-8xl font-black italic uppercase tracking-tighter leading-[0.85] mb-12 text-foreground">
                    {player.playerName}
                  </h2>
                  <div className="flex gap-4 flex-wrap mb-12">
                      <span className="bg-foreground text-white px-5 py-2 text-sm font-black uppercase tracking-widest">{player.specialism}</span>
                      <span className="border-2 border-foreground px-5 py-2 text-sm font-black uppercase tracking-widest">{player.country}</span>
                      <span className="border-2 border-foreground px-5 py-2 text-sm font-black uppercase tracking-widest">{player.cua}</span>
                  </div>

                  <div className="flex items-center gap-8 py-10 border-y-2 border-foreground/10">
                      <div className="h-16 w-px bg-primary" />
                      <div>
                          <span className="block text-[10px] font-black uppercase tracking-[0.5em] text-foreground/40 mb-2">Performance Metric</span>
                          <span className="text-6xl font-black italic text-foreground tracking-tighter leading-none">{player.points} POINTS</span>
                      </div>
                  </div>
              </div>

              <div className="mt-12 space-y-6">
                  <div className="bg-foreground text-white p-12 shadow-[16px_16px_0px_rgba(59,130,246,1)]">
                      <div className="flex justify-between items-start mb-6">
                        <p className="text-[11px] font-black uppercase tracking-[0.5em] opacity-40">Final Floor Bid</p>
                        <span className="text-7xl font-black italic text-primary leading-none uppercase">SOLD</span>
                      </div>
                      <div className="flex items-baseline gap-4">
                          <span className="text-[140px] font-mono font-black italic tracking-tighter leading-none">{bid}</span>
                          <span className="text-5xl font-black italic uppercase opacity-20">Lakh</span>
                      </div>
                  </div>

                  {houseName && (
                    <div className="bg-primary text-white p-10 border-2 border-foreground shadow-[8px_8px_0px_rgba(0,0,0,1)]">
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] mb-3 opacity-60">Franchise Acquisition</p>
                        <h3 className="text-5xl font-black italic uppercase tracking-widest leading-none">{houseName}</h3>
                    </div>
                  )}
              </div>
          </div>
      </div>

      {/* Footer Branding */}
      <div className="p-12 border-t-[10px] border-foreground flex items-center justify-center text-center bg-white z-10 box-border">
          <p className="text-[11px] font-black uppercase tracking-[1em] text-foreground/30 leading-none italic">
            Margazhi '27 Paradox // Official Live Ledger Announcement
          </p>
      </div>

      {/* Aesthetic Accents */}
      <div className="absolute top-1/2 left-0 w-10 h-[300px] bg-primary -translate-y-1/2" />
      <div className="absolute top-1/2 right-0 w-10 h-[300px] bg-primary -translate-y-1/2" />
    </div>
  );
};
