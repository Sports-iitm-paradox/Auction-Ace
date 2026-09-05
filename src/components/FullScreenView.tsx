
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { X, Trophy, Gavel, Undo2, RotateCcw, Shield, Loader2 } from 'lucide-react';
import { Player, PlayerSet, ActiveAuctionState, ActionEvent } from '@/lib/player-data';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useFirestore, useUser, useDoc, useMemoFirebase, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp, DocumentReference } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';
import { ScrollArea } from "@/components/ui/scroll-area";

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
            if (auction.currentBid >= MARQUEE_THRESHOLD) confetti({ particleCount: 200, spread: 90 });
            
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
      <div className="w-full flex items-center justify-between px-6 py-4 z-[100] bg-black/60 backdrop-blur-md border-b border-primary/20">
        <div className="flex items-center gap-4">
            <Trophy className="h-6 w-6 text-primary" />
            <h2 className="font-serif text-[10px] text-primary tracking-[0.3em] uppercase font-bold">Session Moderator</h2>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setIsHistoryOpen(!isHistoryOpen)} className={cn("h-8 px-4 text-[9px] font-black uppercase tracking-widest rounded border transition-all", isHistoryOpen ? "bg-primary text-primary-foreground border-primary" : "bg-black/40 border-primary/20 text-primary")}>Official Ledger</button>
            <button onClick={handleUndo} className="h-8 px-3 bg-black/40 border border-primary/20 text-primary rounded"><Undo2 size={14} /></button>
            <button onClick={handleHardReset} className="h-8 px-3 bg-black/40 border border-primary/20 text-destructive rounded"><RotateCcw size={14} /></button>
            <button onClick={() => router.push('/')} className="h-8 w-8 bg-black/40 border border-primary/20 text-primary rounded flex items-center justify-center"><X size={18} /></button>
        </div>
      </div>

      <div className="flex flex-1 w-full relative overflow-hidden">
        {isHistoryOpen && (
            <aside className="w-80 bg-black/95 border-r border-primary/20 h-full p-6 z-[90] flex flex-col">
                <h3 className="text-primary font-serif uppercase tracking-[0.3em] text-[12px] font-black mb-6">Auction Ledger</h3>
                <ScrollArea className="flex-1">
                    <div className="space-y-3 pr-4">
                        {auction.history.slice().reverse().map((p, i) => (
                            <div key={i} className="bg-white/5 border border-primary/10 p-4 rounded relative overflow-hidden">
                                <div className={cn("absolute left-0 top-0 bottom-0 w-1", p.type === 'sold' ? "bg-primary" : "bg-destructive")} />
                                <p className="text-[11px] font-black text-white uppercase truncate">{players.find(pl => pl.id === p.playerId)?.playerName}</p>
                                <div className="flex justify-between mt-2">
                                    <span className="text-[9px] text-primary/60 font-black uppercase">{p.type === 'sold' ? 'SOLD' : 'UNSOLD'}</span>
                                    {p.bid && <span className="text-[11px] font-mono font-black text-primary">{p.bid}L</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </aside>
        )}

        <main className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
            <AnimatePresence mode="wait">
                {auction.status !== 'drawing' && currentPlayer ? (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={cn("w-full max-w-6xl aspect-[16/9] ornate-border bg-[#1a0202]/98 shadow-2xl flex overflow-hidden relative", auction.currentBid >= MARQUEE_THRESHOLD && "border-primary shadow-[0_0_100px_rgba(255,215,0,0.25)]")}>
                        
                        {(auction.isSold || auction.isUnsold) && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[110] flex flex-col items-center justify-center bg-black/98 p-12 text-center">
                                <Gavel size={100} className={cn("mb-8", auction.isSold ? "text-primary animate-bounce" : "text-destructive")} />
                                <h2 className={cn("text-6xl lg:text-9xl font-serif font-black uppercase italic tracking-tighter", auction.isSold ? "text-primary text-glow-gold" : "text-destructive")}>{auction.isSold ? 'SOLD' : 'UNSOLD'}</h2>
                                <h3 className="text-2xl lg:text-4xl font-serif text-white uppercase mt-6 tracking-[0.2em]">{currentPlayer.playerName}</h3>
                                {auction.isSold && <p className="text-5xl lg:text-8xl font-mono font-black text-primary mt-6">{auction.currentBid}L</p>}
                                <Button onClick={handleNextLot} className="mt-12 h-20 px-20 text-2xl font-serif font-black uppercase tracking-widest shadow-2xl">Reveal Next Lot</Button>
                            </motion.div>
                        )}

                        {auction.hammerStep > 0 && auction.hammerStep < 4 && !auction.isSold && (
                            <motion.div initial={{ y: -100 }} animate={{ y: 0 }} className="absolute top-0 left-0 w-full bg-primary py-6 flex justify-center z-[105] shadow-2xl">
                                <h2 className="text-3xl lg:text-5xl font-serif font-black uppercase italic tracking-[0.5em] text-primary-foreground">
                                    {steps[auction.hammerStep - 1].toUpperCase()}
                                </h2>
                            </motion.div>
                        )}

                        <div className="w-[40%] h-full border-r border-primary/20 p-8 flex flex-col gap-6">
                            <div className="w-full aspect-[3/4] relative ornate-border bg-black shadow-2xl overflow-hidden">
                                {currentPlayer.imageUrl ? <Image src={currentPlayer.imageUrl} alt="" fill className="object-cover" /> : <Shield className="w-full h-full p-24 opacity-10 text-primary" />}
                            </div>
                            <div className="flex-1 bg-black/40 p-6 border border-primary/10">
                                <span className="text-[10px] text-primary font-black uppercase tracking-widest block mb-4">Official scouting insight</span>
                                <p className="text-[12px] italic text-white/70 leading-relaxed max-h-[120px] overflow-y-auto custom-scrollbar">{currentPlayer.auctionInsight || 'Official Paradox verified data.'}</p>
                            </div>
                        </div>

                        <div className="flex-1 p-10 flex flex-col justify-between overflow-hidden">
                            <div>
                                <h1 className="text-4xl lg:text-7xl font-serif font-black text-white italic tracking-tighter mb-8 drop-shadow-2xl truncate">{currentPlayer.playerName}</h1>
                                <div className="grid grid-cols-2 gap-8">
                                    {[
                                        { label: 'Specialism', value: currentPlayer.specialism },
                                        { label: 'Status', value: currentPlayer.cua },
                                        { label: 'Rating', value: currentPlayer.points },
                                        { label: 'Origin', value: currentPlayer.country },
                                    ].map((s, i) => (
                                        <div key={i} className="border-l-4 border-primary/40 pl-6">
                                            <span className="text-[10px] text-primary font-black uppercase tracking-widest block mb-2">{s.label}</span>
                                            <span className="text-xl lg:text-3xl font-serif font-bold text-white">{s.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-black/60 border border-primary/20 p-8 flex items-center justify-between shadow-2xl relative">
                                {isTimerActive && (
                                    <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-[#1a0202] border-4 border-primary flex items-center justify-center z-[101]">
                                        <span className={cn("text-2xl font-mono font-black", timer <= 5 ? "text-destructive animate-pulse" : "text-primary")}>{timer}</span>
                                    </div>
                                )}
                                <div>
                                    <span className="text-[12px] text-primary font-black uppercase tracking-[0.8em] block mb-2">Live Floor Bid</span>
                                    <div className="flex items-baseline gap-4">
                                        <span className="text-6xl lg:text-[8rem] font-mono font-black text-white tracking-tighter leading-none">{auction.currentBid}</span>
                                        <span className="text-3xl lg:text-5xl font-serif text-primary italic font-black">L</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <div className="flex flex-col items-center gap-12">
                        <Trophy size={120} className="text-primary animate-pulse" />
                        <h1 className="text-4xl lg:text-7xl font-serif font-black text-primary uppercase tracking-[0.6em] text-center italic">Auction floor active</h1>
                        <Button onClick={handleDrawPlayer} className="h-24 px-24 text-2xl font-serif font-black uppercase tracking-widest shadow-2xl">Reveal First Lot</Button>
                    </div>
                )}
            </AnimatePresence>
        </main>
      </div>

      <footer className="w-full bg-black border-t-2 border-primary/40 p-6 z-50">
        <div className="max-w-7xl mx-auto flex gap-6">
            {currentPlayer && !auction.isSold && !auction.isUnsold ? (
                <>
                    <Button onClick={handleIncreaseBid} className="h-20 flex-1 text-2xl font-serif font-black tracking-widest uppercase shadow-2xl shadow-primary/20">+ Raise Bid</Button>
                    <Button onClick={handleHammerCall} disabled={auction.hammerStep > 0} className="h-20 px-12 bg-primary text-primary-foreground font-black tracking-widest uppercase hover:bg-primary/90 text-xl">
                        {auction.hammerStep === 0 ? 'Start Hammer' : steps[auction.hammerStep-1]}
                    </Button>
                    <Button onClick={handleUnsold} variant="destructive" className="h-20 px-12 font-black tracking-widest uppercase text-xl">Unsold</Button>
                </>
            ) : (
                <Button onClick={handleDrawPlayer} disabled={auction.status === 'drawing'} className="h-24 w-full text-xl lg:text-3xl font-serif font-black uppercase tracking-[0.3em] shadow-[0_0_60px_rgba(255,215,0,0.1)] truncate">
                    {auction.status === 'drawing' ? 'Accessing Official Lot...' : `Reveal Next Player Lot (${undrawnIds.length} Remaining)`}
                </Button>
            )}
        </div>
      </footer>
    </div>
  );
}
