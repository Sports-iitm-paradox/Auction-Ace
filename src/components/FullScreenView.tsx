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
    audio.volume = 0.3;
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
                if (prev <= 5 && prev > 0) playSound('tick');
                return prev - 1;
            });
        }, 1000);
    } else if (timer === 0 && isTimerActive) {
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
    }, 600);
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
              confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ['#f14690', '#90afd2', '#f8eadd'] });
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
    if (!auctionRef || !confirm("CRITICAL: Wipe global auction ledger?")) return;
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
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h2 className="text-primary font-headline uppercase tracking-widest text-sm">Initializing Floor...</h2>
        </div>
    );
  }

  const steps = ['Going Once', 'Going Twice', 'Final Call'];

  return (
    <div className="fixed inset-0 flex flex-col items-center bg-background cyber-grid select-none overflow-hidden h-screen text-foreground">
      {/* HUD Header */}
      <div className="w-full flex items-center justify-between px-6 py-4 z-[100] bg-black/60 backdrop-blur-xl border-b border-primary/20 shadow-2xl">
        <div className="flex items-center gap-4">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="font-headline text-[11px] text-primary tracking-[0.3em] uppercase">IPL AUCTION HUB // MODERATOR SYSTEM</h2>
        </div>
        <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setIsHistoryOpen(!isHistoryOpen)} className={cn("h-8 text-[10px] uppercase tracking-widest border-primary/20", isHistoryOpen && "bg-primary text-primary-foreground")}>Ledger</Button>
            <div className="h-4 w-px bg-primary/20 mx-1" />
            <Button variant="outline" size="sm" onClick={handleUndo} className="h-8 w-8 p-0 border-primary/20 hover:text-primary"><Undo2 size={14} /></Button>
            <Button variant="outline" size="sm" onClick={handleHardReset} className="h-8 w-8 p-0 border-destructive/20 text-destructive hover:bg-destructive/10"><RotateCcw size={14} /></Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/')} className="h-8 w-8 p-0 border-primary/20"><X size={16} /></Button>
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
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="w-80 bg-black/95 border-r border-primary/20 h-full p-8 z-[90] flex flex-col shadow-2xl"
              >
                  <h3 className="text-primary font-headline uppercase tracking-[0.4em] text-[12px] mb-8 flex items-center gap-3">
                    <Award size={16} /> Transaction Log
                  </h3>
                  <ScrollArea className="flex-1 -mr-4 pr-4">
                      <div className="space-y-3">
                          {auction.history.slice().reverse().map((p, i) => (
                              <div key={i} className="bg-white/[0.02] border border-white/[0.05] p-4 relative overflow-hidden group hover:border-primary/40 transition-all duration-300">
                                  <div className={cn("absolute left-0 top-0 bottom-0 w-1", p.type === 'sold' ? "bg-primary" : "bg-destructive")} />
                                  <p className="text-[11px] font-black text-white uppercase truncate mb-2">{players.find(pl => pl.id === p.playerId)?.playerName}</p>
                                  <div className="flex justify-between items-center">
                                      <span className={cn("text-[9px] font-black uppercase tracking-widest", p.type === 'sold' ? "text-primary" : "text-destructive")}>{p.type === 'sold' ? 'SOLD' : 'UNSOLD'}</span>
                                      {p.bid && <span className="text-[12px] font-mono font-black text-secondary">{p.bid}L</span>}
                                  </div>
                              </div>
                          ))}
                          {auction.history.length === 0 && (
                            <div className="text-center py-20 opacity-20 italic text-[10px] uppercase tracking-widest">Awaiting Floor Action</div>
                          )}
                      </div>
                  </ScrollArea>
              </motion.aside>
          )}
        </AnimatePresence>

        <main className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
            <AnimatePresence mode="wait">
                {auction.status !== 'drawing' && currentPlayer ? (
                    <motion.div 
                      key={currentPlayer.id}
                      initial={{ opacity: 0, scale: 0.96, filter: 'blur(10px)' }} 
                      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} 
                      className={cn(
                        "w-full max-w-6xl aspect-[16/9] cyber-border shadow-[0_0_100px_rgba(0,0,0,0.8)] flex overflow-hidden relative", 
                        auction.currentBid >= MARQUEE_THRESHOLD && "border-primary shadow-[0_0_120px_rgba(241,70,144,0.15)]"
                      )}
                    >
                        {/* Sold/Unsold Cinematic Overlay */}
                        {(auction.isSold || auction.isUnsold) && (
                            <motion.div 
                              initial={{ opacity: 0, backdropFilter: 'blur(0px)' }} 
                              animate={{ opacity: 1, backdropFilter: 'blur(20px)' }} 
                              className="absolute inset-0 z-[110] flex flex-col items-center justify-center bg-background/95 p-12 text-center"
                            >
                                <motion.div 
                                  initial={{ scale: 0.9, opacity: 0, y: 40 }}
                                  animate={{ scale: 1, opacity: 1, y: 0 }}
                                  className={cn(
                                    "p-14 cyber-border max-w-3xl w-full relative bg-black/60",
                                    auction.isSold ? "border-primary shadow-[0_0_120px_rgba(241,70,144,0.4)]" : "border-destructive shadow-[0_0_120px_rgba(255,0,0,0.3)]"
                                  )}
                                >
                                  <div className="absolute top-8 right-8 opacity-20">
                                    {auction.isSold ? <Award size={120} className="text-primary" /> : <Shield size={120} className="text-destructive" />}
                                  </div>
                                  
                                  <Gavel size={100} className={cn("mx-auto mb-8", auction.isSold ? "text-primary animate-pulse" : "text-destructive")} />
                                  
                                  <h2 className={cn(
                                    "text-8xl lg:text-9xl font-headline font-black uppercase tracking-tighter leading-none mb-6", 
                                    auction.isSold ? "text-primary text-glow-primary" : "text-destructive"
                                  )}>
                                    {auction.isSold ? 'SOLD' : 'UNSOLD'}
                                  </h2>
                                  
                                  <h3 className="text-4xl lg:text-6xl font-headline text-white uppercase tracking-[0.2em] border-y border-white/10 py-8 my-8 bg-white/[0.02]">
                                    {currentPlayer.playerName}
                                  </h3>
                                  
                                  {auction.isSold && (
                                    <div className="flex items-center justify-center gap-8">
                                      <span className="text-8xl lg:text-9xl font-mono font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">{auction.currentBid}L</span>
                                    </div>
                                  )}
                                </motion.div>

                                <Button 
                                  onClick={handleNextLot} 
                                  className="mt-16 h-20 px-20 text-2xl font-headline font-black uppercase tracking-[0.4em] bg-primary hover:bg-primary/80 transition-all shadow-[0_0_40px_rgba(241,70,144,0.3)]"
                                >
                                  Next Lot Incoming
                                </Button>
                            </motion.div>
                        )}

                        {/* Hammer Step Header */}
                        {auction.hammerStep > 0 && auction.hammerStep < 4 && !auction.isSold && (
                            <motion.div 
                              initial={{ y: -120 }} 
                              animate={{ y: 0 }} 
                              className="absolute top-0 left-0 w-full bg-primary py-8 flex justify-center z-[105] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-b-2 border-white/20"
                            >
                                <h2 className="text-4xl lg:text-6xl font-headline font-black uppercase tracking-[0.8em] text-primary-foreground drop-shadow-2xl">
                                    {steps[auction.hammerStep - 1].toUpperCase()}
                                </h2>
                            </motion.div>
                        )}

                        {/* Left Column: Player Visuals */}
                        <div className="w-[42%] h-full border-r border-primary/20 p-10 flex flex-col gap-8 bg-black/40">
                            <div className="w-full aspect-[3/4] relative bg-black/80 shadow-[inset_0_0_60px_rgba(0,0,0,1)] overflow-hidden flex items-center justify-center group border border-white/5">
                                {currentPlayer.imageUrl ? (
                                  <Image 
                                    src={currentPlayer.imageUrl} 
                                    alt={currentPlayer.playerName} 
                                    fill 
                                    className="object-contain p-6 transition-transform duration-700 group-hover:scale-105" 
                                    priority
                                  />
                                ) : (
                                  <Shield className="w-full h-full p-32 opacity-5 text-primary" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                                <div className="absolute top-6 left-6">
                                  <Badge className="bg-primary text-primary-foreground font-black text-xl px-4 py-1 shadow-2xl border border-white/20">LOT #{currentPlayer.playerNumber}</Badge>
                                </div>
                            </div>
                            <div className="flex-1 bg-white/[0.02] p-8 border-l-4 border-primary shadow-2xl">
                                <span className="text-[11px] text-primary font-black uppercase tracking-[0.5em] block mb-4 underline underline-offset-8">Floor Scouting Report</span>
                                <p className="text-[13px] text-secondary/80 leading-relaxed font-sans font-medium italic pr-4">
                                  {currentPlayer.auctionInsight || 'Strategic asset identified with high performance metrics for current squad requirements.'}
                                </p>
                            </div>
                        </div>

                        {/* Right Column: Player Details & Bidding */}
                        <div className="flex-1 p-14 flex flex-col justify-between bg-gradient-to-br from-black/20 to-primary/5">
                            <div>
                                <div className="flex items-center gap-4 mb-8">
                                  <span className="font-headline text-[10px] text-primary font-black uppercase tracking-[0.6em] border-l-4 border-primary pl-5">Auction Floor Active</span>
                                  {auction.currentBid >= MARQUEE_THRESHOLD && <Badge className="bg-primary text-primary-foreground animate-pulse text-[10px] px-3">MARQUEE STATUS</Badge>}
                                </div>
                                <h1 className="text-6xl lg:text-[6.5rem] font-headline font-black text-white tracking-tighter mb-16 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] leading-none">
                                  {currentPlayer.playerName}
                                </h1>
                                <div className="grid grid-cols-2 gap-x-12 gap-y-12">
                                    {[
                                        { label: 'Specialism', value: currentPlayer.specialism },
                                        { label: 'Category', value: currentPlayer.cua },
                                        { label: 'Valuation', value: `${currentPlayer.points} PTS` },
                                        { label: 'Country', value: currentPlayer.country },
                                    ].map((s, i) => (
                                        <div key={i} className="relative">
                                            <span className="text-[10px] text-primary font-black uppercase tracking-[0.4em] block mb-3 opacity-80">{s.label}</span>
                                            <span className="text-2xl lg:text-3xl font-headline font-bold text-white uppercase tracking-wider block truncate">{s.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Bidding & Timer Block */}
                            <div className="bg-black/60 border border-primary/30 p-10 flex items-center justify-between shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                
                                {/* Countdown Timer */}
                                {isTimerActive && (
                                    <div className="absolute right-0 top-0 bottom-0 w-28 bg-primary flex flex-col items-center justify-center shadow-[-10px_0_30px_rgba(0,0,0,0.3)]">
                                        <Timer size={24} className="text-primary-foreground mb-2" />
                                        <span className={cn(
                                          "text-4xl font-mono font-black", 
                                          timer <= 5 ? "text-white animate-pulse scale-110" : "text-primary-foreground"
                                        )}>
                                          {timer}
                                        </span>
                                    </div>
                                )}
                                
                                <div className="z-10 flex-1 pr-32">
                                    <span className="text-[12px] text-primary font-black uppercase tracking-[0.8em] block mb-3">Live Valuation //</span>
                                    <div className="flex items-baseline gap-6">
                                        <motion.span 
                                          key={auction.currentBid}
                                          initial={{ y: -10, opacity: 0 }}
                                          animate={{ y: 0, opacity: 1 }}
                                          className="text-7xl lg:text-[7rem] font-mono font-black text-white tracking-tighter leading-none text-glow-primary"
                                        >
                                          {auction.currentBid}
                                        </motion.span>
                                        <span className="text-3xl lg:text-5xl font-headline text-primary font-black italic">LAKH</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                      initial={{ opacity: 0, y: 30 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      className="flex flex-col items-center gap-16"
                    >
                        <div className="relative">
                            <Zap size={140} className="text-primary animate-pulse relative z-10 drop-shadow-[0_0_30px_rgba(241,70,144,0.5)]" />
                            <div className="absolute inset-0 bg-primary/20 blur-[60px] rounded-full animate-ping" />
                        </div>
                        <div className="space-y-6 text-center">
                          <h1 className="text-7xl lg:text-9xl font-headline font-black text-white uppercase tracking-tighter italic">
                            Floor Standby
                          </h1>
                          <p className="text-xl font-headline text-primary tracking-[1em] uppercase animate-pulse">Awaiting Signal // Lot Synchronization</p>
                        </div>
                        <Button 
                          onClick={handleDrawPlayer} 
                          className="h-24 px-24 text-3xl font-headline font-black uppercase tracking-[0.5em] bg-primary hover:bg-primary/80 transition-all shadow-[0_0_60px_rgba(241,70,144,0.3)] hover:scale-105 active:scale-95"
                        >
                          Reveal Next Lot
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
      </div>

      {/* Control Footer */}
      <footer className="w-full bg-black/90 border-t border-primary/20 p-8 z-[100] backdrop-blur-2xl shadow-[0_-20px_50px_rgba(0,0,0,0.8)]">
        <div className="max-w-7xl mx-auto flex gap-6">
            {currentPlayer && !auction.isSold && !auction.isUnsold ? (
                <>
                    <Button 
                      onClick={handleIncreaseBid} 
                      className="h-20 flex-1 text-2xl font-headline font-black tracking-[0.4em] uppercase bg-primary hover:bg-primary/90 transition-all border-b-4 border-black/20"
                    >
                      + Raise Bid
                    </Button>
                    <Button 
                      onClick={handleHammerCall} 
                      disabled={auction.hammerStep > 0} 
                      className={cn(
                        "h-20 px-24 font-headline font-black tracking-[0.4em] uppercase text-2xl transition-all border-b-4 border-black/20",
                        auction.hammerStep > 0 ? "bg-muted text-primary cursor-wait" : "bg-white text-black hover:bg-white/90"
                      )}
                    >
                        {auction.hammerStep === 0 ? 'Start Hammer' : steps[auction.hammerStep-1]}
                    </Button>
                    <Button 
                      onClick={handleUnsold} 
                      variant="destructive" 
                      className="h-20 px-20 font-headline font-black tracking-[0.4em] uppercase text-2xl transition-all border-b-4 border-black/20"
                    >
                      Unsold
                    </Button>
                </>
            ) : (
                <Button 
                  onClick={handleDrawPlayer} 
                  disabled={auction.status === 'drawing'} 
                  className="h-20 w-full text-2xl font-headline font-black uppercase tracking-[0.5em] bg-primary transition-all border-b-4 border-black/20"
                >
                    {auction.status === 'drawing' ? 'Synchronizing Lot...' : `Access Next Lot (${undrawnIds.length} Available)`}
                </Button>
            )}
        </div>
      </footer>
      
      <style jsx global>{`
        .text-glow-primary { 
          text-shadow: 0 0 25px rgba(241, 70, 144, 0.8), 0 0 60px rgba(241, 70, 144, 0.4); 
        }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--primary) / 0.4); border-radius: 10px; }
      `}</style>
    </div>
  );
}