
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { X, Gavel, ChevronsLeft, ChevronsRight, Trophy, Ban, RefreshCw, Plus, TrendingUp, Heart } from 'lucide-react';
import { Player, PlayerSet } from '@/lib/player-data';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';

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

export default function FullScreenView({ players, set, onReset }: FullScreenViewProps) {
  const [undrawnPlayers, setUndrawnPlayers] = useState<Player[]>([...players]);
  const [drawnPlayers, setDrawnPlayers] = useState<DrawnPlayer[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  
  const [currentBid, setCurrentBid] = useState<number>(0);
  const [bidHistory, setBidHistory] = useState<{ value: number }[]>([]);
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
    heartbeat: typeof Audio !== 'undefined' ? new Audio(SOUNDS.HEARTBEAT) : null,
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
    setBidHistory([]);

    setTimeout(() => {
      stopDrawingAnimation();
      const randomIndex = Math.floor(Math.random() * undrawnPlayers.length);
      const newDrawnPlayer = undrawnPlayers[randomIndex];
      
      setCurrentPlayer(newDrawnPlayer);
      setCurrentBid(newDrawnPlayer.reservePrice || 0);
      setBidHistory([{ value: newDrawnPlayer.reservePrice || 0 }]);
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
        setBidHistory([]);
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
    const newBid = nextValidBid;
    setCurrentBid(newBid);
    setBidHistory(prev => [...prev, { value: newBid }]);
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

  const isHighStakes = currentBid >= 500;

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
    <div className={cn(
        "fixed inset-0 flex flex-col items-center justify-between transition-colors duration-1000 select-none overflow-hidden h-screen text-foreground",
        isHighStakes ? "bg-[#1a0505] shadow-[inset_0_0_150px_rgba(255,165,0,0.2)]" : "bg-[#2b0303] sunburst-bg"
    )}>
      
      {/* High Stakes Particles Overlay */}
      {isHighStakes && !isSold && !isUnsold && (
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://picsum.photos/seed/gold-sparks/1200/800')] bg-cover mix-blend-screen animate-pulse" />
      )}

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

      {/* Navigation Buttons */}
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
              className={cn(
                "relative w-full max-w-[1000px] border-[1px] p-1 backdrop-blur-sm transition-all duration-500",
                isHighStakes ? "border-orange-500/60 bg-[#1a0202]/80 shadow-[0_0_50px_rgba(255,140,0,0.1)]" : "border-primary/40 bg-[#1a0202]/60"
              )}
            >
              {/* Sold/Unsold Overlay */}
              <AnimatePresence>
                {(isSold || isUnsold) && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 1.1 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
                    >
                        <div className={cn(
                            "relative p-12 border-4 rotate-[-6deg] bg-[#1a0202] shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col items-center",
                            isSold ? "border-primary" : "border-red-600"
                        )}>
                            <div className="absolute -top-6 -right-6">
                                {isSold ? <Trophy size={64} className="text-primary drop-shadow-lg" /> : <Ban size={64} className="text-red-600 drop-shadow-lg" />}
                            </div>
                            <h2 className={cn(
                                "text-8xl font-black uppercase tracking-tighter italic",
                                isSold ? "text-primary" : "text-red-600"
                            )}>
                                {isSold ? 'SOLD' : 'UNSOLD'}
                            </h2>
                            {isSold && (
                                <div className="mt-4 text-center">
                                    <p className="text-white/60 font-bold uppercase tracking-[0.4em] text-xs mb-2">FINAL HAMMER PRICE</p>
                                    <p className="text-4xl font-mono font-black text-white">{currentBid} LAKH</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
              </AnimatePresence>

              {/* Inner Frame */}
              <div className="border-[1px] border-primary/40 p-6 lg:p-8 flex flex-col lg:flex-row gap-8 items-center lg:items-start overflow-hidden">
                
                {/* Left Column: Photo Area */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="p-1 border-[1px] border-primary/80 bg-black/40">
                      <div className="border-[1px] border-primary/40 p-2">
                           <div className="relative w-[180px] lg:w-[240px] aspect-[3/4] overflow-hidden bg-[#2a0303]">
                              {currentPlayer.imageUrl ? (
                                  <Image src={currentPlayer.imageUrl} alt={currentPlayer.playerName} fill className="object-cover" />
                              ) : (
                                  <div className="w-full h-full flex items-center justify-center font-serif text-9xl text-primary/5">?</div>
                              )}
                           </div>
                      </div>
                  </div>
                  <div className="mt-4 bg-primary px-4 py-1.5 w-full text-center">
                      <span className="text-[10px] font-black tracking-widest text-primary-foreground uppercase">LIST SR.NO {currentPlayer.playerNumber}</span>
                  </div>
                </div>

                {/* Right Column: Profile & Bidding */}
                <div className="flex-1 flex flex-col gap-5 w-full">
                  
                  {/* Header */}
                  <div className="text-center lg:text-left">
                    <p className="text-[10px] text-primary font-black tracking-[0.4em] mb-1 uppercase opacity-80">LOT PROFILE</p>
                    <h1 className="text-4xl lg:text-5xl font-serif font-bold text-white uppercase tracking-tight leading-none truncate">{currentPlayer.playerName}</h1>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                      {[
                          { label: 'ORIGIN', value: currentPlayer.country },
                          { label: 'SPECIALISM', value: currentPlayer.specialism },
                          { label: 'CATEGORY', value: currentPlayer.cua },
                          { label: 'POINTS', value: currentPlayer.points },
                          { label: 'RESERVE PRICE', value: `${currentPlayer.reservePrice} LAKH` },
                      ].map((s, i) => (
                          <div key={i} className="bg-black/40 border-l-2 border-primary/40 p-3">
                              <span className="text-[8px] text-primary/70 font-black tracking-[0.3em] block mb-1 uppercase">{s.label}</span>
                              <span className="font-serif text-sm lg:text-lg text-white uppercase tracking-wide truncate block">{s.value || 'N/A'}</span>
                          </div>
                      ))}
                  </div>

                  {/* Live Bidding Box */}
                  <div className={cn(
                    "relative mt-2 border-[1px] p-5 lg:p-6 shadow-inner transition-all duration-500",
                    isHighStakes ? "border-orange-500/60 bg-black/90" : "border-primary/50 bg-[#1a0202]/80"
                  )}>
                      <div className="flex items-center justify-between relative z-10">
                          <div className="flex-1">
                              <span className="text-[10px] text-primary font-black tracking-[0.4em] block mb-2 uppercase">LIVE BIDDING STATUS</span>
                              <div className="flex items-baseline gap-3">
                                  <span className={cn(
                                    "text-5xl lg:text-6xl font-mono font-black text-white",
                                    isHighStakes && "animate-pulse drop-shadow-[0_0_20px_rgba(255,165,0,0.4)]"
                                  )}>{currentBid}</span>
                                  <span className="text-xl font-serif text-primary font-bold italic">LAKH</span>
                              </div>
                              {!isSold && !isUnsold && (
                                  <div className="mt-3 flex items-center gap-2">
                                      <Plus size={12} className="text-primary" />
                                      <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest">
                                          Next Bid: <span className="text-primary font-mono ml-1">{nextValidBid} Lakh</span>
                                      </p>
                                  </div>
                              )}
                          </div>

                          {/* Sparkline Visual */}
                          {!isSold && !isUnsold && bidHistory.length > 1 && (
                            <div className="h-16 w-32 hidden lg:block mr-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={bidHistory}>
                                        <YAxis hide domain={['dataMin', 'dataMax']} />
                                        <Line 
                                            type="monotone" 
                                            dataKey="value" 
                                            stroke="#ffcc00" 
                                            strokeWidth={3} 
                                            dot={false} 
                                            animationDuration={500}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                                <p className="text-[7px] text-center text-primary/40 font-bold uppercase tracking-widest mt-1">PRICE TREND</p>
                            </div>
                          )}

                          {/* Circular Timer */}
                          {isTimerActive && !isSold && !isUnsold && (
                              <div className="relative flex items-center justify-center scale-90">
                                  <svg className="w-16 h-16 transform -rotate-90">
                                      <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/10" />
                                      <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="4" fill="transparent" 
                                          className={cn("transition-all duration-1000", timer <= 10 ? "text-red-600" : "text-primary")}
                                          strokeDasharray="251" strokeDashoffset={251 - (251 * timer) / 30}
                                      />
                                  </svg>
                                  <span className={cn(
                                    "absolute font-bold text-xl",
                                    timer <= 5 ? "text-red-600 scale-125 transition-transform animate-pulse" : "text-white"
                                  )}>
                                      {timer}
                                  </span>
                                  {timer <= 5 && (
                                    <div className="absolute -top-1 -right-1">
                                        <Heart size={14} className="text-red-600 animate-ping" />
                                    </div>
                                  )}
                              </div>
                          )}
                      </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : isDrawing ? (
            <div className="flex flex-col items-center gap-8 py-20">
              <div className="w-20 h-20 border-8 border-primary border-t-transparent animate-spin rounded-full shadow-[0_0_30px_rgba(255,204,0,0.3)]" />
              <div className="text-center space-y-2">
                <h1 className="text-4xl lg:text-5xl text-primary font-black font-serif uppercase tracking-[0.3em] animate-pulse">REVEALING LOT</h1>
                <p className="text-primary/40 text-[10px] font-bold tracking-[0.5em] uppercase">CONSULTING OFFICIAL ROSTER...</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center gap-6 py-20">
              <div className="p-8 border-2 border-primary/20 rounded-full animate-pulse">
                <Trophy className="h-24 w-24 lg:h-32 lg:w-32 text-primary/30" />
              </div>
              <div className="space-y-4">
                <h1 className="text-5xl lg:text-7xl font-serif font-black text-primary tracking-tight">READY TO BEGIN</h1>
                <p className="text-white/30 text-lg tracking-[0.4em] uppercase font-bold">Press SPACE to reveal Lot</p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Control Actions & HUD */}
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-5 pb-8 px-4">
        
        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
          {currentPlayer && !isSold && !isUnsold ? (
            <>
              <Button onClick={handleIncreaseBid} size="lg" className="h-12 px-8 font-serif font-black text-lg rounded-none bg-primary text-primary-foreground tracking-widest uppercase shadow-xl hover:scale-105 transition-transform">
                + RAISE BID ({getIncrement(currentBid)}L)
              </Button>
              <Button onClick={() => { setTimer(30); setIsTimerActive(true); }} variant="outline" className="h-12 px-6 font-black rounded-none border-primary/40 bg-[#1a0202] text-white uppercase text-[10px] tracking-[0.2em] hover:bg-primary/20 transition-all">
                <RefreshCw className="mr-2 h-4 w-4"/> RESET CLOCK
              </Button>
              <Button onClick={handleSold} className="h-12 px-8 font-serif font-black text-lg rounded-none bg-[#e63946] text-white tracking-widest uppercase shadow-xl hover:scale-105 transition-transform">
                <Gavel className="mr-2 h-5 w-5"/> FINAL SOLD
              </Button>
              <Button onClick={handleUnsold} variant="outline" className="h-12 px-6 font-black rounded-none border-red-600/40 text-red-500 bg-[#1a0202] text-[10px] tracking-[0.2em] uppercase hover:bg-red-950 transition-all">
                <Ban className="mr-2 h-4 w-4"/> UNSOLD
              </Button>
            </>
          ) : undrawnPlayers.length > 0 && !isDrawing && !isSold && !isUnsold ? (
            <Button onClick={handleDrawPlayer} disabled={isDrawing} className="h-14 w-full max-w-[400px] text-xl font-black font-serif border-4 border-primary bg-primary text-primary-foreground tracking-widest uppercase shadow-2xl hover:scale-105 transition-transform">
              REVEAL NEXT LOT
            </Button>
          ) : (isSold || isUnsold) ? (
             <Button onClick={handleDrawPlayer} className="h-14 w-80 font-black border-4 border-primary bg-primary text-primary-foreground uppercase tracking-widest text-lg hover:scale-105 transition-all">
                {undrawnPlayers.length > 0 ? 'NEXT LOT INCOMING' : 'FINISH SESSION'}
             </Button>
          ) : undrawnPlayers.length === 0 && !isDrawing && (
            <Button onClick={resetAuction} variant="outline" className="h-14 w-80 font-black border-primary/30 text-primary bg-black/40 uppercase tracking-widest text-lg hover:bg-primary hover:text-primary-foreground transition-all">RESTART SESSION</Button>
          )}
        </div>

        {/* Global HUD Badge */}
        <div className="flex flex-col items-center gap-2">
          <div className="bg-primary px-8 py-1.5 text-primary-foreground text-[10px] font-black uppercase tracking-[0.4em] shadow-lg rounded-sm">
            {undrawnPlayers.length} LOTS REMAINING IN SET
          </div>
          <p className="text-[9px] text-white/20 font-black uppercase tracking-[0.5em] mt-1">SAAVAN '26 • IIT MADRAS PARADOX</p>
        </div>
      </div>
    </div>
  );
}
