'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { X, Trophy, Gavel, Undo2, RotateCcw, Shield, Loader2, Sparkles, Award, Zap, Timer } from 'lucide-react';
import { Player, PlayerSet, ActiveAuctionState, ActionEvent } from '@/lib/player-data';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useFirestore, useUser, useDoc, useMemoFirebase, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp, DocumentReference } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from '@/components/ui/badge';

const SOUNDS = {
    REVEAL: 'https://assets.mixkit.co/sfx/preview/mixkit-positive-interface-beep-221.mp3',
    SOLD: 'https://assets.mixkit.co/sfx/preview/mixkit-gavel-hammer-thump-2293.mp3',
    BUZZER: 'https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3',
    TICK: 'https://assets.mixkit.co/sfx/preview/mixkit-simple-game-countdown-921.mp3',
    UNSOLD: 'https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-947.mp3',
    HYPE: 'https://assets.mixkit.co/sfx/preview/mixkit-arcade-retro-changing-tab-206.mp3'
};

const DEFAULT_TIMER = 20;
const MARQUEE_THRESHOLD = 1000;
const HAMMER_INTERVAL = 1500;

export default function FullScreenView({ players, set, onReset }: { players: Player[], set: PlayerSet, onReset: () => void }) {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [timer, setTimer] = useState<number>(DEFAULT_TIMER);
  const [isTimerActive, setIsTimerActive] = useState(false);

  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const hammerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const auctionRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'activeAuctions', user.uid) as DocumentReference<ActiveAuctionState>;
  }, [firestore, user]);

  const { data: auction, isLoading: isLoadingAuction } = useDoc<ActiveAuctionState>(auctionRef);

  useEffect(() => {
    if (isLoadingAuction || !auctionRef || !user) return;
    if (!auction) {
        setDocumentNonBlocking(auctionRef, {
            currentPlayerId: "",
            currentBid: 0,
            status: 'idle',
            hammerStep: 0,
            isSold: false,
            isUnsold: false,
            userId: user.uid,
            lastUpdated: serverTimestamp(),
            history: []
        }, { merge: true });
    }
  }, [auction, isLoadingAuction, auctionRef, user]);

  const undrawnIds = useMemo(() => {
    if (!auction || !players) return [];
    const historyIds = new Set(auction.history.map(h => h.playerId));
    return players.filter(p => !historyIds.has(p.id)).map(p => p.id);
  }, [auction?.history, players]);

  const currentPlayer = useMemo(() => {
    if (!auction?.currentPlayerId) return null;
    return players.find(p => p.id === auction.currentPlayerId) || null;
  }, [auction?.currentPlayerId, players]);

  const playSound = useCallback((key: string) => {
    if (typeof Audio === 'undefined') return;
    const audio = new Audio((SOUNDS as any)[key.toUpperCase()]);
    audio.volume = 0.4;
    audio.play().catch(() => {});
  }, []);

  const clearHammerSequence = () => {
    if (hammerTimeoutRef.current) {
        clearTimeout(hammerTimeoutRef.current);
        hammerTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (isTimerActive && timer > 0) {
        timerInterval.current = setInterval(() => {
            setTimer(prev => {
                if (prev <= 5 && prev > 1) playSound('tick');
                return prev - 1;
            });
        }, 1000);
    } else if (timer === 0) {
        setIsTimerActive(false);
        playSound('buzzer');
    }
    return () => { if (timerInterval.current) clearInterval(timerInterval.current); };
  }, [isTimerActive, timer, playSound]);

  const handleDrawPlayer = async () => {
    if (!auction || undrawnIds.length === 0 || auction.status === 'drawing' || !auctionRef) return;
    
    clearHammerSequence();
    const nextId = undrawnIds[Math.floor(Math.random() * undrawnIds.length)];
    const nextPlayer = players.find(p => p.id === nextId);
    if (!nextPlayer) return;

    setTimer(DEFAULT_TIMER);
    updateDocumentNonBlocking(auctionRef, { 
        status: 'drawing', 
        hammerStep: 0, 
        isSold: false, 
        isUnsold: false,
        currentPlayerId: nextId,
        lastUpdated: serverTimestamp() 
    });

    setTimeout(() => {
      playSound('reveal');
      updateDocumentNonBlocking(auctionRef, {
        status: 'bidding',
        currentBid: nextPlayer.reservePrice || 0,
        lastUpdated: serverTimestamp()
      });
      setIsTimerActive(true);
    }, 800);
  };

  const handleIncreaseBid = () => {
    if (!auction || !auctionRef || auction.isSold || auction.isUnsold || auction.status !== 'bidding') return;
    
    clearHammerSequence();
    const getIncrement = (val: number) => {
        if (val < 100) return 5;
        if (val < 200) return 10;
        if (val < 500) return 20;
        return 50;
    };

    const newBid = auction.currentBid + getIncrement(auction.currentBid);
    if (newBid >= MARQUEE_THRESHOLD && auction.currentBid < MARQUEE_THRESHOLD) playSound('hype');

    setTimer(DEFAULT_TIMER);
    setIsTimerActive(true);
    updateDocumentNonBlocking(auctionRef, { currentBid: newBid, hammerStep: 0, lastUpdated: serverTimestamp() });
  };

  const handleHammerCall = () => {
    if (!auction || !auctionRef || auction.status !== 'bidding' || auction.hammerStep > 0) return;
    
    const runStep = (step: number) => {
        if (step > 3) {
            setIsTimerActive(false);
            playSound('sold');
            if (auction.currentBid >= MARQUEE_THRESHOLD) {
              confetti({ particleCount: 250, spread: 100, origin: { y: 0.5 } });
            }
            
            const newHistory: ActionEvent[] = [...(auction.history || []), { 
                type: 'sold', 
                playerId: auction.currentPlayerId, 
                bid: auction.currentBid, 
                timestamp: new Date().toISOString() 
            }];

            updateDocumentNonBlocking(auctionRef, { 
                status: 'sold', 
                hammerStep: 4, 
                isSold: true, 
                history: newHistory,
                lastUpdated: serverTimestamp() 
            });
            return;
        }
        playSound('reveal');
        updateDocumentNonBlocking(auctionRef, { hammerStep: step, lastUpdated: serverTimestamp() });
        hammerTimeoutRef.current = setTimeout(() => runStep(step + 1), HAMMER_INTERVAL);
    };

    runStep(1);
  };

  const handleUnsold = () => {
    if (!auction || !auctionRef || !currentPlayer) return;
    setIsTimerActive(false);
    playSound('unsold');
    const newHistory: ActionEvent[] = [...(auction.history || []), { 
        type: 'unsold', 
        playerId: currentPlayer.id, 
        timestamp: new Date().toISOString() 
    }];
    updateDocumentNonBlocking(auctionRef, {
        status: 'unsold',
        isUnsold: true,
        history: newHistory,
        lastUpdated: serverTimestamp()
    });
  };

  const handleNextLot = () => {
    if (!auctionRef) return;
    updateDocumentNonBlocking(auctionRef, {
        currentPlayerId: "",
        status: 'idle',
        isSold: false,
        isUnsold: false,
        hammerStep: 0,
        lastUpdated: serverTimestamp()
    });
    handleDrawPlayer();
  };

  const handleUndo = () => {
    if (!auction || !auctionRef || auction.history.length === 0) return;
    const history = [...auction.history];
    const last = history.pop();
    updateDocumentNonBlocking(auctionRef, {
        status: 'bidding',
        hammerStep: 0,
        isSold: false,
        isUnsold: false,
        history,
        currentPlayerId: last?.playerId,
        currentBid: last?.bid || 0,
        lastUpdated: serverTimestamp()
    });
  };

  const handleHardReset = () => {
    if (!auctionRef || !confirm("CRITICAL: Wipe entire global auction ledger?")) return;
    updateDocumentNonBlocking(auctionRef, {
        status: 'idle',
        currentPlayerId: "",
        currentBid: 0,
        hammerStep: 0,
        isSold: false,
        isUnsold: false,
        history: [],
        lastUpdated: serverTimestamp()
    });
  };

  if (isLoadingAuction || !auction) {
    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-[200]">
            <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
            <h2 className="text-primary font-headline uppercase tracking-widest text-xl">Connecting Feed...</h2>
        </div>
    );
  }

  const steps = ['Going Once', 'Going Twice', 'Final Call'];

  return (
    <div className="fixed inset-0 flex flex-col items-center bg-background cyber-grid select-none overflow-hidden h-screen text-foreground">
      {/* HUD Header */}
      <div className="w-full flex items-center justify-between px-6 py-3 z-[100] bg-black/60 backdrop-blur-md border-b border-primary/20">
        <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="font-headline text-[10px] text-primary tracking-widest uppercase">IPL AUCTION HUB // FLOOR CONTROL</h2>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsHistoryOpen(!isHistoryOpen)} className={cn("h-7 text-[9px] uppercase tracking-widest border-primary/20", isHistoryOpen && "bg-primary text-primary-foreground")}>Official Ledger</Button>
            <Button variant="outline" size="sm" onClick={handleUndo} className="h-7 w-8 p-0 border-primary/20"><Undo2 size={12} /></Button>
            <Button variant="outline" size="sm" onClick={handleHardReset} className="h-7 w-8 p-0 border-destructive/20 text-destructive"><RotateCcw size={12} /></Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/')} className="h-7 w-8 p-0 border-primary/20"><X size={14} /></Button>
        </div>
      </div>

      <div className="flex flex-1 w-full relative overflow-hidden">
        {/* Ledger Sidebar */}
        <AnimatePresence>
          {isHistoryOpen && (
              <motion.aside 
                initial={{ x: -320 }}
                animate={{ x: 0 }}
                exit={{ x: -320 }}
                transition={{ type: "tween", duration: 0.2 }}
                className="w-80 bg-black/90 border-r border-primary/20 h-full p-6 z-[90] flex flex-col shadow-2xl"
              >
                  <h3 className="text-primary font-headline uppercase tracking-widest text-[12px] mb-6 flex items-center gap-2">
                    <Award size={14} /> Global Floor Log
                  </h3>
                  <ScrollArea className="flex-1">
                      <div className="space-y-2 pr-4">
                          {auction.history.slice().reverse().map((p, i) => (
                              <div key={i} className="bg-white/5 border border-primary/5 p-3 relative overflow-hidden group hover:border-primary/30 transition-colors">
                                  <div className={cn("absolute left-0 top-0 bottom-0 w-1", p.type === 'sold' ? "bg-primary" : "bg-destructive")} />
                                  <p className="text-[10px] font-bold text-white uppercase truncate">{players.find(pl => pl.id === p.playerId)?.playerName}</p>
                                  <div className="flex justify-between mt-1">
                                      <span className={cn("text-[8px] font-bold uppercase", p.type === 'sold' ? "text-primary" : "text-destructive")}>{p.type === 'sold' ? 'SOLD' : 'UNSOLD'}</span>
                                      {p.bid && <span className="text-[10px] font-mono font-bold text-primary">{p.bid}L</span>}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </ScrollArea>
              </motion.aside>
          )}
        </AnimatePresence>

        <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
            <AnimatePresence mode="wait">
                {auction.status !== 'drawing' && currentPlayer ? (
                    <motion.div 
                      key={currentPlayer.id}
                      initial={{ opacity: 0, scale: 0.98 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      className={cn(
                        "w-full max-w-6xl aspect-[16/9] cyber-border shadow-[0_0_80px_rgba(0,0,0,0.9)] flex overflow-hidden relative", 
                        auction.currentBid >= MARQUEE_THRESHOLD && "border-primary shadow-[0_0_120px_rgba(255,70,85,0.2)]"
                      )}
                    >
                        {/* Sold/Unsold Cinematic Overlay */}
                        {(auction.isSold || auction.isUnsold) && (
                            <motion.div 
                              initial={{ opacity: 0 }} 
                              animate={{ opacity: 1 }} 
                              className="absolute inset-0 z-[110] flex flex-col items-center justify-center bg-black/95 p-12 text-center"
                            >
                                <motion.div 
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  className={cn(
                                    "p-12 cyber-border max-w-3xl w-full relative",
                                    auction.isSold ? "border-primary shadow-[0_0_100px_rgba(255,70,85,0.5)]" : "border-destructive shadow-[0_0_100px_rgba(255,0,0,0.4)]"
                                  )}
                                >
                                  <div className="absolute top-6 right-6 opacity-30">
                                    {auction.isSold ? <Award size={100} className="text-primary" /> : <Shield size={100} className="text-destructive" />}
                                  </div>
                                  
                                  <Gavel size={80} className={cn("mx-auto mb-6", auction.isSold ? "text-primary animate-pulse" : "text-destructive")} />
                                  
                                  <h2 className={cn(
                                    "text-7xl lg:text-9xl font-headline font-black uppercase tracking-tighter leading-none mb-4", 
                                    auction.isSold ? "text-primary text-glow-pink" : "text-destructive"
                                  )}>
                                    {auction.isSold ? 'SOLD' : 'UNSOLD'}
                                  </h2>
                                  
                                  <h3 className="text-3xl lg:text-5xl font-headline text-white uppercase tracking-widest border-y border-primary/20 py-6 my-6">
                                    {currentPlayer.playerName}
                                  </h3>
                                  
                                  {auction.isSold && (
                                    <div className="flex items-center justify-center gap-6">
                                      <span className="text-7xl lg:text-9xl font-mono font-black text-white">{auction.currentBid}L</span>
                                    </div>
                                  )}
                                </motion.div>

                                <Button 
                                  onClick={handleNextLot} 
                                  className="mt-12 h-16 px-16 text-xl font-headline font-black uppercase tracking-widest bg-primary hover:bg-primary/80 transition-all"
                                >
                                  Call Next Lot
                                </Button>
                            </motion.div>
                        )}

                        {/* Hammer Step Header */}
                        {auction.hammerStep > 0 && auction.hammerStep < 4 && !auction.isSold && (
                            <motion.div 
                              initial={{ y: -100 }} 
                              animate={{ y: 0 }} 
                              className="absolute top-0 left-0 w-full bg-primary py-6 flex justify-center z-[105] shadow-2xl border-b-4 border-white/20"
                            >
                                <h2 className="text-3xl lg:text-5xl font-headline font-black uppercase tracking-widest text-primary-foreground">
                                    {steps[auction.hammerStep - 1].toUpperCase()}
                                </h2>
                            </motion.div>
                        )}

                        {/* Left Column: Player Visuals */}
                        <div className="w-[40%] h-full border-r border-primary/20 p-8 flex flex-col gap-6 bg-black/20">
                            <div className="w-full aspect-[3/4] relative bg-black/60 shadow-2xl overflow-hidden flex items-center justify-center group">
                                {currentPlayer.imageUrl ? (
                                  <Image 
                                    src={currentPlayer.imageUrl} 
                                    alt={currentPlayer.playerName} 
                                    fill 
                                    className="object-contain p-4 group-hover:scale-105 transition-transform duration-1000" 
                                    priority
                                  />
                                ) : (
                                  <Shield className="w-full h-full p-24 opacity-5 text-primary" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                                <div className="absolute top-4 left-4">
                                  <Badge className="bg-primary text-primary-foreground font-black text-lg px-3 py-0">#{currentPlayer.playerNumber}</Badge>
                                </div>
                            </div>
                            <div className="flex-1 bg-black/40 p-6 border-l-2 border-primary/40">
                                <span className="text-[10px] text-primary font-bold uppercase tracking-widest block mb-2">Floor Insights //</span>
                                <p className="text-[12px] text-white/70 leading-relaxed font-sans pr-2">
                                  {currentPlayer.auctionInsight || 'High-value asset identified for this session lot.'}
                                </p>
                            </div>
                        </div>

                        {/* Right Column: Player Details & Bidding */}
                        <div className="flex-1 p-12 flex flex-col justify-between bg-black/40">
                            <div>
                                <div className="flex items-center gap-3 mb-6">
                                  <span className="font-headline text-[10px] text-primary font-bold uppercase tracking-widest border-l-2 border-primary pl-4">Live Lot Active</span>
                                  {auction.currentBid >= MARQUEE_THRESHOLD && <Badge className="bg-primary text-primary-foreground animate-pulse text-[9px]">MARQUEE ASSET</Badge>}
                                </div>
                                <h1 className="text-5xl lg:text-7xl font-headline font-black text-white tracking-tighter mb-12 drop-shadow-2xl leading-none">
                                  {currentPlayer.playerName}
                                </h1>
                                <div className="grid grid-cols-2 gap-x-8 gap-y-10">
                                    {[
                                        { label: 'Role', value: currentPlayer.specialism },
                                        { label: 'Status', value: currentPlayer.cua },
                                        { label: 'Points', value: `${currentPlayer.points} PTS` },
                                        { label: 'Country', value: currentPlayer.country },
                                    ].map((s, i) => (
                                        <div key={i} className="relative">
                                            <span className="text-[9px] text-primary font-bold uppercase tracking-widest block mb-2">{s.label}</span>
                                            <span className="text-xl lg:text-2xl font-headline font-bold text-white uppercase truncate block">{s.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Bidding & Timer Block */}
                            <div className="bg-black/60 border border-primary/40 p-8 flex items-center justify-between shadow-2xl relative overflow-hidden">
                                {/* Countdown Timer */}
                                {isTimerActive && (
                                    <div className="absolute right-0 top-0 bottom-0 w-24 bg-primary flex flex-col items-center justify-center">
                                        <Timer size={20} className="text-primary-foreground mb-1" />
                                        <span className={cn(
                                          "text-3xl font-mono font-black", 
                                          timer <= 5 ? "text-white animate-pulse" : "text-primary-foreground"
                                        )}>
                                          {timer}
                                        </span>
                                    </div>
                                )}
                                
                                <div className="z-10 flex-1 pr-24">
                                    <span className="text-[10px] text-primary font-bold uppercase tracking-widest block mb-2">Current Valuation //</span>
                                    <div className="flex items-baseline gap-4">
                                        <span className="text-6xl lg:text-8xl font-mono font-black text-white tracking-tighter leading-none">
                                          {auction.currentBid}
                                        </span>
                                        <span className="text-2xl lg:text-4xl font-headline text-primary font-black">LAKH</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      className="flex flex-col items-center gap-12"
                    >
                        <Zap size={100} className="text-primary animate-pulse" />
                        <div className="space-y-4 text-center">
                          <h1 className="text-6xl lg:text-8xl font-headline font-black text-primary uppercase tracking-tighter italic">
                            READY FOR DRAW
                          </h1>
                          <p className="text-lg font-headline text-white/40 tracking-widest uppercase">System Standby // Awaiting Floor Signal</p>
                        </div>
                        <Button 
                          onClick={handleDrawPlayer} 
                          className="h-20 px-20 text-2xl font-headline font-black uppercase tracking-widest bg-primary hover:bg-primary/80 transition-all shadow-[0_0_50px_rgba(255,70,85,0.3)]"
                        >
                          Access Next Lot
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
      </div>

      {/* Control Footer */}
      <footer className="w-full bg-black/80 border-t border-primary/20 p-6 z-[100] backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex gap-4">
            {currentPlayer && !auction.isSold && !auction.isUnsold ? (
                <>
                    <Button 
                      onClick={handleIncreaseBid} 
                      className="h-16 flex-1 text-xl font-headline font-black tracking-widest uppercase bg-primary hover:bg-primary/90"
                    >
                      + Raise Valuation
                    </Button>
                    <Button 
                      onClick={handleHammerCall} 
                      disabled={auction.hammerStep > 0} 
                      className={cn(
                        "h-16 px-16 font-headline font-black tracking-widest uppercase text-xl",
                        auction.hammerStep > 0 ? "bg-accent" : "bg-white text-black hover:bg-white/90"
                      )}
                    >
                        {auction.hammerStep === 0 ? 'START HAMMER' : steps[auction.hammerStep-1]}
                    </Button>
                    <Button 
                      onClick={handleUnsold} 
                      variant="destructive" 
                      className="h-16 px-16 font-headline font-black tracking-widest uppercase text-xl"
                    >
                      MARK UNSOLD
                    </Button>
                </>
            ) : (
                <Button 
                  onClick={handleDrawPlayer} 
                  disabled={auction.status === 'drawing'} 
                  className="h-16 w-full text-xl font-headline font-black uppercase tracking-widest bg-primary"
                >
                    {auction.status === 'drawing' ? 'Syncing Lot...' : `Reveal Next Lot (${undrawnIds.length} Remaining)`}
                </Button>
            )}
        </div>
      </footer>
      
      <style jsx global>{`
        .text-glow-pink { 
          text-shadow: 0 0 20px rgba(255, 70, 85, 0.7), 0 0 50px rgba(255, 70, 85, 0.4); 
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--primary) / 0.3); }
      `}</style>
    </div>
  );
}