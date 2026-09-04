
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { X, RefreshCw, Keyboard, Clock3, Shield, History, Trophy, Gavel, Share2, Sparkles, Undo2, RotateCcw, UserCheck, LayoutDashboard, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Player, PlayerSet, ActiveAuctionState, ActionEvent, Squad, OFFICIAL_HOUSES, SQUAD_RULES } from '@/lib/player-data';
import { AnimatePresence, motion } from 'framer-motion';
import { cn, shuffleArray } from '@/lib/utils';
import Image from 'next/image';
import { useFirestore, useUser, useDoc, useMemoFirebase, updateDocumentNonBlocking, setDocumentNonBlocking, useCollection } from '@/firebase';
import { doc, serverTimestamp, DocumentReference, collection, query, orderBy, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

interface FullScreenViewProps {
    players: Player[];
    set: PlayerSet;
    onReset: () => void;
}

const SOUNDS = {
    REVEAL: 'https://assets.mixkit.co/sfx/preview/mixkit-positive-interface-beep-221.mp3',
    SOLD: 'https://assets.mixkit.co/sfx/preview/mixkit-gavel-hammer-thump-2293.mp3',
    BUZZER: 'https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3',
    TICK: 'https://assets.mixkit.co/sfx/preview/mixkit-simple-game-countdown-921.mp3',
    UNSOLD: 'https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-947.mp3',
    HEARTBEAT: 'https://assets.mixkit.co/sfx/preview/mixkit-human-heart-beat-493.mp3',
    HYPE: 'https://assets.mixkit.co/sfx/preview/mixkit-arcade-retro-changing-tab-206.mp3'
};

const DEFAULT_TIMER = 20;
const MARQUEE_THRESHOLD = 1000;

export default function FullScreenView({ players, set, onReset }: FullScreenViewProps) {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [selectedHouseId, setSelectedHouseId] = useState<string>("");
  const [timer, setTimer] = useState<number>(DEFAULT_TIMER);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [finalCallStatus, setFinalCallStatus] = useState<'none' | 'once' | 'twice' | 'final'>('none');
  const [shouldShake, setShouldShake] = useState(false);

  const timerInterval = useRef<NodeJS.Timeout>(null);

  const auctionRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'activeAuctions', user.uid) as DocumentReference<ActiveAuctionState>;
  }, [firestore, user]);

  const { data: auction } = useDoc<ActiveAuctionState>(auctionRef);

  const squadsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'squads'), orderBy('order'));
  }, [firestore]);

  const { data: squads } = useCollection<Squad>(squadsQuery);

  const currentPlayer = useMemo(() => {
    if (!auction?.currentPlayerId) return null;
    return set.players.find(p => p.id === auction.currentPlayerId) || null;
  }, [auction?.currentPlayerId, set.players]);

  const drawnPlayers = useMemo(() => {
    if (!auction?.history) return [];
    const list: (Player & { status: 'sold' | 'unsold'; finalPrice?: number; houseName?: string })[] = [];
    auction.history.forEach(event => {
      if (event.type === 'sold' || event.type === 'unsold') {
        const p = set.players.find(player => player.id === event.playerId);
        if (p) {
          list.push({ ...p, status: event.type, finalPrice: event.bid, houseName: event.houseName });
        }
      }
    });
    return list;
  }, [auction?.history, set.players]);

  const playSound = useCallback((key: string) => {
    if (typeof Audio === 'undefined') return;
    const audio = new Audio((SOUNDS as any)[key.toUpperCase()]);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  }, []);

  const triggerConfetti = (isMarquee: boolean) => {
    if (isMarquee) {
      confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });
    } else {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  };

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
    }
    return () => { if (timerInterval.current) clearInterval(timerInterval.current); };
  }, [isTimerActive, timer, playSound]);

  const handleDrawPlayer = async () => {
    if (!auction || auction.undrawnIds.length === 0 || auction.status === 'drawing' || !auctionRef) return;
    const undrawn = [...auction.undrawnIds];
    const nextId = undrawn.shift();
    const nextPlayer = set.players.find(p => p.id === nextId);
    if (!nextPlayer) return;

    setFinalCallStatus('none');
    setTimer(DEFAULT_TIMER);
    updateDocumentNonBlocking(auctionRef, { status: 'drawing', isSold: false, isUnsold: false, lastUpdated: serverTimestamp() });

    setTimeout(() => {
      playSound('reveal');
      updateDocumentNonBlocking(auctionRef, {
        status: 'bidding',
        currentPlayerId: nextId,
        currentBid: nextPlayer.reservePrice || 0,
        undrawnIds: undrawn,
        history: [...(auction.history || []), { type: 'draw', playerId: nextId, timestamp: new Date().toISOString() }],
        lastUpdated: serverTimestamp()
      });
      setIsTimerActive(true);
    }, 1000);
  };

  const handleIncreaseBid = () => {
    if (!auction || !auctionRef || auction.isSold || auction.isUnsold) return;
    const getIncrement = (val: number) => val < 100 ? 5 : val < 200 ? 10 : val < 500 ? 20 : 50;
    const newBid = auction.currentBid + getIncrement(auction.currentBid);
    if (newBid >= MARQUEE_THRESHOLD && auction.currentBid < MARQUEE_THRESHOLD) {
      playSound('hype');
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 500);
    }
    setTimer(DEFAULT_TIMER);
    setFinalCallStatus('none');
    setIsTimerActive(true);
    updateDocumentNonBlocking(auctionRef, { currentBid: newBid, status: 'bidding', lastUpdated: serverTimestamp() });
  };

  const handleSold = async () => {
    if (!auction || !auctionRef || !currentPlayer || !selectedHouseId || !firestore) {
      toast({ title: "Select a House", description: "You must select the winning House first.", variant: "destructive" });
      return;
    }

    const house = squads?.find(s => s.id === selectedHouseId);
    if (!house) return;

    const bidInCr = auction.currentBid / 100; // Convert Lakh to Crore
    const newMoneyLeft = parseFloat((house.moneyLeft - bidInCr).toFixed(2));
    const newMoneySpent = parseFloat((house.moneySpent + bidInCr).toFixed(2));
    
    // Auto-update Squad
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

    setIsTimerActive(false);
    setFinalCallStatus('none');
    playSound('sold');
    triggerConfetti(auction.currentBid >= MARQUEE_THRESHOLD);

    updateDocumentNonBlocking(auctionRef, {
        status: 'sold',
        isSold: true,
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
  };

  const handleUnsold = () => {
    if (!auction || !auctionRef || !currentPlayer) return;
    setIsTimerActive(false);
    setFinalCallStatus('none');
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

    // If it was a sale, we need to manually revert the house data (complex for this prototype, so we prompt)
    if (lastEvent.type === 'sold') {
      toast({ title: "Manual Correction Needed", description: "Purse and squad for the house must be manually adjusted after undoing a sale.", variant: "destructive" });
    }

    updateDocumentNonBlocking(auctionRef, {
        status: 'bidding',
        isSold: false,
        isUnsold: false,
        history: history,
        lastUpdated: serverTimestamp()
    });
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === ' ' && auction?.status !== 'drawing') {
      e.preventDefault();
      if (!currentPlayer) handleDrawPlayer();
      else if (!auction?.isSold && !auction?.isUnsold) handleIncreaseBid();
    } else if (e.key === 'f' && currentPlayer && !auction?.isSold && !auction?.isUnsold) {
      setFinalCallStatus('once');
      setIsTimerActive(false);
    }
  }, [auction, currentPlayer]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const getSquadStats = (squad: Squad) => {
    const players = (squad.playersList || "").split(";").filter(Boolean);
    const stats = {
      total: players.length,
      batters: 0,
      wk: 0,
      ar: 0,
      bowlers: 0,
      overseas: 0,
      uncapped: 0
    };
    players.forEach(p => {
      const parts = p.split(":");
      const role = parts[2]?.toLowerCase();
      const cat = parts[3]?.toLowerCase();
      if (role?.includes("batter")) stats.batters++;
      else if (role?.includes("keeper")) stats.wk++;
      else if (role?.includes("rounder")) stats.ar++;
      else if (role?.includes("bowler")) stats.bowlers++;
      
      if (cat?.includes("uncapped")) stats.uncapped++;
      // Logic for overseas needs player country check, assuming database 'country' field
    });
    return stats;
  };

  if (!auction) return <div className="fixed inset-0 flex items-center justify-center bg-background text-primary font-serif">Syncing floor...</div>;

  return (
    <div className="fixed inset-0 flex flex-col items-center bg-background sunburst-bg select-none overflow-hidden h-screen text-foreground">
      {/* Header */}
      <div className="w-full flex items-center justify-between px-6 py-4 z-40 bg-black/20 backdrop-blur-sm border-b border-primary/20">
        <div className="flex items-center gap-4">
            <Trophy className="h-6 w-6 text-primary" />
            <h2 className="font-serif text-lg text-primary tracking-[0.2em] uppercase font-bold">IPL Auction Console</h2>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setIsTrackerOpen(!isTrackerOpen)} className={cn("h-9 px-4 flex items-center gap-2 rounded border transition-all text-xs font-bold uppercase tracking-widest", isTrackerOpen ? "bg-primary text-primary-foreground border-primary" : "bg-black/40 border-primary/20 text-primary")}>
                <LayoutDashboard size={16} /> Tracker
            </button>
            <button onClick={() => setIsHistoryOpen(!isHistoryOpen)} className={cn("h-9 px-4 flex items-center gap-2 rounded border transition-all text-xs font-bold uppercase tracking-widest", isHistoryOpen ? "bg-primary text-primary-foreground border-primary" : "bg-black/40 border-primary/20 text-primary")}>
                <History size={16} /> Ledger
            </button>
            <button onClick={handleUndo} className="h-9 px-4 flex items-center gap-2 bg-black/40 border border-primary/20 text-primary rounded transition-all"><Undo2 size={16} /></button>
            <button onClick={() => router.push('/')} className="h-9 w-9 flex items-center justify-center bg-black/40 border border-primary/20 text-primary rounded"><X size={20} /></button>
        </div>
      </div>

      <div className="flex flex-1 w-full relative overflow-hidden">
        {/* Ledger Sidebar */}
        <AnimatePresence>
            {isHistoryOpen && (
                <motion.aside initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} className="w-80 bg-black/40 backdrop-blur-xl border-r border-primary/20 h-full p-4 overflow-y-auto custom-scrollbar z-30">
                    <h3 className="text-primary font-serif uppercase tracking-widest text-xs mb-4 border-b border-primary/20 pb-2">Floor Ledger</h3>
                    <div className="space-y-3">
                        {drawnPlayers.map((p, i) => (
                            <div key={i} className="bg-black/60 border border-primary/10 p-3 rounded relative">
                                <div className={cn("absolute left-0 top-0 bottom-0 w-1", p.status === 'sold' ? "bg-primary" : "bg-destructive")} />
                                <p className="text-[11px] font-serif text-white uppercase truncate">{p.playerName}</p>
                                <div className="flex justify-between mt-1">
                                    <span className="text-[8px] font-black uppercase tracking-widest opacity-60">{p.houseName || p.status}</span>
                                    {p.status === 'sold' && <span className="text-xs font-mono text-primary">{p.finalPrice}L</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.aside>
            )}
        </AnimatePresence>

        {/* Main Floor */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
            <AnimatePresence mode="wait">
                {auction.status !== 'drawing' && currentPlayer ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1, x: shouldShake ? [0, -10, 10, -10, 10, 0] : 0 }} className={cn("w-full max-w-5xl aspect-[16/9] ornate-border bg-[#1a0202]/95 backdrop-blur-xl shadow-2xl flex overflow-hidden relative", auction.currentBid >= MARQUEE_THRESHOLD && "border-primary shadow-[0_0_50px_rgba(255,215,0,0.2)]")}>
                        {/* Sold Overlay */}
                        {(auction.isSold || auction.isUnsold) && (
                            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-10">
                                <h2 className={cn("text-8xl font-serif font-black uppercase italic tracking-tighter drop-shadow-2xl", auction.isSold ? "text-primary text-glow-gold" : "text-destructive")}>{auction.isSold ? 'SOLD' : 'UNSOLD'}</h2>
                                <h3 className="text-3xl font-serif text-white uppercase mt-4">{currentPlayer.playerName}</h3>
                                {auction.isSold && <p className="text-5xl font-mono font-black text-primary mt-4">{auction.currentBid}L</p>}
                                <Button onClick={handleDrawPlayer} className="mt-10 h-16 px-20 text-xl font-serif font-black tracking-widest">NEXT LOT</Button>
                            </div>
                        )}

                        <div className="w-1/3 h-full bg-black/40 border-r border-primary/20 p-6 flex flex-col gap-6">
                            <div className="w-full aspect-[3/4] relative border-4 border-primary/20 bg-black overflow-hidden">
                                {currentPlayer.imageUrl ? <Image src={currentPlayer.imageUrl} alt="" fill className="object-cover" /> : <Shield className="w-full h-full p-12 opacity-10" />}
                            </div>
                            <div className="flex-1 border border-primary/20 p-4 bg-secondary/5">
                                <span className="text-[9px] text-primary font-black uppercase tracking-widest block mb-2">Scout Report</span>
                                <p className="text-xs italic text-foreground/80 leading-relaxed">{currentPlayer.auctionInsight}</p>
                            </div>
                        </div>

                        <div className="flex-1 p-8 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-[10px] text-primary font-black uppercase tracking-widest px-2 py-0.5 border border-primary/20">LOT {currentPlayer.playerNumber}</span>
                                    {auction.currentBid >= MARQUEE_THRESHOLD && <Badge className="bg-primary text-primary-foreground animate-bounce">MARQUEE</Badge>}
                                </div>
                                <h1 className="text-6xl font-serif font-black text-white uppercase italic tracking-tighter">{currentPlayer.playerName}</h1>
                                <div className="grid grid-cols-2 gap-4 mt-6">
                                    {[
                                        { label: 'Role', value: currentPlayer.specialism },
                                        { label: 'Category', value: currentPlayer.cua },
                                        { label: 'Country', value: currentPlayer.country },
                                        { label: 'Rating', value: currentPlayer.points },
                                    ].map((s, i) => (
                                        <div key={i} className="border-b border-primary/10 pb-2">
                                            <span className="text-[8px] text-primary/60 font-black uppercase tracking-widest block">{s.label}</span>
                                            <span className="text-lg font-serif font-bold text-white">{s.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-4 border-primary/20 bg-black/60 p-6 relative">
                                {isTimerActive && (
                                    <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-background border-4 border-primary flex items-center justify-center z-40 shadow-xl">
                                        <span className={cn("text-2xl font-mono font-black", timer <= 5 ? "text-destructive" : "text-primary")}>{timer}</span>
                                    </div>
                                )}
                                <span className="text-[9px] text-primary font-black uppercase tracking-[0.5em] block mb-2">Live Floor Valuation</span>
                                <div className="flex items-baseline gap-4">
                                    <span className="text-8xl font-mono font-black text-white tracking-tighter">{auction.currentBid}</span>
                                    <span className="text-4xl font-serif text-primary italic font-black">L</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <div className="flex flex-col items-center gap-8">
                        <Trophy size={100} className="text-primary animate-pulse" />
                        <h1 className="text-4xl font-serif font-black text-primary uppercase tracking-[0.5em]">IPL Auction Floor</h1>
                        <Button onClick={handleDrawPlayer} className="h-16 px-24 text-xl font-serif font-black tracking-widest uppercase">Open Session</Button>
                    </div>
                )}
            </AnimatePresence>
        </main>

        {/* Tracker Sidebar */}
        <AnimatePresence>
            {isTrackerOpen && (
                <motion.aside initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: 300 }} className="w-80 bg-black/40 backdrop-blur-xl border-l border-primary/20 h-full p-4 overflow-y-auto custom-scrollbar z-30">
                    <h3 className="text-primary font-serif uppercase tracking-widest text-xs mb-4 border-b border-primary/20 pb-2">Requirements Tracker</h3>
                    <div className="space-y-6">
                        {squads?.map(squad => {
                            const stats = getSquadStats(squad);
                            return (
                                <div key={squad.id} className="bg-black/40 border border-primary/10 p-4 rounded space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="font-serif text-xs text-white font-bold">{squad.name}</span>
                                        <span className="text-[10px] font-mono text-primary font-black">{squad.moneyLeft}Cr</span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1">
                                        {[
                                            { label: 'BAT', val: stats.batters, target: SQUAD_RULES.BATTERS },
                                            { label: 'BOWL', val: stats.bowlers, target: SQUAD_RULES.BOWLERS },
                                            { label: 'AR', val: stats.ar, target: SQUAD_RULES.AR },
                                            { label: 'WK', val: stats.wk, target: SQUAD_RULES.WK },
                                        ].map((r, i) => (
                                            <div key={i} className="text-center">
                                                <div className="text-[7px] text-white/40 font-black mb-0.5">{r.label}</div>
                                                <div className={cn("text-[10px] font-bold", r.val >= r.target ? "text-green-500" : "text-white")}>{r.val}/{r.target}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center text-[9px] pt-1 border-t border-white/5">
                                        <span className={cn(stats.uncapped >= SQUAD_RULES.MIN_UNCAPPED ? "text-green-500" : "text-destructive")}>UNCAPPED: {stats.uncapped}/{SQUAD_RULES.MIN_UNCAPPED}</span>
                                        <span className={cn(stats.overseas <= SQUAD_RULES.MAX_OVERSEAS ? "text-white/60" : "text-destructive")}>OVERSEAS: {stats.overseas}/{SQUAD_RULES.MAX_OVERSEAS}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.aside>
            )}
        </AnimatePresence>
      </div>

      {/* Footer Controls */}
      <footer className="w-full bg-black/60 border-t border-primary/30 p-6 z-50">
        <div className="max-w-5xl mx-auto flex items-center gap-6">
            {currentPlayer && !auction.isSold && !auction.isUnsold ? (
                <>
                    <div className="w-64 flex flex-col gap-2">
                        <span className="text-[9px] text-primary font-black uppercase tracking-widest">Select Buyer House</span>
                        <Select value={selectedHouseId} onValueChange={setSelectedHouseId}>
                            <SelectTrigger className="bg-black/60 border-primary/40 h-10 text-xs">
                                <SelectValue placeholder="Winning Franchise..." />
                            </SelectTrigger>
                            <SelectContent className="bg-black border-primary/20">
                                {squads?.map(h => (
                                    <SelectItem key={h.id} value={h.id} className="text-xs hover:bg-primary/20">{h.name} ({h.moneyLeft}Cr)</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleIncreaseBid} className="h-14 flex-1 text-lg font-serif font-black tracking-widest uppercase">+ RAISE BID</Button>
                    <Button onClick={() => setFinalCallStatus('once')} className="h-14 px-10 bg-accent text-white font-serif font-black tracking-widest uppercase">HAMMER</Button>
                    <Button onClick={handleSold} className="h-14 px-10 bg-primary text-primary-foreground font-black tracking-widest uppercase"><UserCheck className="mr-2"/> CONFIRM SALE</Button>
                    <Button onClick={handleUnsold} variant="destructive" className="h-14 px-10 font-black tracking-widest uppercase">UNSOLD</Button>
                </>
            ) : (
                <Button onClick={handleDrawPlayer} className="h-16 w-full text-xl font-serif font-black tracking-[0.5em] uppercase shadow-[0_0_30px_rgba(255,215,0,0.2)]">Reveal Next Lot ({auction.undrawnIds.length} Left)</Button>
            )}
        </div>
      </footer>

      <style jsx global>{`
        .text-glow-gold { text-shadow: 0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.1); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 215, 0, 0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
}
