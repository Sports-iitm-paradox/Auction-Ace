
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { X, Gavel, ChevronsLeft, ChevronsRight, Trophy, Ban, RefreshCw, Keyboard, Clock3, History, Shield } from 'lucide-react';
import { Player, PlayerSet } from '@/lib/player-data';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import Image from 'next/image';

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
    HEARTBEAT: 'https://assets.mixkit.co/sfx/preview/mixkit-human-heart-beat-493.mp3'
};

type FinalCallStatus = 'none' | 'once' | 'twice' | 'final';

const DEFAULT_TIMER = 20;

export default function FullScreenView({ players, set, onReset }: FullScreenViewProps) {
  const [undrawnPlayers, setUndrawnPlayers] = useState<Player[]>([...players]);
  const [drawnPlayers, setDrawnPlayers] = useState<DrawnPlayer[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const router = useRouter();
  
  const [currentBid, setCurrentBid] = useState<number>(0);
  const [timer, setTimer] = useState<number>(DEFAULT_TIMER);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isSold, setIsSold] = useState(false);
  const [isUnsold, setIsUnsold] = useState(false);
  const [finalCallStatus, setFinalCallStatus] = useState<FinalCallStatus>('none');

  const timerInterval = useRef<NodeJS.Timeout>();

  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({
    reveal: typeof Audio !== 'undefined' ? new Audio(SOUNDS.REVEAL) : null,
    sold: typeof Audio !== 'undefined' ? new Audio(SOUNDS.SOLD) : null,
    buzzer: typeof Audio !== 'undefined' ? new Audio(SOUNDS.BUZZER) : null,
    tick: typeof Audio !== 'undefined' ? new Audio(SOUNDS.TICK) : null,
    unsold: typeof Audio !== 'undefined' ? new Audio(SOUNDS.UNSOLD) : null,
    heartbeat: typeof Audio !== 'undefined' ? new Audio(SOUNDS.HEARTBEAT) : null,
  });

  const playSound = useCallback((key: string) => {
    const audio = audioRefs.current[key];
    if (audio) {
        audio.currentTime = 0;
        audio.volume = 0.5;
        audio.play().catch(() => {});
    }
  }, []);

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

    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * undrawnPlayers.length);
      const newDrawnPlayer = undrawnPlayers[randomIndex];
      
      setCurrentPlayer(newDrawnPlayer);
      setCurrentBid(newDrawnPlayer.reservePrice || 0);
      setUndrawnPlayers(prev => prev.filter(p => p.id !== newDrawnPlayer.id));
      setIsDrawing(false);
      playSound('reveal');
    }, 1000);
  }, [isDrawing, undrawnPlayers, playSound]);
  
  const resetAuction = () => {
    if (window.confirm("Reset auction session? All progress will be lost.")) {
        onReset();
        setCurrentPlayer(null);
        setCurrentBid(0);
        setIsSold(false);
        setIsUnsold(false);
        setDrawnPlayers([]);
        setTimer(DEFAULT_TIMER);
    }
  };

  const getIncrement = (value: number) => {
    if (value < 100) return 5;
    if (value < 200) return 10;
    if (value < 500) return 20;
    return 50;
  };

  const nextValidBid = currentBid + getIncrement(currentBid);

  const handleSold = useCallback(() => {
    if (!currentPlayer || isSold || isUnsold) return;
    setIsSold(true);
    setIsTimerActive(false);
    setFinalCallStatus('none');
    setDrawnPlayers(prev => [{ ...currentPlayer, status: 'sold', finalPrice: currentBid } as DrawnPlayer, ...prev]);
    playSound('sold');
  }, [currentPlayer, isSold, isUnsold, currentBid, playSound]);

  const handleUnsold = () => {
    if (!currentPlayer || isSold || isUnsold) return;
    setIsUnsold(true);
    setIsTimerActive(false);
    setFinalCallStatus('none');
    setDrawnPlayers(prev => [{ ...currentPlayer, status: 'unsold' } as DrawnPlayer, ...prev]);
    playSound('unsold');
  };

  useEffect(() => {
    if (finalCallStatus !== 'none' && !isSold && !isUnsold) {
      const stepDuration = 2500;
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
    setCurrentBid(newBid);
    setTimer(DEFAULT_TIMER);
    setFinalCallStatus('none');
    setIsTimerActive(true);
  };

  const startHammerSequence = () => {
    if (isSold || isUnsold || !currentPlayer) return;
    setFinalCallStatus('once');
    setIsTimerActive(false);
    playSound('tick');
  };

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
      } else if (event.key === '?' || event.key === 'h') {
        setIsHelpOpen(prev => !prev);
      }
    }, [handleDrawPlayer, router, currentPlayer, isSold, isUnsold, handleIncreaseBid, startHammerSequence]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const progressPercentage = ((players.length - undrawnPlayers.length) / players.length) * 100;

  return (
    <div className="fixed inset-0 flex flex-col bg-[#2b0303] sunburst-bg select-none overflow-hidden h-screen text-foreground">
      
      {/* Header Progress Bar */}
      <div className="w-full h-1 bg-black/40 z-50">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            className="h-full bg-primary shadow-[0_0_15px_hsl(var(--primary))]"
          />
      </div>

      {/* Navigation Controls */}
      <div className="absolute top-4 right-6 z-40 flex gap-2">
        <button onClick={() => setIsHelpOpen(true)} className="h-8 w-8 flex items-center justify-center bg-black/60 border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground rounded-full backdrop-blur-md transition-all">
          <Keyboard size={16} />
        </button>
        <button onClick={resetAuction} className="h-8 w-8 flex items-center justify-center bg-black/60 border border-red-900/40 text-red-500 hover:bg-red-600 hover:text-white rounded-full backdrop-blur-md transition-all">
          <RefreshCw size={16} />
        </button>
        <button onClick={() => router.push('/')} className="h-8 w-8 flex items-center justify-center bg-black/60 border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground rounded-full backdrop-blur-md transition-all">
          <X size={18} />
        </button>
      </div>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-[85rem] mx-auto px-6 py-4 flex flex-col min-h-0 relative">
        <AnimatePresence mode="wait">
          {!isDrawing && currentPlayer ? (
            <motion.div 
              key={currentPlayer.id} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 1.02 }}
              className="flex-1 flex flex-col lg:flex-row gap-6 items-stretch min-h-0"
            >
              {/* Sold/Unsold Overlay */}
              <AnimatePresence>
                {(isSold || isUnsold) && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                        className="absolute inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6 rounded-xl"
                    >
                        <motion.div 
                          initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                          className={cn(
                            "relative p-8 border-4 bg-[#1a0202] shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col items-center w-full max-w-lg ornate-border",
                            isSold ? "border-primary" : "border-destructive"
                        )}>
                            <h2 className={cn(
                                "text-6xl lg:text-8xl font-black uppercase tracking-tighter italic mb-4 text-center",
                                isSold ? "text-primary" : "text-destructive"
                            )}>
                                {isSold ? 'SOLD' : 'UNSOLD'}
                            </h2>
                            <h3 className="text-2xl font-serif text-white uppercase mb-6 tracking-[0.2em]">{currentPlayer.playerName}</h3>
                            {isSold && (
                                <div className="bg-primary/10 p-4 border-y border-primary/30 w-full text-center mb-8">
                                    <span className="text-[10px] text-primary/60 font-black uppercase tracking-[0.4em]">Final Price</span>
                                    <div className="flex items-baseline justify-center gap-2">
                                        <span className="text-5xl font-mono font-black text-white">{currentBid}</span>
                                        <span className="text-xl font-serif text-primary italic font-black">LAKH</span>
                                    </div>
                                </div>
                            )}
                            <Button onClick={handleDrawPlayer} className="px-12 h-12 bg-primary text-primary-foreground font-black uppercase tracking-[0.3em] text-xs">
                                NEXT LOT →
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
              </AnimatePresence>

              {/* Left Profile Section */}
              <div className="w-full lg:w-[320px] flex flex-col gap-4 min-h-0">
                <div className="flex-1 flex flex-col min-h-0 relative">
                  <div className="flex-1 ornate-border bg-black/40 overflow-hidden relative">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.8)_100%)] z-10" />
                    {currentPlayer.imageUrl ? (
                       <div className="relative w-full h-full flex items-center justify-center p-2">
                         <Image 
                          src={currentPlayer.imageUrl} 
                          alt={currentPlayer.playerName} 
                          fill 
                          className="object-contain" 
                          sizes="25vw"
                          priority
                        />
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10">
                          <Shield className="h-24 w-24 text-primary" />
                          <span className="font-serif text-xl text-primary mt-2">SAAVAN</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-primary py-1.5 text-center shadow-lg -mt-1 z-20 border-b-2 border-primary-foreground/20">
                      <span className="text-[8px] font-black tracking-[0.6em] text-primary-foreground uppercase italic">LOT NO. {currentPlayer.playerNumber}</span>
                  </div>
                </div>

                {/* Analysis Box */}
                <div className="bg-black/80 border-l-4 border-primary p-4 shadow-2xl relative min-h-[120px] max-h-[160px] overflow-hidden">
                    <div className="absolute top-1 right-2 opacity-5"><Gavel className="h-8 w-8 text-primary" /></div>
                    <span className="text-[8px] text-primary font-black tracking-[0.4em] uppercase mb-2 flex items-center gap-2">
                        <span className="w-4 h-px bg-primary" /> SCOUT REPORT
                    </span>
                    <div className="overflow-y-auto custom-scrollbar h-full pr-2">
                      <p className="text-[10px] leading-relaxed text-white/80 italic font-medium font-serif">
                          "{currentPlayer.auctionInsight || 'Tactical high-value lot. No specific scout data available.'}"
                      </p>
                    </div>
                </div>
              </div>

              {/* Right Auction Section */}
              <div className="flex-1 flex flex-col gap-4 min-h-0">
                {/* Identity Header */}
                <div className="border-b-2 border-primary/20 pb-2">
                  <div className="flex items-center gap-4 mb-0.5">
                    <span className="text-[8px] text-primary/60 font-black tracking-[0.5em] uppercase">SYSTEM REGISTERED LOT</span>
                    <div className="flex-1 h-px bg-primary/10" />
                  </div>
                  <h1 className="text-4xl lg:text-5xl font-serif font-black text-white uppercase tracking-tighter italic">
                      {currentPlayer.playerName}
                  </h1>
                </div>

                {/* Stats Grid - Compact */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {[
                        { label: 'Origin', value: currentPlayer.country },
                        { label: 'Role', value: currentPlayer.specialism },
                        { label: 'Category', value: currentPlayer.cua },
                        { label: 'Points', value: currentPlayer.points },
                    ].map((s, i) => (
                        <div key={i} className="bg-black/50 border-l border-primary/30 p-2.5 group transition-all hover:bg-primary/5">
                            <span className="text-[7px] text-primary/70 font-black tracking-[0.2em] block mb-0.5 uppercase">{s.label}</span>
                            <span className="font-serif text-xs text-white uppercase tracking-[0.1em] font-bold truncate block">{s.value || 'N/A'}</span>
                        </div>
                    ))}
                </div>

                {/* The Premium Hammer Console */}
                <div className="flex-1 flex flex-col bg-[#1a0202]/80 border-2 border-primary/20 relative rounded-lg overflow-hidden shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,hsl(var(--primary)/0.03)_0%,transparent_60%)] pointer-events-none" />
                    
                    <div className="flex-1 flex flex-col lg:flex-row items-center p-6 relative z-10 gap-8">
                        {/* Big Bid Section */}
                        <div className="flex-1 flex flex-col justify-center text-center lg:text-left">
                            <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
                                <span className="text-[9px] text-primary font-black tracking-[0.4em] uppercase">CURRENT BID</span>
                                <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="h-1.5 w-1.5 rounded-full bg-red-600" />
                            </div>
                            <div className="flex items-baseline justify-center lg:justify-start gap-4">
                                <span className="text-7xl lg:text-8xl font-mono font-black text-white tracking-tighter leading-none">{currentBid}</span>
                                <span className="text-xl lg:text-2xl font-serif text-primary font-black italic tracking-widest uppercase">LAKH</span>
                            </div>
                            <div className="mt-6 flex justify-center lg:justify-start">
                                <div className="px-4 py-2 bg-white/5 border border-white/10 flex items-center gap-4">
                                    <span className="text-[8px] text-primary/50 font-black uppercase tracking-[0.3em]">NEXT VALID ENTRY</span>
                                    <span className="font-mono text-white text-lg font-black">{nextValidBid} LAKH</span>
                                </div>
                            </div>
                        </div>

                        {/* Timing and Status Section */}
                        <div className="flex flex-col items-center justify-center gap-6 min-w-[280px] lg:pl-10 lg:border-l border-white/5">
                            {isTimerActive && !isSold && !isUnsold && finalCallStatus === 'none' && (
                                <div className="relative">
                                    <svg className="w-16 h-16 transform -rotate-90">
                                        <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="1" fill="transparent" className="text-white/5" />
                                        <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="3" fill="transparent" 
                                            className={cn("transition-all duration-1000", timer <= 6 ? "text-red-600 shadow-[0_0_10px_red]" : "text-primary")}
                                            strokeDasharray="168" strokeDashoffset={168 - (168 * timer) / DEFAULT_TIMER}
                                        />
                                    </svg>
                                    <span className="absolute inset-0 flex items-center justify-center font-mono font-black text-xl text-white">
                                        {timer}
                                    </span>
                                </div>
                            )}

                            <div className="w-full space-y-4 text-center">
                                <div className="flex justify-center gap-2">
                                    {[1, 2, 3].map((idx) => (
                                        <div key={idx} className={cn(
                                            "w-10 h-1 rounded-full transition-all duration-500", 
                                            ((idx === 1 && finalCallStatus !== 'none') || (idx === 2 && (finalCallStatus === 'twice' || finalCallStatus === 'final')) || (idx === 3 && finalCallStatus === 'final')) 
                                                ? "bg-primary shadow-[0_0_15px_gold]" 
                                                : "bg-white/5"
                                        )} />
                                    ))}
                                </div>
                                <div className="h-8 flex items-center justify-center">
                                    <AnimatePresence mode="wait">
                                        {finalCallStatus !== 'none' && (
                                            <motion.span 
                                                key={finalCallStatus}
                                                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                                                className="text-2xl font-serif font-black tracking-[0.3em] uppercase text-primary italic drop-shadow-[0_0_10px_gold]"
                                            >
                                                {finalCallStatus === 'once' ? 'GOING ONCE' : finalCallStatus === 'twice' ? 'GOING TWICE' : 'FINAL CALL'}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
              </div>
            </motion.div>
          ) : isDrawing ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent animate-spin rounded-full" />
              <h1 className="text-2xl text-primary font-black font-serif uppercase tracking-[0.4em] animate-pulse">SYNCHRONIZING LOT...</h1>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-8">
              <Gavel className="h-20 w-20 text-primary opacity-10 animate-pulse" />
              <div className="space-y-2">
                <h1 className="text-6xl font-serif font-black text-primary tracking-widest uppercase italic">AUCTION FLOOR</h1>
                <p className="text-white/30 text-[9px] tracking-[0.8em] uppercase font-black italic">AWAITING COMMENCEMENT</p>
              </div>
              <Button onClick={handleDrawPlayer} className="h-14 px-16 font-black font-serif text-lg bg-primary text-primary-foreground tracking-widest uppercase">
                  OPEN FIRST LOT
              </Button>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Moderator Deck - Fixed Bottom */}
      <footer className="w-full bg-[#1a0202] border-t border-primary/20 py-4 px-6 z-50">
        <div className="max-w-[80rem] mx-auto flex items-center justify-center gap-3">
          {currentPlayer && !isSold && !isUnsold ? (
            <>
              <Button onClick={handleIncreaseBid} size="lg" className="h-12 px-12 font-serif font-black text-lg bg-primary text-primary-foreground tracking-widest uppercase hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,215,0,0.2)]">
                + RAISE BID
              </Button>
              <Button onClick={startHammerSequence} disabled={finalCallStatus !== 'none'} variant="secondary" className="h-12 px-8 font-serif font-black text-xs bg-orange-600 text-white tracking-[0.3em] uppercase hover:bg-orange-500 transition-all">
                <Clock3 className="mr-2 h-4 w-4"/> {finalCallStatus === 'none' ? 'INITIATE HAMMER' : 'HAMMER ACTIVE'}
              </Button>
              <div className="flex gap-2">
                <Button onClick={() => { setTimer(DEFAULT_TIMER); setIsTimerActive(true); setFinalCallStatus('none'); }} variant="outline" className="h-12 w-12 p-0 border-white/20 text-white hover:bg-white/10">
                  <RefreshCw size={18}/>
                </Button>
                <Button onClick={handleUnsold} variant="outline" className="h-12 px-4 font-black border-red-600 text-red-600 bg-black/40 uppercase text-[8px] tracking-[0.2em] hover:bg-red-600 hover:text-white transition-all">
                  <Ban className="mr-2 h-3 w-3"/> UNSOLD
                </Button>
              </div>
            </>
          ) : (undrawnPlayers.length > 0 && !isDrawing) || (isSold || isUnsold) ? (
            <Button onClick={handleDrawPlayer} className="h-14 px-20 font-black font-serif text-xl border-2 border-primary bg-primary text-primary-foreground tracking-[0.4em] uppercase shadow-2xl transition-all">
              {undrawnPlayers.length > 0 ? 'REVEAL NEXT LOT →' : 'CONCLUDE SESSION'}
            </Button>
          ) : undrawnPlayers.length === 0 && !isDrawing && (
            <Button onClick={() => router.push('/')} variant="outline" className="h-14 px-20 font-black border-2 border-primary/30 text-primary uppercase tracking-[0.4em] text-lg hover:bg-primary hover:text-white transition-all">EXIT AUCTION ROOM</Button>
          )}
        </div>
        <div className="mt-3 text-center">
            <span className="text-[8px] text-primary/40 font-black tracking-[0.6em] uppercase italic">SAAVAN '26 OFFICIAL AUCTION HUB</span>
        </div>
      </footer>

      {/* Shortcuts Overlay */}
      <AnimatePresence>
        {isHelpOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6"
            onClick={() => setIsHelpOpen(false)}
          >
            <div className="max-w-md w-full bg-[#1a0202] border border-primary/40 p-8 ornate-border shadow-2xl" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-serif text-primary uppercase tracking-[0.3em] border-b border-primary/20 pb-4 mb-6">COMMAND SHORTCUTS</h2>
                <div className="space-y-3">
                    {[
                        { key: 'Space', action: 'Reveal / Increment Bid' },
                        { key: 'F', action: 'Hammer Sequence' },
                        { key: 'U', action: 'Mark Unsold' },
                        { key: 'R', action: 'Reset Timer' },
                        { key: 'Esc', action: 'Exit Room' },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between bg-white/5 p-3 border border-white/5 transition-all hover:border-primary">
                            <span className="text-[10px] font-black bg-primary text-primary-foreground px-2 py-0.5 uppercase">{item.key}</span>
                            <span className="text-[9px] uppercase font-bold text-white/50 tracking-widest">{item.action}</span>
                        </div>
                    ))}
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--primary));
        }
      `}</style>
    </div>
  );
}
