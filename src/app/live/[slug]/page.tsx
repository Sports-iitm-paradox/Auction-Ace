'use client';

import { useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, DocumentReference } from 'firebase/firestore';
import { Player, PlayerSet, ActiveAuctionState } from '@/lib/player-data';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Gavel, ShieldCheck, Award, Sparkles } from 'lucide-react';
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
        particleCount: 200,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#FFD700', '#FFFFFF', '#8B0000']
      });
    }
  }, [auction?.isSold, auction?.currentBid]);

  const marqueeHistory = useMemo(() => {
    if (!auction?.history) return [];
    return auction.history.slice(-20).reverse();
  }, [auction?.history]);

  if (!auction || (auction.status === 'idle' && !auction.currentPlayerId)) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#1a0202] p-4 text-center">
        <Trophy className="h-24 w-24 text-primary mb-8 animate-pulse" />
        <h1 className="text-5xl font-serif text-primary mb-4 italic uppercase tracking-[0.4em]">Broadcast Standby</h1>
        <p className="text-muted-foreground uppercase tracking-[0.6em] text-xs">Syncing with Paradox Official Floor...</p>
        <div className="mt-12 w-48 h-1 bg-primary/20 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-primary"
            animate={{ x: [-200, 200] }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          />
        </div>
      </div>
    );
  }

  const isMarquee = (auction?.currentBid || 0) >= MARQUEE_THRESHOLD;
  const steps = ['Going Once', 'Going Twice', 'Final Call'];

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-4 bg-background overflow-hidden sunburst-bg">
      {/* Broadcast Header */}
      <div className="absolute top-0 left-0 w-full p-8 flex items-center justify-between z-50 bg-gradient-to-b from-black to-transparent">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_15px_red]" />
            <span className="text-red-600 font-bold uppercase tracking-[0.4em] text-xs">Live Floor Feed</span>
          </div>
          <div className="h-6 w-px bg-primary/30 mx-2" />
          <span className="text-primary font-serif font-black text-2xl tracking-widest uppercase italic">{set?.name || 'Paradox Auction'}</span>
        </div>
        <div className="hidden lg:block">
          <span className="text-white/40 font-serif text-[10px] uppercase tracking-[0.8em]">Official Broadcast System • Paradox 2026</span>
        </div>
      </div>

      <div className="w-full max-w-6xl">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentPlayer?.id || 'idle'} 
            initial={{ opacity: 0, y: 30, scale: 0.98 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: -30, scale: 0.98 }}
            className="w-full"
          >
              <Card className={cn(
                "ornate-border bg-card/95 backdrop-blur-xl shadow-[0_0_80px_rgba(0,0,0,0.8)] relative transition-all duration-1000", 
                isMarquee && "border-primary shadow-[0_0_120px_rgba(255,215,0,0.3)]"
              )}>
                  <CardContent className="p-0 min-h-[600px] flex items-center justify-center relative overflow-hidden">
                      
                      {/* Sold/Unsold Cinematic Overlay */}
                      {(auction.isSold || auction.isUnsold) && (
                          <motion.div 
                            initial={{ opacity: 0, backdropFilter: "blur(0px)" }} 
                            animate={{ opacity: 1, backdropFilter: "blur(12px)" }} 
                            className="absolute inset-0 z-[110] flex flex-col items-center justify-center bg-black/90 p-12 text-center"
                          >
                             <motion.div 
                                initial={{ scale: 0.6, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className={cn(
                                  "p-16 border-8 ornate-border bg-card/40 max-w-4xl w-full relative",
                                  auction.isSold ? "border-primary shadow-[0_0_100px_rgba(255,215,0,0.5)]" : "border-destructive shadow-[0_0_100px_rgba(255,0,0,0.3)]"
                                )}
                              >
                                <div className="absolute top-6 right-6 opacity-20">
                                  {auction.isSold ? <Award size={150} className="text-primary" /> : <ShieldCheck size={150} className="text-destructive" />}
                                </div>
                                
                                <Gavel size={140} className={cn("mx-auto mb-10", auction.isSold ? "text-primary animate-bounce drop-shadow-[0_0_20px_rgba(255,215,0,0.6)]" : "text-destructive")} />
                                
                                <h2 className={cn(
                                  "text-7xl lg:text-[10rem] font-serif font-black uppercase italic tracking-tighter leading-none mb-6", 
                                  auction.isSold ? "text-primary text-glow-gold" : "text-destructive"
                                )}>
                                  {auction.isSold ? 'SOLD' : 'UNSOLD'}
                                </h2>
                                
                                <h3 className="text-4xl lg:text-6xl font-serif text-white uppercase tracking-[0.3em] border-y border-primary/30 py-6 my-8">
                                  {currentPlayer?.playerName}
                                </h3>
                                
                                {auction.isSold && (
                                  <div className="flex items-center justify-center gap-6">
                                    <Sparkles className="text-primary w-12 h-12 animate-pulse" />
                                    <span className="text-7xl lg:text-[12rem] font-mono font-black text-primary drop-shadow-2xl">{auction.currentBid}L</span>
                                    <Sparkles className="text-primary w-12 h-12 animate-pulse" />
                                  </div>
                                )}
                              </motion.div>
                          </motion.div>
                      )}

                      {/* Hammer Step Overlay */}
                      {auction.hammerStep > 0 && auction.hammerStep < 4 && !auction.isSold && (
                          <motion.div 
                            initial={{ y: -200 }} 
                            animate={{ y: 0 }} 
                            exit={{ y: -200 }}
                            className="absolute top-0 left-0 w-full bg-primary py-10 flex justify-center z-[105] shadow-2xl border-b-4 border-white/20"
                          >
                              <h2 className="text-5xl lg:text-7xl font-serif font-black uppercase italic tracking-[0.8em] text-primary-foreground drop-shadow-xl">
                                  {steps[auction.hammerStep - 1].toUpperCase()}
                              </h2>
                          </motion.div>
                      )}

                      {auction.status === 'drawing' ? (
                          <div className="text-center flex flex-col items-center p-20">
                              <div className="w-32 h-32 border-8 border-primary border-t-transparent animate-spin rounded-full mb-12 shadow-[0_0_30px_rgba(255,215,0,0.3)]" />
                              <h1 className="text-6xl text-primary font-serif tracking-[0.6em] uppercase italic animate-pulse">Next Lot Incoming</h1>
                          </div>
                      ) : currentPlayer ? (
                          <div className="flex flex-col lg:flex-row items-stretch w-full">
                              {/* Player Image - Contain Fit */}
                              <div className="w-full lg:w-[45%] p-10 bg-black/30 border-r border-primary/20 flex items-center justify-center">
                                <div className="w-full aspect-[3/4] relative ornate-border bg-[#0a0101] overflow-hidden flex items-center justify-center shadow-2xl">
                                    {currentPlayer.imageUrl ? (
                                      <Image 
                                        src={currentPlayer.imageUrl} 
                                        alt={currentPlayer.playerName} 
                                        fill 
                                        className="object-contain p-2" 
                                        priority
                                      />
                                    ) : (
                                      <ShieldCheck className="h-64 w-64 opacity-5 text-primary" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                                    <div className="absolute top-4 left-4 bg-primary text-primary-foreground font-black px-4 py-1 text-xl shadow-lg border border-white/20">
                                      LOT #{currentPlayer.playerNumber}
                                    </div>
                                </div>
                              </div>

                              {/* Player Info Section */}
                              <div className="w-full lg:w-[55%] p-12 flex flex-col justify-between bg-gradient-to-br from-[#1a0202] to-black">
                                  <div className="space-y-12">
                                      <div>
                                          <div className="flex items-center gap-4 mb-4">
                                            <span className="font-serif text-sm text-primary font-black uppercase tracking-[0.6em] border-l-4 border-primary pl-4">Live Auction Lot</span>
                                            {isMarquee && <Badge className="bg-primary text-primary-foreground animate-bounce px-4 py-1 text-xs">MARQUEE PLAYER</Badge>}
                                          </div>
                                          <h1 className="text-6xl lg:text-[7rem] font-bold font-serif text-white italic tracking-tighter drop-shadow-2xl leading-none">
                                            {currentPlayer.playerName}
                                          </h1>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-10">
                                          {[
                                              { label: 'Specialism', value: currentPlayer.specialism },
                                              { label: 'Rating', value: `${currentPlayer.points} PTS` },
                                              { label: 'Category', value: currentPlayer.cua },
                                              { label: 'Country', value: currentPlayer.country },
                                          ].map((s, i) => (
                                              <div key={i} className="relative">
                                                  <span className="text-[10px] text-primary font-black uppercase block tracking-[0.4em] mb-3">{s.label}</span>
                                                  <span className="font-serif text-3xl lg:text-4xl text-white font-bold tracking-wide">{s.value}</span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>

                                  <div className="mt-16 p-12 border-4 border-primary/30 bg-black/70 flex flex-col shadow-[0_30px_60px_rgba(0,0,0,0.6)] relative overflow-hidden">
                                      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-[80px] -z-10" />
                                      <span className="text-[14px] font-black text-primary uppercase tracking-[1em] mb-6 text-center lg:text-left">Current Valuation</span>
                                      <div className="flex items-baseline justify-center lg:justify-start gap-6">
                                          <motion.span 
                                            key={auction.currentBid}
                                            initial={{ scale: 1.1, y: -20 }}
                                            animate={{ scale: 1, y: 0 }}
                                            className="text-8xl lg:text-[12rem] font-mono font-black text-white tracking-tighter leading-none"
                                          >
                                            {auction.currentBid}
                                          </motion.span>
                                          <span className="text-4xl lg:text-7xl font-serif text-primary italic font-black">LAKH</span>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      ) : (
                          <h1 className="text-5xl text-primary font-serif uppercase tracking-[0.6em] opacity-30 italic">Awaiting Floor Signal...</h1>
                      )}
                  </CardContent>
              </Card>
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Broadcast Ticker - Marquee History */}
      <div className="fixed bottom-0 left-0 w-full h-20 bg-black border-t-2 border-primary overflow-hidden flex items-center z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.9)]">
          <div className="bg-primary px-12 h-full flex items-center z-10 shadow-[10px_0_30px_rgba(0,0,0,0.8)] border-r-2 border-white/20">
              <span className="text-primary-foreground font-black text-2xl uppercase tracking-[0.3em] italic whitespace-nowrap">PARADOX LIVE</span>
          </div>
          <div className="flex-1 overflow-hidden relative h-full bg-black/40">
              <div className="animate-marquee whitespace-nowrap flex flex-row items-center gap-24 absolute inset-0">
                  {marqueeHistory.map((event, i) => {
                      const p = set?.players.find(pl => pl.id === event.playerId);
                      return (
                        <div key={`event-${i}`} className="flex items-center gap-6 shrink-0">
                            <span className={cn(
                              "text-sm font-black uppercase tracking-[0.4em] px-3 py-1 rounded", 
                              event.type === 'sold' ? "text-primary border border-primary/40 bg-primary/10" : "text-destructive border border-destructive/40 bg-destructive/10"
                            )}>
                              {event.type === 'sold' ? 'SOLD' : 'UNSOLD'}
                            </span>
                            <span className="text-white text-2xl font-serif font-bold uppercase italic tracking-wider">{p?.playerName || 'Player'}</span>
                            {event.bid && (
                              <div className="flex items-baseline gap-1">
                                <span className="text-primary font-mono text-3xl font-black">{event.bid}</span>
                                <span className="text-primary font-serif text-sm italic font-bold">L</span>
                              </div>
                            )}
                        </div>
                      );
                  })}
                  {marqueeHistory.length === 0 && (
                      <div className="text-white/20 text-lg uppercase tracking-[0.8em] italic ml-10">Awaiting Floor activity... Synchronizing with moderator feed...</div>
                  )}
              </div>
          </div>
      </div>

      <style jsx global>{`
        .animate-marquee {
            display: flex;
            width: max-content;
            animation: marquee 50s linear infinite;
        }
        @keyframes marquee {
            0% { transform: translateX(100vw); }
            100% { transform: translateX(-100%); }
        }
        .text-glow-gold { 
          text-shadow: 0 0 25px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 215, 0, 0.5), 0 0 100px rgba(255, 215, 0, 0.2); 
        }
      `}</style>
    </div>
  );
}
