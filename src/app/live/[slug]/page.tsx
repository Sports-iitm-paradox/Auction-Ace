'use client';

import { useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, DocumentReference } from 'firebase/firestore';
import { Player, PlayerSet, ActiveAuctionState } from '@/lib/player-data';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import confetti from 'canvas-confetti';

export default function PublicLivePage() {
  const params = useParams();
  const slug = params.slug as string;
  const firestore = useFirestore();

  const auctionRef = useMemoFirebase(() => {
    if (!firestore || !slug) return null;
    return doc(firestore, 'activeAuctions', slug) as DocumentReference<ActiveAuctionState>;
  }, [firestore, slug]);

  const { data: auction } = useDoc<ActiveAuctionState>(auctionRef);

  const setRef = useMemoFirebase(() => {
    if (!firestore || !auction?.setId) return null;
    return doc(firestore, 'sets', auction.setId) as DocumentReference<PlayerSet>;
  }, [firestore, auction?.setId]);

  const { data: set } = useDoc<PlayerSet>(setRef);

  const currentPlayer = useMemo(() => {
    if (!auction?.currentPlayerId) return null;
    return set?.players.find(p => p.id === auction.currentPlayerId) || null;
  }, [auction?.currentPlayerId, set?.players]);

  useEffect(() => {
    if (auction?.isSold && auction.currentBid >= 500) {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#3b82f6', '#0f172a', '#FFFFFF'] });
    }
  }, [auction?.isSold, auction?.currentBid]);

  const marqueeHistory = useMemo(() => {
    if (!auction?.history) return [];
    return auction.history.slice(-20).reverse();
  }, [auction?.history]);

  if (!auction || (auction.status === 'idle' && !auction.currentPlayerId)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center vector-grid-bg min-h-[calc(100vh-80px-112px)]">
        <h1 className="text-8xl font-headline text-foreground mb-8 font-black uppercase tracking-tighter italic">Ledger Sync</h1>
        <p className="text-foreground/40 uppercase tracking-[1em] text-[12px] font-black">Official Broadcast Feed // Awaiting Floor Signal</p>
      </div>
    );
  }

  const hammerSteps = ['Going Once', 'Going Twice', 'Final Call'];

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background vector-grid-bg relative overflow-hidden gpu-layer min-h-[calc(100vh-80px-112px)]">
      <div className="w-full max-w-[1600px] mx-auto z-10 px-8 py-12">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentPlayer?.id || 'idle'} 
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="w-full"
          >
              <Card className="bg-white border-2 border-foreground shadow-[16px_16px_0px_rgba(0,0,0,1)] overflow-hidden relative">
                  <CardContent className="p-0 aspect-[16/9] flex items-center justify-center relative">
                      
                      {/* Sold/Unsold Overlay */}
                      {(auction.isSold || auction.isUnsold) && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[110] flex flex-col items-center justify-center bg-white/95 p-16 text-center">
                             <div className={cn("p-12 border-4 rounded-none max-w-2xl w-full bg-white", auction.isSold ? "border-primary shadow-[10px_10px_0px_rgba(59,130,246,1)]" : "border-foreground shadow-[10px_10px_0px_rgba(0,0,0,1)]")}>
                                <h2 className={cn("text-7xl font-headline font-black uppercase tracking-tighter mb-4", auction.isSold ? "text-primary" : "text-foreground")}>
                                  {auction.isSold ? 'SOLD' : 'UNSOLD'}
                                </h2>
                                <h3 className="text-3xl font-headline text-foreground uppercase tracking-widest border-y-2 border-foreground/10 py-8 my-4 font-black">
                                  {currentPlayer?.playerName}
                                </h3>
                                {auction.isSold && (
                                  <div className="flex flex-col items-center gap-4">
                                      <div className="flex items-center justify-center gap-4">
                                          <span className="text-9xl font-mono font-black text-foreground">{auction.currentBid}</span>
                                          <span className="text-3xl font-headline font-black text-foreground/30 pt-10 italic">LAKH</span>
                                      </div>
                                  </div>
                                )}
                              </div>
                          </motion.div>
                      )}

                      {/* Hammer Step */}
                      {auction.hammerStep > 0 && auction.hammerStep < 4 && !auction.isSold && (
                          <motion.div initial={{ y: -100 }} animate={{ y: 0 }} className="absolute top-0 left-0 w-full bg-primary py-6 flex justify-center z-[105] border-b-2 border-foreground">
                              <h2 className="text-4xl font-headline font-black uppercase tracking-[0.6em] text-white">
                                  {hammerSteps[auction.hammerStep - 1]}
                              </h2>
                          </motion.div>
                      )}

                      {auction.status === 'drawing' ? (
                          <div className="text-center p-20 flex flex-col items-center">
                              <Loader2 className="h-16 w-16 animate-spin text-primary mb-8" />
                              <h1 className="text-5xl text-foreground font-headline font-black tracking-[0.5em] uppercase">Initializing Entry</h1>
                          </div>
                      ) : currentPlayer ? (
                          <div className="flex flex-col lg:flex-row items-stretch w-full h-full">
                              <div className="w-full lg:w-[48%] p-10 lg:p-14 bg-accent/30 border-r-2 border-foreground flex items-center justify-center">
                                <div className="w-full aspect-[3/4] relative bg-white border-2 border-foreground shadow-2xl overflow-hidden">
                                    {currentPlayer.imageUrl ? (
                                      <Image src={currentPlayer.imageUrl} alt={currentPlayer.playerName} fill className="object-contain p-6 scale-110" priority />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center opacity-5">
                                        <Image src="https://picsum.photos/seed/placeholder/400/600" alt="Placeholder" fill className="object-cover grayscale" />
                                      </div>
                                    )}
                                    <div className="absolute top-6 left-6">
                                      <Badge className="bg-foreground text-white font-black text-xl px-4 py-1.5 rounded-none uppercase tracking-widest">LOT #{currentPlayer.playerNumber}</Badge>
                                    </div>
                                </div>
                              </div>

                              <div className="w-full lg:w-[52%] p-10 lg:p-16 flex flex-col justify-between h-full text-left">
                                  <div>
                                      <h1 className="text-6xl lg:text-8xl font-headline font-black text-foreground tracking-tighter leading-none mb-12 italic text-wrap break-words">
                                        {currentPlayer.playerName}
                                      </h1>
                                      <div className="grid grid-cols-2 gap-10">
                                          {[
                                              { label: 'Asset Role', value: currentPlayer.specialism },
                                              { label: 'Score Metric', value: `${currentPlayer.points} PTS` },
                                              { label: 'Category', value: currentPlayer.cua },
                                              { label: 'Region', value: currentPlayer.country },
                                          ].map((s, i) => (
                                              <div key={i} className="border-l-2 border-foreground/10 pl-6">
                                                  <span className="text-[10px] text-foreground/40 font-black uppercase tracking-[0.2em] block mb-2">{s.label}</span>
                                                  <span className="text-3xl font-headline font-black text-foreground uppercase tracking-wide truncate block">{s.value}</span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>

                                  <div className="mt-auto p-10 bg-foreground text-white shadow-[10px_10px_0px_rgba(59,130,246,1)] flex items-center justify-between min-h-[140px]">
                                      <div>
                                          <span className="text-[11px] font-black uppercase tracking-[0.4em] block mb-3 text-white/50">Current Bid</span>
                                          <div className="flex items-baseline gap-4">
                                              <span className="text-8xl font-mono font-black tracking-tighter leading-none">{auction.currentBid}</span>
                                              <span className="text-4xl font-headline font-black italic uppercase opacity-40">LAKH</span>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      ) : (
                          <div className="flex flex-col items-center gap-10">
                             <h1 className="text-5xl text-foreground font-headline font-black uppercase tracking-[0.6em] opacity-20">Awaiting Signal</h1>
                          </div>
                      )}
                  </CardContent>
              </Card>
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Broadcast Ticker */}
      <div className="fixed bottom-0 left-0 w-full h-28 bg-white border-t-2 border-foreground flex items-center z-[100] shadow-2xl">
          <div className="bg-foreground px-16 h-full flex items-center z-10">
              <span className="text-white font-black text-3xl uppercase tracking-[0.5em] italic whitespace-nowrap">LEDGER</span>
          </div>
          <div className="flex-1 overflow-hidden relative h-full">
              <div className="animate-marquee whitespace-nowrap flex flex-row items-center gap-32 absolute inset-0 py-6">
                  {marqueeHistory.map((event, i) => {
                      const p = set?.players.find(pl => pl.id === event.playerId);
                      return (
                        <div key={`event-${i}`} className="flex items-center gap-10 shrink-0">
                            <div className="flex items-center gap-2">
                                <span className={cn("text-[11px] font-black uppercase tracking-widest px-4 py-1.5", event.type === 'sold' ? "bg-primary text-white" : "bg-foreground text-white")}>
                                  {event.type === 'sold' ? 'SOLD' : 'UNSOLD'}
                                </span>
                            </div>
                            <span className="text-foreground text-4xl font-headline font-black uppercase italic tracking-tighter">{p?.playerName || 'Roster Item'}</span>
                            {event.bid && (
                                <div className="flex items-baseline gap-3">
                                    <span className="text-foreground font-mono text-5xl font-black">{event.bid}</span>
                                    <span className="text-foreground/40 font-headline font-black text-lg uppercase">L</span>
                                </div>
                            )}
                        </div>
                      );
                  })}
              </div>
          </div>
      </div>
    </div>
  );
}
