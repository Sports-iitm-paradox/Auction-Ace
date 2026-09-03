'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { X, Gavel, ChevronsLeft, ChevronsRight, Trophy, Ban, RefreshCw, Plus } from 'lucide-react';
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
    UNSOLD: 'https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-947.mp3'
};

export default function FullScreenView({ players, set, onReset }: FullScreenViewProps) {
  const [undrawnPlayers, setUndrawnPlayers] = useState<Player[]>([...players]);
  const [drawnPlayers, setDrawnPlayers] = useState<DrawnPlayer[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  
  const [currentBid, setCurrentBid] = useState<number>(0);
  const [timer, setTimer] = useState<number>(30);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isSold, setIsSold] = useState(false);
  const [isUnsold, setIsUnsold] = useState(false);

  const drawingInterval = useRef<NodeJS.Timeout>();
  const timerInterval = useRef<NodeJS.Timeout>();

  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({
    reveal: typeof Audio !== 'undefined' ? new Audio(SOUNDS.REVEAL) : null,
    sold: typeof Audio !== 'undefined' ? new Audio(SOUNDS.SOLD) : null,
    buzzer: typeof Audio !== 'undefined' ? new Audio(SOUNDS.BUZZER) : null,
    tick: typeof Audio !== 'undefined' ? new Audio(SOUNDS.TICK) : null,
    unsold: typeof Audio !== 'undefined' ? new Audio(SOUNDS.UNSOLD) : null,
  });

  const playSound = (key: string) => {
    const audio = audioRefs.current[key];
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }
  };

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
  }, [isTimerActive, timer]);

  const stopDrawingAnimation = useCallback(() => {
    if (drawingInterval.current) {
        clearInterval(drawingInterval.current);
        drawingInterval.current = undefined;
    }
  }, []);

  const handleDrawPlayer = useCallback(() => {
    if (undrawnPlayers.length === 0 || isDrawing) return;

    setIsDrawing(true);
    setCurrentPlayer(null);
    setIsSold(false);
    setIsUnsold(false);
    setIsTimerActive(false);
    setTimer(30);

    drawingInterval.current = setInterval(() => {}, 100);

    setTimeout(() => {
      stopDrawingAnimation();
      const randomIndex = Math.floor(Math.random() * undrawnPlayers.length);
      const newDrawnPlayer = undrawnPlayers[randomIndex];
      
      setCurrentPlayer(newDrawnPlayer);
      setCurrentBid(newDrawnPlayer.reservePrice || 0);
      setUndrawnPlayers(prev => prev.filter(p => p.id !== newDrawnPlayer.id));
      setIsDrawing(false);
      playSound('reveal');
    }, 1200);
  }, [isDrawing, undrawnPlayers, stopDrawingAnimation]);
  
  const resetAuction = () => {
    if (window.confirm("Reset auction session?")) {
        onReset();
        setCurrentPlayer(null);
        setCurrentBid(0);
        setIsSold(false);
        setIsUnsold(false);
    }
  };

  const getIncrement = (value: number) => {
    if (value < 100) return 5;
    if (value < 200) return 10;
    if (value < 500) return 20;
    return 50;
  };

  const nextValidBid = currentBid + getIncrement(currentBid);

  const handleIncreaseBid = () => {
    if (isSold || isUnsold) return;
    setCurrentBid(nextValidBid);
    setTimer(30);
    setIsTimerActive(true);
  };

  const handleSold = () => {
    if (!currentPlayer) return;
    setIsSold(true);
    setIsTimerActive(false);
    setDrawnPlayers(prev => [{ ...currentPlayer, status: 'sold', finalPrice: currentBid } as DrawnPlayer, ...prev]);
    playSound('sold');
  };

  const handleUnsold = () => {
    if (!currentPlayer) return;
    setIsUnsold(true);
    setIsTimerActive(false);
    setDrawnPlayers(prev => [{ ...currentPlayer, status: 'unsold' } as DrawnPlayer, ...prev]);
    playSound('unsold');
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
      if (event.key === ' ' && !isDrawing) {
        event.preventDefault();
        if (!currentPlayer) handleDrawPlayer();
        else if (!isSold && !isUnsold) handleIncreaseBid();
      } else if (event.key === 'Escape') {
        router.push('/');
      } else if (event.key === 's' && currentPlayer && !isSold && !isUnsold) {
        handleSold();
      } else if (event.key === 'u' && currentPlayer && !isSold && !isUnsold) {
        handleUnsold();
      }
    }, [handleDrawPlayer, router, currentPlayer, isSold, isUnsold, currentBid]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-between py-4 px-4 bg-[#2b0303] sunburst-bg select-none overflow-hidden h-screen">
      
      {/* Sidebar Roster */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            className="absolute top-0 left-0 h-full z-50 w-72 bg-[#1a0202]/95 border-r-2 border-primary/50 p-6 shadow-2xl backdrop-blur-md"
          >
            <h3 className="text-xl font-bold text-primary font-serif border-b border-primary/30 pb-3 mb-4 tracking-wider">AUCTION ROSTER</h3>
            <ul className="space-y-3 h-[calc(100%-5rem)] overflow-y-auto custom-scrollbar">
              {drawnPlayers.map((p) => (
                <li key={p.id} className={cn("p-3 border-l-4 rounded-r-md text-sm", p.status === 'sold' ? "bg-primary/5 border-primary/60" : "bg-destructive/5 border-destructive/40")}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white/90 truncate">{p.playerName}</span>
                    <span className={cn("uppercase text-[9px] font-black px-1.5 py-0.5 rounded", p.status === 'sold' ? "bg-primary text-primary-foreground" : "bg-destructive text-white")}>
                        {p.status}
                    </span>
                  </div>
                  {p.status === 'sold' && <div className="font-mono text-primary font-bold mt-1 text-xs">FINAL: {p.finalPrice} LAKH</div>}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn('absolute top-1/2 -translate-y-1/2 z-40 transition-all', isSidebarOpen ? 'left-72' : 'left-0')}>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-10 h-16 bg-primary text-primary-foreground flex items-center justify-center rounded-r-xl shadow-lg hover:brightness-110 transition-all">
          {isSidebarOpen ? <ChevronsLeft size={20} /> : <ChevronsRight size={20} />}
        </button>
      </div>

      <div className="absolute top-4 right-4 z-40">
        <button onClick={() => router.push('/')} className="h-10 w-10 flex items-center justify-center bg-black/40 border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all rounded-lg">
          <X size={20} />
        </button>
      </div>

      {/* Main UI Container */}
      <div className="flex-1 flex items-center justify-center w-full max-w-7xl px-4">
        <AnimatePresence mode="wait">
          {!isDrawing && currentPlayer ? (
            <motion.div 
              key={currentPlayer.id} 
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 1.02 }}
              className="relative w-full max-w-[1100px] border-[1px] border-primary/40 bg-[#1a0202]/60 p-1 backdrop-blur-sm"
            >
              {/* Inner Double Border Frame */}
              <div className="border-[1px] border-primary/60 p-8 lg:p-12">
                
                {/* Status Overlay */}
                {(isSold || isUnsold) && (
                  <motion.div initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/20 backdrop-blur-[2px]">
                    <div className={cn("border-8 p-10 -rotate-12 bg-black/80 shadow-[0_0_50px_rgba(0,0,0,0.8)]", isSold ? "border-primary text-primary" : "border-red-600 text-red-600")}>
                      <h2 className="text-7xl lg:text-9xl font-black uppercase tracking-tight">{isSold ? 'SOLD' : 'UNSOLD'}</h2>
                    </div>
                  </motion.div>
                )}

                <div className="flex flex-col lg:flex-row gap-12 items-start justify-center">
                  
                  {/* Left Column: Photo Area */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="p-1 border-[1px] border-primary/80 bg-black/40">
                        <div className="border-[1px] border-primary/40 p-2">
                             <div className="relative w-[220px] lg:w-[320px] aspect-[3/4] overflow-hidden bg-[#2a0303]">
                                {currentPlayer.imageUrl ? (
                                    <Image src={currentPlayer.imageUrl} alt={currentPlayer.playerName} fill className="object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center font-serif text-9xl text-primary/5">?</div>
                                )}
                             </div>
                        </div>
                    </div>
                    <div className="mt-4 bg-primary px-4 py-1.5">
                        <span className="text-[10px] lg:text-xs font-black tracking-widest text-primary-foreground uppercase">LIST SR.NO {currentPlayer.playerNumber}</span>
                    </div>
                  </div>

                  {/* Right Column: Profile & Bidding */}
                  <div className="flex-1 flex flex-col gap-6 w-full">
                    
                    {/* Header */}
                    <div>
                      <p className="text-[10px] lg:text-xs text-primary font-black tracking-[0.4em] mb-2 uppercase opacity-80">LOT PROFILE</p>
                      <h1 className="text-4xl lg:text-6xl font-serif font-bold text-white uppercase tracking-tight leading-tight">{currentPlayer.playerName}</h1>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: 'ORIGIN', value: currentPlayer.country },
                            { label: 'SPECIALISM', value: currentPlayer.specialism },
                            { label: 'CATEGORY', value: currentPlayer.cua },
                            { label: 'POINTS', value: currentPlayer.points },
                        ].map((s, i) => (
                            <div key={i} className="bg-black/40 border-l-2 border-primary/40 p-3 lg:p-4">
                                <span className="text-[9px] lg:text-[10px] text-primary/70 font-black tracking-[0.3em] block mb-1 uppercase">{s.label}</span>
                                <span className="font-serif text-lg lg:text-2xl text-white uppercase tracking-wide">{s.value || 'N/A'}</span>
                            </div>
                        ))}
                    </div>

                    {/* Reserve Price (Standalone Box) */}
                    <div className="bg-black/40 border-l-2 border-primary/40 p-3 lg:p-4">
                        <span className="text-[9px] lg:text-[10px] text-primary/70 font-black tracking-[0.3em] block mb-1 uppercase">RESERVE PRICE</span>
                        <span className="font-serif text-lg lg:text-2xl text-white uppercase tracking-wide">{currentPlayer.reservePrice} LAKH</span>
                    </div>

                    {/* Live Bidding Box */}
                    <div className="mt-2 border-[1px] border-primary/50 bg-[#1a0202]/80 p-6 lg:p-8 shadow-inner relative overflow-hidden">
                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] lg:text-xs text-primary font-black tracking-[0.4em] block mb-3 uppercase">LIVE BIDDING STATUS</span>
                                <div className="flex items-baseline gap-4">
                                    <span className="text-6xl lg:text-8xl font-mono font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">{currentBid}</span>
                                    <span className="text-2xl lg:text-3xl font-serif text-primary font-bold italic">LAKH</span>
                                </div>
                                {!isSold && !isUnsold && (
                                    <div className="mt-4 flex items-center gap-2">
                                        <Plus size={12} className="text-primary" />
                                        <p className="text-[10px] lg:text-xs text-white/60 font-bold uppercase tracking-widest">
                                            Next Valid Bid: <span className="text-primary font-mono ml-1">{nextValidBid} Lakh</span>
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Circular Timer */}
                            {isTimerActive && !isSold && !isUnsold && (
                                <div className="relative flex items-center justify-center">
                                    <svg className="w-16 h-16 lg:w-20 lg:h-20 transform -rotate-90">
                                        <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/10" />
                                        <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="4" fill="transparent" 
                                            className={cn("transition-all duration-1000", timer <= 10 ? "text-red-600" : "text-primary")}
                                            strokeDasharray="251" strokeDashoffset={251 - (251 * timer) / 30}
                                        />
                                    </svg>
                                    <span className={cn("absolute font-bold text-xl lg:text-2xl", timer <= 10 ? "text-red-600 animate-pulse" : "text-white")}>
                                        {timer}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                  </div>
                </div>
              </div>
            </motion.div>
          ) : isDrawing ? (
            <div className="flex flex-col items-center gap-8 py-20">
              <div className="w-24 h-24 border-8 border-primary border-t-transparent animate-spin rounded-full shadow-[0_0_30px_rgba(255,204,0,0.3)]" />
              <div className="text-center space-y-2">
                <h1 className="text-4xl lg:text-6xl text-primary font-black font-serif uppercase tracking-[0.3em] animate-pulse">REVEALING LOT</h1>
                <p className="text-primary/40 text-sm font-bold tracking-[0.5em] uppercase">Consulting Official Database...</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center gap-6 py-20">
              <div className="p-8 border-2 border-primary/20 rounded-full animate-pulse">
                <Trophy className="h-24 w-24 lg:h-32 lg:w-32 text-primary/30" />
              </div>
              <div className="space-y-4">
                <h1 className="text-5xl lg:text-7xl font-serif font-black text-primary tracking-tight">READY TO BEGIN</h1>
                <p className="text-white/30 text-lg lg:text-xl tracking-[0.4em] uppercase font-bold">Press SPACE to reveal Lot</p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Control Actions & HUD */}
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6 pb-6">
        
        <div className="flex flex-wrap items-center justify-center gap-4 w-full">
          {currentPlayer && !isSold && !isUnsold ? (
            <>
              <Button onClick={handleIncreaseBid} size="lg" className="h-16 px-10 font-serif font-black text-xl lg:text-2xl rounded-none bg-primary text-primary-foreground tracking-widest uppercase shadow-xl hover:scale-105 transition-transform">
                + RAISE BID ({getIncrement(currentBid)}L)
              </Button>
              <Button onClick={() => { setTimer(30); setIsTimerActive(true); }} variant="outline" className="h-16 px-8 font-black rounded-none border-primary/40 bg-[#1a0202] text-white uppercase text-xs tracking-[0.2em] hover:bg-primary/20 transition-all">
                <RefreshCw className="mr-3 h-5 w-5"/> RESET CLOCK
              </Button>
              <Button onClick={handleSold} className="h-16 px-10 font-serif font-black text-xl lg:text-2xl rounded-none bg-[#e63946] text-white tracking-widest uppercase shadow-xl hover:scale-105 transition-transform">
                <Gavel className="mr-3 h-6 w-6"/> FINAL SOLD
              </Button>
              <Button onClick={handleUnsold} variant="outline" className="h-16 px-8 font-black rounded-none border-red-600/40 text-red-500 bg-[#1a0202] text-xs tracking-[0.2em] uppercase hover:bg-red-950 transition-all">
                <Ban className="mr-3 h-5 w-5"/> UNSOLD
              </Button>
            </>
          ) : undrawnPlayers.length > 0 ? (
            <Button onClick={handleDrawPlayer} disabled={isDrawing} className="h-16 w-[400px] text-2xl font-black font-serif border-4 border-primary bg-primary text-primary-foreground tracking-widest uppercase shadow-2xl hover:scale-105 transition-transform">
              {isDrawing ? 'DRAWING...' : 'REVEAL NEXT LOT'}
            </Button>
          ) : (
            <Button onClick={resetAuction} variant="outline" className="h-16 w-80 font-black border-primary/30 text-primary bg-black/40 uppercase tracking-widest text-lg hover:bg-primary hover:text-primary-foreground transition-all">RESTART SESSION</Button>
          )}
        </div>

        {/* Global HUD Badge */}
        <div className="flex flex-col items-center gap-3">
          <div className="bg-primary px-8 py-2 text-primary-foreground text-[10px] lg:text-xs font-black uppercase tracking-[0.4em] shadow-lg rounded-sm">
            {undrawnPlayers.length} LOTS REMAINING IN SET
          </div>
          <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.5em] mt-2">SAAVAN '26 • IIT MADRAS PARADOX</p>
        </div>
      </div>
    </div>
  );
}
