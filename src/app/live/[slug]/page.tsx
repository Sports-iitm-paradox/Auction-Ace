
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, DocumentReference, collection, query, orderBy } from 'firebase/firestore';
import { Player, PlayerSet, ActiveAuctionState, Squad } from '@/lib/player-data';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Gavel, ShieldCheck } from 'lucide-react';
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

  const { data: auction } = useDoc<ActiveAuctionState>(auctionRef);

  const squadsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'squads'), orderBy('order'));
  }, [firestore]);

  const { data: squads } = useCollection<Squad>(squadsQuery);

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

  const marqueeBuys = useMemo(() => {
    if (!auction?.history) return [];
    return auction.history
      .filter(e => e.type === 'sold')
      .slice(-10)
      .reverse();
  }, [auction?.history]);

  const upcomingLots = useMemo(() => {
    if (!auction?.undrawnIds || !set?.players) return [];
    return auction.undrawnIds
      .slice(0, 5)
      .map(id => set.players.find(p => p.id === id)?.playerName)
      .filter(Boolean);
  }, [auction?.undrawnIds, set?.players]);

  if (!auction || (auction.status === 'idle' && !auction.currentPlayerId)) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#1a0202] p-4 text-center">
        <Trophy className="h-20 w-20 text-primary mb-4 animate-pulse" />
        <h1 className="text-4xl font-serif text-primary mb-2 italic">Live Session Idle</h1>
        <p className="text-muted-foreground uppercase tracking-widest text-[10px]">Synchronizing with global floor integrity...</p>
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
          <span className="text-red-600 font-bold uppercase tracking-[0.2em] text-[10px]">Broadcast Live</span>
          <div className="h-4 w-px bg-primary/20 mx-2" />
          <span className="text-primary font-serif font-bold text-lg">{set?.name || 'Main Floor'}</span>
        </div>

        <div className="flex bg-black/60 border border-primary/30 p-1 rounded-full">
            <button onClick={() => setActiveView('auction')} className={cn("px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all", activeView === 'auction' ? "bg-primary text-primary-foreground" : "text-primary/60")}>Auction Floor</button>
            <button onClick={() => setActiveView('standings')} className={cn("px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all", activeView === 'standings' ? "bg-primary text-primary-foreground" : "text-primary/60")}>House Standings</button>
        </div>
      </div>

      <div className="w-full max-w-5xl mt-8">
        <AnimatePresence mode="wait">
          {activeView === 'auction' ? (
            <motion.div key={currentPlayer?.id || 'idle'} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="w-full">
                <Card className={cn("ornate-border bg-card/95 backdrop-blur-md shadow-2xl relative transition-all duration-700", isMarquee && "border-primary shadow-[0_0_100px_rgba(255,215,0,0.3)]")}>
                    <CardContent className="p-8 min-h-[480px] flex items-center justify-center relative">
                        {/* Status Overlays */}
                        {(auction.isSold || auction.isUnsold) && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/98 p-10 text-center">
                                <Gavel size={80} className={cn("mb-6", auction.isSold ? "text-primary animate-bounce" : "text-destructive")} />
                                <h2 className={cn("text-7xl lg:text-9xl font-serif font-black uppercase italic tracking-tighter", auction.isSold ? "text-primary text-glow-gold" : "text-destructive")}>{auction.isSold ? 'SOLD' : 'UNSOLD'}</h2>
                                <h3 className="text-2xl lg:text-4xl font-serif text-white uppercase mt-4 tracking-[0.2em]">{currentPlayer?.playerName}</h3>
                                {auction.isSold && <p className="text-5xl lg:text-8xl font-mono font-black text-primary mt-6">{auction.currentBid}L</p>}
                            </motion.div>
                        )}

                        {auction.status === 'drawing' ? (
                            <div className="text-center flex flex-col items-center">
                                <div className="w-16 h-16 border-4 border-primary border-t-transparent animate-spin rounded-full mb-6" />
                                <h1 className="text-3xl text-primary font-serif tracking-[0.3em] uppercase italic">Preparing Next Lot</h1>
                            </div>
                        ) : currentPlayer ? (
                            <div className="flex flex-col lg:flex-row items-center gap-12 w-full">
                                <div className="w-full lg:w-2/5 relative aspect-[3/4] max-w-[320px] mx-auto ornate-border overflow-hidden shadow-2xl">
                                    {currentPlayer.imageUrl ? <Image src={currentPlayer.imageUrl} alt="" fill className="object-cover" /> : <ShieldCheck className="h-40 w-40 opacity-10 mx-auto mt-20" />}
                                </div>
                                <div className="w-full lg:w-3/5 flex flex-col space-y-8">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                          <p className="font-serif text-[10px] text-primary font-black uppercase tracking-[0.5em]">Active Drawing</p>
                                          {isMarquee && <Badge className="bg-primary text-primary-foreground">MARQUEE</Badge>}
                                        </div>
                                        <h1 className="text-5xl lg:text-8xl font-bold font-serif text-white italic tracking-tighter drop-shadow-2xl">{currentPlayer.playerName}</h1>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { label: 'Specialism', value: currentPlayer.specialism },
                                            { label: 'Rating', value: currentPlayer.points },
                                        ].map((s, i) => (
                                            <div key={i} className="bg-secondary/20 border-l-4 border-primary p-6">
                                                <span className="text-[9px] text-primary font-black uppercase block tracking-widest mb-1">{s.label}</span>
                                                <span className="font-serif text-3xl text-white font-bold">{s.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-10 border-4 border-primary/30 bg-black/60 flex flex-col shadow-2xl">
                                        <span className="text-[12px] font-black text-primary uppercase tracking-[0.6em] mb-4">Current Valuation</span>
                                        <div className="flex items-baseline gap-4">
                                            <span className="text-8xl lg:text-9xl font-mono font-black text-white tracking-tighter">{auction.currentBid}</span>
                                            <span className="text-3xl lg:text-5xl font-serif text-primary italic font-black">L</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <h1 className="text-4xl text-primary font-serif uppercase tracking-[0.4em] opacity-20 italic">Floor Waiting...</h1>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
          ) : (
            <motion.div key="standings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                <Card className="ornate-border bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden max-h-[68vh]">
                    <div className="p-8 border-b border-primary/20 flex justify-between items-center bg-black/20">
                        <h2 className="text-3xl font-serif text-primary uppercase tracking-[0.3em] font-black italic">Official Standings</h2>
                        <span className="text-[10px] text-primary/60 font-black uppercase tracking-[0.4em]">Live Ledger Integrity</span>
                    </div>
                    <div className="p-6 overflow-y-auto custom-scrollbar h-[52vh]">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b border-primary/20 hover:bg-transparent">
                                    <TableHead className="font-black text-primary uppercase text-[12px] tracking-widest p-6">Franchise</TableHead>
                                    <TableHead className="text-right font-black text-primary uppercase text-[12px] tracking-widest">Purse Left (Cr)</TableHead>
                                    <TableHead className="text-right font-black text-primary uppercase text-[12px] tracking-widest">Points</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {squads?.map((h) => (
                                    <TableRow key={h.id} className="border-b border-primary/5 hover:bg-primary/5 transition-colors">
                                        <TableCell className="font-serif text-2xl font-bold text-white py-8 px-6">{h.name}</TableCell>
                                        <TableCell className="text-right font-mono text-3xl text-primary font-black">{h.moneyLeft}Cr</TableCell>
                                        <TableCell className="text-right font-mono text-3xl text-white font-black">{h.totalPoints}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Professional Broadcast Ticker */}
      <div className="fixed bottom-0 left-0 w-full h-14 bg-black border-t-2 border-primary overflow-hidden flex items-center z-[100] shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
          <div className="bg-primary px-8 h-full flex items-center z-10 shadow-[8px_0_20px_rgba(0,0,0,0.6)]">
              <span className="text-primary-foreground font-black text-sm uppercase tracking-[0.3em] italic whitespace-nowrap">SAAVAN UPDATE</span>
          </div>
          <div className="flex-1 overflow-hidden relative h-full">
              <div className="animate-marquee whitespace-nowrap flex flex-row items-center gap-16 absolute inset-0">
                  {marqueeBuys.map((buy, i) => (
                      <div key={`buy-${i}`} className="flex items-center gap-3 shrink-0">
                          <span className="text-primary text-[10px] font-black uppercase tracking-widest">{buy.houseName}:</span>
                          <span className="text-white text-sm font-bold uppercase">{buy.playerId}</span>
                          <span className="text-primary font-mono text-sm font-black">{buy.bid}L</span>
                      </div>
                  ))}
                  {squads?.map((s, i) => (
                      <div key={`purse-${i}`} className="flex items-center gap-3 border-l border-white/10 pl-8 shrink-0">
                          <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">{s.name} PURSE:</span>
                          <span className="text-white text-sm font-bold font-mono">{s.moneyLeft}Cr</span>
                      </div>
                  ))}
                  {upcomingLots.length > 0 && (
                      <div className="flex items-center gap-3 border-l border-white/10 pl-8 shrink-0">
                          <span className="text-primary text-[10px] font-black uppercase tracking-widest">UPCOMING:</span>
                          <span className="text-white/60 text-sm italic">{upcomingLots.join(" • ")}</span>
                      </div>
                  )}
              </div>
          </div>
      </div>

      <style jsx global>{`
        .animate-marquee {
            display: flex;
            width: max-content;
            animation: marquee 60s linear infinite;
        }
        @keyframes marquee {
            0% { transform: translateX(100vw); }
            100% { transform: translateX(-100%); }
        }
        .text-glow-gold { text-shadow: 0 0 20px rgba(255, 215, 0, 0.7), 0 0 60px rgba(255, 215, 0, 0.3); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 215, 0, 0.3); border-radius: 10px; }
      `}</style>
    </div>
  );
}
