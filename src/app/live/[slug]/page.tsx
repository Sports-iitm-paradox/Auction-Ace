'use client';

import { useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, DocumentReference } from 'firebase/firestore';
import { Player, PlayerSet, ActiveAuctionState } from '@/lib/player-data';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Gavel, ShieldCheck, Timer, Loader2, Award } from 'lucide-react';
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
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#FF4655', '#0A192F', '#FFFFFF'] });
    }
  }, [auction?.isSold, auction?.currentBid]);

  const marqueeHistory = useMemo(() => {
    if (!auction?.history) return [];
    return auction.history.slice(-20).reverse();
  }, [auction?.history]);

  if (!auction || (auction.status === 'idle' && !auction.currentPlayerId)) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background p-8 text-center vector-grid-bg">
        <div className="relative mb-12">
            <Trophy className="h-24 w-24 text-foreground/5" />
            <div className="absolute inset-0 flex items-center justify-center">
                <ShieldCheck className="h-10 w-10 text-foreground/10" />
            </div>
        </div>
        <h1 className="text-6xl font-headline text-foreground mb-6 font-black uppercase tracking-tighter">Floor Standby</h1>
        <p className="text-foreground/40 uppercase tracking-[0.6em] text-[11px] font-black">Official Live Stream // Authorization Required</p>
      </div>
    );
  }

  const steps = ['Going Once', 'Going Twice', 'Final Call'];

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-12 bg-background vector-grid-bg overflow-hidden gpu-layer">
      {/* Broadcast Header HUD */}
      <div className="absolute top-0 left-0 w-full p-8 flex items-center justify-between z-50 bg-white/80 backdrop-blur-md border-b-2 border-foreground">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-primary rounded-none animate-pulse" />
            <span className="text-primary font-black uppercase tracking-[0.4em] text-[10px]">Official Feed</span>
          </div>
          <div className="h-6 w-px bg-foreground/10 mx-2" />
          <span className="text-foreground font-headline font-black text-2xl tracking-[0.2em] uppercase italic">{set?.name || 'IPL AUCTION HUB'}</span>
        </div>
        <span className="text-foreground/30 font-black text-[9px] uppercase tracking-[0.5em] hidden sm:block">Participant Access Verified // Floor Sync v2.5</span>
      </div>

      <div className="w-full max-w-6xl">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentPlayer?.id || 'idle'} 
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="w-full"
          >
              <Card className="bg-white border-2 border-foreground rounded-none shadow-[16px_16px_0px_rgba(10,25,47,1)] overflow-hidden relative">
                  <CardContent className="p-0 min-h-[550px] flex items-center justify-center relative">
                      
                      {/* Soldier/Unsold Cinematic Overlay */}
                      {(auction.isSold || auction.isUnsold) && (
                          <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            className="absolute inset-0 z-[110] flex flex-col items-center justify-center bg-white/95 p-16 text-center"
                          >
                             <motion.div className={cn("p-16 border-4 rounded-none max-w-2xl w-full bg-white", auction.isSold ? "border-primary shadow-[8px_8px_0px_rgba(255,70,85,1)]" : "border-foreground shadow-[8px_8px_0px_rgba(10,25,47,1)]")}>
                                <Award size={80} className={cn("mx-auto mb-8", auction.isSold ? "text-primary" : "text-foreground")} />
                                <h2 className={cn("text-8xl font-headline font-black uppercase tracking-tighter mb-6", auction.isSold ? "text-primary" : "text-foreground")}>
                                  {auction.isSold ? 'SOLD' : 'UNSOLD'}
                                </h2>
                                <h3 className="text-4xl font-headline text-foreground uppercase tracking-widest border-y-2 border-foreground/10 py-8 my-8 font-black">
                                  {currentPlayer?.playerName}
                                </h3>
                                {auction.isSold && (
                                  <div className="flex items-center justify-center gap-4">
                                      <span className="text-8xl font-mono font-black text-foreground">{auction.currentBid}</span>
                                      <span className="text-3xl font-headline font-black text-foreground/30 pt-8 italic">LAKH</span>
                                  </div>
                                )}
                              </motion.div>
                          </motion.div>
                      )}

                      {/* Automated Hammer Call HUD */}
                      {auction.hammerStep > 0 && auction.hammerStep < 4 && !auction.isSold && (
                          <motion.div initial={{ y: -100 }} animate={{ y: 0 }} className="absolute top-0 left-0 w-full bg-primary py-6 flex justify-center z-[105] border-b-2 border-foreground">
                              <h2 className="text-4xl font-headline font-black uppercase tracking-[0.6em] text-white">
                                  {steps[auction.hammerStep - 1].toUpperCase()}
                              </h2>
                          </motion.div>
                      )}

                      {auction.status === 'drawing' ? (
                          <div className="text-center p-20 flex flex-col items-center">
                              <Loader2 className="h-16 w-16 animate-spin text-primary mb-8" />
                              <h1 className="text-5xl text-foreground font-headline font-black tracking-[0.4em] uppercase">Initializing Lot</h1>
                          </div>
                      ) : currentPlayer ? (
                          <div className="flex flex-col lg:flex-row items-stretch w-full">
                              {/* Player Visual Block */}
                              <div className="w-full lg:w-[45%] p-12 bg-accent/10 border-r-2 border-foreground flex items-center justify-center">
                                <div className="w-full aspect-[3/4] relative bg-white rounded-none shadow-2xl border-2 border-foreground overflow-hidden">
                                    {currentPlayer.imageUrl ? (
                                      <Image src={currentPlayer.imageUrl} alt={currentPlayer.playerName} fill className="object-contain p-6" priority />
                                    ) : (
                                      <ShieldCheck className="w-full h-full p-24 opacity-5 text-foreground" />
                                    )}
                                    <div className="absolute top-6 left-6">
                                      <Badge className="bg-foreground text-white font-black text-xl px-4 py-1 rounded-none uppercase tracking-widest">LOT #{currentPlayer.playerNumber}</Badge>
                                    </div>
                                </div>
                              </div>

                              {/* Details Panel Block */}
                              <div className="w-full lg:w-[55%] p-16 flex flex-col justify-between">
                                  <div>
                                      <span className="font-headline text-[10px] text-primary font-black uppercase tracking-[0.5em] border-l-4 border-primary pl-4 mb-6 block">Entry Authorized</span>
                                      <h1 className="text-7xl lg:text-8xl font-headline font-black text-foreground tracking-tighter leading-none mb-12">
                                        {currentPlayer.playerName}
                                      </h1>
                                      <div className="grid grid-cols-2 gap-12">
                                          {[
                                              { label: 'Role Profile', value: currentPlayer.specialism },
                                              { label: 'Score Metric', value: `${currentPlayer.points} PTS` },
                                              { label: 'Category', value: currentPlayer.cua },
                                              { label: 'Country', value: currentPlayer.country },
                                          ].map((s, i) => (
                                              <div key={i} className="border-l-2 border-foreground/10 pl-6">
                                                  <span className="text-[10px] text-foreground/40 font-black uppercase tracking-[0.2em] block mb-2">{s.label}</span>
                                                  <span className="text-3xl font-headline font-bold text-foreground uppercase tracking-wide">{s.value}</span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>

                                  <div className="mt-16 p-12 bg-foreground text-white rounded-none flex items-center justify-between shadow-[8px_8px_0px_rgba(255,70,85,1)]">
                                      <div>
                                          <span className="text-[11px] font-black uppercase tracking-[0.4em] block mb-2 text-white/50">Current Valuation</span>
                                          <div className="flex items-baseline gap-4">
                                              <span className="text-9xl font-mono font-black tracking-tighter leading-none">{auction.currentBid}</span>
                                              <span className="text-4xl font-headline font-black italic uppercase opacity-40">Lakh</span>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      ) : (
                          <div className="flex flex-col items-center gap-6">
                             <Trophy size={80} className="opacity-10 text-foreground" />
                             <h1 className="text-4xl text-foreground font-headline font-black uppercase tracking-[0.5em] opacity-20">Awaiting Signal</h1>
                          </div>
                      )}
                  </CardContent>
              </Card>
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Broadcast Ticker Bar */}
      <div className="fixed bottom-0 left-0 w-full h-24 bg-white border-t-2 border-foreground flex items-center z-[100] shadow-2xl">
          <div className="bg-foreground px-12 h-full flex items-center z-10">
              <span className="text-white font-black text-2xl uppercase tracking-[0.4em] italic whitespace-nowrap">LIVE STREAM</span>
          </div>
          <div className="flex-1 overflow-hidden relative h-full">
              <div className="animate-marquee whitespace-nowrap flex flex-row items-center gap-24 absolute inset-0 py-4">
                  {marqueeHistory.map((event, i) => {
                      const p = set?.players.find(pl => pl.id === event.playerId);
                      return (
                        <div key={`event-${i}`} className="flex items-center gap-8 shrink-0">
                            <span className={cn("text-[10px] font-black uppercase tracking-widest px-3 py-1", event.type === 'sold' ? "bg-primary text-white" : "bg-foreground text-white")}>
                              {event.type === 'sold' ? 'SOLD' : 'UNSOLD'}
                            </span>
                            <span className="text-foreground text-3xl font-headline font-black uppercase italic tracking-tighter">{p?.playerName || 'Entry'}</span>
                            {event.bid && (
                                <div className="flex items-baseline gap-2">
                                    <span className="text-foreground font-mono text-4xl font-black">{event.bid}</span>
                                    <span className="text-foreground/40 font-headline font-black text-sm uppercase">L</span>
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