"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { X, Undo2, Loader2, Volume2, VolumeX, ListRestart, ArrowRight, Download, ImageIcon } from 'lucide-react';
import { Player, PlayerSet, ActiveAuctionState, ActionEvent, Squad } from '@/lib/player-data';
import { AnimatePresence, motion } from 'framer-motion';
import { cn, shuffleArray } from '@/lib/utils';
import Image from 'next/image';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp, DocumentReference, collection, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from '@/components/ui/badge';
import { toPng } from 'html-to-image';
import { SoldPoster } from './SoldPoster';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const SOUNDS = {
    REVEAL: 'https://assets.mixkit.co/sfx/preview/mixkit-positive-interface-beep-221.mp3',
    SOLD: 'https://assets.mixkit.co/sfx/preview/mixkit-gavel-hammer-thump-2293.mp3',
    BUZZER: 'https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3',
    TICK: 'https://assets.mixkit.co/sfx/preview/mixkit-simple-game-countdown-921.mp3',
    UNSOLD: 'https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-947.mp3',
    HYPE: 'https://assets.mixkit.co/sfx/preview/mixkit-arcade-retro-changing-tab-206.mp3'
};

const DEFAULT_TIMER = 20;
const MARQUEE_THRESHOLD = 500;
const HAMMER_INTERVAL = 1500;

