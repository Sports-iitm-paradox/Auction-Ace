'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { X, Gavel, ChevronsLeft, ChevronsRight, Trophy, Ban, RefreshCw, Plus, History, Clock3, Keyboard, Info } from 'lucide-react';
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
    setUndrawnPlayers([...players]);
    setDrawnPlayers([]);
    setCurrentPlayer(null);
  }, [players]);

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
    }, 1200);
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
    }, [handleDrawPlayer, router, currentPlayer, isSold, isUnsold, currentBid, finalCallStatus]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const progressPercentage = ((players.length - undrawnPlayers.length) / players.length) * 100;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-between bg-[#2b0303] sunburst-bg transition-colors duration-1000 select-none overflow-hidden h-screen text-foreground">
      
      {/* Session Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-white/5 z-50">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            className="h-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]"
          />
      </div>

      {/* Shortcuts Legend Overlay */}
      <AnimatePresence>
        {isHelpOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6"
            onClick={() => setIsHelpOpen(false)}
          >
            <div className="max-w-2xl w-full bg-[#1a0202] border-2 border-primary/50 p-6 sm:p-8 shadow-2xl ornate-border overflow-y-auto max-h-[90vh]">
                <div className="flex items-center gap-4 mb-6 sm:mb-8 border-b border-primary/20 pb-4">
                    <Keyboard className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                    <h2 className="text-xl sm:text-3xl font-serif text-primary uppercase">Moderator Controls</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 sm:gap-y-6">
                    {[
                        { key: 'Space', action: 'Draw Player / Increase Bid' },
                        { key: 'F', action: 'Start Automated Hammer Down' },
                        { key: 'U', action: 'Mark as UNSOLD' },
                        { key: 'R', action: 'Reset/Clear Sequence' },
                        { key: 'H / ?', action: 'Toggle this help menu' },
                        { key: 'Esc', action: 'Exit Presentation' },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between group">
                            <span className="text-[10px] font-black bg-primary/20 text-primary px-2 py-1 rounded border border-primary/30 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">{item.key}</span>
                            <span className="text-[10px] sm:text-sm font-bold text-white/70 uppercase tracking-widest text-right ml-2">{item.action}</span>
                        </div>
                    ))}
                </div>
                <p className="mt-8 sm:mt-12 text-center text-[10px] text-primary/40 uppercase font-black tracking-[0.3em]">Tap anywhere to close</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Roster */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            className="absolute top-0 left-0 h-full z-50 w-full sm:w-80 bg-[#1a0202]/98 border-r-2 border-primary/50 p-6 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-center justify-between border-b border-primary/30 pb-4 mb-6">
                <h3 className="text-xl font-bold text-primary font-serif tracking-wider flex items-center gap-2">
                    <History className="h-5 w-5" /> SESSION ROSTER
                </h3>
                <button onClick={() => setIsSidebarOpen(false)} className="text-primary hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>
            <div className="space-y-4 h-[calc(100%-6rem)] overflow-y-auto custom-scrollbar pr-2">
              {drawnPlayers.length === 0 ? (
                <div className="text-center py-10 opacity-30">
                    <History size={48} className="mx-auto mb-2" />
                    <p className="text-xs uppercase font-bold">No results yet</p>
                </div>
              ) : drawnPlayers.map((p) => (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    key={p.id} 
                    className={cn(
                        "p-4 border-l-4 rounded-r-md text-sm", 
                        p.status === 'sold' ? "bg-primary/5 border-primary" : "bg-destructive/5 border-destructive"
                    )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-white uppercase tracking-tight leading-tight">{p.playerName}</span>
                    <span className={cn(
                        "uppercase text-[9px] font-black px-2 py-0.5 rounded", 
                        p.status === 'sold' ? "bg-primary text-primary-foreground" : "bg-destructive text-white"
                    )}>
                        {p.status}
                    </span>
                  </div>
                  {p.status === 'sold' && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                        <span className="text-[10px] text-white/50 font-bold uppercase">Hammer Price</span>
                        <span className="font-mono text-primary font-black">{p.finalPrice} LAKH</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation & Controls */}
      <div className={cn('absolute top-1/2 -translate-y-1/2 z-40 transition-all', isSidebarOpen ? 'left-80 hidden sm:block' : 'left-0')}>
        <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="w-8 sm:w-10 h-16 sm:h-20 bg-primary text-primary-foreground flex flex-col items-center justify-center rounded-r-2xl shadow-2xl hover:brightness-110 transition-all group"
        >
          {isSidebarOpen ? <ChevronsLeft size={24} /> : <ChevronsRight size={24} />}
          <span className="hidden sm:block [writing-mode:vertical-rl] text-[10px] font-black tracking-widest mt-2 uppercase">History</span>
        </button>
      </div>

      <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-40 flex gap-2 sm:gap-3">
        <button onClick={() => setIsHelpOpen(true)} title="Keyboard Shortcuts" className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center bg-black/40 border border-white/20 text-white/60 hover:text-white transition-all rounded-lg">
          <Keyboard size={18} />
        </button>
        <button onClick={resetAuction} title="Reset Session" className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center bg-black/40 border border-white/20 text-white/60 hover:text-red-500 transition-all rounded-lg">
          <RefreshCw size={18} />
        </button>
        <button onClick={() => router.push('/')} title="Exit" className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center bg-black/40 border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all rounded-lg">
          <X size={20} />
        </button>
      </div>

      {/* Main UI Container */}
      <div className="flex-1 flex items-center justify-center w-full max-w-7xl px-4 mt-12 sm:mt-8 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          {!isDrawing && currentPlayer ? (
            <motion.div 
              key={currentPlayer.id} 
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 1.02 }}
              className="relative w-full max-w-[900px] bg-[#1a0202]/80 backdrop-blur-md p-0.5 sm:p-1 shadow-2xl border border-primary/40"
            >
              {/* Sold/Unsold Overlay */}
              <AnimatePresence>
                {(isSold || isUnsold) && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 1.1 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4"
                    >
                        <div className="absolute inset-0 pointer-events-none overflow-hidden hidden sm:block">
                            {[...Array(20)].map((_, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ y: -100, x: Math.random() * 800 - 400, rotate: 0 }}
                                    animate={{ y: 800, rotate: 360 }}
                                    transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, ease: 'linear' }}
                                    className="absolute w-2 h-2 bg-primary rounded-full opacity-40"
                                />
                            ))}
                        </div>

                        <div className={cn(
                            "relative p-6 sm:p-12 border-4 rotate-[-4deg] bg-[#1a0202] shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col items-center w-full sm:min-w-[450px] ornate-border",
                            isSold ? "border-primary" : "border-red-600"
                        )}>
                            <div className="absolute -top-6 sm:-top-12 -right-6 sm:-right-12">
                                {isSold ? <Trophy className="h-16 w-16 sm:h-24 sm:w-24 text-primary drop-shadow-[0_0_20px_rgba(255,204,0,0.5)]" /> : <Ban className="h-16 w-16 sm:h-24 sm:w-24 text-red-600 drop-shadow-[0_0_20px_rgba(220,38,38,0.5)]" />}
                            </div>
                            <p className="text-[8px] sm:text-[10px] text-white/40 font-black tracking-[0.4em] sm:tracking-[0.8em] uppercase mb-4">Official Declaration</p>
                            <h2 className={cn(
                                "text-5xl sm:text-8xl font-black uppercase tracking-tighter italic drop-shadow-lg mb-2 text-center",
                                isSold ? "text-primary" : "text-red-600"
                            )}>
                                {isSold ? 'SOLD' : 'UNSOLD'}
                            </h2>
                            <div className="h-px w-20 sm:w-40 bg-white/10 my-4" />
                            <h3 className="text-xl sm:text-2xl font-serif text-white uppercase mb-6 text-center">{currentPlayer.playerName}</h3>
                            
                            {isSold && (
                                <div className="text-center">
                                    <p className="text-white/40 font-bold uppercase tracking-[0.2em] sm:tracking-[0.4em] text-[8px] sm:text-[9px] mb-2">FINAL HAMMER PRICE</p>
                                    <div className="flex items-baseline justify-center gap-2">
                                        <span className="text-5xl sm:text-7xl font-mono font-black text-white">{currentBid}</span>
                                        <span className="text-xl sm:text-3xl font-serif text-primary font-bold">LAKH</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
              </AnimatePresence>

              {/* Inner Frame */}
              <div className="border border-primary/20 p-4 sm:p-6 flex flex-col lg:flex-row gap-6 sm:gap-8 items-stretch">
                
                {/* Left Column: Photo Area */}
                <div className="flex flex-col items-center shrink-0 w-full lg:w-[280px]">
                  <div className="p-1 border border-primary/60 bg-black/40 shadow-2xl w-full max-w-[200px] sm:max-w-full">
                      <div className="border border-primary/20 p-1.5 sm:p-2">
                           <div className="relative aspect-[3/4] overflow-hidden bg-[#2a0303]">
                              {currentPlayer.imageUrl ? (
                                  <Image src={currentPlayer.imageUrl} alt={currentPlayer.playerName} fill className="object-cover" />
                              ) : (
                                  <div className="w-full h-full flex items-center justify-center font-serif text-7xl sm:text-9xl text-primary/5">?</div>
                              )}
                           </div>
                      </div>
                  </div>
                  <div className="mt-3 sm:mt-4 bg-primary px-4 sm:px-6 py-1.5 sm:py-2 w-full max-w-[200px] sm:max-w-full text-center shadow-lg">
                      <span className="text-[8px] sm:text-[10px] font-black tracking-[0.2em] text-primary-foreground uppercase">LIST SR.NO {currentPlayer.playerNumber}</span>
                  </div>
                </div>

                {/* Right Column: Profile & Bidding */}
                <div className="flex-1 flex flex-col justify-between w-full">
                  
                  {/* Header */}
                  <div className="text-center lg:text-left mb-4 sm:mb-6">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 justify-center lg:justify-start">
                        <span className="h-px w-6 sm:w-8 bg-primary/40" />
                        <p className="text-[8px] sm:text-[9px] text-primary font-black tracking-[0.3em] sm:tracking-[0.5em] uppercase opacity-80">LOT PROFILE</p>
                        <span className="h-px w-6 sm:w-8 bg-primary/40" />
                    </div>
                    <h1 className="text-2xl sm:text-4xl lg:text-5xl font-serif font-bold text-white uppercase tracking-tight leading-none text-center lg:text-left">{currentPlayer.playerName}</h1>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-4 sm:mb-6">
                      {[
                          { label: 'ORIGIN', value: currentPlayer.country },
                          { label: 'SPECIALISM', value: currentPlayer.specialism },
                          { label: 'CATEGORY', value: currentPlayer.cua },
                          { label: 'POINTS', value: currentPlayer.points },
                          { label: 'RESERVE', value: `${currentPlayer.reservePrice} L` },
                      ].map((s, i) => (
                          <div key={i} className={cn(
                              "bg-black/40 border-l-2 border-primary/30 p-2 sm:p-3",
                              i === 4 && "col-span-2 border-primary"
                          )}>
                              <span className="text-[7px] sm:text-[8px] text-primary/60 font-black tracking-[0.2em] sm:tracking-[0.3em] block mb-0.5 sm:mb-1 uppercase">{s.label}</span>
                              <span className="font-serif text-sm sm:text-base text-white uppercase tracking-wide truncate block">{s.value || 'N/A'}</span>
                          </div>
                      ))}
                  </div>

                  {/* Live Bidding Box */}
                  <div className="relative border border-primary/40 bg-black/60 p-4 sm:p-6 shadow-2xl">
                      <div className="flex flex-col sm:flex-row items-center justify-between relative z-10 gap-4 sm:gap-0">
                          <div className="flex-1 text-center sm:text-left">
                              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 justify-center sm:justify-start">
                                <span className="text-[8px] sm:text-[10px] text-primary font-black tracking-[0.2em] sm:tracking-[0.4em] uppercase">LIVE HAMMER STATUS</span>
                                <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                              </div>
                              <div className="flex items-baseline gap-2 sm:gap-3 justify-center sm:justify-start">
                                  <span className="text-4xl sm:text-6xl font-mono font-black text-white">{currentBid}</span>
                                  <span className="text-xl sm:text-2xl font-serif text-primary font-bold italic">LAKH</span>
                              </div>
                              {!isSold && !isUnsold && (
                                  <div className="mt-2 sm:mt-3 flex items-center gap-2 justify-center sm:justify-start">
                                      <Plus size={10} className="text-primary" />
                                      <p className="text-[8px] sm:text-[10px] text-white/70 font-bold uppercase tracking-[0.1em] sm:tracking-[0.2em]">
                                          NEXT BID: <span className="text-primary font-mono ml-1 sm:ml-2">{nextValidBid} LAKH</span>
                                      </p>
                                  </div>
                              )}
                          </div>

                          {/* Auctioneer HUD */}
                          <div className="flex flex-col items-center gap-4 sm:gap-6 border-t sm:border-t-0 sm:border-l border-white/10 pt-4 sm:pt-0 sm:pl-8 sm:ml-6 min-w-full sm:min-w-[200px]">
                             {/* Timer Circle */}
                             {isTimerActive && !isSold && !isUnsold && finalCallStatus === 'none' && (
                                <div className={cn(
                                    "relative flex items-center justify-center transition-transform scale-100 sm:scale-125",
                                    timer <= 5 && "animate-[shake_0.2s_infinite]"
                                )}>
                                    <svg className="w-16 h-16 sm:w-20 sm:h-20 transform -rotate-90">
                                        <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-white/5" />
                                        <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="3" fill="transparent" 
                                            className={cn("transition-all duration-1000", timer <= 10 ? "text-red-600" : "text-primary")}
                                            strokeDasharray="251" strokeDashoffset={251 - (251 * timer) / DEFAULT_TIMER}
                                        />
                                    </svg>
                                    <span className={cn(
                                        "absolute font-bold text-xl sm:text-2xl font-mono",
                                        timer <= 5 ? "text-red-600 scale-125" : "text-white"
                                    )}>
                                        {timer}
                                    </span>
                                </div>
                             )}

                             {/* Final Call Status Indicator */}
                             <div className="flex flex-col items-center gap-3 sm:gap-4 w-full">
                                <div className="flex gap-2 sm:gap-3 justify-center">
                                    <div className={cn(
                                        "w-8 sm:w-12 h-2 sm:h-3 rounded-full transition-all duration-500", 
                                        finalCallStatus !== 'none' ? "bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.8)]" : "bg-white/10"
                                    )} />
                                    <div className={cn(
                                        "w-8 sm:w-12 h-2 sm:h-3 rounded-full transition-all duration-500", 
                                        finalCallStatus === 'twice' || finalCallStatus === 'final' ? "bg-orange-600 shadow-[0_0_20px_rgba(234,88,12,0.8)]" : "bg-white/10"
                                    )} />
                                    <div className={cn(
                                        "w-8 sm:w-12 h-2 sm:h-3 rounded-full transition-all duration-500", 
                                        finalCallStatus === 'final' ? "bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.8)]" : "bg-white/10"
                                    )} />
                                </div>
                                <div className="h-8 sm:h-10 flex items-center justify-center w-full">
                                    <AnimatePresence mode="wait">
                                        {finalCallStatus !== 'none' && (
                                            <motion.span 
                                                key={finalCallStatus}
                                                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                                animate={{ opacity: 1, scale: 1.1, y: 0 }}
                                                exit={{ opacity: 0, scale: 1.2, y: -10 }}
                                                className="text-sm sm:text-lg font-black tracking-[0.2em] sm:tracking-[0.4em] uppercase text-primary text-center whitespace-nowrap drop-shadow-[0_0_10px_rgba(255,204,0,0.5)]"
                                            >
                                                {finalCallStatus === 'once' ? 'GOING ONCE' : finalCallStatus === 'twice' ? 'GOING TWICE' : 'FINAL CALL'}
                                            </motion.span>
                                        )}
                                        {finalCallStatus === 'none' && isTimerActive && (
                                             <span className="text-[10px] font-black tracking-[0.3em] sm:tracking-[0.5em] uppercase text-white/20 text-center">BIDDING ACTIVE</span>
                                        )}
                                    </AnimatePresence>
                                </div>
                             </div>
                          </div>
                      </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : isDrawing ? (
            <div className="flex flex-col items-center gap-6 sm:gap-8 py-10 sm:py-20">
              <div className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-primary border-t-transparent animate-spin rounded-full shadow-[0_0_40px_rgba(255,204,0,0.4)]" />
              <div className="text-center space-y-3 sm:space-y-4">
                <h1 className="text-3xl sm:text-5xl text-primary font-black font-serif uppercase tracking-[0.2em] sm:tracking-[0.4em] animate-pulse">REVEALING LOT</h1>
                <p className="text-primary/40 text-[8px] sm:text-[10px] font-bold tracking-[0.4em] sm:tracking-[0.6em] uppercase">CONSULTING OFFICIAL POOL...</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center gap-6 sm:gap-8 py-10 sm:py-20">
              <div className="p-6 sm:p-10 border-2 border-primary/20 rounded-full animate-pulse bg-primary/5">
                <Gavel className="h-20 w-20 sm:h-32 sm:w-32 text-primary/20" />
              </div>
              <div className="space-y-4 sm:space-y-6">
                <h1 className="text-3xl sm:text-7xl font-serif font-black text-primary tracking-tight uppercase px-4">Auction Session Ready</h1>
                <div className="flex flex-col items-center gap-3 sm:gap-4">
                    <p className="text-white/40 text-sm sm:text-lg tracking-[0.2em] sm:tracking-[0.5em] uppercase font-bold animate-bounce">Tap REVEAL to start Lot</p>
                    <div className="flex items-center gap-2">
                        <Info size={12} className="text-primary/40" />
                        <span className="text-[8px] sm:text-[10px] text-primary/40 uppercase font-black tracking-widest px-4 text-center">Moderator: Use keyboard or screen buttons</span>
                    </div>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Control Actions Hub */}
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center gap-4 sm:gap-6 pb-6 sm:pb-10 px-4 sm:px-6">
        
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full">
          {currentPlayer && !isSold && !isUnsold ? (
            <>
              <Button onClick={handleIncreaseBid} size="lg" className="h-12 sm:h-14 px-6 sm:px-10 font-serif font-black text-sm sm:text-xl rounded-none bg-primary text-primary-foreground tracking-widest uppercase shadow-2xl hover:scale-105 active:scale-95 border-b-4 border-black/20 flex-1 sm:flex-none">
                + RAISE BID
              </Button>
              <Button onClick={() => { setTimer(DEFAULT_TIMER); setIsTimerActive(true); setFinalCallStatus('none'); }} variant="outline" className="h-12 sm:h-14 px-4 sm:px-6 font-black rounded-none border-white/20 bg-[#1a0202] text-white uppercase text-[8px] sm:text-[10px] tracking-[0.2em] sm:tracking-[0.3em] flex items-center gap-2 flex-1 sm:flex-none">
                <RefreshCw size={14}/> RESET
              </Button>
              <Button 
                onClick={startHammerSequence} 
                disabled={finalCallStatus !== 'none'}
                variant="secondary" 
                className="h-12 sm:h-14 px-6 sm:px-8 font-serif font-black text-[10px] sm:text-sm rounded-none bg-orange-600 text-white tracking-widest uppercase shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 w-full sm:w-auto"
              >
                <Clock3 className="mr-2 h-4 w-4"/> {finalCallStatus === 'none' ? 'START HAMMER' : 'HAMMER IN PROGRESS'}
              </Button>
              <Button onClick={handleUnsold} variant="outline" className="h-12 sm:h-14 px-4 sm:px-6 font-black rounded-none border-red-600/40 text-red-500 bg-black/60 text-[8px] sm:text-[10px] tracking-[0.2em] sm:tracking-[0.3em] uppercase w-full sm:w-auto mt-1 sm:mt-0">
                <Ban className="mr-2 h-4 w-4"/> UNSOLD
              </Button>
            </>
          ) : undrawnPlayers.length > 0 && !isDrawing && !isSold && !isUnsold ? (
            <Button onClick={handleDrawPlayer} disabled={isDrawing} className="h-14 sm:h-16 w-full max-w-[440px] text-lg sm:text-2xl font-black font-serif border-4 border-primary bg-primary text-primary-foreground tracking-[0.2em] uppercase shadow-2xl hover:scale-105 active:scale-95">
              REVEAL NEXT LOT
            </Button>
          ) : (isSold || isUnsold) ? (
             <Button onClick={handleDrawPlayer} className="h-14 sm:h-16 w-full sm:w-80 font-black border-4 border-primary bg-primary text-primary-foreground uppercase tracking-[0.1em] sm:tracking-[0.2em] text-lg sm:text-xl">
                {undrawnPlayers.length > 0 ? 'NEXT LOT' : 'FINISH SESSION'}
             </Button>
          ) : undrawnPlayers.length === 0 && !isDrawing && (
            <Button onClick={() => router.push('/')} variant="outline" className="h-14 sm:h-16 w-full sm:w-80 font-black border-primary/30 text-primary bg-black/40 uppercase tracking-[0.1em] sm:tracking-[0.2em] text-lg sm:text-xl">CLOSE SESSION</Button>
          )}
        </div>

        {/* Global HUD Badge */}
        <div className="flex flex-col items-center gap-1 sm:gap-2">
          <div className="bg-primary px-4 sm:px-8 py-1 text-primary-foreground text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.5em] shadow-2xl flex items-center gap-2 sm:gap-3 text-center">
            {undrawnPlayers.length} LOTS REMAINING • {set.name}
          </div>
          <p className="text-[7px] sm:text-[9px] text-white/20 font-black uppercase tracking-[0.4em] sm:tracking-[0.6em] mt-1 text-center">SAAVAN '26 • SPORTS DEPT • IIT MADRAS PARADOX</p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-2px, 0); }
          75% { transform: translate(2px, 0); }
        }
      `}</style>
    </div>
  );
}
