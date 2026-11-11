'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { X, Trophy, Gavel, Undo2, RotateCcw, Shield, Loader2, Sparkles, Award, Zap, Timer, ChevronRight } from 'lucide-react';
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
    audio.volume = 0.2;
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
    }, 400);
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
              confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
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

  if (isLoadingAuction || !auction) {
    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-[200]">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <h2 className="text-primary font-headline uppercase tracking-widest text-xs">Preparing Floor...</h2>
        </div>
    );
  }

  const steps = ['Going Once', 'Going Twice', 'Final Call'];

  return (
    <div className="fixed inset-0 flex flex-col items-center bg-background select-none overflow-hidden h-screen text-foreground">
      {/* Premium Vector HUD */}
      <div className="w-full flex items-center justify-between px-8 py-4 z-[100] bg-white border-b border-border shadow-sm">
        <div className="flex items-center gap-6">
            <Trophy className="h-6 w-6 text-primary" />
            <h2 className="font-headline text-sm text-foreground tracking-[0.2em] uppercase">IPL AUCTION HUB <span className="text-primary/40 mx-2">//</span> MODERATOR FLOOR</h2>
        </div>
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setIsHistoryOpen(!isHistoryOpen)} className={cn("h-9 px-4 uppercase tracking-widest text-xs font-bold", isHistoryOpen ? "bg-secondary text-secondary-foreground" : "hover:bg-accent")}>History</Button>
            <div className="h-4 w-px bg-border mx-1" />
            <Button variant="outline" size="icon" onClick={handleUndo} className="h-9 w-9 border-border hover:text-primary"><Undo2 size={16} /></Button>
            <Button variant="outline" size="icon" onClick={() => router.push('/')} className="h-9 w-9 border-border"><X size={18} /></Button>
        </div>
      </div>

      <div className="flex flex-1 w-full relative overflow-hidden">
        {/* Ledger Sidebar - Premium Vector Style */}
        <AnimatePresence>
          {isHistoryOpen && (
              <motion.aside 
                initial={{ x: -350 }}
                animate={{ x: 0 }}
                exit={{ x: -350 }}
                transition={{ type: "tween", duration: 0.3 }}
                className="w-[350px] bg-white border-r border-border h-full p-8 z-[90] flex flex-col shadow-xl"
              >
                  <h3 className="text-foreground font-headline uppercase tracking-widest text-xs mb-8 flex items-center gap-3 border-b border-border pb-4">
                    <Award size={18} className="text-primary" /> Auction History
                  </h3>
                  <ScrollArea className="flex-1 -mr-4 pr-4">
                      <div className="space-y-4">
                          {auction.history.slice().reverse().map((p, i) => (
                              <div key={i} className="bg-background border border-border p-4 rounded-md transition-all hover:border-primary/40 group">
                                  <div className="flex justify-between items-start mb-2">
                                    <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded", p.type === 'sold' ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>{p.type === 'sold' ? 'SOLD' : 'UNSOLD'}</span>
                                    {p.bid && <span className="text-sm font-mono font-bold text-foreground">{p.bid}L</span>}
                                  </div>
                                  <p className="text-xs font-bold text-foreground uppercase truncate">{players.find(pl => pl.id === p.playerId)?.playerName}</p>
                              </div>
                          ))}
                          {auction.history.length === 0 && (
                            <div className="text-center py-20 text-muted-foreground italic text-xs uppercase tracking-widest">Awaiting Floor Activity</div>
                          )}
                      </div>
                  </ScrollArea>
              </motion.aside>
          )}
        </AnimatePresence>

        <main className="flex-1 flex flex-col items-center justify-center p-12 relative z-10">
            <AnimatePresence mode="wait">
                {auction.status !== 'drawing' && currentPlayer ? (
                    <motion.div 
                      key={currentPlayer.id}
                      initial={{ opacity: 0, y: 20 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      className="w-full max-w-6xl aspect-[16/9] bg-white border border-border rounded-xl shadow-2xl flex overflow-hidden relative"
                    >
                        {/* Sold/Unsold Cinematic Overlay - Clean Vector Art Style */}
                        {(auction.isSold || auction.isUnsold) && (
                            <motion.div 
                              initial={{ opacity: 0 }} 
                              animate={{ opacity: 1 }} 
                              className="absolute inset-0 z-[110] flex flex-col items-center justify-center bg-white/95 p-12 text-center"
                            >
                                <motion.div 
                                  initial={{ scale: 0.95, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  className={cn(
                                    "p-16 border-4 rounded-xl max-w-3xl w-full relative bg-white shadow-2xl",
                                    auction.isSold ? "border-primary" : "border-destructive"
                                  )}
                                >
                                  <Gavel size={80} className={cn("mx-auto mb-8", auction.isSold ? "text-primary" : "text-destructive")} />
                                  
                                  <h2 className={cn(
                                    "text-8xl font-headline font-black uppercase tracking-tighter leading-none mb-6", 
                                    auction.isSold ? "text-primary" : "text-destructive"
                                  )}>
                                    {auction.isSold ? 'SOLD' : 'UNSOLD'}
                                  </h2>
                                  
                                  <h3 className="text-4xl font-headline text-foreground uppercase tracking-widest border-y border-border py-8 my-8">
                                    {currentPlayer.playerName}
                                  </h3>
                                  
                                  {auction.isSold && (
                                    <div className="flex items-center justify-center gap-4">
                                      <span className="text-8xl font-mono font-black text-foreground">{auction.currentBid}L</span>
                                    </div>
                                  )}
                                </motion.div>

                                <Button 
                                  onClick={handleNextLot} 
                                  className="mt-12 h-16 px-16 text-xl font-headline font-black uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-lg"
                                >
                                  Next Lot
                                </Button>
                            </motion.div>
                        )}

                        {/* Hammer Step Header */}
                        {auction.hammerStep > 0 && auction.hammerStep < 4 && !auction.isSold && (
                            <motion.div 
                              initial={{ y: -100 }} 
                              animate={{ y: 0 }} 
                              className="absolute top-0 left-0 w-full bg-primary py-6 flex justify-center z-[105] shadow-lg"
                            >
                                <h2 className="text-4xl font-headline font-black uppercase tracking-[0.5em] text-primary-foreground">
                                    {steps[auction.hammerStep - 1].toUpperCase()}
                                </h2>
                            </motion.div>
                        )}

                        {/* Left Column: Player Visuals */}
                        <div className="w-[40%] h-full border-r border-border p-12 flex flex-col gap-8 bg-muted/30">
                            <div className="w-full aspect-[3/4] relative bg-white rounded-lg shadow-inner overflow-hidden flex items-center justify-center border border-border">
                                {currentPlayer.imageUrl ? (
                                  <Image 
                                    src={currentPlayer.imageUrl} 
                                    alt={currentPlayer.playerName} 
                                    fill 
                                    className="object-contain p-4" 
                                    priority
                                  />
                                ) : (
                                  <Shield className="w-full h-full p-24 opacity-5 text-primary" />
                                )}
                                <div className="absolute top-4 left-4">
                                  <Badge className="bg-secondary text-secondary-foreground font-bold text-lg px-3 py-1">LOT #{currentPlayer.playerNumber}</Badge>
                                </div>
                            </div>
                            <div className="flex-1 bg-white p-6 rounded-lg border border-border shadow-sm">
                                <span className="text-[10px] text-primary font-black uppercase tracking-widest block mb-3">Scouting Insight</span>
                                <p className="text-sm text-foreground/70 leading-relaxed font-medium italic">
                                  {currentPlayer.auctionInsight || 'Strategic asset with high performance metrics for current squad requirements.'}
                                </p>
                            </div>
                        </div>

                        {/* Right Column: Player Details & Bidding */}
                        <div className="flex-1 p-16 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-4 mb-6">
                                  <span className="font-headline text-[10px] text-primary font-black uppercase tracking-widest border-l-2 border-primary pl-4">Live Floor Active</span>
                                  {auction.currentBid >= MARQUEE_THRESHOLD && <Badge className="bg-primary text-primary-foreground text-[10px] px-3">MARQUEE</Badge>}
                                </div>
                                <h1 className="text-7xl font-headline font-black text-foreground tracking-tighter mb-12 leading-none">
                                  {currentPlayer.playerName}
                                </h1>
                                <div className="grid grid-cols-2 gap-12">
                                    {[
                                        { label: 'Specialism', value: currentPlayer.specialism },
                                        { label: 'Category', value: currentPlayer.cua },
                                        { label: 'Rating', value: `${currentPlayer.points} PTS` },
                                        { label: 'Country', value: currentPlayer.country },
                                    ].map((s, i) => (
                                        <div key={i}>
                                            <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest block mb-2">{s.label}</span>
                                            <span className="text-2xl font-headline font-bold text-foreground uppercase tracking-wide block truncate">{s.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Bidding & Timer Block */}
                            <div className="bg-secondary text-secondary-foreground p-10 rounded-xl flex items-center justify-between shadow-xl relative overflow-hidden">
                                <div className="flex-1">
                                    <span className="text-[11px] font-black uppercase tracking-widest block mb-2 opacity-60">Current Valuation</span>
                                    <div className="flex items-baseline gap-4">
                                        <motion.span 
                                          key={auction.currentBid}
                                          initial={{ scale: 1.1 }}
                                          animate={{ scale: 1 }}
                                          className="text-8xl font-mono font-black tracking-tighter leading-none"
                                        >
                                          {auction.currentBid}
                                        </motion.span>
                                        <span className="text-4xl font-headline font-black italic opacity-80">LAKH</span>
                                    </div>
                                </div>

                                {/* Simplified, High-Performance Timer */}
                                {isTimerActive && (
                                    <div className="bg-primary w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-lg animate-in zoom-in duration-300">
                                        <Timer size={20} className="mb-1 text-primary-foreground" />
                                        <span className={cn(
                                          "text-3xl font-mono font-black", 
                                          timer <= 5 ? "text-white animate-pulse" : "text-primary-foreground"
                                        )}>
                                          {timer}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      className="flex flex-col items-center gap-12"
                    >
                        <Trophy size={100} className="text-primary opacity-20" />
                        <div className="space-y-4 text-center">
                          <h1 className="text-8xl font-headline font-black text-foreground uppercase tracking-tighter">
                            Standby
                          </h1>
                          <p className="text-sm font-headline text-muted-foreground tracking-[0.5em] uppercase">Awaiting Floor Signal</p>
                        </div>
                        <Button 
                          onClick={handleDrawPlayer} 
                          disabled={auction.status === 'drawing'} 
                          className="h-20 px-20 text-2xl font-headline font-black uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-xl"
                        >
                          {auction.status === 'drawing' ? 'Syncing...' : 'Reveal Lot'}
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
      </div>

      {/* Premium Footer Controls */}
      <footer className="w-full bg-white border-t border-border p-8 z-[100] shadow-2xl">
        <div className="max-w-7xl mx-auto flex gap-4">
            {currentPlayer && !auction.isSold && !auction.isUnsold ? (
                <>
                    <Button 
                      onClick={handleIncreaseBid} 
                      className="h-16 flex-1 text-xl font-headline font-black tracking-widest uppercase bg-primary hover:bg-primary/90 shadow-md"
                    >
                      Raise Bid
                    </Button>
                    <Button 
                      onClick={handleHammerCall} 
                      disabled={auction.hammerStep > 0} 
                      className={cn(
                        "h-16 px-16 font-headline font-black tracking-widest uppercase text-xl transition-all shadow-md",
                        auction.hammerStep > 0 ? "bg-muted text-foreground cursor-wait" : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                      )}
                    >
                        {auction.hammerStep === 0 ? 'Hammer' : steps[auction.hammerStep-1]}
                    </Button>
                    <Button 
                      onClick={handleUnsold} 
                      variant="outline" 
                      className="h-16 px-12 font-headline font-black tracking-widest uppercase text-xl border-destructive/20 text-destructive hover:bg-destructive/5"
                    >
                      Unsold
                    </Button>
                </>
            ) : (
                <Button 
                  onClick={handleDrawPlayer} 
                  disabled={auction.status === 'drawing'} 
                  className="h-16 w-full text-xl font-headline font-black uppercase tracking-widest bg-primary shadow-md"
                >
                    {auction.status === 'drawing' ? 'Processing...' : `Draw Next Player (${undrawnIds.length} Left)`}
                </Button>
            )}
        </div>
      </footer>
    </div>
  );
}