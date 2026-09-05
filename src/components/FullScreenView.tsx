'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { X, Trophy, Gavel, Undo2, RotateCcw, Shield, Loader2, Sparkles, Award } from 'lucide-react';
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
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#1a0202] z-[200]">
            <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
            <h2 className="text-primary font-serif uppercase tracking-[0.4em] italic text-xl">Connecting Floor...</h2>
        </div>
    );
  }

  const steps = ['Going Once', 'Going Twice', 'Final Call'];

  return (
    <div className="fixed inset-0 flex flex-col items-center bg-background sunburst-bg select-none overflow-hidden h-screen text-foreground">
      {/* HUD Header */}
      <div className="w-full flex items-center justify-between px-6 py-4 z-[100] bg-black/80 backdrop-blur-md border-b border-primary/20">
        <div className="flex items-center gap-4">
            <Trophy className="h-6 w-6 text-primary" />
            <h2 className="font-serif text-[10px] text-primary tracking-[0.4em] uppercase font-black">IPL AUCTION HUB • SESSION MODERATOR</h2>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setIsHistoryOpen(!isHistoryOpen)} className={cn("h-8 px-4 text-[9px] font-black uppercase tracking-widest rounded border transition-all", isHistoryOpen ? "bg-primary text-primary-foreground border-primary" : "bg-black/40 border-primary/20 text-primary")}>Official Ledger</button>
            <button onClick={handleUndo} className="h-8 px-3 bg-black/40 border border-primary/20 text-primary rounded hover:bg-primary/10"><Undo2 size={14} /></button>
            <button onClick={handleHardReset} className="h-8 px-3 bg-black/40 border border-primary/20 text-destructive rounded hover:bg-destructive/10"><RotateCcw size={14} /></button>
            <button onClick={() => router.push('/')} className="h-8 w-8 bg-black/40 border border-primary/20 text-primary rounded flex items-center justify-center hover:bg-primary/10"><X size={18} /></button>
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
                className="w-80 bg-black/98 border-r border-primary/20 h-full p-6 z-[90] flex flex-col shadow-2xl"
              >
                  <h3 className="text-primary font-serif uppercase tracking-[0.3em] text-[12px] font-black mb-6 flex items-center gap-2">
                    <Award size={14} /> Global Floor Log
                  </h3>
                  <ScrollArea className="flex-1">
                      <div className="space-y-3 pr-4">
                          {auction.history.slice().reverse().map((p, i) => (
                              <div key={i} className="bg-white/5 border border-primary/10 p-4 rounded relative overflow-hidden group hover:border-primary/30 transition-colors">
                                  <div className={cn("absolute left-0 top-0 bottom-0 w-1 transition-all group-hover:w-1.5", p.type === 'sold' ? "bg-primary" : "bg-destructive")} />
                                  <p className="text-[11px] font-black text-white uppercase truncate">{players.find(pl => pl.id === p.playerId)?.playerName}</p>
                                  <div className="flex justify-between mt-2">
                                      <span className={cn("text-[9px] font-black uppercase tracking-tighter", p.type === 'sold' ? "text-primary" : "text-destructive")}>{p.type === 'sold' ? 'SOLD' : 'UNSOLD'}</span>
                                      {p.bid && <span className="text-[11px] font-mono font-black text-primary">{p.bid}L</span>}
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
                      initial={{ opacity: 0, scale: 0.98, y: 10 }} 
                      animate={{ opacity: 1, scale: 1, y: 0 }} 
                      className={cn(
                        "w-full max-w-6xl aspect-[16/9] ornate-border bg-[#0d0101]/98 shadow-[0_0_80px_rgba(0,0,0,0.9)] flex overflow-hidden relative", 
                        auction.currentBid >= MARQUEE_THRESHOLD && "border-primary shadow-[0_0_120px_rgba(255,215,0,0.2)]"
                      )}
                    >
                        {/* Sold/Unsold Cinematic Overlay */}
                        {(auction.isSold || auction.isUnsold) && (
                            <motion.div 
                              initial={{ opacity: 0, backdropFilter: "blur(0px)" }} 
                              animate={{ opacity: 1, backdropFilter: "blur(12px)" }} 
                              className="absolute inset-0 z-[110] flex flex-col items-center justify-center bg-black/95 p-12 text-center"
                            >
                                <motion.div 
                                  initial={{ scale: 0.8, opacity: 0, y: 20 }}
                                  animate={{ scale: 1, opacity: 1, y: 0 }}
                                  transition={{ type: "spring", damping: 15 }}
                                  className={cn(
                                    "p-12 border-8 ornate-border bg-[#120101]/60 max-w-3xl w-full relative",
                                    auction.isSold ? "border-primary shadow-[0_0_100px_rgba(255,215,0,0.5)]" : "border-destructive shadow-[0_0_100px_rgba(255,0,0,0.4)]"
                                  )}
                                >
                                  <div className="absolute top-6 right-6 opacity-30">
                                    {auction.isSold ? <Award size={100} className="text-primary" /> : <Shield size={100} className="text-destructive" />}
                                  </div>
                                  
                                  <motion.div
                                    animate={auction.isSold ? { rotate: [0, -2, 2, -2, 0], scale: [1, 1.05, 1] } : {}}
                                    transition={{ repeat: Infinity, duration: 3 }}
                                  >
                                    <Gavel size={100} className={cn("mx-auto mb-6", auction.isSold ? "text-primary drop-shadow-[0_0_20px_rgba(255,215,0,0.6)]" : "text-destructive")} />
                                  </motion.div>
                                  
                                  <h2 className={cn(
                                    "text-7xl lg:text-8xl font-serif font-black uppercase italic tracking-tighter leading-none mb-4", 
                                    auction.isSold ? "text-primary text-glow-gold" : "text-destructive"
                                  )}>
                                    {auction.isSold ? 'SOLD' : 'UNSOLD'}
                                  </h2>
                                  
                                  <h3 className="text-4xl lg:text-5xl font-serif text-white uppercase tracking-[0.3em] border-y border-primary/20 py-6 my-6 italic">
                                    {currentPlayer.playerName}
                                  </h3>
                                  
                                  {auction.isSold && (
                                    <motion.div 
                                      initial={{ scale: 0.9, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      className="flex items-center justify-center gap-6"
                                    >
                                      <Sparkles className="text-primary w-10 h-10 animate-pulse" />
                                      <span className="text-7xl lg:text-8xl font-mono font-black text-white drop-shadow-2xl">{auction.currentBid}L</span>
                                      <Sparkles className="text-primary w-10 h-10 animate-pulse" />
                                    </motion.div>
                                  )}
                                </motion.div>

                                <Button 
                                  onClick={handleNextLot} 
                                  className="mt-12 h-20 px-24 text-2xl font-serif font-black uppercase tracking-[0.2em] shadow-[0_0_40px_rgba(255,215,0,0.2)] hover:scale-105 transition-transform"
                                >
                                  Call Next Lot
                                </Button>
                            </motion.div>
                        )}

                        {/* Hammer Step Header */}
                        {auction.hammerStep > 0 && auction.hammerStep < 4 && !auction.isSold && (
                            <motion.div 
                              initial={{ y: -100, opacity: 0 }} 
                              animate={{ y: 0, opacity: 1 }} 
                              exit={{ y: -100, opacity: 0 }}
                              className="absolute top-0 left-0 w-full bg-primary/98 backdrop-blur-md py-6 flex justify-center z-[105] shadow-2xl border-b-4 border-white/20"
                            >
                                <h2 className="text-3xl lg:text-5xl font-serif font-black uppercase italic tracking-[0.6em] text-primary-foreground drop-shadow-xl">
                                    {steps[auction.hammerStep - 1].toUpperCase()}
                                </h2>
                            </motion.div>
                        )}

                        {/* Left Column: Player Visuals */}
                        <div className="w-[42%] h-full border-r border-primary/20 p-8 flex flex-col gap-6 bg-black/40 relative">
                            <div className="w-full aspect-[3/4] relative ornate-border bg-[#080101] shadow-2xl overflow-hidden flex items-center justify-center group">
                                {currentPlayer.imageUrl ? (
                                  <Image 
                                    src={currentPlayer.imageUrl} 
                                    alt={currentPlayer.playerName} 
                                    fill 
                                    className="object-contain p-4 group-hover:scale-105 transition-transform duration-700" 
                                    priority
                                  />
                                ) : (
                                  <Shield className="w-full h-full p-24 opacity-5 text-primary" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                                  <Badge className="bg-primary text-primary-foreground font-black text-xl px-4 py-1 shadow-2xl border border-white/20">#{currentPlayer.playerNumber}</Badge>
                                </div>
                            </div>
                            <div className="flex-1 bg-[#120101]/80 p-6 border border-primary/10 shadow-inner rounded-sm relative group">
                                <span className="text-[10px] text-primary font-black uppercase tracking-[0.4em] block mb-3 border-b border-primary/20 pb-2">Floor Insights</span>
                                <p className="text-[12px] italic text-white/70 leading-relaxed max-h-[140px] overflow-y-auto custom-scrollbar font-sans pr-2">
                                  {currentPlayer.auctionInsight || 'Official data analytics pending. High-value asset identified for this session lot.'}
                                </p>
                            </div>
                        </div>

                        {/* Right Column: Player Details & Bidding */}
                        <div className="flex-1 p-10 flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#120101] via-black to-[#0a0000]">
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                  <span className="font-serif text-[10px] text-primary font-black uppercase tracking-[0.5em] border-l-4 border-primary pl-4">Lot {currentPlayer.playerNumber} Active</span>
                                  {auction.currentBid >= MARQUEE_THRESHOLD && <Badge className="bg-primary text-primary-foreground animate-pulse text-[9px] px-3">MARQUEE ASSET</Badge>}
                                </div>
                                <h1 className="text-5xl lg:text-6xl font-serif font-black text-white italic tracking-tighter mb-10 drop-shadow-2xl leading-[1.1]">
                                  {currentPlayer.playerName}
                                </h1>
                                <div className="grid grid-cols-2 gap-x-10 gap-y-8">
                                    {[
                                        { label: 'Role', value: currentPlayer.specialism },
                                        { label: 'Class', value: currentPlayer.cua },
                                        { label: 'Valuation', value: `${currentPlayer.points} PTS` },
                                        { label: 'Origin', value: currentPlayer.country },
                                    ].map((s, i) => (
                                        <div key={i} className="relative pl-6">
                                            <div className="absolute left-0 top-1 bottom-1 w-1 bg-primary/30" />
                                            <span className="text-[10px] text-primary font-black uppercase tracking-[0.4em] block mb-2">{s.label}</span>
                                            <span className="text-xl lg:text-2xl font-serif font-bold text-white tracking-wide uppercase truncate block">{s.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Bidding & Timer Block */}
                            <div className="bg-black/80 border-2 border-primary/40 p-8 flex items-center justify-between shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative group overflow-visible">
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-[80px] -z-10 group-hover:bg-primary/20 transition-all" />
                                
                                {/* Countdown Timer - Optimized Position */}
                                {isTimerActive && (
                                    <motion.div 
                                      initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
                                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                      className="absolute -top-6 right-6 w-20 h-20 rounded-full bg-[#120101] border-4 border-primary shadow-[0_0_30px_rgba(255,215,0,0.4)] flex items-center justify-center z-[110]"
                                    >
                                        <span className={cn(
                                          "text-3xl font-mono font-black", 
                                          timer <= 5 ? "text-red-600 animate-pulse scale-125" : "text-primary"
                                        )}>
                                          {timer}
                                        </span>
                                    </motion.div>
                                )}
                                
                                <div className="z-10 flex-1">
                                    <span className="text-[12px] text-primary font-black uppercase tracking-[0.8em] block mb-2">Live Floor Valuation</span>
                                    <div className="flex items-baseline gap-6 overflow-hidden">
                                        <motion.span 
                                          key={auction.currentBid}
                                          initial={{ scale: 1.1, y: -10 }}
                                          animate={{ scale: 1, y: 0 }}
                                          className="text-6xl lg:text-8xl font-mono font-black text-white tracking-tighter leading-none"
                                        >
                                          {auction.currentBid}
                                        </motion.span>
                                        <span className="text-3xl lg:text-5xl font-serif text-primary italic font-black">LAKH</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      className="flex flex-col items-center gap-12"
                    >
                        <div className="relative">
                          <Trophy size={120} className="text-primary animate-pulse" />
                          <div className="absolute inset-0 bg-primary/20 blur-[120px] -z-10" />
                        </div>
                        <div className="space-y-4 text-center">
                          <h1 className="text-5xl lg:text-7xl font-serif font-black text-primary uppercase tracking-[0.4em] italic leading-none drop-shadow-2xl">
                            Floor Ready
                          </h1>
                          <p className="text-lg font-serif text-white/40 tracking-[0.6em] uppercase">Awaiting Floor Signal for Next Lot</p>
                        </div>
                        <Button 
                          onClick={handleDrawPlayer} 
                          className="h-20 lg:h-24 px-20 text-2xl font-serif font-black uppercase tracking-[0.3em] shadow-[0_0_60px_rgba(255,215,0,0.2)] hover:scale-105 transition-transform"
                        >
                          Access Next Lot
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
      </div>

      {/* Control Footer */}
      <footer className="w-full bg-black border-t-2 border-primary/40 p-6 z-[100] shadow-[0_-15px_60px_rgba(0,0,0,0.95)]">
        <div className="max-w-7xl mx-auto flex gap-6">
            {currentPlayer && !auction.isSold && !auction.isUnsold ? (
                <>
                    <Button 
                      onClick={handleIncreaseBid} 
                      className="h-16 lg:h-20 flex-1 text-lg lg:text-xl font-serif font-black tracking-[0.2em] uppercase shadow-2xl hover:bg-primary/90 transition-all"
                    >
                      + Raise Valuation
                    </Button>
                    <Button 
                      onClick={handleHammerCall} 
                      disabled={auction.hammerStep > 0} 
                      className={cn(
                        "h-16 lg:h-20 px-10 lg:px-20 font-serif font-black tracking-[0.2em] uppercase text-lg lg:text-xl transition-all",
                        auction.hammerStep > 0 ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
                      )}
                    >
                        {auction.hammerStep === 0 ? 'START HAMMER' : steps[auction.hammerStep-1].toUpperCase()}
                    </Button>
                    <Button 
                      onClick={handleUnsold} 
                      variant="destructive" 
                      className="h-16 lg:h-20 px-10 lg:px-20 font-serif font-black tracking-[0.2em] uppercase text-lg lg:text-xl"
                    >
                      MARK UNSOLD
                    </Button>
                </>
            ) : (
                <Button 
                  onClick={handleDrawPlayer} 
                  disabled={auction.status === 'drawing'} 
                  className="h-16 lg:h-20 w-full text-lg lg:text-xl font-serif font-black uppercase tracking-[0.4em] shadow-[0_0_60px_rgba(255,215,0,0.1)] px-4"
                >
                    <span className="truncate">
                        {auction.status === 'drawing' ? 'Syncing Official Lot...' : `REVEAL NEXT PLAYER LOT (${undrawnIds.length} REMAINING)`}
                    </span>
                </Button>
            )}
        </div>
      </footer>
      
      <style jsx global>{`
        .text-glow-gold { 
          text-shadow: 0 0 20px rgba(255, 215, 0, 0.7), 0 0 50px rgba(255, 215, 0, 0.4), 0 0 100px rgba(255, 215, 0, 0.2); 
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--primary) / 0.3); border-radius: 10px; }
      `}</style>
    </div>
  );
}
