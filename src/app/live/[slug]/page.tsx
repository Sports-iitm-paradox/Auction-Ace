'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, DocumentReference, collection, query, orderBy } from 'firebase/firestore';
import { Player, PlayerSet, ActiveAuctionState, Squad } from '@/lib/player-data';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Gavel, Users, Info, ShieldCheck, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import confetti from 'canvas-confetti';

const MARQUEE_THRESHOLD = 1000;

export default function PublicLivePage() {
  const params = useParams();
  const slug = params.slug as string;
  const firestore = useFirestore();
  const [activeView, setActiveView] = useState<'auction' | 'standings'>('auction');

  const auctionRef = useMemoFirebase(() => {
    if (!firestore || !slug) return null;
    return doc(firestore, 'activeAuctions', slug) as DocumentReference<ActiveAuctionState>;
  }, [firestore, slug]);

  const { data: auction, isLoading: isLoadingAuction } = useDoc<ActiveAuctionState>(auctionRef);

  const squadsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'squads'), orderBy('order'));
  }, [firestore]);

  const { data: squads } = useCollection<Squad>(squadsQuery);

  const setRef = useMemoFirebase(() => {
    if (!firestore || !auction?.setId) return null;
    return doc(firestore, 'sets', auction.setId) as DocumentReference<PlayerSet>;
  }, [firestore, auction?.setId]);

  const { data: set, isLoading: isLoadingSet } = useDoc<PlayerSet>(setRef);

  const currentPlayer = set?.players.find(p => p.id === auction?.currentPlayerId) || null;

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

  if (isLoadingAuction || (auction?.setId && isLoadingSet)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <p className="text-primary font-serif animate-pulse text-2xl">Joining Live Floor...</p>
      </div>
    );
  }

  if (!auction || (auction.status === 'idle' && !auction.currentPlayerId)) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background p-4 text-center">
        <Trophy className="h-20 w-20 text-primary mb-4" />
        <h1 className="text-4xl font-serif text-primary mb-2">Floor Currently Closed</h1>
        <p className="text-muted-foreground">The moderator hasn't started the session yet. Stay tuned.</p>
      </div>
    );
  }

  const isMarquee = (auction?.currentBid || 0) >= MARQUEE_THRESHOLD;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-4 bg-background overflow-hidden">
      {/* Broadcast Header */}
      <div className="absolute top-0 left-0 w-full p-6 flex items-center justify-between z-50 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_red]" />
          <span className="text-red-600 font-bold uppercase tracking-[0.2em] text-xs">Live Feed</span>
          <div className="hidden sm:block h-4 w-px bg-primary/20 mx-2" />
          <span className="text-primary font-serif font-bold text-lg hidden sm:block">{set?.name || 'Session Active'}</span>
        </div>

        <div className="flex bg-black/40 border border-primary/30 p-1 rounded-full">
            <button 
                onClick={() => setActiveView('auction')}
                className={cn(
                    "px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                    activeView === 'auction' ? "bg-primary text-primary-foreground shadow-lg" : "text-primary/60 hover:text-primary"
                )}
            >
                <Gavel size={14} /> Auction
            </button>
            <button 
                onClick={() => setActiveView('standings')}
                className={cn(
                    "px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                    activeView === 'standings' ? "bg-primary text-primary-foreground shadow-lg" : "text-primary/60 hover:text-primary"
                )}
            >
                <Users size={14} /> Standings
            </button>
        </div>
      </div>

      <div className="w-full max-w-5xl mt-16">
        <AnimatePresence mode="wait">
          {activeView === 'auction' ? (
            <motion.div
                key={auction.status === 'drawing' ? 'drawing' : (currentPlayer?.id || 'idle')}
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  scale: (isMarquee && auction.status === 'bidding') ? [1, 1.01, 1] : 1
                }}
                transition={isMarquee ? { repeat: Infinity, duration: 2 } : {}}
                exit={{ opacity: 0, y: -20 }}
                className="w-full"
            >
                <Card className={cn(
                  "ornate-border bg-card/90 backdrop-blur-md shadow-2xl relative transition-all duration-700",
                  isMarquee && "border-primary shadow-[0_0_80px_rgba(255,215,0,0.2)]"
                )}>
                    <CardContent className="p-8 min-h-[450px] flex items-center justify-center">
                        
                        {(auction.isSold || auction.isUnsold) && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 2 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none"
                            >
                                <div className={cn(
                                    "border-8 p-10 rotate-[-12deg] bg-card shadow-[0_0_100px_rgba(0,0,0,0.9)] ornate-border",
                                    auction.isSold ? "border-primary" : "border-destructive"
                                )}>
                                    <h2 className={cn(
                                        "text-6xl sm:text-8xl font-serif font-black uppercase tracking-tighter",
                                        auction.isSold ? "text-primary text-glow-gold" : "text-destructive text-glow-red"
                                    )}>
                                        {auction.isSold ? 'SOLD' : 'UNSOLD'}
                                    </h2>
                                </div>
                            </motion.div>
                        )}

                        {auction.status === 'drawing' ? (
                            <div className="text-center flex flex-col justify-center items-center">
                                <div className="w-20 h-20 border-8 border-primary border-t-transparent animate-spin rounded-full mb-6" />
                                <h1 className="text-4xl text-primary font-bold font-serif tracking-widest animate-pulse">Next Lot Incoming...</h1>
                            </div>
                        ) : currentPlayer ? (
                            <div className="flex flex-col lg:flex-row items-center justify-center gap-12 w-full">
                                <div className="w-full lg:w-2/5 flex-shrink-0">
                                    <div className={cn(
                                      "relative aspect-[3/4] max-w-[320px] mx-auto ornate-border shadow-2xl",
                                      isMarquee && "border-primary shadow-[0_0_40px_rgba(255,215,0,0.3)]"
                                    )}>
                                        <div className="bg-black/40 w-full h-full flex items-center justify-center overflow-hidden">
                                            {currentPlayer.imageUrl ? (
                                                <Image src={currentPlayer.imageUrl} alt={currentPlayer.playerName} fill className="object-cover" />
                                            ) : (
                                                <ShieldCheck className="h-40 w-40 text-primary/10" />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full lg:w-3/5 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
                                    <div className="flex flex-col items-center lg:items-start">
                                        <div className="flex items-center gap-3 mb-2">
                                          <p className="font-serif text-sm text-primary/80 uppercase tracking-[0.4em] font-black">Active Floor Lot</p>
                                          {isMarquee && (
                                            <Badge className="bg-primary text-primary-foreground gap-1.5 animate-bounce">
                                              <Sparkles size={10} /> Marquee
                                            </Badge>
                                          )}
                                        </div>
                                        <h1 className="text-4xl lg:text-7xl font-bold font-serif text-white italic tracking-tighter drop-shadow-[0_4px_10px_black]">
                                            {currentPlayer.playerName}
                                        </h1>
                                    </div>
                                    
                                    <div className="w-full grid grid-cols-2 gap-4">
                                        {[
                                            { label: 'Origin', value: currentPlayer.country },
                                            { label: 'Role', value: currentPlayer.specialism },
                                            { label: 'Category', value: currentPlayer.cua },
                                            { label: 'Rating', value: currentPlayer.points },
                                        ].map((stat, i) => stat.value && (
                                            <div key={i} className={cn(
                                              "flex flex-col p-4 bg-secondary/30 border-l-4 shadow-lg",
                                              isMarquee ? "border-primary" : "border-primary/40"
                                            )}>
                                                <span className="text-[10px] text-primary/60 font-black uppercase tracking-widest mb-1">{stat.label}</span>
                                                <span className="font-serif text-2xl text-white font-bold">{stat.value}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className={cn(
                                      "w-full p-6 border-4 bg-black/80 flex flex-col items-center lg:items-start transition-all duration-500",
                                      isMarquee ? "border-primary shadow-[0_0_50px_rgba(255,215,0,0.3)]" : "border-primary/30 shadow-[0_0_30px_rgba(255,215,0,0.1)]"
                                    )}>
                                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.5em] mb-2">Live Floor Valuation</span>
                                        <div className="flex items-baseline gap-4">
                                            <motion.span 
                                              key={auction.currentBid}
                                              initial={{ scale: 0.9 }}
                                              animate={{ scale: 1 }}
                                              className={cn(
                                                "text-6xl lg:text-8xl font-mono font-black",
                                                isMarquee ? "text-primary text-glow-gold" : "text-white"
                                              )}
                                            >
                                              {auction.currentBid}
                                            </motion.span>
                                            <span className="text-2xl lg:text-4xl font-serif text-primary italic font-black uppercase tracking-widest">L</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center flex flex-col justify-center items-center space-y-8">
                                <Gavel className="h-32 w-32 text-primary opacity-20 animate-pulse" />
                                <h1 className="text-4xl font-black font-serif text-primary uppercase tracking-[0.4em]">Floor Waiting...</h1>
                                <p className="text-muted-foreground text-sm tracking-widest uppercase">The moderator is preparing the next lot.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
          ) : (
            <motion.div
                key="standings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full"
            >
                <Card className="ornate-border bg-card/90 backdrop-blur-md shadow-2xl max-h-[70vh] flex flex-col">
                    <div className="p-8 border-b border-primary/20 flex items-center justify-between">
                        <h2 className="text-3xl font-serif text-primary uppercase tracking-widest font-black flex items-center gap-3">
                            <Trophy className="text-primary" /> House Standings
                        </h2>
                        <span className="text-[10px] text-primary/60 font-black tracking-widest uppercase">SAAVAN '26 Real-time Ledger</span>
                    </div>
                    <div className="overflow-y-auto custom-scrollbar flex-1 p-8 pt-0">
                        {squads && squads.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-primary/20 hover:bg-transparent">
                                        <TableHead className="font-black text-primary uppercase tracking-widest">House</TableHead>
                                        <TableHead className="text-right font-black text-primary uppercase tracking-widest">Purse Left</TableHead>
                                        <TableHead className="text-center font-black text-primary uppercase tracking-widest">Budget</TableHead>
                                        <TableHead className="text-right font-black text-primary uppercase tracking-widest">Points</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {squads.map((house) => (
                                        <TableRow key={house.id} className="border-b border-primary/5 hover:bg-primary/5 transition-colors">
                                            <TableCell className="font-serif text-xl font-bold text-white py-6">{house.name}</TableCell>
                                            <TableCell className="text-right font-mono text-2xl text-primary font-black">{house.moneyLeft}L</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={house.budgetStatus === 'OK' ? 'default' : 'destructive'} className="gap-2 px-4 py-1 bg-green-600 text-[10px]">
                                                    {house.budgetStatus === 'OK' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                                                    {house.budgetStatus}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-2xl text-white font-black">{house.totalPoints}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="py-20 text-center opacity-30">
                                <Info size={60} className="mx-auto mb-4" />
                                <p className="text-xl font-serif uppercase tracking-widest">Standings Ledger Closed</p>
                            </div>
                        )}
                    </div>
                </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="mt-12 text-center opacity-40">
        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.4em] font-black">
            IIT MADRAS PARADOX • OFFICIAL AUCTION SYSTEM
        </p>
      </div>

      <style jsx global>{`
        .text-glow-gold { text-shadow: 0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3); }
        .text-glow-red { text-shadow: 0 0 20px rgba(255, 0, 0, 0.6), 0 0 40px rgba(255, 0, 0, 0.3); }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 215, 0, 0.3); border-radius: 10px; }
      `}</style>
    </div>
  );
}
