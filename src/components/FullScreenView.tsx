'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { X, Gavel, ChevronsLeft, ChevronsRight, Trophy, Ban, RefreshCw, Keyboard, Clock3, History } from 'lucide-react';
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
      
      {/* Cinematic Top Progress */}
      <div className="w-full h-1.5 bg-black/40 z-50">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            className="h-full bg-primary shadow-[0_0_15px_hsl(var(--primary))]"
          />
      </div>

      {/* Roster Sidebar */}
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
                    <span className="font-bold text-white uppercase text-xs truncate mr-2">{p.playerName}</span>
                    <span className={cn(
                        "uppercase text-[9px] font-black px-1.5 py-0.5 rounded", 
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

      {/* Sidebar Toggle */}
      <div className={cn('absolute top-1/2 -translate-y-1/2 z-40 transition-all', isSidebarOpen ? 'left-72' : 'left-0')}>
        <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="w-8 h-20 bg-primary text-primary-foreground flex flex-col items-center justify-center rounded-r-xl shadow-2xl hover:brightness-110 transition-all border-y border-r border-white/20"
        >
          {isSidebarOpen ? <ChevronsLeft size={18} /> : <ChevronsRight size={18} />}
        </button>
      </div>

      {/* Global Controls */}
      <div className="absolute top-6 right-6 z-40 flex gap-3">
        <button onClick={() => setIsHelpOpen(true)} className="h-10 w-10 flex items-center justify-center bg-black/60 border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground rounded-full backdrop-blur-md transition-all">
          <Keyboard size={20} />
        </button>
        <button onClick={resetAuction} className="h-10 w-10 flex items-center justify-center bg-black/60 border border-red-900/40 text-red-500 hover:bg-red-600 hover:text-white rounded-full backdrop-blur-md transition-all">
          <RefreshCw size={20} />
        </button>
        <button onClick={() => router.push('/')} className="h-10 w-10 flex items-center justify-center bg-black/60 border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground rounded-full backdrop-blur-md transition-all">
          <X size={24} />
        </button>
      </div>

      {/* Main Presentation Layout */}
      <main className="flex-1 w-full max-w-[85rem] mx-auto px-6 py-4 flex flex-col min-h-0">
        
        <AnimatePresence mode="wait">
          {!isDrawing && currentPlayer ? (
            <motion.div 
              key={currentPlayer.id} 
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 1.02 }}
              className="flex-1 flex flex-col lg:flex-row gap-6 items-stretch min-h-0"
            >
              
              {/* Sold Overlay */}
              <AnimatePresence>
                {(isSold || isUnsold) && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                        className="absolute inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md p-6"
                    >
                        <motion.div 
                          initial={{ scale: 0.8, rotate: -5 }} animate={{ scale: 1, rotate: 0 }}
                          className={cn(
                            "relative p-10 border-8 bg-[#1a0202] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center w-full max-w-2xl ornate-border",
                            isSold ? "border-primary" : "border-destructive"
                        )}>
                            <div className="absolute -top-12 -right-12">
                                {isSold ? <Trophy className="h-24 w-24 text-primary drop-shadow-[0_0_15px_gold]" /> : <Ban className="h-24 w-24 text-destructive drop-shadow-[0_0_15px_red]" />}
                            </div>
                            <span className="text-xs text-primary/60 font-black tracking-[0.5em] uppercase mb-4">Official Auction Record</span>
                            <h2 className={cn(
                                "text-7xl lg:text-9xl font-black uppercase tracking-tighter italic mb-4 text-center",
                                isSold ? "text-primary" : "text-destructive"
                            )}>
                                {isSold ? 'SOLD' : 'UNSOLD'}
                            </h2>
                            <h3 className="text-3xl font-serif text-white uppercase mb-8 tracking-widest">{currentPlayer.playerName}</h3>
                            {isSold && (
                                <div className="bg-white/5 p-6 border-y-2 border-primary/30 w-full text-center">
                                    <p className="text-primary/60 font-bold uppercase tracking-[0.4em] text-[10px] mb-2">Final Winning Bid</p>
                                    <div className="flex items-baseline justify-center gap-3">
                                        <span className="text-6xl lg:text-8xl font-mono font-black text-white">{currentBid}</span>
                                        <span className="text-2xl font-serif text-primary italic font-black">LAKH</span>
                                    </div>
                                </div>
                            )}
                            <button 
                                onClick={handleDrawPlayer}
                                className="mt-10 px-8 py-3 bg-primary text-primary-foreground font-black uppercase tracking-[0.3em] text-sm hover:scale-105 active:scale-95 transition-all shadow-xl"
                            >
                                Next Player →
                            </button>
                        </motion.div>
                    </motion.div>
                )}
              </AnimatePresence>

              {/* Left Column: The Spotlight (Narrower for balance) */}
              <div className="w-full lg:w-[30%] flex flex-col gap-4 min-h-0">
                <div className="relative flex-1 flex flex-col min-h-0">
                  <div className="flex-1 ornate-border bg-black/60 relative overflow-hidden flex items-center justify-center p-1">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] z-10 pointer-events-none" />
                    {currentPlayer.imageUrl ? (
                      <div className="relative w-full h-full flex items-center justify-center bg-background/20">
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
                      <div className="font-serif text-6xl text-primary/5 italic uppercase tracking-tighter">SAAVAN</div>
                    )}
                  </div>
                  
                  {/* Lot Banner */}
                  <div className="bg-primary py-2 text-center shadow-lg border-x-4 border-white/20 -mt-1 z-20">
                      <span className="text-[10px] font-black tracking-[0.4em] text-primary-foreground uppercase italic">LOT #{currentPlayer.playerNumber}</span>
                  </div>
                </div>

                {/* Insight Box */}
                <div className="h-[20%] bg-black/60 border-l-4 border-primary p-4 shadow-2xl flex flex-col min-h-0 relative">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                      <Gavel className="h-10 w-10 text-primary" />
                    </div>
                    <span className="text-[9px] text-primary font-black tracking-[0.3em] uppercase mb-1 block">Scout Analysis</span>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      <p className="text-xs leading-relaxed text-white/90 italic font-medium font-serif">
                          "{currentPlayer.auctionInsight || 'No scouting data available for this lot.'}"
                      </p>
                    </div>
                </div>
              </div>

              {/* Right Column: The Arena */}
              <div className="flex-1 flex flex-col gap-4 min-h-0">
                
                {/* Header Block */}
                <div className="border-b-2 border-primary/20 pb-2">
                  <div className="flex items-center gap-4 mb-1">
                    <span className="text-[10px] text-primary font-black tracking-[0.5em] uppercase opacity-60">Identity Verified</span>
                    <div className="flex-1 h-px bg-primary/20" />
                  </div>
                  <h1 className="text-4xl lg:text-6xl font-serif font-black text-white uppercase tracking-tighter leading-none drop-shadow-2xl">
                      {currentPlayer.playerName}
                  </h1>
                </div>

                {/* Stats Matrix */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {[
                        { label: 'Origin', value: currentPlayer.country },
                        { label: 'Specialism', value: currentPlayer.specialism },
                        { label: 'Category', value: currentPlayer.cua },
                        { label: 'Points', value: currentPlayer.points },
                    ].map((s, i) => (
                        <div key={i} className="bg-black/60 border-l-2 border-primary/40 p-2 hover:border-primary transition-all group">
                            <span className="text-[8px] text-primary/60 font-black tracking-[0.2em] block mb-0.5 uppercase">{s.label}</span>
                            <span className="font-serif text-sm lg:text-base text-white uppercase tracking-widest block font-bold truncate group-hover:text-primary transition-colors">{s.value || 'N/A'}</span>
                        </div>
                    ))}
                    <div className="col-span-2 lg:col-span-4 bg-primary/5 border-l-4 border-primary p-2 flex justify-between items-center shadow-inner">
                        <span className="text-[9px] text-primary font-black tracking-[0.3em] uppercase">Opening Price</span>
                        <span className="font-serif text-lg text-white uppercase tracking-[0.2em] font-black italic">{currentPlayer.reservePrice} LAKH</span>
                    </div>
                </div>

                {/* Live Hammer Terminal */}
                <div className="flex-1 flex flex-col gap-3 border-2 border-primary/30 bg-black/90 p-5 shadow-[0_0_40px_rgba(0,0,0,0.8)] ornate-border relative min-h-0">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6 h-full">
                        
                        <div className="flex-1 flex flex-col justify-center text-center lg:text-left">
                            <div className="flex items-center gap-3 mb-1 justify-center lg:justify-start">
                              <span className="text-[10px] text-primary font-black tracking-[0.5em] uppercase">Hammer Price</span>
                              <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="h-2.5 w-2.5 rounded-full bg-red-600 shadow-[0_0_10px_red]" />
                            </div>
                            <div className="flex items-baseline gap-4 justify-center lg:justify-start">
                                <span className="text-6xl lg:text-8xl font-mono font-black text-white leading-none tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">{currentBid}</span>
                                <span className="text-2xl lg:text-3xl font-serif text-primary font-black italic tracking-widest">LAKH</span>
                            </div>
                            <div className="mt-4 p-2 bg-primary/10 border border-primary/20 inline-flex items-center gap-4 justify-center lg:justify-start w-fit">
                                <span className="text-[9px] text-primary/70 font-black uppercase tracking-[0.4em]">Next Entry</span>
                                <span className="font-mono text-white text-xl font-black">{nextValidBid} LAKH</span>
                            </div>
                        </div>

                        {/* Timing Console */}
                        <div className="flex flex-col items-center justify-center gap-4 lg:pl-8 lg:border-l-2 border-white/5 min-w-[200px]">
                           {isTimerActive && !isSold && !isUnsold && finalCallStatus === 'none' && (
                              <div className={cn("relative", timer <= 5 && "animate-[shake_0.1s_infinite]")}>
                                  <svg className="w-16 h-16 transform -rotate-90">
                                      <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-white/5" />
                                      <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="3" fill="transparent" 
                                          className={cn("transition-all duration-1000", timer <= 10 ? "text-red-600 shadow-[0_0_10px_red]" : "text-primary")}
                                          strokeDasharray="211" strokeDashoffset={211 - (211 * timer) / DEFAULT_TIMER}
                                      />
                                  </svg>
                                  <span className="absolute inset-0 flex items-center justify-center font-black text-xl font-mono text-white tracking-tighter">
                                      {timer}
                                  </span>
                              </div>
                           )}

                           <div className="flex flex-col items-center gap-3 w-full">
                              <div className="flex gap-2">
                                  {[1, 2, 3].map((idx) => (
                                      <div key={idx} className={cn(
                                          "w-10 h-1.5 rounded-full transition-all duration-700", 
                                          ((idx === 1 && finalCallStatus !== 'none') || (idx === 2 && (finalCallStatus === 'twice' || finalCallStatus === 'final')) || (idx === 3 && finalCallStatus === 'final')) 
                                              ? "bg-primary shadow-[0_0_20px_gold] scale-y-125" 
                                              : "bg-white/5"
                                      )} />
                                  ))}
                              </div>
                              <div className="h-10 flex items-center">
                                  <AnimatePresence mode="wait">
                                      {finalCallStatus !== 'none' && (
                                          <motion.span 
                                              key={finalCallStatus}
                                              initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                              animate={{ opacity: 1, scale: 1.1, y: 0 }}
                                              exit={{ opacity: 0, scale: 1.2, y: -10 }}
                                              className="text-lg lg:text-2xl font-black tracking-[0.5em] uppercase text-primary italic text-center drop-shadow-[0_0_15px_gold]"
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
            <div className="flex-1 flex flex-col items-center justify-center gap-8">
              <div className="w-20 h-20 border-8 border-primary border-t-transparent animate-spin rounded-full shadow-[0_0_40px_rgba(255,215,0,0.3)]" />
              <h1 className="text-4xl text-primary font-black font-serif uppercase tracking-[0.5em] animate-pulse">Consulting the Oracle</h1>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-12">
              <div className="relative">
                <Gavel className="h-32 w-32 text-primary opacity-10 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="h-16 w-16 border-2 border-primary/20 rounded-full" />
                </div>
              </div>
              <div className="space-y-4">
                <h1 className="text-6xl lg:text-8xl font-serif font-black text-primary tracking-tighter uppercase drop-shadow-2xl">Podium Open</h1>
                <p className="text-white/30 text-base tracking-[0.6em] uppercase font-bold italic">Ready for Next Lot Selection</p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Control Deck (Compressed for desktop vertical integrity) */}
      <footer className="w-full bg-[#1a0202]/95 backdrop-blur-xl border-t border-primary/30 p-4 z-40">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3">
          {currentPlayer && !isSold && !isUnsold ? (
            <>
              <Button onClick={handleIncreaseBid} size="lg" className="h-14 px-10 font-serif font-black text-lg rounded-none bg-primary text-primary-foreground tracking-widest uppercase hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,215,0,0.2)]">
                + RAISE BID
              </Button>
              <Button onClick={startHammerSequence} disabled={finalCallStatus !== 'none'} variant="secondary" className="h-14 px-10 font-serif font-black text-sm rounded-none bg-orange-600 text-white tracking-widest uppercase hover:bg-orange-500 shadow-xl transition-all">
                <Clock3 className="mr-3 h-5 w-5"/> {finalCallStatus === 'none' ? 'INITIATE HAMMER' : 'SEQUENCE ACTIVE'}
              </Button>
              <div className="flex gap-2">
                <Button onClick={() => { setTimer(DEFAULT_TIMER); setIsTimerActive(true); setFinalCallStatus('none'); }} variant="outline" className="h-14 w-14 p-0 rounded-none border-white/20 text-white hover:bg-white hover:text-black">
                  <RefreshCw size={20}/>
                </Button>
                <Button onClick={handleUnsold} variant="outline" className="h-14 px-4 font-black rounded-none border-red-600 text-red-600 bg-black/40 uppercase text-[10px] tracking-[0.2em] hover:bg-red-600 hover:text-white transition-all">
                  <Ban className="mr-2 h-4 w-4"/> UNSOLD
                </Button>
              </div>
            </>
          ) : undrawnPlayers.length > 0 && !isDrawing && !isSold && !isUnsold ? (
            <Button onClick={handleDrawPlayer} disabled={isDrawing} className="h-16 w-full max-w-lg text-2xl font-black font-serif border-4 border-primary bg-primary text-primary-foreground tracking-[0.3em] uppercase shadow-2xl hover:brightness-110 transition-all flex items-center justify-center gap-6">
              Reveal Next Lot <Gavel className="h-8 w-8" />
            </Button>
          ) : (isSold || isUnsold) ? (
             <Button onClick={handleDrawPlayer} className="h-16 w-full max-w-lg font-black border-4 border-primary bg-primary text-primary-foreground uppercase tracking-[0.3em] text-2xl hover:brightness-110 shadow-2xl transition-all">
                {undrawnPlayers.length > 0 ? 'Next Contender →' : 'Conclude Session'}
             </Button>
          ) : undrawnPlayers.length === 0 && !isDrawing && (
            <Button onClick={() => router.push('/')} variant="outline" className="h-16 w-full max-w-lg font-black border-4 border-primary/40 text-primary bg-black/60 uppercase tracking-[0.4em] text-xl hover:bg-primary hover:text-white transition-all">Return to Dashboard</Button>
          )}
        </div>

        <div className="mt-2 flex items-center justify-center gap-4 text-[9px] text-primary/40 font-black uppercase tracking-[0.5em]">
            <span className="text-primary">{undrawnPlayers.length} LOTS REMAINING</span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary/20" />
            <span>SESSION: {set.name}</span>
        </div>
      </footer>

      {/* Help Backdrop */}
      <AnimatePresence>
        {isHelpOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6"
            onClick={() => setIsHelpOpen(false)}
          >
            <div className="max-w-xl w-full bg-[#1a0202] border-2 border-primary/40 p-8 shadow-2xl ornate-border" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-4 mb-8 border-b-2 border-primary/20 pb-6">
                    <Keyboard className="h-8 w-8 text-primary" />
                    <h2 className="text-3xl font-serif text-primary uppercase tracking-widest">Command Logic</h2>
                </div>
                <div className="space-y-4">
                    {[
                        { key: 'Space', action: 'Reveal Lot / Increment Bid' },
                        { key: 'F', action: 'Trigger Final Call Sequence' },
                        { key: 'U', action: 'Flag as Unsold' },
                        { key: 'R', action: 'Synchronize / Reset Timer' },
                        { key: 'Esc', action: 'Forfeit Session / Exit' },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between bg-white/5 p-4 border border-white/10 group hover:border-primary transition-all">
                            <span className="text-xs font-black bg-primary text-primary-foreground px-3 py-1.5 rounded-none uppercase tracking-widest">{item.key}</span>
                            <span className="text-xs uppercase font-bold text-white/80 tracking-widest group-hover:text-primary">{item.action}</span>
                        </div>
                    ))}
                </div>
                <p className="mt-8 text-center text-[10px] text-white/30 uppercase tracking-[0.4em] font-black">Esc / Click Outside to Return</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-3px, 0); }
          75% { transform: translate(3px, 0); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
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