export default function FullScreenView({ set }: { set: PlayerSet }) {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [timer, setTimer] = useState<number>(DEFAULT_TIMER);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [winningHouse, setWinningHouse] = useState<string>("");

  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const hammerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const squadsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'squads'), orderBy('order'));
  }, [firestore]);

  const { data: squads } = useCollection<Squad>(squadsQuery);

  const auctionRef = useMemoFirebase(() => {
    if (!firestore || !set) return null;
    return doc(firestore, 'activeAuctions', set.id) as DocumentReference<ActiveAuctionState>;
  }, [firestore, set]);

  const { data: auction, isLoading: isLoadingAuction } = useDoc<ActiveAuctionState>(auctionRef);

  useEffect(() => {
    if (isLoadingAuction || !auctionRef || !user || !set) return;
    
    if (!auction) {
        setDocumentNonBlocking(auctionRef, {
            currentPlayerId: "",
            currentBid: 0,
            status: 'idle',
            hammerStep: 0,
            isSold: false,
            isUnsold: false,
            userId: user.uid,
            setId: set.id,
            lastUpdated: serverTimestamp(),
            history: [],
            undrawnIds: shuffleArray(set.players).map(p => p.id) 
        }, { merge: true });
    }
  }, [auction, isLoadingAuction, auctionRef, user, set]);

  const currentPlayer = useMemo(() => {
    if (!auction?.currentPlayerId || !set.players) return null;
    return set.players.find(p => p.id === auction.currentPlayerId) || null;
  }, [auction?.currentPlayerId, set.players]);

  const playSound = useCallback((key: string) => {
    if (typeof Audio === 'undefined' || isMuted) return;
    const audio = new Audio((SOUNDS as any)[key.toUpperCase()]);
    audio.volume = 0.15;
    audio.play().catch(() => {});
  }, [isMuted]);

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
    if (!auction || !auction.undrawnIds || auction.undrawnIds.length === 0 || auction.status === 'drawing' || !auctionRef) return;
    
    clearHammerSequence();
    setWinningHouse("");
    const undrawn = [...auction.undrawnIds];
    const nextId = undrawn[0]; 
    const remaining = undrawn.slice(1);
    
    setTimer(DEFAULT_TIMER);
    updateDocumentNonBlocking(auctionRef, { 
        status: 'drawing', 
        hammerStep: 0, 
        isSold: false, 
        isUnsold: false,
        currentPlayerId: nextId,
        undrawnIds: remaining,
        lastUpdated: serverTimestamp() 
    });

    setTimeout(() => {
      playSound('reveal');
      const nextPlayer = set.players.find(p => p.id === nextId);
      updateDocumentNonBlocking(auctionRef, {
        status: 'bidding',
        currentBid: nextPlayer?.reservePrice || 0,
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
              confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#3b82f6', '#0f172a', '#FFFFFF'] });
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

  const syncSquadData = async (houseName: string, playerId: string, bid: number, isRemoving: boolean = false) => {
    if (!firestore || !squads) return;
    
    const squad = squads.find(s => s.name === houseName);
    if (!squad) return;

    const player = set.players.find(p => p.id === playerId);
    if (!player) return;

    const bidInCr = bid / 100; // Converting Lakhs to Cr for Squad page
    const points = player.points || 0;
    
    const currentList = squad.playersList || '';
    // Enhanced serialization: Name:Price:Role:Category:Points:Country
    const playerEntry = `${player.playerName}:${bidInCr}:${player.specialism || '-'}:${player.cua || '-'}:${player.points || 0}:${player.country || '-'}`;
    
    let newList = '';
    if (isRemoving) {
        newList = currentList.split(';').filter(entry => !entry.startsWith(`${player.playerName}:`)).join(';');
    } else {
        newList = currentList ? `${currentList};${playerEntry}` : playerEntry;
    }

    const newMoneySpent = isRemoving ? squad.moneySpent - bidInCr : squad.moneySpent + bidInCr;
    const newMoneyLeft = isRemoving ? squad.moneyLeft + bidInCr : squad.moneyLeft - bidInCr;
    const newPoints = isRemoving ? squad.totalPoints - points : squad.totalPoints + points;

    const squadRef = doc(firestore, 'squads', squad.id);
    updateDocumentNonBlocking(squadRef, {
        moneySpent: parseFloat(newMoneySpent.toFixed(2)),
        moneyLeft: parseFloat(newMoneyLeft.toFixed(2)),
        totalPoints: newPoints,
        playersList: newList,
        budgetStatus: newMoneyLeft < 0 ? 'OVER' : 'OK'
    });
  };

  const assignWinningHouse = (houseName: string) => {
      if (!auction || !auctionRef || !currentPlayer) return;
      setWinningHouse(houseName);
      
      const history = [...auction.history];
      if (history.length > 0) {
          const lastIndex = history.length - 1;
          if (history[lastIndex].playerId === auction.currentPlayerId) {
              const prevHouse = history[lastIndex].houseName;
              if (prevHouse) {
                  syncSquadData(prevHouse, auction.currentPlayerId, auction.currentBid, true);
              }
              
              history[lastIndex].houseName = houseName;
              updateDocumentNonBlocking(auctionRef, { history, lastUpdated: serverTimestamp() });
              
              syncSquadData(houseName, auction.currentPlayerId, auction.currentBid);
          }
      }
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

  const exportSoldGraphic = async (playerId: string) => {
    const node = document.getElementById(`sold-poster-${playerId}`);
    if (!node) return;
    
    setIsExporting(true);
    try {
      const dataUrl = await toPng(node, { quality: 0.95, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `Margazhi27_SOLD_${playerId}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: "Graphic Exported", description: "Official Vector-Art announcement poster saved." });
    } catch (err) {
      toast({ title: "Export Failed", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleUndo = () => {
    if (!auction || !auctionRef || auction.history.length === 0) return;
    const history = [...auction.history];
    const last = history.pop();
    
    if (last?.type === 'sold' && last.houseName) {
        syncSquadData(last.houseName, last.playerId, last.bid || 0, true);
    }

    const undrawn = [last!.playerId, ...(auction.undrawnIds || [])];

    updateDocumentNonBlocking(auctionRef, {
        status: 'bidding',
        hammerStep: 0,
        isSold: false,
        isUnsold: false,
        history,
        undrawnIds: undrawn,
        currentPlayerId: last?.playerId,
        currentBid: last?.bid || 0,
        lastUpdated: serverTimestamp()
    });
  };

  const hardResetAuction = () => {
    if (!auctionRef || !user || !set) return;
    if (confirm("Reset official session? This will clear all ledger entries and reshuffle assets.")) {
        setDocumentNonBlocking(auctionRef, {
            currentPlayerId: "",
            currentBid: 0,
            status: 'idle',
            hammerStep: 0,
            isSold: false,
            isUnsold: false,
            userId: user.uid,
            setId: set.id,
            lastUpdated: serverTimestamp(),
            history: [],
            undrawnIds: shuffleArray(set.players).map(p => p.id)
        });
    }
  };

  if (isLoadingAuction || !auction) {
    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-[200] vector-grid-bg">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-foreground/40 font-headline uppercase tracking-[0.4em] text-[11px]">Syncing Floor Ledger</p>
        </div>
    );
  }

  const hammerSteps = ['Going Once', 'Going Twice', 'Final Call'];

  return (
    <div className="fixed inset-0 flex flex-col items-center bg-background select-none overflow-hidden h-screen text-foreground vector-grid-bg gpu-layer">
      {/* HUD Header */}
      <div className="w-full flex items-center justify-between px-8 h-20 z-[100] bg-white border-b-2 border-foreground shadow-sm">
        <div className="flex items-center gap-6">
            <h2 className="font-headline text-lg text-foreground tracking-[0.4em] uppercase font-black italic">
              IPL AUCTION HUB
            </h2>
            <div className="h-6 w-px bg-foreground/10" />
            <span className="text-[10px] font-black uppercase text-foreground/40 tracking-widest">{set.name} Floor</span>
        </div>
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)} className="h-10 w-10 border-2 border-foreground hover:bg-accent">
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </Button>
            <Button onClick={() => setIsHistoryOpen(!isHistoryOpen)} className={cn("h-10 px-8 uppercase tracking-widest text-[10px] font-black border-2 border-foreground transition-colors", isHistoryOpen ? "bg-foreground text-white" : "bg-transparent text-foreground hover:bg-accent")}>Ledger</Button>
            <div className="h-8 w-px bg-foreground/10 mx-2" />
            <Button variant="outline" size="icon" onClick={handleUndo} className="h-10 w-10 border-2 border-foreground hover:bg-accent"><Undo2 size={16} /></Button>
            <Button variant="outline" size="icon" onClick={hardResetAuction} className="h-10 w-10 border-2 border-foreground text-destructive hover:bg-destructive/5"><ListRestart size={16} /></Button>
            <Button variant="outline" size="icon" onClick={() => router.push('/')} className="h-10 w-10 border-2 border-foreground"><X size={18} /></Button>
        </div>
      </div>

      <div className="flex flex-1 w-full relative overflow-hidden">
        {/* Hidden Export Cache */}
        <div className="absolute top-0 left-0 pointer-events-none opacity-0 z-[-100]">
            {set.players.map(p => {
              const histItem = auction.history.find(h => h.playerId === p.id && h.type === 'sold');
              return (
                <div key={`export-${p.id}`} className="fixed top-0 left-0">
                  <SoldPoster 
                    player={p} 
                    bid={histItem?.bid || 0} 
                    houseName={histItem?.houseName} 
                  />
                </div>
              );
            })}
        </div>

        {/* Ledger Sidebar */}
        <AnimatePresence>
          {isHistoryOpen && (
              <motion.aside 
                initial={{ x: -400 }}
                animate={{ x: 0 }}
                exit={{ x: -400 }}
                className="w-[380px] bg-white border-r-2 border-foreground h-full p-8 z-[90] flex flex-col shadow-2xl"
              >
                  <h3 className="text-foreground font-headline uppercase tracking-[0.4em] text-[11px] font-black mb-8 border-b-2 border-foreground pb-4">
                    Transaction History
                  </h3>
                  <ScrollArea className="flex-1 -mr-4 pr-4">
                      <div className="space-y-4">
                          {auction.history.slice().reverse().map((p, i) => (
                              <div key={i} className="bg-white border-2 border-foreground p-5 transition-all hover:bg-accent/30 group">
                                  <div className="flex justify-between items-start mb-2">
                                    <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5", p.type === 'sold' ? "bg-primary text-white" : "bg-foreground text-white")}>{p.type === 'sold' ? 'SOLD' : 'UNSOLD'}</span>
                                    {p.bid && <span className="text-sm font-mono font-black">{p.bid}L</span>}
                                  </div>
                                  <p className="text-[12px] font-black text-foreground uppercase truncate tracking-tight mb-2">{set.players.find(pl => pl.id === p.playerId)?.playerName}</p>
                                  {p.type === 'sold' && (
                                    <div className="flex items-center justify-between mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[9px] font-black text-foreground/40 uppercase tracking-widest">{p.houseName || 'Floor Sale'}</span>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => exportSoldGraphic(p.playerId)} 
                                            className="h-8 w-8 border border-foreground/10 hover:bg-white"
                                        >
                                            <ImageIcon size={14} />
                                        </Button>
                                    </div>
                                  )}
                              </div>
                          ))}
                          {auction.history.length === 0 && (
                            <div className="text-center py-32 text-foreground/20 font-headline uppercase tracking-[0.4em] text-[10px]">Empty Ledger</div>
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
                      initial={{ opacity: 0, scale: 0.98 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      className="w-full max-w-6xl aspect-[16/9] bg-white border-2 border-foreground shadow-[12px_12px_0px_rgba(0,0,0,1)] flex overflow-hidden relative"
                    >
                        {(auction.isSold || auction.isUnsold) && (
                            <motion.div 
                              initial={{ opacity: 0 }} 
                              animate={{ opacity: 1 }} 
                              className="absolute inset-0 z-[110] flex flex-col items-center justify-center bg-white/95 p-16 text-center"
                            >
                                <div className={cn("p-12 border-4 max-w-2xl w-full bg-white", auction.isSold ? "border-primary shadow-[10px_10px_0px_rgba(59,130,246,1)]" : "border-foreground shadow-[10px_10px_0px_rgba(0,0,0,1)]")}>
                                  <h2 className={cn("text-7xl font-headline font-black uppercase tracking-tighter mb-4", auction.isSold ? "text-primary" : "text-foreground")}>
                                    {auction.isSold ? 'SOLD' : 'UNSOLD'}
                                  </h2>
                                  <h3 className="text-3xl font-headline text-foreground uppercase tracking-widest border-y-2 border-foreground/10 py-6 my-6 font-black">
                                    {currentPlayer.playerName}
                                  </h3>
                                  {auction.isSold && (
                                    <div className="flex flex-col items-center gap-8">
                                        <div className="flex items-center justify-center gap-4">
                                            <span className="text-8xl font-mono font-black">{auction.currentBid}</span>
                                            <span className="text-2xl font-headline font-black italic text-foreground/30 pt-8">LAKH</span>
                                        </div>
                                    </div>
                                  )}
                                </div>
                                <Button onClick={handleNextLot} className="mt-8 h-14 px-12 text-sm vector-button bg-foreground text-white hover:bg-foreground/90">
                                  Next Lot <ArrowRight className="ml-3 h-5 w-5" />
                                </Button>
                            </motion.div>
                        )}

                        {auction.hammerStep > 0 && auction.hammerStep < 4 && !auction.isSold && (
                            <motion.div initial={{ y: -80 }} animate={{ y: 0 }} className="absolute top-0 left-0 w-full bg-primary py-4 flex justify-center z-[105] border-b-2 border-foreground">
                                <h2 className="text-3xl font-headline font-black uppercase tracking-[0.4em] text-white">
                                    {hammerSteps[auction.hammerStep - 1]}
                                </h2>
                            </motion.div>
                        )}

                        <div className="w-[48%] h-full border-r-2 border-foreground p-8 flex flex-col items-center justify-center bg-accent/30">
                            <div className="w-full aspect-[3/4] relative bg-white border-2 border-foreground overflow-hidden shadow-2xl">
                                {currentPlayer.imageUrl ? (
                                  <Image src={currentPlayer.imageUrl} alt={currentPlayer.playerName} fill className="object-contain p-4 scale-110" priority />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center opacity-5">
                                      <Image src="https://picsum.photos/seed/placeholder/400/600" alt="Placeholder" fill className="object-cover grayscale" />
                                  </div>
                                )}
                                <div className="absolute top-4 left-4">
                                  <Badge className="bg-foreground text-white font-black text-xs px-3 py-1 rounded-none uppercase tracking-widest">LOT #{currentPlayer.playerNumber}</Badge>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 p-10 lg:p-14 flex flex-col justify-between h-full">
                            <div>
                                <h1 className="text-5xl lg:text-7xl font-headline font-black text-foreground tracking-tighter leading-none mb-10 italic text-wrap break-words">
                                  {currentPlayer.playerName}
                                </h1>
                                <div className="grid grid-cols-2 gap-8 mb-8">
                                    {[
                                        { label: 'Role', value: currentPlayer.specialism },
                                        { label: 'Asset', value: currentPlayer.cua },
                                        { label: 'Score', value: `${currentPlayer.points} PTS` },
                                        { label: 'Region', value: currentPlayer.country },
                                    ].map((s, i) => (
                                        <div key={i} className="border-l-2 border-foreground/10 pl-5">
                                            <span className="text-[9px] text-foreground/40 font-black uppercase tracking-[0.2em] block mb-1">{s.label}</span>
                                            <span className="text-2xl font-headline font-black text-foreground uppercase truncate block tracking-wide">{s.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="bg-foreground text-white p-8 flex items-center justify-between shadow-[8px_8px_0px_rgba(59,130,246,1)] relative overflow-hidden min-h-[160px] mt-auto">
                                <div className="flex-1 z-10">
                                    <span className="text-[10px] font-black uppercase tracking-[0.4em] block mb-2 text-white/50">Current Bid</span>
                                    <div className="flex items-baseline gap-4">
                                        <motion.span 
                                          key={auction.currentBid}
                                          initial={{ scale: 1.1, opacity: 0 }}
                                          animate={{ scale: 1, opacity: 1 }}
                                          className="text-7xl lg:text-8xl font-mono font-black tracking-tighter leading-none"
                                        >
                                          {auction.currentBid}
                                        </motion.span>
                                        <span className="text-2xl lg:text-3xl font-headline font-black italic opacity-40 uppercase">LAKH</span>
                                    </div>
                                </div>

                                {isTimerActive && (
                                    <div className="bg-primary w-20 h-20 lg:w-24 lg:h-24 flex flex-col items-center justify-center border-4 border-white shadow-2xl ml-4 shrink-0">
                                        <span className={cn(
                                          "text-4xl lg:text-5xl font-mono font-black", 
                                          timer <= 5 ? "animate-pulse" : ""
                                        )}>
                                          {timer}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <div className="flex flex-col items-center gap-12">
                        <div className="text-center">
                          <h1 className="text-8xl font-headline font-black text-foreground uppercase tracking-tighter italic">
                            Standby
                          </h1>
                          <p className="text-[11px] font-black uppercase tracking-[0.8em] text-foreground/30 mt-4">
                            {auction.undrawnIds?.length || 0} Assets Remaining in Ledger
                          </p>
                        </div>
                        <Button 
                          onClick={handleDrawPlayer} 
                          disabled={auction.status === 'drawing' || !auction.undrawnIds || auction.undrawnIds.length === 0} 
                          className="h-20 px-24 text-xl vector-button bg-foreground text-white hover:bg-foreground/90 min-w-[320px]"
                        >
                          {auction.status === 'drawing' ? 'Syncing...' : auction.undrawnIds?.length ? 'Initiate Draw' : 'Roster Complete'}
                        </Button>
                    </div>
                )}
            </AnimatePresence>
        </main>
      </div>

      {/* Control Footer */}
      <footer className="w-full bg-white border-t-2 border-foreground p-6 z-[100] shadow-2xl">
        <div className="max-w-6xl mx-auto flex gap-6">
            {currentPlayer && !auction.isSold && !auction.isUnsold ? (
                <>
                    <Button 
                      onClick={handleIncreaseBid} 
                      className="h-16 flex-1 text-xl vector-button bg-primary text-white hover:bg-primary/90"
                    >
                      Increase Bid
                    </Button>
                    <Button 
                      onClick={handleHammerCall} 
                      disabled={auction.hammerStep > 0} 
                      className={cn(
                        "h-16 px-16 text-xl vector-button",
                        auction.hammerStep > 0 ? "bg-accent text-foreground/30" : "bg-foreground text-white"
                      )}
                    >
                        {auction.hammerStep === 0 ? 'Hammer' : hammerSteps[auction.hammerStep-1]}
                    </Button>
                    <Button 
                      onClick={handleUnsold} 
                      variant="outline" 
                      className="h-16 px-10 text-xl vector-button border-destructive/20 text-destructive hover:bg-destructive/5"
                    >
                      Unsold
                    </Button>
                </>
            ) : auction.isSold ? (
              <div className="flex items-center gap-4 w-full">
                  <Select value={winningHouse} onValueChange={assignWinningHouse}>
                      <SelectTrigger className="h-16 flex-1 border-2 border-foreground rounded-none font-black uppercase text-[12px] tracking-widest">
                          <SelectValue placeholder="Assign Winning Franchise" />
                      </SelectTrigger>
                      <SelectContent className="rounded-none border-2 border-foreground shadow-[6px_6px_0px_rgba(0,0,0,1)]">
                          {squads?.map(s => (
                              <SelectItem key={s.id} value={s.name} className="font-black uppercase tracking-widest text-[12px] h-14 cursor-pointer">
                                  {s.name}
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                  <Button 
                      onClick={() => exportSoldGraphic(currentPlayer!.id)} 
                      className="h-16 w-16 vector-button bg-primary text-white"
                      disabled={isExporting}
                  >
                      {isExporting ? <Loader2 className="animate-spin" size={20} /> : <ImageIcon size={20} />}
                  </Button>
                  <Button onClick={handleNextLot} className="h-16 px-12 text-sm vector-button bg-foreground text-white">
                      Next Lot <ArrowRight className="ml-3 h-5 w-5" />
                  </Button>
              </div>
            ) : (
                <Button 
                  onClick={handleDrawPlayer} 
                  disabled={auction.status === 'drawing' || !auction.undrawnIds || auction.undrawnIds.length === 0} 
                  className="h-16 w-full text-xl vector-button bg-foreground text-white"
                >
                    {auction.status === 'drawing' ? 'Syncing...' : auction.undrawnIds?.length ? `Draw Next Lot (${auction.undrawnIds.length} Left)` : 'Session Complete'}
                </Button>
            )}
        </div>
      </footer>
    </div>
  );
}
