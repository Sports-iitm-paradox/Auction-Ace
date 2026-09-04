
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { X, History, Trophy, Gavel, Undo2, RotateCcw, Shield, LayoutDashboard, Hammer } from 'lucide-react';
import { Player, PlayerSet, ActiveAuctionState, Squad, SQUAD_RULES } from '@/lib/player-data';
import { AnimatePresence, motion } from 'framer-motion';
import { cn, shuffleArray } from '@/lib/utils';
import Image from 'next/image';
import { useFirestore, useUser, useDoc, useMemoFirebase, updateDocumentNonBlocking, useCollection, setDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp, DocumentReference, collection, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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

export default function FullScreenView({ players, set, onReset }: FullScreenViewProps) {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [selectedHouseId, setSelectedHouseId] = useState<string>("");
  const [timer, setTimer] = useState<number>(DEFAULT_TIMER);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);

  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  const auctionRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'activeAuctions', user.uid) as DocumentReference<ActiveAuctionState>;
  }, [firestore, user]);

  const { data: auction, isLoading: isLoadingAuction } = useDoc<ActiveAuctionState>(auctionRef);

  const squadsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'squads'), orderBy('order'));
  }, [firestore]);

  const { data: squads } = useCollection<Squad>(squadsQuery);

  // Auto-initialize auction if it doesn't exist
  useEffect(() => {
    if (!isLoadingAuction && !auction && auctionRef && user) {
        setDocumentNonBlocking(auctionRef, {
            currentPlayerId: "",
            setId: set.id,
            currentBid: 0,
            status: 'idle',
            hammerStep: 0,
            isSold: false,
            isUnsold: false,
            userId: user.uid,
            lastUpdated: serverTimestamp(),
            history: [],
            undrawnIds: shuffleArray(set.players.map(p => p.id))
        }, { merge: true });
    }
  }, [auction, isLoadingAuction, auctionRef, user, set]);

  const currentPlayer = useMemo(() => {
    if (!auction?.currentPlayerId) return null;
    return set.players.find(p => p.id === auction.currentPlayerId) || null;
  }, [auction?.currentPlayerId, set.players]);

  const drawnPlayers = useMemo(() => {
    if (!auction?.history) return [];
    return auction.history
      .filter(event => event.type === 'sold' || event.type === 'unsold')
      .map(event => {
        const p = set.players.find(player => player.id === event.playerId);
        return { ...p, status: event.type, finalPrice: event.bid, houseName: event.houseName };
      })
      .filter(Boolean);
  }, [auction?.history, set.players]);

  const playSound = useCallback((key: string) => {
    if (typeof Audio === 'undefined') return;
    const audio = new Audio((SOUNDS as any)[key.toUpperCase()]);
    audio.volume = 0.4;
    audio.play().catch(() => {});
  }, []);

  useEffect(() => {
    if (isTimerActive && timer > 0) {
        timerInterval.current = setInterval(() => {
            setTimer(prev => {
                if (prev <= 6 && prev > 1) playSound('tick');
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
    if (!auction || auction.undrawnIds.length === 0 || auction.status === 'drawing' || !auctionRef) return;
    
    const undrawn = [...auction.undrawnIds];
    const nextId = undrawn.shift();
    const nextPlayer = set.players.find(p => p.id === nextId);
    if (!nextPlayer) return;

    setTimer(DEFAULT_TIMER);
    updateDocumentNonBlocking(auctionRef, { 
        status: 'drawing', 
        hammerStep: 0, 
        isSold: false, 
        isUnsold: false, 
        lastUpdated: serverTimestamp() 
    });

    setTimeout(() => {
      playSound('reveal');
      updateDocumentNonBlocking(auctionRef, {
        status: 'bidding',
        currentPlayerId: nextId,
        currentBid: nextPlayer.reservePrice || 0,
        hammerStep: 0,
        undrawnIds: undrawn,
        history: [...(auction.history || []), { type: 'draw', playerId: nextId, timestamp: new Date().toISOString() }],
        lastUpdated: serverTimestamp()
      });
      setIsTimerActive(true);
    }, 800);
  };

  const handleIncreaseBid = () => {
    if (!auction || !auctionRef || auction.isSold || auction.isUnsold || auction.status !== 'bidding') return;
    
    const getIncrement = (val: number) => {
        if (val < 100) return 5;
        if (val < 200) return 10;
        if (val < 500) return 20;
        return 50;
    };

    const currentVal = auction.currentBid;
    const increment = getIncrement(currentVal);
    const newBid = currentVal + increment;

    if (newBid >= MARQUEE_THRESHOLD && currentVal < MARQUEE_THRESHOLD) {
      playSound('hype');
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 500);
    }

    setTimer(DEFAULT_TIMER);
    setIsTimerActive(true);
    updateDocumentNonBlocking(auctionRef, { 
        currentBid: newBid, 
        hammerStep: 0, // Reset hammer call if bid increases
        lastUpdated: serverTimestamp() 
    });
  };

  const handleHammerCall = () => {
    if (!auction || !auctionRef || !currentPlayer || auction.status !== 'bidding') return;
    
    const nextStep = (auction.hammerStep || 0) + 1;
    
    if (nextStep === 3) {
        // Hammer Fall (Sold)
        setIsTimerActive(false);
        playSound('sold');
        if (auction.currentBid >= MARQUEE_THRESHOLD) {
            confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });
        }
        updateDocumentNonBlocking(auctionRef, {
            status: 'sold',
            hammerStep: 3,
            isSold: true,
            lastUpdated: serverTimestamp()
        });
    } else {
        // Going Once / Twice
        playSound('reveal');
        updateDocumentNonBlocking(auctionRef, {
            hammerStep: nextStep,
            lastUpdated: serverTimestamp()
        });
    }
  };

  const handleConfirmAssignment = async () => {
    if (!auction || !auctionRef || !currentPlayer || !selectedHouseId || !firestore) {
      toast({ title: "Franchise Required", description: "Select the winning house to record the transaction.", variant: "destructive" });
      return;
    }

    const house = squads?.find(s => s.id === selectedHouseId);
    if (!house) return;

    const bidInCr = auction.currentBid / 100;
    const newMoneyLeft = parseFloat((house.moneyLeft - bidInCr).toFixed(2));
    const newMoneySpent = parseFloat((house.moneySpent + bidInCr).toFixed(2));
    
    const playerEntry = `${currentPlayer.playerName}:${bidInCr}:${currentPlayer.specialism}:${currentPlayer.cua}`;
    const newPlayersList = house.playersList ? `${house.playersList};${playerEntry}` : playerEntry;
    
    const houseRef = doc(firestore, 'squads', house.id);
    updateDocumentNonBlocking(houseRef, {
        moneyLeft: newMoneyLeft,
        moneySpent: newMoneySpent,
        totalPoints: house.totalPoints + (currentPlayer.points || 0),
        playersList: newPlayersList,
        budgetStatus: newMoneyLeft < 0 ? 'OVER' : 'OK'
    });

    updateDocumentNonBlocking(auctionRef, {
        history: [...(auction.history || []), { 
            type: 'sold', 
            playerId: currentPlayer.id, 
            bid: auction.currentBid, 
            houseId: house.id,
            houseName: house.name,
            timestamp: new Date().toISOString() 
        }],
        lastUpdated: serverTimestamp()
    });
    setSelectedHouseId("");
    handleDrawPlayer();
  };

  const handleUnsold = () => {
    if (!auction || !auctionRef || !currentPlayer) return;
    setIsTimerActive(false);
    playSound('unsold');
    updateDocumentNonBlocking(auctionRef, {
        status: 'unsold',
        isUnsold: true,
        history: [...(auction.history || []), { type: 'unsold', playerId: currentPlayer.id, timestamp: new Date().toISOString() }],
        lastUpdated: serverTimestamp()
    });
  };

  const handleUndo = () => {
    if (!auction || !auctionRef || auction.history.length === 0) return;
    const history = [...auction.history];
    const lastEvent = history.pop();
    if (!lastEvent) return;

    updateDocumentNonBlocking(auctionRef, {
        status: 'bidding',
        hammerStep: 0,
        isSold: false,
        isUnsold: false,
        history: history,
        lastUpdated: serverTimestamp()
    });
  };

  const handleHardReset = async () => {
    if (!auctionRef || !confirm("Are you sure? This will wipe progress.")) return;
    
    const allIds = set.players.map(p => p.id);
    const shuffled = shuffleArray(allIds);

    updateDocumentNonBlocking(auctionRef, {
        status: 'idle',
        currentPlayerId: "",
        currentBid: 0,
        hammerStep: 0,
        isSold: false,
        isUnsold: false,
        undrawnIds: shuffled,
        history: [],
        lastUpdated: serverTimestamp()
    });
    setTimer(DEFAULT_TIMER);
    setIsTimerActive(false);
  };

  const getSquadStats = (squad: Squad) => {
    const players = (squad.playersList || "").split(";").filter(Boolean);
    const stats = {
      total: players.length,
      batters: 0,
      wk: 0,
      ar: 0,
      bowlers: 0,
      uncapped: 0
    };
    players.forEach(p => {
      const parts = p.split(":");
      const role = (parts[2] || "").toLowerCase();
      const cat = (parts[3] || "").toLowerCase();
      if (role.includes("batter")) stats.batters++;
      else if (role.includes("keeper")) stats.wk++;
      else if (role.includes("rounder")) stats.ar++;
      else if (role.includes("bowler")) stats.bowlers++;
      if (cat.includes("uncapped")) stats.uncapped++;
    });
    return stats;
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.key === ' ' && auction?.status !== 'drawing') {
      e.preventDefault();
      if (!currentPlayer) handleDrawPlayer();
      else if (!auction?.isSold && !auction?.isUnsold) handleIncreaseBid();
    }
    if (e.key === 'Enter' && auction?.status === 'bidding') {
        e.preventDefault();
        handleHammerCall();
    }
  }, [auction, currentPlayer]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (isLoadingAuction || !auction) {
      return (
          <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#1a0202] text-primary font-serif">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent animate-spin rounded-full mb-6" />
              <h1 className="text-2xl uppercase tracking-[0.5em] animate-pulse">Establishing Secure Floor Connection...</h1>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center bg-background sunburst-bg select-none overflow-hidden h-screen text-foreground">
      {/* Top Controls Bar */}
      <div className="w-full flex items-center justify-between px-6 py-4 z-40 bg-black/20 backdrop-blur-sm border-b border-primary/20">
        <div className="flex items-center gap-4">
            <Trophy className="h-6 w-6 text-primary" />
            <h2 className="font-serif text-[10px] text-primary tracking-[0.3em] uppercase font-bold italic">IPL Auction Moderator Hub</h2>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setIsTrackerOpen(!isTrackerOpen)} className={cn("h-8 px-4 flex items-center gap-2 rounded border transition-all text-[9px] font-black uppercase tracking-widest", isTrackerOpen ? "bg-primary text-primary-foreground border-primary" : "bg-black/40 border-primary/20 text-primary")}>
                <LayoutDashboard size={12} /> Tracker
            </button>
            <button onClick={() => setIsHistoryOpen(!isHistoryOpen)} className={cn("h-8 px-4 flex items-center gap-2 rounded border transition-all text-[9px] font-black uppercase tracking-widest", isHistoryOpen ? "bg-primary text-primary-foreground border-primary" : "bg-black/40 border-primary/20 text-primary")}>
                <History size={12} /> Ledger
            </button>
            <button onClick={handleUndo} className="h-8 px-3 flex items-center justify-center bg-black/40 border border-primary/20 text-primary rounded hover:bg-primary/20 transition-colors"><Undo2 size={14} /></button>
            <button onClick={handleHardReset} title="Hard Reset Session" className="h-8 px-3 flex items-center justify-center bg-black/40 border border-primary/20 text-destructive rounded hover:bg-destructive/20 transition-colors"><RotateCcw size={14} /></button>
            <button onClick={() => router.push('/')} className="h-8 w-8 flex items-center justify-center bg-black/40 border border-primary/20 text-primary rounded"><X size={18} /></button>
        </div>
      </div>

      <div className="flex flex-1 w-full relative overflow-hidden">
        {/* Ledger Sidebar */}
        <AnimatePresence>
            {isHistoryOpen && (
                <motion.aside initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} className="w-80 bg-black/60 backdrop-blur-3xl border-r border-primary/20 h-full p-4 overflow-hidden z-30 flex flex-col">
                    <h3 className="text-primary font-serif uppercase tracking-[0.3em] text-[10px] font-black mb-4 flex items-center gap-2"><History size={14}/> Official Ledger</h3>
                    <ScrollArea className="flex-1">
                        <div className="space-y-2 pr-2">
                            {drawnPlayers.slice().reverse().map((p: any, i) => (
                                <div key={i} className="bg-black/40 border border-primary/10 p-3 rounded group hover:border-primary/40 transition-colors relative">
                                    <div className={cn("absolute left-0 top-1 bottom-1 w-1 rounded-full", p.status === 'sold' ? "bg-primary" : "bg-destructive")} />
                                    <p className="text-[10px] font-bold text-white uppercase truncate ml-2">{p.playerName}</p>
                                    <div className="flex justify-between items-center mt-1 ml-2">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-primary/60">{p.houseName || 'UNSOLD'}</span>
                                        {p.status === 'sold' && <span className="text-[10px] font-mono font-black text-primary">{p.finalPrice}L</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </motion.aside>
            )}
        </AnimatePresence>

        {/* Main Floor View */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <AnimatePresence mode="wait">
                {auction.status !== 'drawing' && currentPlayer ? (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1, x: shouldShake ? [0, -5, 5, -5, 5, 0] : 0 }} className={cn("w-full max-w-5xl aspect-[16/9] ornate-border bg-[#1a0202]/95 backdrop-blur-2xl shadow-2xl flex overflow-hidden relative", (auction.currentBid || 0) >= MARQUEE_THRESHOLD && "border-primary shadow-[0_0_80px_rgba(255,215,0,0.2)]")}>
                        
                        {/* Sold Overlay */}
                        {(auction.isSold || auction.isUnsold) && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl p-8 text-center">
                                <Gavel size={100} className={cn("mb-8", auction.isSold ? "text-primary animate-bounce" : "text-destructive")} />
                                <h2 className={cn("text-8xl font-serif font-black uppercase italic tracking-tighter drop-shadow-2xl", auction.isSold ? "text-primary text-glow-gold" : "text-destructive")}>{auction.isSold ? 'SOLD' : 'UNSOLD'}</h2>
                                <h3 className="text-4xl font-serif text-white uppercase mt-6 tracking-[0.2em]">{currentPlayer.playerName}</h3>
                                {auction.isSold && <p className="text-7xl font-mono font-black text-primary mt-6">{auction.currentBid}L</p>}
                                
                                {auction.isSold && (
                                  <div className="mt-12 w-full max-w-sm space-y-4">
                                      <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Assign Winning Franchise</p>
                                      <Select value={selectedHouseId} onValueChange={setSelectedHouseId}>
                                          <SelectTrigger className="bg-black/60 border-primary/40 h-14 text-sm font-bold">
                                              <SelectValue placeholder="Select Winning House..." />
                                          </SelectTrigger>
                                          <SelectContent className="bg-[#1a0202] border-primary/20">
                                              {squads?.map(h => (
                                                  <SelectItem key={h.id} value={h.id} className="text-xs hover:bg-primary/20 text-white py-3 border-b border-primary/5">
                                                      <div className="flex justify-between w-64 items-center gap-4">
                                                          <span className="font-bold">{h.name}</span>
                                                          <span className="text-[10px] font-mono opacity-60">({h.moneyLeft}Cr LEFT)</span>
                                                      </div>
                                                  </SelectItem>
                                              ))}
                                          </SelectContent>
                                      </Select>
                                      <Button onClick={handleConfirmAssignment} disabled={!selectedHouseId} className="w-full h-14 text-lg font-serif font-black uppercase tracking-widest shadow-2xl">Record Sale & Next Lot</Button>
                                  </div>
                                )}

                                {auction.isUnsold && (
                                  <Button onClick={handleDrawPlayer} className="mt-12 h-14 px-16 text-lg font-serif font-black uppercase tracking-widest">Draw Next Lot</Button>
                                )}
                            </motion.div>
                        )}

                        {/* Going Once/Twice Ticker */}
                        {auction.hammerStep > 0 && auction.hammerStep < 3 && !auction.isSold && (
                            <motion.div initial={{ y: -100 }} animate={{ y: 0 }} className="absolute top-0 left-0 w-full bg-primary/90 py-4 flex items-center justify-center z-40 border-b-2 border-primary-foreground shadow-2xl">
                                <h2 className="text-4xl font-serif font-black uppercase italic tracking-[0.4em] text-primary-foreground">
                                    GOING {auction.hammerStep === 1 ? 'ONCE' : 'TWICE'}
                                </h2>
                            </motion.div>
                        )}

                        {/* Player Frame */}
                        <div className="w-[35%] h-full bg-black/40 border-r border-primary/20 p-6 flex flex-col gap-4 overflow-hidden">
                            <div className="w-full aspect-[3/4] relative ornate-border bg-black overflow-hidden shadow-2xl flex-shrink-0">
                                {currentPlayer.imageUrl ? <Image src={currentPlayer.imageUrl} alt="" fill className="object-cover" /> : <Shield className="w-full h-full p-20 opacity-10 text-primary" />}
                            </div>
                            <div className="flex-1 bg-black/20 p-3 border border-primary/5 overflow-y-auto custom-scrollbar">
                                <span className="text-[9px] text-primary font-black uppercase tracking-[0.4em] block mb-1">Auction Insight</span>
                                <p className="text-[10px] italic text-foreground/70 leading-relaxed font-medium">{currentPlayer.auctionInsight || 'Official scouting data pending confirmation.'}</p>
                            </div>
                        </div>

                        {/* Bidding Control Frame */}
                        <div className="flex-1 p-8 flex flex-col justify-between overflow-hidden">
                            <div className="overflow-hidden">
                                <div className="flex items-center gap-4 mb-4">
                                    <span className="text-[10px] text-primary font-black uppercase tracking-widest px-2 py-0.5 border border-primary/20">LOT {currentPlayer.playerNumber}</span>
                                    {auction.currentBid >= MARQUEE_THRESHOLD && <Badge className="bg-primary text-primary-foreground animate-bounce">MARQUEE</Badge>}
                                </div>
                                <h1 className="text-6xl font-serif font-black text-white uppercase italic tracking-tighter leading-[0.9]">{currentPlayer.playerName}</h1>
                                <div className="grid grid-cols-2 gap-4 mt-8">
                                    {[
                                        { label: 'Role', value: currentPlayer.specialism },
                                        { label: 'Status', value: currentPlayer.cua },
                                        { label: 'Country', value: currentPlayer.country },
                                        { label: 'Rating', value: currentPlayer.points },
                                    ].map((s, i) => (
                                        <div key={i} className="border-l-2 border-primary/20 pl-4">
                                            <span className="text-[8px] text-primary/40 font-black uppercase tracking-widest block mb-0.5">{s.label}</span>
                                            <span className="text-xl font-serif font-bold text-white/90">{s.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-black/60 border border-primary/30 p-6 relative flex items-center justify-between shadow-2xl mt-4">
                                {isTimerActive && (
                                    <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-[#1a0202] border-4 border-primary flex items-center justify-center z-40 shadow-2xl">
                                        <span className={cn("text-2xl font-mono font-black", timer <= 5 ? "text-destructive animate-pulse" : "text-primary")}>{timer}</span>
                                    </div>
                                )}
                                <div>
                                    <span className="text-[10px] text-primary font-black uppercase tracking-[0.5em] block mb-1">Floor Valuation</span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-7xl font-mono font-black text-white tracking-tighter">{auction.currentBid}</span>
                                        <span className="text-3xl font-serif text-primary italic font-black">L</span>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col gap-0.5">
                                    <span className="text-[9px] text-primary/40 font-black uppercase block">Base Price</span>
                                    <span className="text-xl font-mono text-white/30 font-black">{currentPlayer.reservePrice}L</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <div className="flex flex-col items-center gap-8">
                        <Trophy size={100} className="text-primary animate-pulse" />
                        <h1 className="text-4xl font-serif font-black text-primary uppercase tracking-[0.6em] text-center italic">Auction Floor Waiting</h1>
                        <Button onClick={handleDrawPlayer} className="h-16 px-20 text-xl font-serif font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-transform">Begin Next Drawing</Button>
                    </div>
                )}
            </AnimatePresence>
        </main>

        {/* Tracker Sidebar */}
        <AnimatePresence>
            {isTrackerOpen && (
                <motion.aside initial={{ x: 320 }} animate={{ x: 0 }} exit={{ x: 320 }} className="w-80 bg-black/60 backdrop-blur-3xl border-l border-primary/20 h-full p-4 overflow-hidden z-30 flex flex-col">
                    <h3 className="text-primary font-serif uppercase tracking-[0.3em] text-[10px] font-black mb-4 flex items-center gap-2"><LayoutDashboard size={14}/> Franchise Tracker</h3>
                    <ScrollArea className="flex-1">
                        <div className="space-y-3 pr-2">
                            {squads?.map(squad => {
                                const stats = getSquadStats(squad);
                                return (
                                    <div key={squad.id} className="bg-black/40 border border-primary/10 p-3 rounded-xl space-y-3 hover:border-primary/40 transition-all">
                                        <div className="flex justify-between items-center">
                                            <span className="font-serif text-[11px] text-white font-black uppercase italic tracking-wider">{squad.name}</span>
                                            <span className="text-[10px] font-mono text-primary font-black">{squad.moneyLeft}Cr</span>
                                        </div>
                                        <div className="grid grid-cols-4 gap-1.5">
                                            {[
                                                { label: 'BAT', val: stats.batters, target: SQUAD_RULES.BATTERS },
                                                { label: 'BOWL', val: stats.bowlers, target: SQUAD_RULES.BOWLERS },
                                                { label: 'AR', val: stats.ar, target: SQUAD_RULES.AR },
                                                { label: 'WK', val: stats.wk, target: SQUAD_RULES.WK },
                                            ].map((r, i) => (
                                                <div key={i} className="text-center bg-black/60 p-1 border border-primary/5">
                                                    <div className="text-[6px] text-white/40 font-black mb-0.5">{r.label}</div>
                                                    <div className={cn("text-[9px] font-black", r.val >= r.target ? "text-green-500" : "text-white")}>{r.val}/{r.target}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </motion.aside>
            )}
        </AnimatePresence>
      </div>

      {/* Persistent Moderator Controls */}
      <footer className="w-full bg-black/95 border-t border-primary/30 p-6 z-50">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
            {currentPlayer && !auction.isSold && !auction.isUnsold ? (
                <>
                    <Button onClick={handleIncreaseBid} className="h-20 flex-1 text-2xl font-serif font-black tracking-widest uppercase shadow-[0_0_30px_rgba(255,215,0,0.1)]">+ RAISE FLOOR BID</Button>
                    <Button onClick={handleHammerCall} className="h-20 px-16 bg-primary text-primary-foreground font-black tracking-widest uppercase hover:bg-primary/90 text-lg">
                        <Gavel className="mr-3 h-6 w-6"/> 
                        {auction.hammerStep === 0 ? 'Start Hammer' : auction.hammerStep === 1 ? 'Going Twice' : 'Sold'}
                    </Button>
                    <Button onClick={handleUnsold} variant="destructive" className="h-20 px-16 font-black tracking-widest uppercase text-lg">Unsold</Button>
                </>
            ) : (
                <Button onClick={handleDrawPlayer} disabled={auction.status === 'drawing'} className="h-20 w-full text-3xl font-serif font-black tracking-[0.5em] uppercase shadow-[0_0_50px_rgba(255,215,0,0.2)]">
                    {auction.status === 'drawing' ? 'Accessing Next Lot...' : `Reveal Next Player Lot (${auction.undrawnIds.length} REMAINING)`}
                </Button>
            )}
        </div>
      </footer>

      <style jsx global>{`
        .text-glow-gold { text-shadow: 0 0 20px rgba(255, 215, 0, 0.7), 0 0 40px rgba(255, 215, 0, 0.4); }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 215, 0, 0.3); border-radius: 10px; }
      `}</style>
    </div>
  );
}

interface FullScreenViewProps {
    players: Player[];
    set: PlayerSet;
    onReset: () => void;
}
