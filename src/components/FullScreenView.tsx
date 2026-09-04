
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
      
      {/* Dynamic Progress Header */}
      <div className="w-full h-1 bg-black/40 z-50">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            className="h-full bg-primary shadow-[0_0_15px_hsl(var(--primary))]"
          />
      </div>

      {/* Roster History Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            className="absolute top-0 left-0 h-full z-50 w-72 bg-[#1a0202]/98 border-r-2 border-primary/50 p-6 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-center justify-between border-b border-primary/30 pb-4 mb-6">
                <h3 className="text-lg font-bold text-primary font-serif tracking-wider flex items-center gap-2 uppercase">
                    <History className="h-5 w-5" /> History
                </h3>
                <button onClick={() => setIsSidebarOpen(false)} className="text-primary hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>
            <div className="space-y-3 h-[calc(100%-6rem)] overflow-y-auto custom-scrollbar pr-2">
              {drawnPlayers.map((p) => (
                <motion.div 
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    key={p.id} 
                    className={cn(
                        "p-3 border-l-4 rounded-r-md text-sm", 
                        p.status === 'sold' ? "bg-primary/5 border-primary" : "bg-destructive/5 border-destructive"
                    )}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white uppercase text-[10px] truncate mr-2">{p.playerName}</span>
                    <span className={cn(
                        "uppercase text-[8px] font-black px-1 py-0.5 rounded", 
                        p.status === 'sold' ? "bg-primary text-primary-foreground" : "bg-destructive text-white"
                    )}>
                        {p.status}
                    </span>
                  </div>
                  {p.status === 'sold' && <div className="text-[10px] text-primary font-mono font-bold mt-1">{p.finalPrice} LAKH</div>}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Trigger Tab */}
      <div className={cn('absolute top-1/2 -translate-y-1/2 z-40 transition-all', isSidebarOpen ? 'left-72' : 'left-0')}>
        <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="w-8 h-20 bg-primary/20 text-primary flex flex-col items-center justify-center rounded-r-xl border-y border-r border-primary/30 hover:bg-primary hover:text-primary-foreground transition-all backdrop-blur-sm"
        >
          {isSidebarOpen ? <ChevronsLeft size={18} /> : <ChevronsRight size={18} />}
        </button>
      </div>

      {/* Navigation & Controls */}
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

      {/* Main Presentation Stage */}
      <main className="flex-1 w-full max-w-[90rem] mx-auto px-6 py-4 flex flex-col min-h-0">
        
        <AnimatePresence mode="wait">
          {!isDrawing && currentPlayer ? (
            <motion.div 
              key={currentPlayer.id} 
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 1.02 }}
              className="flex-1 flex flex-col lg:flex-row gap-6 items-stretch min-h-0 relative"
            >
              {/* Sold/Unsold Overlay */}
              <AnimatePresence>
                {(isSold || isUnsold) && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                        className="absolute inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6 rounded-xl"
                    >
                        <motion.div 
                          initial={{ scale: 0.8, rotate: -3 }} animate={{ scale: 1, rotate: 0 }}
                          className={cn(
                            "relative p-8 border-4 bg-[#1a0202] shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col items-center w-full max-w-xl ornate-border",
                            isSold ? "border-primary" : "border-destructive"
                        )}>
                            <div className="absolute -top-10 -right-10">
                                {isSold ? <Trophy className="h-20 w-20 text-primary drop-shadow-[0_0_20px_gold]" /> : <Ban className="h-20 w-20 text-destructive drop-shadow-[0_0_20px_red]" />}
                            </div>
                            <span className="text-[10px] text-primary/60 font-black tracking-[0.5em] uppercase mb-4">Official Auction Registry</span>
                            <h2 className={cn(
                                "text-6xl lg:text-8xl font-black uppercase tracking-tighter italic mb-2 text-center",
                                isSold ? "text-primary" : "text-destructive"
                            )}>
                                {isSold ? 'SOLD' : 'UNSOLD'}
                            </h2>
                            <h3 className="text-2xl font-serif text-white uppercase mb-6 tracking-[0.2em]">{currentPlayer.playerName}</h3>
                            
                            {isSold && (
                                <div className="bg-primary/10 p-6 border-y border-primary/30 w-full text-center mb-8">
                                    <p className="text-primary/60 font-bold uppercase tracking-[0.4em] text-[10px] mb-2">Hammer Acquisition Price</p>
                                    <div className="flex items-baseline justify-center gap-3">
                                        <span className="text-5xl lg:text-7xl font-mono font-black text-white">{currentBid}</span>
                                        <span className="text-2xl font-serif text-primary italic font-black">LAKH</span>
                                    </div>
                                </div>
                            )}

                            <button 
                                onClick={handleDrawPlayer}
                                className="px-10 py-3 bg-primary text-primary-foreground font-black uppercase tracking-[0.3em] text-xs hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,215,0,0.3)]"
                            >
                                NEXT CONTENDER →
                            </button>
                        </motion.div>
                    </motion.div>
                )}
              </AnimatePresence>

              {/* Left Profile Panel */}
              <div className="w-full lg:w-[28%] flex flex-col gap-4 min-h-0">
                <div className="relative flex-1 flex flex-col min-h-0">
                  <div className="flex-1 ornate-border bg-black/60 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.9)_100%)] z-10 pointer-events-none" />
                    <div className="absolute inset-0 border border-primary/20 pointer-events-none z-20" />
                    {currentPlayer.imageUrl ? (
                      <div className="relative w-full h-full flex items-center justify-center">
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
                      <div className="flex flex-col items-center justify-center opacity-20">
                          <Shield className="h-24 w-24 text-primary mb-2" />
                          <span className="font-serif text-2xl text-primary italic uppercase tracking-widest">SAAVAN</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-primary py-2 text-center shadow-lg border-x-2 border-white/20 -mt-1 z-20">
                      <span className="text-[9px] font-black tracking-[0.5em] text-primary-foreground uppercase italic">LIST SERIAL NO. {currentPlayer.playerNumber}</span>
                  </div>
                </div>

                {/* Tactical Scout Insight */}
                <div className="h-[22%] bg-black/60 border-l-4 border-primary p-4 shadow-2xl flex flex-col min-h-0 relative backdrop-blur-md">
                    <div className="absolute -top-1 -right-1 opacity-5">
                      <Gavel className="h-12 w-12 text-primary rotate-45" />
                    </div>
                    <span className="text-[9px] text-primary font-black tracking-[0.3em] uppercase mb-1 flex items-center gap-2">
                        <span className="w-4 h-px bg-primary" /> SCOUT ANALYSIS
                    </span>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      <p className="text-[11px] leading-relaxed text-white/90 italic font-medium font-serif pr-2">
                          "{currentPlayer.auctionInsight || 'High-value tactical lot under observation. Scout reports pending live verification.'}"
                      </p>
                    </div>
                </div>
              </div>

              {/* Right Auction Console */}
              <div className="flex-1 flex flex-col gap-4 min-h-0">
                
                {/* Identity Header */}
                <div className="border-b border-primary/30 pb-2">
                  <div className="flex items-center gap-4 mb-1">
                    <span className="text-[9px] text-primary font-black tracking-[0.4em] uppercase opacity-70">IDENTITY VERIFIED & SECURED</span>
                    <div className="flex-1 h-px bg-[linear-gradient(to_right,hsl(var(--primary)/0.4),transparent)]" />
                  </div>
                  <h1 className="text-4xl lg:text-6xl font-serif font-black text-white uppercase tracking-tighter leading-none drop-shadow-2xl italic">
                      {currentPlayer.playerName}
                  </h1>
                </div>

                {/* Attributes Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {[
                        { label: 'Origin', value: currentPlayer.country },
                        { label: 'Specialism', value: currentPlayer.specialism },
                        { label: 'Category', value: currentPlayer.cua },
                        { label: 'Base Points', value: currentPlayer.points },
                    ].map((s, i) => (
                        <div key={i} className="bg-black/60 border-l border-primary/40 p-3 hover:bg-primary/5 hover:border-primary transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-8 h-8 bg-primary/5 -rotate-45 translate-x-4 -translate-y-4" />
                            <span className="text-[8px] text-primary/70 font-black tracking-[0.2em] block mb-0.5 uppercase">{s.label}</span>
                            <span className="font-serif text-sm text-white uppercase tracking-widest block font-bold truncate group-hover:text-primary transition-colors">{s.value || 'SECURED'}</span>
                        </div>
                    ))}
                    <div className="col-span-2 lg:col-span-4 bg-primary/10 border-l-4 border-primary p-3 flex justify-between items-center shadow-inner backdrop-blur-sm">
                        <span className="text-[9px] text-primary font-black tracking-[0.4em] uppercase">Opening Reserve Floor</span>
                        <span className="font-serif text-lg text-white uppercase tracking-[0.2em] font-black italic">{currentPlayer.reservePrice} LAKH</span>
                    </div>
                </div>

                {/* Bidding Cockpit */}
                <div className="flex-1 flex flex-col border-2 border-primary/40 bg-black/80 shadow-[0_0_60px_rgba(0,0,0,0.9)] relative overflow-hidden rounded-md">
                    {/* Background Texture/Accent */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,hsl(var(--primary)/0.05)_0%,transparent_70%)] pointer-events-none" />
                    
                    <div className="flex-1 flex flex-col lg:flex-row items-stretch p-6 relative z-10">
                        {/* Current Hammer Price */}
                        <div className="flex-1 flex flex-col justify-center">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-[10px] text-primary font-black tracking-[0.4em] uppercase">HAMMER PRICE</span>
                                <motion.div 
                                  animate={{ opacity: [1, 0.3, 1], scale: [1, 1.2, 1] }} 
                                  transition={{ repeat: Infinity, duration: 1.5 }} 
                                  className="h-2 w-2 rounded-full bg-red-600 shadow-[0_0_10px_red]" 
                                />
                            </div>
                            <div className="flex items-baseline gap-4">
                                <span className="text-7xl lg:text-9xl font-mono font-black text-white leading-none tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]">{currentBid}</span>
                                <span className="text-2xl lg:text-3xl font-serif text-primary font-black italic tracking-widest uppercase">LAKH</span>
                            </div>
                            
                            <motion.div 
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="mt-6 p-3 bg-white/5 border border-white/10 inline-flex items-center gap-6 w-fit"
                            >
                                <span className="text-[9px] text-primary/60 font-black uppercase tracking-[0.4em]">NEXT ENTRY</span>
                                <span className="font-mono text-white text-2xl font-black">{nextValidBid} LAKH</span>
                            </motion.div>
                        </div>

                        {/* Timing HUD */}
                        <div className="flex flex-col items-center justify-center gap-6 lg:pl-10 lg:border-l border-white/10 min-w-[240px]">
                           {isTimerActive && !isSold && !isUnsold && finalCallStatus === 'none' && (
                              <div className={cn("relative p-2", timer <= 5 && "animate-[shake_0.1s_infinite]")}>
                                  <svg className="w-20 h-20 transform -rotate-90">
                                      <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-white/5" />
                                      <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="4" fill="transparent" 
                                          className={cn("transition-all duration-1000", timer <= 10 ? "text-red-600 shadow-[0_0_20px_red]" : "text-primary shadow-[0_0_15px_gold]")}
                                          strokeDasharray="211" strokeDashoffset={211 - (211 * timer) / DEFAULT_TIMER}
                                      />
                                  </svg>
                                  <span className="absolute inset-0 flex items-center justify-center font-mono font-black text-2xl text-white tracking-tighter">
                                      {timer}
                                  </span>
                              </div>
                           )}

                           <div className="flex flex-col items-center gap-4 w-full">
                              <div className="flex gap-2">
                                  {[1, 2, 3].map((idx) => (
                                      <div key={idx} className={cn(
                                          "w-12 h-1 rounded-full transition-all duration-700", 
                                          ((idx === 1 && finalCallStatus !== 'none') || (idx === 2 && (finalCallStatus === 'twice' || finalCallStatus === 'final')) || (idx === 3 && finalCallStatus === 'final')) 
                                              ? "bg-primary shadow-[0_0_25px_gold] scale-y-150" 
                                              : "bg-white/5"
                                      )} />
                                  ))}
                              </div>
                              <div className="h-12 flex items-center">
                                  <AnimatePresence mode="wait">
                                      {finalCallStatus !== 'none' && (
                                          <motion.span 
                                              key={finalCallStatus}
                                              initial={{ opacity: 0, y: 10 }}
                                              animate={{ opacity: 1, y: 0, scale: [1, 1.1, 1] }}
                                              exit={{ opacity: 0, y: -10 }}
                                              className="text-xl lg:text-3xl font-black tracking-[0.4em] uppercase text-primary italic text-center drop-shadow-[0_0_20px_gold] font-serif"
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
              <div className="w-16 h-16 border-4 border-primary border-t-transparent animate-spin rounded-full shadow-[0_0_40px_rgba(255,215,0,0.3)]" />
              <h1 className="text-3xl text-primary font-black font-serif uppercase tracking-[0.6em] animate-pulse">DECODING LOT DATA...</h1>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-10">
              <div className="relative">
                <Gavel className="h-28 w-28 text-primary opacity-10 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }} transition={{ repeat: Infinity, duration: 2 }} className="h-20 w-20 border-2 border-primary rounded-full" />
                </div>
              </div>
              <div className="space-y-4">
                <h1 className="text-5xl lg:text-7xl font-serif font-black text-primary tracking-tighter uppercase drop-shadow-2xl italic">FLOOR OPEN</h1>
                <p className="text-white/40 text-[10px] tracking-[0.8em] uppercase font-black italic">AWAITING SYSTEM COMMANDS</p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Moderator Deck */}
      <footer className="w-full bg-[#1a0202]/98 backdrop-blur-xl border-t border-primary/30 p-4 z-40">
        <div className="max-w-[80rem] mx-auto flex flex-col sm:flex-row items-center justify-center gap-3">
          {currentPlayer && !isSold && !isUnsold ? (
            <>
              <Button onClick={handleIncreaseBid} size="lg" className="h-12 px-12 font-serif font-black text-lg rounded-none bg-primary text-primary-foreground tracking-widest uppercase hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,215,0,0.2)]">
                + RAISE BID
              </Button>
              <Button onClick={startHammerSequence} disabled={finalCallStatus !== 'none'} variant="secondary" className="h-12 px-10 font-serif font-black text-xs rounded-none bg-orange-600 text-white tracking-[0.3em] uppercase hover:bg-orange-500 shadow-xl transition-all">
                <Clock3 className="mr-3 h-4 w-4"/> {finalCallStatus === 'none' ? 'INITIATE HAMMER' : 'SEQUENCE ACTIVE'}
              </Button>
              <div className="flex gap-2">
                <Button onClick={() => { setTimer(DEFAULT_TIMER); setIsTimerActive(true); setFinalCallStatus('none'); }} variant="outline" className="h-12 w-12 p-0 rounded-none border-white/20 text-white hover:bg-white hover:text-black">
                  <RefreshCw size={18}/>
                </Button>
                <Button onClick={handleUnsold} variant="outline" className="h-12 px-4 font-black rounded-none border-red-600 text-red-600 bg-black/40 uppercase text-[9px] tracking-[0.2em] hover:bg-red-600 hover:text-white transition-all">
                  <Ban className="mr-2 h-3 w-3"/> UNSOLD
                </Button>
              </div>
            </>
          ) : undrawnPlayers.length > 0 && !isDrawing && !isSold && !isUnsold ? (
            <Button onClick={handleDrawPlayer} disabled={isDrawing} className="h-14 w-full max-w-md text-xl font-black font-serif border-2 border-primary bg-primary text-primary-foreground tracking-[0.4em] uppercase shadow-2xl hover:brightness-110 transition-all flex items-center justify-center gap-6">
              REVEAL LOT <Gavel className="h-6 w-6" />
            </Button>
          ) : (isSold || isUnsold) ? (
             <Button onClick={handleDrawPlayer} className="h-14 w-full max-w-md font-black border-2 border-primary bg-primary text-primary-foreground uppercase tracking-[0.3em] text-xl hover:brightness-110 shadow-2xl transition-all">
                {undrawnPlayers.length > 0 ? 'NEXT CONTENDER →' : 'CONCLUDE SESSION'}
             </Button>
          ) : undrawnPlayers.length === 0 && !isDrawing && (
            <Button onClick={() => router.push('/')} variant="outline" className="h-14 w-full max-w-md font-black border-2 border-primary/40 text-primary bg-black/60 uppercase tracking-[0.4em] text-lg hover:bg-primary hover:text-white transition-all">CLOSE SESSION</Button>
          )}
        </div>

        <div className="mt-3 flex items-center justify-center gap-6 text-[8px] text-primary/50 font-black uppercase tracking-[0.6em]">
            <span className="text-primary">{undrawnPlayers.length} LOTS REMAINING</span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary/20" />
            <span>REGISTRY: {set.name}</span>
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
            <div className="max-w-lg w-full bg-[#1a0202] border border-primary/40 p-8 shadow-2xl ornate-border" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-4 mb-8 border-b border-primary/20 pb-6">
                    <Keyboard className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-serif text-primary uppercase tracking-[0.3em]">SYSTEM COMMANDS</h2>
                </div>
                <div className="space-y-3">
                    {[
                        { key: 'Space', action: 'Reveal / Increment Bid' },
                        { key: 'F', action: 'Initiate Hammer Sequence' },
                        { key: 'U', action: 'Mark as Unsold' },
                        { key: 'R', action: 'Synchronize Timer' },
                        { key: 'Esc', action: 'Exit to Registry' },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between bg-white/5 p-4 border border-white/10 group hover:border-primary transition-all">
                            <span className="text-[10px] font-black bg-primary text-primary-foreground px-3 py-1 rounded-none uppercase tracking-widest">{item.key}</span>
                            <span className="text-[10px] uppercase font-bold text-white/70 tracking-[0.2em] group-hover:text-primary">{item.action}</span>
                        </div>
                    ))}
                </div>
                <p className="mt-8 text-center text-[9px] text-white/30 uppercase tracking-[0.5em] font-black italic">Click anywhere to return</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-2px, 0); }
          75% { transform: translate(2px, 0); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.4);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--primary));
          border-radius: 0px;
        }
      `}</style>
    </div>
  );
}
