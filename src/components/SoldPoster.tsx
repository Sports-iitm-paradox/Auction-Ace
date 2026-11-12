'use client';

import React from 'react';
import { Player } from '@/lib/player-data';
import { Shield } from 'lucide-react';

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
      <div className="bg-foreground text-white px-12 py-10 flex justify-between items-center z-10 box-border">
          <div>
            <h2 className="text-[12px] font-black uppercase tracking-[0.6em] mb-2 opacity-50">Official Announcement</h2>
            <h1 className="text-4xl font-black italic tracking-tighter uppercase">IPL Auction Hub</h1>
          </div>
          <div className="text-right">
              <span className="bg-primary px-4 py-1 text-sm font-black uppercase tracking-widest italic">Lot #{player.playerNumber}</span>
          </div>
      </div>

      <div className="flex-1 flex flex-row items-stretch z-10 relative">
          {/* Player Visual */}
          <div className="w-[45%] border-r-[10px] border-foreground bg-accent/20 flex items-center justify-center p-12">
            <div className="w-full aspect-[3/4] relative bg-white border-4 border-foreground shadow-[20px_20px_0px_rgba(0,0,0,1)] overflow-hidden">
                {player.imageUrl ? (
                  <img 
                    src={player.imageUrl} 
                    alt={player.playerName} 
                    className="w-full h-full object-contain p-4" 
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center opacity-10">
                    <Shield className="h-40 w-40 text-foreground" />
                  </div>
                )}
            </div>
          </div>

          {/* Info Side */}
          <div className="flex-1 flex flex-col justify-center p-16">
              <div className="mb-auto">
                  <h2 className="text-7xl font-black italic uppercase tracking-tighter leading-[0.9] mb-8 text-foreground">
                    {player.playerName}
                  </h2>
                  <div className="flex gap-4 flex-wrap mb-8">
                      <span className="border-2 border-foreground px-4 py-1.5 text-xs font-black uppercase tracking-widest">{player.specialism}</span>
                      <span className="border-2 border-foreground px-4 py-1.5 text-xs font-black uppercase tracking-widest">{player.country}</span>
                      <span className="border-2 border-foreground px-4 py-1.5 text-xs font-black uppercase tracking-widest">{player.cua}</span>
                  </div>

                  <div className="flex items-center gap-4 py-6 border-y-2 border-foreground/10">
                      <div className="h-10 w-px bg-foreground/20" />
                      <div>
                          <span className="block text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-1">Performance Metric</span>
                          <span className="text-4xl font-black italic text-foreground tracking-tighter">{player.points} POINTS</span>
                      </div>
                  </div>
              </div>

              <div className="mt-8 space-y-4">
                  <div className="bg-foreground text-white p-10 shadow-[12px_12px_0px_rgba(59,130,246,1)]">
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-4 opacity-50">Acquisition Value</p>
                      <div className="flex items-baseline gap-4">
                          <span className="text-9xl font-mono font-black italic tracking-tighter leading-none">{bid}</span>
                          <span className="text-4xl font-black italic uppercase opacity-30">Lakh</span>
                      </div>
                  </div>

                  {houseName && (
                    <div className="bg-primary text-white p-8">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-2 opacity-50">Franchise Destination</p>
                        <h3 className="text-4xl font-black italic uppercase tracking-wider">{houseName}</h3>
                    </div>
                  )}
              </div>
          </div>
      </div>

      {/* Footer Branding */}
      <div className="p-10 border-t-[10px] border-foreground flex items-center justify-center text-center bg-white z-10 box-border">
          <p className="text-[10px] font-black uppercase tracking-[0.8em] text-foreground/40 leading-none">
            Margazhi '27 Paradox // Official Broadcast Feed
          </p>
      </div>

      {/* Aesthetic Accents */}
      <div className="absolute top-1/2 left-0 w-8 h-[200px] bg-primary -translate-y-1/2" />
      <div className="absolute top-1/2 right-0 w-8 h-[200px] bg-primary -translate-y-1/2" />
    </div>
  );
};
