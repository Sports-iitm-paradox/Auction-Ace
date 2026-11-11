'use client';

import { useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, DocumentReference } from 'firebase/firestore';
import { Player, PlayerSet, ActiveAuctionState } from '@/lib/player-data';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Gavel, ShieldCheck, Award, Sparkles, Timer } from 'lucide-react';
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
    if (auction?.isSold && auction.currentBid >= 1000) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
  }, [auction?.isSold]);

  const marqueeHistory = useMemo(() => {
    if (!auction?.history) return [];
    return auction.history.slice(-15).reverse();
  }, [auction?.history]);

  if (!auction || (auction.status === 'idle' && !auction.currentPlayerId)) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background p-4 text-center">
        <Trophy className="h-16 w-16 text-primary/20 mb-8" />
        <h1 className="text-4xl font-serif text-foreground mb-4 italic uppercase tracking-widest">Floor Standby</h1>
        <p className="text-muted-foreground uppercase tracking-widest text-[10px] font-bold">Waiting for moderator signal...</p>
      </div>
    );
  }

  const steps = ['Going Once', 'Going Twice', 'Final Call'];

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-8 bg-background sunburst-bg overflow-hidden">
      {/* Broadcast Header - Premium Light Style */}
      <div className="absolute top-0 left-0 w-full p-8 flex items-center justify-between z-50 bg-white/50 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-primary font-bold uppercase tracking-widest text-[10px]">Live Stream</span>
          </div>
          <div className="h-4 w-px bg-border mx-1" />
          <span className="text-foreground font-serif font-black text-xl tracking-widest uppercase italic">{set?.name || 'IPL AUCTION HUB'}</span>
        </div>
        <span className="text-muted-foreground font-bold text-[9px] uppercase tracking-[0.5em] hidden sm:block">Official Floor Feed // 2026</span>
      </div>

      <div className="w-full max-w-6xl">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentPlayer?.id || 'idle'} 
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="w-full"
          >
              <Card className="bg-white border border-border shadow-2xl rounded-2xl overflow-hidden relative">
                  <CardContent className="p-0 min-h-[600px] flex items-center justify-center relative">
                      
                      {/* Sold/Unsold Overlay */}
                      {(auction.isSold || auction.isUnsold) && (
                          <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            className="absolute inset-0 z-[110] flex flex-col items-center justify-center bg-white/98 p-12 text-center"
                          >
                             <motion.div className={cn("p-16 border-4 rounded-2xl max-w-4xl w-full bg-white shadow-2xl", auction.isSold ? "border-primary" : "border-destructive")}>
                                <Gavel size={100} className={cn("mx-auto mb-8", auction.isSold ? "text-primary" : "text-destructive")} />
                                <h2 className={cn("text-9xl font-headline font-black uppercase tracking-tighter mb-4", auction.isSold ? "text-primary" : "text-destructive")}>
                                  {auction.isSold ? 'SOLD' : 'UNSOLD'}
                                </h2>
                                <h3 className="text-5xl font-headline text-foreground uppercase tracking-widest border-y border-border py-8 my-8">
                                  {currentPlayer?.playerName}
                                </h3>
                                {auction.isSold && (
                                  <span className="text-9xl font-mono font-black text-foreground">{auction.currentBid}L</span>
                                )}
                              </motion.div>
                          </motion.div>
                      )}

                      {/* Hammer Call Header */}
                      {auction.hammerStep > 0 && auction.hammerStep < 4 && !auction.isSold && (
                          <motion.div initial={{ y: -100 }} animate={{ y: 0 }} className="absolute top-0 left-0 w-full bg-primary py-6 flex justify-center z-[105] shadow-lg">
                              <h2 className="text-5xl font-headline font-black uppercase tracking-[0.6em] text-primary-foreground">
                                  {steps[auction.hammerStep - 1].toUpperCase()}
                              </h2>
                          </motion.div>
                      )}

                      {auction.status === 'drawing' ? (
                          <div className="text-center p-20 flex flex-col items-center">
                              <Loader2 className="h-16 w-16 animate-spin text-primary mb-8" />
                              <h1 className="text-5xl text-foreground font-serif tracking-widest uppercase italic">Preparing Next Lot</h1>
                          </div>
                      ) : currentPlayer ? (
                          <div className="flex flex-col lg:flex-row items-stretch w-full">
                              {/* Player Image - Vector Frame */}
                              <div className="w-full lg:w-[45%] p-12 bg-muted/30 border-r border-border flex items-center justify-center">
                                <div className="w-full aspect-[3/4] relative bg-white rounded-xl shadow-lg border border-border overflow-hidden">
                                    {currentPlayer.imageUrl ? (
                                      <Image src={currentPlayer.imageUrl} alt={currentPlayer.playerName} fill className="object-contain p-6" priority />
                                    ) : (
                                      <ShieldCheck className="w-full h-full p-24 opacity-5 text-primary" />
                                    )}
                                    <div className="absolute top-6 left-6">
                                      <Badge className="bg-secondary text-secondary-foreground font-bold text-xl px-4 py-1">LOT #{currentPlayer.playerNumber}</Badge>
                                    </div>
                                </div>
                              </div>

                              {/* Player Details */}
                              <div className="w-full lg:w-[55%] p-16 flex flex-col justify-between">
                                  <div className="space-y-12">
                                      <div>
                                          <span className="font-headline text-[10px] text-primary font-black uppercase tracking-widest border-l-2 border-primary pl-4 mb-4 block">Official Auction Entry</span>
                                          <h1 className="text-7xl lg:text-8xl font-headline font-black text-foreground tracking-tighter leading-none">
                                            {currentPlayer.playerName}
                                          </h1>
                                      </div>
                                      <div className="grid grid-cols-2 gap-12">
                                          {[
                                              { label: 'Role', value: currentPlayer.specialism },
                                              { label: 'Rating', value: `${currentPlayer.points} PTS` },
                                              { label: 'Status', value: currentPlayer.cua },
                                              { label: 'Country', value: currentPlayer.country },
                                          ].map((s, i) => (
                                              <div key={i}>
                                                  <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest block mb-2">{s.label}</span>
                                                  <span className="text-3xl font-headline font-bold text-foreground uppercase tracking-wide">{s.value}</span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>

                                  <div className="mt-16 p-12 bg-secondary text-secondary-foreground rounded-2xl flex items-center justify-between shadow-xl">
                                      <div>
                                          <span className="text-[12px] font-black uppercase tracking-widest block mb-2 opacity-60">Valuation</span>
                                          <div className="flex items-baseline gap-4">
                                              <span className="text-9xl font-mono font-black tracking-tighter leading-none">{auction.currentBid}</span>
                                              <span className="text-4xl font-headline font-black italic">LAKH</span>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      ) : (
                          <h1 className="text-4xl text-muted-foreground font-serif uppercase tracking-widest opacity-20">Awaiting Signal...</h1>
                      )}
                  </CardContent>
              </Card>
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Premium Ticker - Clean Style */}
      <div className="fixed bottom-0 left-0 w-full h-24 bg-white border-t border-border flex items-center z-[100] shadow-2xl">
          <div className="bg-primary px-12 h-full flex items-center z-10 shadow-lg border-r border-white/20">
              <span className="text-primary-foreground font-black text-2xl uppercase tracking-widest italic whitespace-nowrap">AUCTION HUB LIVE</span>
          </div>
          <div className="flex-1 overflow-hidden relative h-full">
              <div className="animate-marquee whitespace-nowrap flex flex-row items-center gap-24 absolute inset-0 py-4">
                  {marqueeHistory.map((event, i) => {
                      const p = set?.players.find(pl => pl.id === event.playerId);
                      return (
                        <div key={`event-${i}`} className="flex items-center gap-8 shrink-0">
                            <span className={cn("text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded", event.type === 'sold' ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>
                              {event.type === 'sold' ? 'SOLD' : 'UNSOLD'}
                            </span>
                            <span className="text-foreground text-3xl font-serif font-black uppercase italic">{p?.playerName || 'Player'}</span>
                            {event.bid && <span className="text-foreground font-mono text-4xl font-black">{event.bid}L</span>}
                        </div>
                      );
                  })}
              </div>
          </div>
      </div>

      <style jsx global>{`
        .animate-marquee { display: flex; width: max-content; animation: marquee 60s linear infinite; }
        @keyframes marquee { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } }
      `}</style>
    </div>
  );
}