
'use client';

import { useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, DocumentReference } from 'firebase/firestore';
import { Player, PlayerSet, ActiveAuctionState } from '@/lib/player-data';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Gavel, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import confetti from 'canvas-confetti';

const MARQUEE_THRESHOLD = 1000;

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
    if (auction?.isSold && auction.currentBid >= MARQUEE_THRESHOLD) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFFFFF', '#8B0000']
      });
    }
  }, [auction?.isSold, auction?.currentBid]);

  const marqueeHistory = useMemo(() => {
    if (!auction?.history) return [];
    return auction.history.slice(-15).reverse();
  }, [auction?.history]);

  if (!auction || (auction.status === 'idle' && !auction.currentPlayerId)) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#1a0202] p-4 text-center">
        <Trophy className="h-20 w-20 text-primary mb-4 animate-pulse" />
        <h1 className="text-4xl font-serif text-primary mb-2 italic">Broadcast Standby</h1>
        <p className="text-muted-foreground uppercase tracking-widest text-[10px]">Syncing with Paradox Official Floor...</p>
      </div>
    );
  }

  const isMarquee = (auction?.currentBid || 0) >= MARQUEE_THRESHOLD;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-4 bg-background overflow-hidden sunburst-bg">
      {/* Broadcast Header */}
      <div className="absolute top-0 left-0 w-full p-6 flex items-center justify-between z-50 bg-gradient-to-b from-black/95 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_red]" />
          <span className="text-red-600 font-bold uppercase tracking-[0.2em] text-[10px]">Paradox Live Feed</span>
          <div className="h-4 w-px bg-primary/20 mx-2" />
          <span className="text-primary font-serif font-bold text-lg">{set?.name || 'Main Floor'}</span>
        </div>
      </div>

      <div className="w-full max-w-5xl">
        <AnimatePresence mode="wait">
          <motion.div key={currentPlayer?.id || 'idle'} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="w-full">
              <Card className={cn("ornate-border bg-card/95 backdrop-blur-md shadow-2xl relative transition-all duration-700", isMarquee && "border-primary shadow-[0_0_100px_rgba(255,215,0,0.3)]")}>
                  <CardContent className="p-8 min-h-[520px] flex items-center justify-center relative">
                      {(auction.isSold || auction.isUnsold) && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/98 p-10 text-center">
                              <Gavel size={100} className={cn("mb-6", auction.isSold ? "text-primary animate-bounce" : "text-destructive")} />
                              <h2 className={cn("text-7xl lg:text-9xl font-serif font-black uppercase italic tracking-tighter", auction.isSold ? "text-primary text-glow-gold" : "text-destructive")}>{auction.isSold ? 'SOLD' : 'UNSOLD'}</h2>
                              <h3 className="text-2xl lg:text-5xl font-serif text-white uppercase mt-4 tracking-[0.2em]">{currentPlayer?.playerName}</h3>
                              {auction.isSold && <p className="text-6xl lg:text-9xl font-mono font-black text-primary mt-6">{auction.currentBid}L</p>}
                          </motion.div>
                      )}

                      {auction.status === 'drawing' ? (
                          <div className="text-center flex flex-col items-center">
                              <div className="w-20 h-20 border-4 border-primary border-t-transparent animate-spin rounded-full mb-6" />
                              <h1 className="text-4xl text-primary font-serif tracking-[0.4em] uppercase italic">Next Lot Incoming</h1>
                          </div>
                      ) : currentPlayer ? (
                          <div className="flex flex-col lg:flex-row items-center gap-12 w-full">
                              <div className="w-full lg:w-2/5 relative aspect-[3/4] max-w-[360px] mx-auto ornate-border overflow-hidden shadow-2xl">
                                  {currentPlayer.imageUrl ? <Image src={currentPlayer.imageUrl} alt="" fill className="object-cover" /> : <ShieldCheck className="h-40 w-40 opacity-10 mx-auto mt-20" />}
                              </div>
                              <div className="w-full lg:w-3/5 flex flex-col space-y-10">
                                  <div>
                                      <div className="flex items-center gap-3 mb-2">
                                        <p className="font-serif text-[12px] text-primary font-black uppercase tracking-[0.5em]">Current Drawing</p>
                                        {isMarquee && <Badge className="bg-primary text-primary-foreground">MARQUEE</Badge>}
                                      </div>
                                      <h1 className="text-5xl lg:text-[6rem] font-bold font-serif text-white italic tracking-tighter drop-shadow-2xl truncate">{currentPlayer.playerName}</h1>
                                  </div>
                                  <div className="grid grid-cols-2 gap-6">
                                      {[
                                          { label: 'Specialism', value: currentPlayer.specialism },
                                          { label: 'Rating', value: currentPlayer.points },
                                      ].map((s, i) => (
                                          <div key={i} className="bg-secondary/20 border-l-4 border-primary p-6">
                                              <span className="text-[10px] text-primary font-black uppercase block tracking-widest mb-1">{s.label}</span>
                                              <span className="font-serif text-4xl text-white font-bold">{s.value}</span>
                                          </div>
                                      ))}
                                  </div>
                                  <div className="p-10 border-4 border-primary/30 bg-black/60 flex flex-col shadow-2xl">
                                      <span className="text-[12px] font-black text-primary uppercase tracking-[0.8em] mb-4 text-center lg:text-left">Live Bid Status</span>
                                      <div className="flex items-baseline justify-center lg:justify-start gap-4">
                                          <span className="text-8xl lg:text-[10rem] font-mono font-black text-white tracking-tighter leading-none">{auction.currentBid}</span>
                                          <span className="text-4xl lg:text-6xl font-serif text-primary italic font-black">L</span>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      ) : (
                          <h1 className="text-4xl text-primary font-serif uppercase tracking-[0.4em] opacity-20 italic">Awaiting Floor Signal...</h1>
                      )}
                  </CardContent>
              </Card>
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Marquee Ticker */}
      <div className="fixed bottom-0 left-0 w-full h-16 bg-black border-t-2 border-primary overflow-hidden flex items-center z-[100] shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
          <div className="bg-primary px-10 h-full flex items-center z-10 shadow-[8px_0_20px_rgba(0,0,0,0.6)]">
              <span className="text-primary-foreground font-black text-lg uppercase tracking-[0.3em] italic whitespace-nowrap">SAAVAN LIVE</span>
          </div>
          <div className="flex-1 overflow-hidden relative h-full">
              <div className="animate-marquee whitespace-nowrap flex flex-row items-center gap-20 absolute inset-0">
                  {marqueeHistory.map((event, i) => {
                      const p = set?.players.find(pl => pl.id === event.playerId);
                      return (
                        <div key={`event-${i}`} className="flex items-center gap-4 shrink-0">
                            <span className={cn("text-[12px] font-black uppercase tracking-widest", event.type === 'sold' ? "text-primary" : "text-destructive")}>{event.type === 'sold' ? 'SOLD' : 'UNSOLD'}:</span>
                            <span className="text-white text-lg font-bold uppercase">{p?.playerName || 'Player'}</span>
                            {event.bid && <span className="text-primary font-mono text-xl font-black">{event.bid}L</span>}
                        </div>
                      );
                  })}
                  {marqueeHistory.length === 0 && (
                      <div className="text-white/20 text-sm uppercase tracking-[0.5em] italic">Floor activity will appear here...</div>
                  )}
              </div>
          </div>
      </div>

      <style jsx global>{`
        .animate-marquee {
            display: flex;
            width: max-content;
            animation: marquee 45s linear infinite;
        }
        @keyframes marquee {
            0% { transform: translateX(100vw); }
            100% { transform: translateX(-100%); }
        }
        .text-glow-gold { text-shadow: 0 0 20px rgba(255, 215, 0, 0.7), 0 0 60px rgba(255, 215, 0, 0.3); }
      `}</style>
    </div>
  );
}
