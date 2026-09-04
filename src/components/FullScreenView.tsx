
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { X, RefreshCw, Keyboard, Clock3, Shield, History, Trophy, Gavel, Share2, Sparkles } from 'lucide-react';
import { Player, PlayerSet, ActiveAuctionState } from '@/lib/player-data';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useFirestore, useUser, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';

interface FullScreenViewProps {
    players: Player[];
    set: PlayerSet;
    onReset: () => void;
}

interface DrawnPlayer extends Player {
    status: 'sold' | 'unsold';
    finalPrice?: number;
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

type FinalCallStatus = 'none' | 'once' | 'twice' | 'final';

const DEFAULT_TIMER = 20;
const MARQUEE_THRESHOLD = 1000;

export default function FullScreenView({ players, set, onReset }: FullScreenViewProps) {
  const [undrawnPlayers, setUndrawnPlayers] = useState<Player[]>([...players]);
  const [drawnPlayers, setDrawnPlayers] = useState<DrawnPlayer[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [currentBid, setCurrentBid] = useState<number>(0);
  const [timer, setTimer] = useState<number>(DEFAULT_TIMER);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isSold, setIsSold] = useState(false);
  const [isUnsold, setIsUnsold] = useState(false);
  const [finalCallStatus, setFinalCallStatus] = useState<FinalCallStatus>('none');
  const [shouldShake, setShouldShake] = useState(false);

  const timerInterval = useRef<NodeJS.Timeout>(null);

  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({
    reveal: typeof Audio !== 'undefined' ? new Audio(SOUNDS.REVEAL) : null,
    sold: typeof Audio !== 'undefined' ? new Audio(SOUNDS.SOLD) : null,
    buzzer: typeof Audio !== 'undefined' ? new Audio(SOUNDS.BUZZER) : null,
    tick: typeof Audio !== 'undefined' ? new Audio(SOUNDS.TICK) : null,
    unsold: typeof Audio !== 'undefined' ? new Audio(SOUNDS.UNSOLD) : null,
    heartbeat: typeof Audio !== 'undefined' ? new Audio(SOUNDS.HEARTBEAT) : null,
    hype: typeof Audio !== 'undefined' ? new Audio(SOUNDS.HYPE) : null,
  });

  const syncToLiveFloor = useCallback((state: Partial<ActiveAuctionState>) => {
    if (!firestore || !user || !set.id) return;
    const auctionRef = doc(firestore, 'activeAuctions', user.uid);
    updateDocumentNonBlocking(auctionRef, {
        ...state,
        setId: set.id,
        userId: user.uid,
        lastUpdated: serverTimestamp()
    });
  }, [firestore, user, set.id]);

  const playSound = useCallback((key: string) => {
    const audio = audioRefs.current[key];
    if (audio) {
        audio.currentTime = 0;
        audio.volume = 0.5;
        audio.play().catch(() => {});
    }
  }, []);

  const triggerConfetti = (isMarquee: boolean) => {
    if (isMarquee) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);
    } else {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFFFFF', '#8B0000']
      });
    }
  };

  useEffect(() => {
    if (isTimerActive && timer > 0) {
        timerInterval.current = setInterval(() => {
            setTimer(prev => {
                if (prev <= 6 && prev > 1) playSound('tick');
                if (prev <= 5 && prev > 1) playSound('heartbeat');
                if (prev === 1) playSound('buzzer');
                return prev - 1;
            });
        }, 1000);
    } else if (timer === 0) {
        setIsTimerActive(false);
    }

    return () => {
        if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [isTimerActive, timer, playSound]);

  const handleDrawPlayer = useCallback(() => {
    if (undrawnPlayers.length === 0 || isDrawing) return;

    setIsDrawing(true);
    setCurrentPlayer(null);
    setIsSold(false);
    setIsUnsold(false);
    setIsTimerActive(false);
    setFinalCallStatus('none');
    setTimer(DEFAULT_TIMER);
    setShouldShake(false);

    syncToLiveFloor({ status: 'drawing', isSold: false, isUnsold: false });

    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * undrawnPlayers.length);
      const newDrawnPlayer = undrawnPlayers[randomIndex];
      
      setCurrentPlayer(newDrawnPlayer);
      setCurrentBid(newDrawnPlayer.reservePrice || 0);
      setUndrawnPlayers(prev => prev.filter(p => p.id !== newDrawnPlayer.id));
      setIsDrawing(false);
      playSound('reveal');
      setIsTimerActive(true);

      syncToLiveFloor({
          status: 'bidding',
          currentPlayerId: newDrawnPlayer.id,
          currentBid: newDrawnPlayer.reservePrice || 0
      });
    }, 1000);
  }, [isDrawing, undrawnPlayers, playSound, syncToLiveFloor]);
  
  const resetAuction = () => {
    if (window.confirm("Reset auction session? All progress will be lost.")) {
        onReset();
        setCurrentPlayer(null);
        setCurrentBid(0);
        setIsSold(false);
        setIsUnsold(false);
        setDrawnPlayers([]);
        setTimer(DEFAULT_TIMER);
        setIsTimerActive(false);
        setShouldShake(false);
        syncToLiveFloor({ status: 'idle', currentPlayerId: '', currentBid: 0, isSold: false, isUnsold: false });
    }
  };

  const getIncrement = (value: number) => {
    if (value < 100) return 5; 
    if (value < 200) return 10;
    if (value < 500) return 20;
    return 50;
  };

  const nextValidBid = parseFloat((currentBid + getIncrement(currentBid)).toFixed(2));

  const handleSold = useCallback(() => {
    if (!currentPlayer || isSold || isUnsold) return;
    setIsSold(true);
    setIsTimerActive(false);
    setFinalCallStatus('none');
    setDrawnPlayers(prev => [{ ...currentPlayer, status: 'sold', finalPrice: currentBid } as DrawnPlayer, ...prev]);
    playSound('sold');
    triggerConfetti(currentBid >= MARQUEE_THRESHOLD);
    syncToLiveFloor({ status: 'sold', isSold: true });
  }, [currentPlayer, isSold, isUnsold, currentBid, playSound, syncToLiveFloor]);

  const handleUnsold = () => {
    if (!currentPlayer || isSold || isUnsold) return;
    setIsUnsold(true);
    setIsTimerActive(false);
    setFinalCallStatus('none');
    setDrawnPlayers(prev => [{ ...currentPlayer, status: 'unsold' } as DrawnPlayer, ...prev]);
    playSound('unsold');
    syncToLiveFloor({ status: 'unsold', isUnsold: true });
  };

  useEffect(() => {
    if (finalCallStatus !== 'none' && !isSold && !isUnsold) {
      const stepDuration = 1500;
      const hammerTimer = setTimeout(() => {
        if (finalCallStatus === 'once') {
          setFinalCallStatus('twice');
          playSound('tick');
        } else if (finalCallStatus === 'twice') {
          setFinalCallStatus('final');
          playSound('tick');
        } else if (finalCallStatus === 'final') {
          handleSold();
        }
      }, stepDuration);
      
      return () => clearTimeout(hammerTimer);
    }
  }, [finalCallStatus, isSold, isUnsold, handleSold, playSound]);

  const handleIncreaseBid = () => {
    if (isSold || isUnsold) return;
    const newBid = nextValidBid;

    if (newBid >= MARQUEE_THRESHOLD && currentBid < MARQUEE_THRESHOLD) {
      playSound('hype');
      setShouldShake(true);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#FFD700']
      });
      setTimeout(() => setShouldShake(false), 500);
    }

    setCurrentBid(newBid);
    setTimer(DEFAULT_TIMER);
    setFinalCallStatus('none');
    setIsTimerActive(true);
    syncToLiveFloor({ currentBid: newBid, status: 'bidding' });
  };

  const startHammerSequence = () => {
    if (isSold || isUnsold || !currentPlayer) return;
    setFinalCallStatus('once');
    setIsTimerActive(false);
    playSound('tick');
  };

  const copyLiveLink = () => {
    if (!user) return;
    const link = `${window.location.origin}/live/${user.uid}`;
    navigator.clipboard.writeText(link);
    toast({
        title: 'Persistent Link Copied',
        description: 'Share this with participants to follow the live auction floor.',
    });
  }

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

      if (event.key === ' ' && !isDrawing) {
        event.preventDefault();
        if (!currentPlayer) handleDrawPlayer();
        else if (!isSold && !isUnsold) handleIncreaseBid();
      } else if (event.key === 'Escape') {
        router.push('/');
      } else if (event.key === 'u' && currentPlayer && !isSold && !isUnsold) {
        handleUnsold();
      } else if (event.key === 'f' && currentPlayer && !isSold && !isUnsold) {
        startHammerSequence();
      } else if (event.key === 'r' && currentPlayer && !isSold && !isUnsold) {
        setTimer(DEFAULT_TIMER);
        setIsTimerActive(true);
        setFinalCallStatus('none');
      } else if (event.key === 'h') {
        setIsHistoryOpen(prev => !prev);
      } else if (event.key === '?') {
        setIsHelpOpen(prev => !prev);
      }
    }, [handleDrawPlayer, router, currentPlayer, isSold, isUnsold, handleIncreaseBid, startHammerSequence]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
      if (firestore && user && set.id) {
          const auctionRef = doc(firestore, 'activeAuctions', user.uid);
          setDocumentNonBlocking(auctionRef, {
              status: 'idle',
              currentPlayerId: '',
              setId: set.id,
              currentBid: 0,
              isSold: false,
              isUnsold: false,
              userId: user.uid,
              lastUpdated: serverTimestamp()
          }, { merge: true });
      }
  }, [firestore, user, set.id]);

  const isMarquee = currentBid >= MARQUEE_THRESHOLD;

  return (
    <div className="fixed inset-0 flex flex-col items-center bg-background sunburst-bg select-none overflow-hidden h-screen text-foreground">
      
      <div className="w-full flex items-center justify-between px-6 py-4 z-40 bg-black/20 backdrop-blur-sm border-b border-primary/20">
        <div className="flex items-center gap-4">
            <Trophy className="h-6 w-6 text-primary" />
            <h2 className="font-serif text-lg text-primary tracking-[0.2em] uppercase font-bold">SAAVAN '26</h2>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={copyLiveLink}
                className="h-9 px-4 flex items-center gap-2 bg-primary text-primary-foreground border-primary rounded transition-all text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(255,215,0,0.3)]"
            >
                <Share2 size={16} /> Live Feed
            </button>
            <button 
                onClick={() => setIsHistoryOpen(!isHistoryOpen)} 
                className={cn(
                    "h-9 px-4 flex items-center gap-2 rounded border transition-all text-xs font-bold uppercase tracking-widest",
                    isHistoryOpen ? "bg-primary text-primary-foreground border-primary" : "bg-black/40 border-primary/20 text-primary hover:bg-primary/20"
                )}
            >
                <History size={16} /> History
            </button>
            <button onClick={() => setIsHelpOpen(true)} className="h-9 px-4 flex items-center gap-2 bg-black/40 border border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground rounded transition-all text-xs font-bold uppercase tracking-widest">
                <Keyboard size={16} /> Help
            </button>
            <button onClick={resetAuction} className="h-9 w-9 flex items-center justify-center bg-black/40 border border-red-900/40 text-red-500 hover:bg-red-600 hover:text-white rounded transition-all">
                <RefreshCw size={16} />
            </button>
            <button onClick={() => router.push('/')} className="h-9 w-9 flex items-center justify-center bg-black/40 border border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground rounded transition-all">
                <X size={20} />
            </button>
        </div>
      </div>

      <div className="flex flex-1 w-full relative overflow-hidden">
        
        <AnimatePresence>
            {isHistoryOpen && (
                <motion.aside
                    initial={{ x: -300, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -300, opacity: 0 }}
                    className="w-80 bg-black/40 backdrop-blur-xl border-r border-primary/20 h-full flex flex-col shadow-2xl z-30"
                >
                    <div className="p-6 border-b border-primary/20 flex items-center justify-between">
                        <span className="font-serif text-sm text-primary uppercase tracking-[0.3em] font-black">Auction Log</span>
                        <History size={16} className="text-primary/40" />
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                        {drawnPlayers.length > 0 ? (
                            drawnPlayers.map((p, i) => (
                                <motion.div 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    key={i} 
                                    className="bg-black/60 border border-primary/10 p-3 rounded relative overflow-hidden group"
                                >
                                    <div className={cn(
                                        "absolute left-0 top-0 bottom-0 w-1",
                                        p.status === 'sold' ? "bg-primary shadow-[0_0_10px_gold]" : "bg-destructive shadow-[0_0_10px_red]"
                                    )} />
                                    <p className="font-serif text-[11px] text-white uppercase tracking-wider truncate mb-1">{p.playerName}</p>
                                    <div className="flex items-center justify-between">
                                        <span className={cn(
                                            "text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded",
                                            p.status === 'sold' ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
                                        )}>
                                            {p.status}
                                        </span>
                                        {p.status === 'sold' && (
                                            <span className="text-xs font-mono font-black text-primary">{p.finalPrice}L</span>
                                        )}
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center px-4">
                                <Gavel size={40} className="text-primary mb-4" />
                                <p className="text-[10px] uppercase tracking-[0.3em] font-black">Floor Empty</p>
                            </div>
                        )}
                    </div>
                </motion.aside>
            )}
        </AnimatePresence>

        <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
            <AnimatePresence mode="wait">
                {!isDrawing && currentPlayer ? (
                    <motion.div 
                        key={currentPlayer.id}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ 
                          opacity: 1, 
                          scale: 1,
                          x: shouldShake ? [0, -10, 10, -10, 10, 0] : 0 
                        }}
                        exit={{ opacity: 0, scale: 1.02 }}
                        className={cn(
                          "w-full max-w-5xl aspect-[16/9] max-h-[68vh] ornate-border bg-[#1a0202]/95 backdrop-blur-xl shadow-[0_0_100px_rgba(0,0,0,0.8)] flex overflow-hidden relative",
                          isMarquee && "border-primary shadow-[0_0_60px_rgba(255,215,0,0.2)]"
                        )}
                    >
                        <AnimatePresence>
                            {(isSold || isUnsold) && (
                                <motion.div 
                                    initial={{ opacity: 0 }} 
                                    animate={{ opacity: 1 }} 
                                    className="absolute inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 sm:p-8"
                                >
                                    <motion.div 
                                        initial={{ scale: 0.9, opacity: 0 }} 
                                        animate={{ scale: 1, opacity: 1 }}
                                        className={cn(
                                            "w-full h-full border-[8px] flex flex-col items-center justify-between p-6 relative overflow-hidden ornate-border",
                                            isSold ? "border-primary shadow-[inset_0_0_60px_rgba(255,215,0,0.2)]" : "border-destructive shadow-[inset_0_0_60px_rgba(255,0,0,0.2)]"
                                        )}
                                    >
                                        <div className="flex flex-col items-center mt-2">
                                            <Trophy className={cn("w-12 h-12 mb-2", isSold ? "text-primary animate-bounce" : "text-destructive")} />
                                            <h2 className={cn(
                                                "text-6xl sm:text-8xl font-serif font-black uppercase italic tracking-tighter leading-none drop-shadow-[0_0_30px_black]",
                                                isSold ? "text-primary text-glow-gold" : "text-destructive text-glow-red"
                                            )}>
                                                {isSold ? 'SOLD' : 'UNSOLD'}
                                            </h2>
                                        </div>
                                        
                                        <div className="text-center flex-1 flex flex-col justify-center items-center py-4">
                                            <h3 className="text-2xl sm:text-4xl font-serif text-white uppercase tracking-[0.4em] mb-4 text-center">
                                                {currentPlayer.playerName}
                                            </h3>
                                            {isSold && (
                                                <div 
                                                  className={cn(
                                                    "flex items-baseline justify-center gap-4 px-8 sm:px-16 py-4 sm:py-6 border-2 backdrop-blur-md",
                                                    isMarquee ? "bg-primary/20 border-primary shadow-[0_0_50px_rgba(255,215,0,0.4)]" : "bg-primary/10 border-primary/40"
                                                  )}
                                                >
                                                    <span className="text-6xl sm:text-8xl font-mono font-black text-white">{currentBid}</span>
                                                    <span className="text-2xl sm:text-4xl font-serif text-primary italic font-black uppercase tracking-widest">L</span>
                                                </div>
                                            )}
                                        </div>

                                        <Button 
                                            onClick={handleDrawPlayer} 
                                            className="h-12 sm:h-14 px-12 sm:px-20 bg-primary text-primary-foreground font-black uppercase tracking-[0.4em] hover:scale-105 transition-all shadow-[0_0_30px_gold] text-lg sm:text-xl rounded-none mt-2"
                                        >
                                            Next Entry
                                        </Button>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="w-[320px] h-full flex flex-col bg-black/40 border-r border-primary/20 overflow-hidden">
                            <div className="flex-1 p-6 flex flex-col gap-6">
                                <div className={cn(
                                  "w-full aspect-[3/4] relative border-4 bg-black/60 shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden",
                                  isMarquee ? "border-primary" : "border-primary/40"
                                )}>
                                    <div className="absolute inset-0 z-10 pointer-events-none border border-primary/20" />
                                    <div className="w-full h-full relative">
                                        {currentPlayer.imageUrl ? (
                                            <Image 
                                                src={currentPlayer.imageUrl} 
                                                alt={currentPlayer.playerName} 
                                                fill 
                                                className="object-cover"
                                                sizes="320px"
                                                priority
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center opacity-10">
                                                <Shield size={100} className="text-primary" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 border border-primary/30 bg-secondary/5 p-5 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/40" />
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/40" />
                                    <span className="text-[9px] text-primary font-black tracking-[0.4em] uppercase block mb-3 border-b border-primary/20 pb-2">Scout Analysis</span>
                                    <div className="h-[calc(100%-35px)] overflow-y-auto custom-scrollbar pr-2">
                                        <p className="text-[12px] font-sans italic text-foreground/90 leading-relaxed">
                                            {currentPlayer.auctionInsight || 'High-value strategic asset with exceptional performance metrics. Identified as a core rotation player for top-tier squads.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col p-8 relative bg-[radial-gradient(circle_at_top_right,rgba(255,215,0,0.05),transparent)]">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-primary font-black tracking-[0.5em] uppercase border-l-2 border-primary pl-3">Official Lot Entry</span>
                                    {isMarquee && (
                                      <motion.div 
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="bg-primary text-primary-foreground px-3 py-0.5 rounded-full flex items-center gap-1.5"
                                      >
                                        <Sparkles size={10} />
                                        <span className="text-[8px] font-black uppercase tracking-widest">Marquee Status</span>
                                      </motion.div>
                                    )}
                                </div>
                                <div className="bg-primary/10 border border-primary/40 px-4 py-1">
                                    <span className="text-[10px] text-primary font-black tracking-widest uppercase italic">PLAYER NO. {currentPlayer.playerNumber}</span>
                                </div>
                            </div>

                            <h1 className="text-5xl font-serif font-black text-white uppercase italic tracking-tighter mb-6 drop-shadow-[0_4px_15px_rgba(0,0,0,1)]">
                                {currentPlayer.playerName}
                            </h1>

                            <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-6">
                                {[
                                    { label: 'Nationality', value: currentPlayer.country },
                                    { label: 'Role', value: currentPlayer.specialism },
                                    { label: 'Category', value: currentPlayer.cua },
                                    { label: 'Rating', value: currentPlayer.points },
                                ].map((stat, i) => (
                                    <div key={i} className="flex flex-col border-b border-primary/20 pb-2 group">
                                        <span className="text-[9px] text-primary/60 font-black tracking-[0.3em] uppercase mb-1 group-hover:text-primary transition-colors">{stat.label}</span>
                                        <span className="font-serif text-base text-white font-bold tracking-[0.1em]">{stat.value || 'N/A'}</span>
                                    </div>
                                ))}
                            </div>

                            <div className={cn(
                              "mt-auto border-4 bg-black/80 p-6 relative overflow-hidden min-h-[180px] flex flex-col justify-center transition-all duration-500",
                              isMarquee ? "border-primary shadow-[0_0_40px_rgba(255,215,0,0.3)]" : "border-primary/30"
                            )}>
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                                
                                <AnimatePresence>
                                    {finalCallStatus !== 'none' && !isSold && !isUnsold && (
                                        <motion.div 
                                            initial={{ x: '100%' }} 
                                            animate={{ x: 0 }} 
                                            exit={{ x: '-100%' }}
                                            className="absolute inset-0 z-30 flex items-center justify-center bg-gradient-to-r from-red-900/90 via-primary to-red-900/90"
                                        >
                                            <span className="text-3xl sm:text-4xl font-serif font-black uppercase italic tracking-[0.2em] text-primary-foreground drop-shadow-2xl text-center px-4">
                                                {finalCallStatus === 'once' ? 'GOING ONCE' : finalCallStatus === 'twice' ? 'GOING TWICE' : 'FINAL CALL'}
                                            </span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {isTimerActive && (
                                    <div className="absolute top-2 right-2 w-12 h-12 rounded-full bg-[#1a0202] border-4 border-primary flex items-center justify-center z-40 shadow-[0_0_20px_gold]">
                                        <span className={cn(
                                            "text-lg font-mono font-black",
                                            timer <= 5 ? "text-destructive" : "text-primary"
                                        )}>
                                            {timer}
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_10px_red]" />
                                    <span className="text-[10px] text-primary font-black tracking-[0.3em] uppercase">Live Floor Valuation</span>
                                    
                                    <div className="ml-auto flex gap-1.5 pr-14">
                                        {[1, 2, 3].map((idx) => (
                                            <div key={idx} className={cn(
                                                "w-8 h-1.5 transition-all duration-500 rounded-sm", 
                                                ((idx === 1 && finalCallStatus !== 'none') || (idx === 2 && (finalCallStatus === 'twice' || finalCallStatus === 'final')) || (idx === 3 && finalCallStatus === 'final')) 
                                                ? "bg-primary shadow-[0_0_15px_gold]" 
                                                : "bg-white/5"
                                            )} />
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-baseline gap-4 mb-2">
                                    <motion.span 
                                        key={currentBid}
                                        initial={{ scale: 0.8, opacity: 0 }} 
                                        animate={{ scale: 1, opacity: 1 }}
                                        className={cn(
                                          "text-6xl sm:text-7xl font-mono font-black leading-none tracking-tighter text-shadow-lg",
                                          isMarquee ? "text-primary text-glow-gold" : "text-white"
                                        )}
                                    >
                                        {currentBid}
                                    </motion.span>
                                    <span className="text-2xl sm:text-3xl font-serif text-primary italic font-black uppercase tracking-[0.2em]">L</span>
                                </div>

                                <div className="flex items-center justify-between border-t border-primary/30 pt-3">
                                    <div className="text-[9px] text-primary/60 font-bold uppercase tracking-[0.3em]">
                                        Base Entry: <span className="text-white ml-2">{currentPlayer.reservePrice}L</span>
                                    </div>
                                    <div className={cn(
                                      "px-3 py-0.5 border transition-all",
                                      isMarquee ? "bg-primary/30 border-primary" : "bg-primary/20 border-primary/30"
                                    )}>
                                        <span className="text-[9px] text-primary font-black uppercase tracking-[0.3em]">
                                            Next Slab: <span className="text-white ml-2">{nextValidBid}L</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : isDrawing ? (
                    <div className="flex flex-col items-center gap-8">
                        <div className="w-20 h-20 border-8 border-primary border-t-transparent animate-spin rounded-full shadow-[0_0_40px_gold]" />
                        <h1 className="text-3xl text-primary font-black font-serif tracking-[0.8em] uppercase">Player Drawing...</h1>
                    </div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center gap-12 text-center"
                    >
                        <div className="space-y-4">
                            <Trophy size={80} className="text-primary mx-auto mb-6" />
                            <h1 className="text-8xl font-serif font-black text-primary tracking-[0.4em] uppercase italic drop-shadow-[0_0_30px_rgba(255,215,0,0.5)]">Saavan '26</h1>
                            <p className="text-white/40 text-xs tracking-[1.5em] font-black uppercase ml-[1.5em]">Command Terminal V.2</p>
                        </div>
                        <Button 
                            onClick={handleDrawPlayer} 
                            className="h-20 px-24 text-2xl font-black font-serif bg-primary text-primary-foreground tracking-[0.5em] uppercase hover:scale-105 transition-all shadow-[0_0_40px_gold] rounded-none"
                        >
                            Open Floor
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
      </div>

      <footer className="w-full flex flex-col items-center gap-4 py-6 px-12 z-50 bg-black/40 backdrop-blur-md border-t border-primary/20">
        <div className="flex items-center gap-6 w-full max-w-5xl">
            {currentPlayer && !isSold && !isUnsold ? (
                <>
                    <Button 
                        onClick={handleIncreaseBid} 
                        className={cn(
                          "h-14 flex-1 font-serif font-black text-lg tracking-[0.2em] uppercase rounded-none transition-all",
                          isMarquee ? "bg-accent text-white hover:bg-accent/90 shadow-[0_0_20px_rgba(255,165,0,0.5)]" : "bg-primary text-primary-foreground hover:shadow-[0_0_20px_gold]"
                        )}
                    >
                        + Raise Bid ({getIncrement(currentBid).toFixed(0)}L)
                    </Button>
                    
                    <Button 
                        onClick={() => { setTimer(DEFAULT_TIMER); setIsTimerActive(true); setFinalCallStatus('none'); }} 
                        variant="outline" 
                        className="h-14 px-8 border-white/20 bg-black/40 text-white font-serif font-black text-xs tracking-[0.2em] uppercase rounded-none hover:bg-white/10"
                    >
                        <Clock3 className="mr-3 h-5 w-5"/> Reset Clock
                    </Button>

                    <Button 
                        onClick={startHammerSequence} 
                        disabled={finalCallStatus !== 'none'} 
                        className="h-14 px-10 bg-accent hover:bg-accent/90 text-white font-serif font-black text-xs tracking-[0.2em] uppercase rounded-none shadow-xl disabled:opacity-30"
                    >
                        Initiate Hammer
                    </Button>

                    <Button 
                        onClick={handleUnsold} 
                        className="h-14 px-8 bg-red-950/80 border border-red-900/40 text-red-500 font-serif font-black text-xs tracking-[0.2em] uppercase rounded-none hover:bg-red-600 hover:text-white transition-all"
                    >
                        Unsold
                    </Button>
                </>
            ) : (undrawnPlayers.length > 0 && !isDrawing) || (isSold || isUnsold) ? (
                <Button 
                    onClick={handleDrawPlayer} 
                    className="h-14 w-full font-black font-serif text-base bg-primary text-primary-foreground tracking-[0.4em] uppercase rounded-none hover:shadow-[0_0_30px_gold]"
                >
                    {undrawnPlayers.length > 0 ? 'Reveal Next Player' : 'All Players Complete'}
                </Button>
            ) : null}
        </div>

        <div className="flex items-center gap-8">
            <span className="text-[10px] font-mono font-black text-primary/60 tracking-[0.4em] uppercase">
                {undrawnPlayers.length} Players Remaining
            </span>
            <div className="h-1 w-1 rounded-full bg-primary/30" />
            <span className="text-[10px] font-mono font-black text-primary/60 tracking-[0.4em] uppercase italic">
                {set.name}
            </span>
        </div>
      </footer>

      <AnimatePresence>
        {isHelpOpen && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-8"
                onClick={() => setIsHelpOpen(false)}
            >
                <div className="max-w-xl w-full bg-[#1a0202] border-4 border-primary/40 p-10 shadow-2xl relative ornate-border" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setIsHelpOpen(false)} className="absolute top-6 right-6 text-primary hover:text-white transition-colors">
                        <X size={28} />
                    </button>
                    <h2 className="text-3xl font-serif text-primary uppercase tracking-[0.4em] border-b border-primary/20 pb-6 mb-8 text-center">Moderator Terminal</h2>
                    <div className="space-y-3">
                        {[
                            { key: 'Space', action: 'Reveal Player / Raise Bid' },
                            { key: 'F', action: 'Initiate Hammer (Once/Twice/Sold)' },
                            { key: 'U', action: 'Mark Player as Unsold' },
                            { key: 'R', action: 'Reset 20s Countdown' },
                            { key: 'H', action: 'Toggle Result History' },
                            { key: 'Esc', action: 'Exit to Dashboard' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between bg-white/5 p-4 border border-white/10 hover:border-primary/50 transition-all group">
                                <span className="text-[10px] font-black bg-primary text-primary-foreground px-3 py-1 uppercase group-hover:shadow-[0_0_10px_gold] transition-all">{item.key}</span>
                                <span className="text-[10px] uppercase font-bold text-white/60 tracking-widest">{item.action}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-10 text-center opacity-30">
                        <p className="text-[9px] uppercase tracking-[0.5em] font-black">Official SAAVAN Control System</p>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
      
      <style jsx global>{`
        .text-glow-gold {
            text-shadow: 0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3);
        }
        .text-glow-red {
            text-shadow: 0 0 20px rgba(255, 0, 0, 0.6), 0 0 40px rgba(255, 0, 0, 0.3);
        }
        .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 215, 0, 0.2);
            border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 215, 0, 0.4);
        }
      `}</style>
    </div>
  );
}

