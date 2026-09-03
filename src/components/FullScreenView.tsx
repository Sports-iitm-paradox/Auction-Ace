
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { X, Gavel, ChevronsLeft, ChevronsRight, Trophy, Ban, RefreshCw, Plus, Heart, History, Clock3 } from 'lucide-react';
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
  const [finalCallStatus, setFinalCallStatus] = useState<'none' | 'once' | 'twice'>('none');

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

  const handleDrawPlayer = useCallback(() => {
    if (undrawnPlayers.length === 0 || isDrawing) return;

    setIsDrawing(true);
    setCurrentPlayer(null);
    setIsSold(false);
    setIsUnsold(false);
    setIsTimerActive(false);
    setFinalCallStatus('none');
    setTimer(30);

    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * undrawnPlayers.length);
      const newDrawnPlayer = undrawnPlayers[randomIndex];
      
      setCurrentPlayer(newDrawnPlayer);
      setCurrentBid(newDrawnPlayer.reservePrice || 0);
      setUndrawnPlayers(prev => prev.filter(p => p.id !== newDrawnPlayer.id));
      setIsDrawing(false);
      playSound('reveal');
    }, 1200);
  }, [isDrawing, undrawnPlayers]);
  
  const resetAuction = () => {
    if (window.confirm("Reset auction session?")) {
        onReset();
        setCurrentPlayer(null);
        setCurrentBid(0);
        setIsSold(false);
        setIsUnsold(false);
        setDrawnPlayers([]);
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
    setTimer(30);
    setFinalCallStatus('none');
    setIsTimerActive(true);
  };

  const handleSold = () => {
    if (!currentPlayer) return;
    setIsSold(true);
    setIsTimerActive(false);
    setFinalCallStatus('none');
    setDrawnPlayers(prev => [{ ...currentPlayer, status: 'sold', finalPrice: currentBid } as DrawnPlayer, ...prev]);
    playSound('sold');
  };

  const handleUnsold = () => {
    if (!currentPlayer) return;
    setIsUnsold(true);
    setIsTimerActive(false);
    setFinalCallStatus('none');
    setDrawnPlayers(prev => [{ ...currentPlayer, status: 'unsold' } as DrawnPlayer, ...prev]);
    playSound('unsold');
  };

  const advanceFinalCall = () => {
    if (finalCallStatus === 'none') setFinalCallStatus('once');
    else if (finalCallStatus === 'once') setFinalCallStatus('twice');
    else if (finalCallStatus === 'twice') handleSold();
    playSound('tick');
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
    <div className="fixed inset-0 flex flex-col items-center justify-between bg-[#2b0303] sunburst-bg transition-colors duration-1000 select-none overflow-hidden h-screen text-foreground">
      
      {/* Sidebar Roster */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            className="absolute top-0 left-0 h-full z-50 w-80 bg-[#1a0202]/98 border-r-2 border-primary/50 p-6 shadow-2xl backdrop-blur-md"
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
      <div className={cn('absolute top-1/2 -translate-y-1/2 z-40 transition-all', isSidebarOpen ? 'left-80' : 'left-0')}>
        <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="w-10 h-20 bg-primary text-primary-foreground flex flex-col items-center justify-center rounded-r-2xl shadow-2xl hover:brightness-110 transition-all group"
        >
          {isSidebarOpen ? <ChevronsLeft size={24} /> : <ChevronsRight size={24} />}
          <span className="[writing-mode:vertical-rl] text-[10px] font-black tracking-widest mt-2 uppercase">History</span>
        </button>
      </div>

      <div className="absolute top-4 right-4 z-40 flex gap-3">
        <button onClick={resetAuction} className="h-10 px-4 flex items-center justify-center bg-black/40 border border-white/20 text-white/60 hover:text-white hover:bg-black/60 transition-all rounded-lg text-xs font-bold uppercase tracking-widest">
          <RefreshCw size={14} className="mr-2" /> Reset Session
        </button>
        <button onClick={() => router.push('/')} className="h-10 w-10 flex items-center justify-center bg-black/40 border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all rounded-lg">
          <X size={20} />
        </button>
      </div>

      {/* Main UI Container */}
      <div className="flex-1 flex items-center justify-center w-full max-w-7xl px-4 mt-8">
        <AnimatePresence mode="wait">
          {!isDrawing && currentPlayer ? (
            <motion.div 
              key={currentPlayer.id} 
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 1.02 }}
              className="relative w-full max-w-[960px] border-[1px] border-primary/40 bg-[#1a0202]/80 backdrop-blur-md p-1 shadow-2xl"
            >
              {/* Sold/Unsold Overlay */}
              <AnimatePresence>
                {(isSold || isUnsold) && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 1.1 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl"
                    >
                        <div className={cn(
                            "relative p-12 border-4 rotate-[-4deg] bg-[#1a0202] shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col items-center min-w-[400px]",
                            isSold ? "border-primary" : "border-red-600"
                        )}>
                            <div className="absolute -top-8 -right-8">
                                {isSold ? <Trophy size={80} className="text-primary drop-shadow-lg" /> : <Ban size={80} className="text-red-600 drop-shadow-lg" />}
                            </div>
                            <h2 className={cn(
                                "text-9xl font-black uppercase tracking-tighter italic",
                                isSold ? "text-primary" : "text-red-600"
                            )}>
                                {isSold ? 'SOLD' : 'UNSOLD'}
                            </h2>
                            {isSold && (
                                <div className="mt-6 text-center">
                                    <p className="text-white/40 font-bold uppercase tracking-[0.5em] text-[10px] mb-2">FINAL HAMMER PRICE</p>
                                    <div className="flex items-baseline justify-center gap-2">
                                        <span className="text-6xl font-mono font-black text-white">{currentBid}</span>
                                        <span className="text-2xl font-serif text-primary font-bold">LAKH</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
              </AnimatePresence>

              {/* Inner Frame */}
              <div className="border-[1px] border-primary/20 p-8 flex flex-col lg:flex-row gap-10 items-center lg:items-stretch">
                
                {/* Left Column: Photo Area */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="p-1 border-[1px] border-primary/60 bg-black/40 shadow-2xl">
                      <div className="border-[1px] border-primary/20 p-2">
                           <div className="relative w-[200px] lg:w-[260px] aspect-[3/4] overflow-hidden bg-[#2a0303]">
                              {currentPlayer.imageUrl ? (
                                  <Image src={currentPlayer.imageUrl} alt={currentPlayer.playerName} fill className="object-cover" />
                              ) : (
                                  <div className="w-full h-full flex items-center justify-center font-serif text-9xl text-primary/5">?</div>
                              )}
                           </div>
                      </div>
                  </div>
                  <div className="mt-4 bg-primary px-6 py-2 w-full text-center shadow-lg">
                      <span className="text-xs font-black tracking-[0.2em] text-primary-foreground uppercase">LIST SR.NO {currentPlayer.playerNumber}</span>
                  </div>
                </div>

                {/* Right Column: Profile & Bidding */}
                <div className="flex-1 flex flex-col justify-between w-full py-2">
                  
                  {/* Header */}
                  <div className="text-center lg:text-left">
                    <p className="text-[10px] text-primary font-black tracking-[0.5em] mb-2 uppercase opacity-80">LOT PROFILE</p>
                    <h1 className="text-5xl lg:text-6xl font-serif font-bold text-white uppercase tracking-tight leading-none mb-6">{currentPlayer.playerName}</h1>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                      {[
                          { label: 'ORIGIN', value: currentPlayer.country },
                          { label: 'SPECIALISM', value: currentPlayer.specialism },
                          { label: 'CATEGORY', value: currentPlayer.cua },
                          { label: 'POINTS', value: currentPlayer.points },
                      ].map((s, i) => (
                          <div key={i} className="bg-black/40 border-l-2 border-primary/30 p-4">
                              <span className="text-[9px] text-primary/60 font-black tracking-[0.3em] block mb-1 uppercase">{s.label}</span>
                              <span className="font-serif text-lg text-white uppercase tracking-wide truncate block">{s.value || 'N/A'}</span>
                          </div>
                      ))}
                  </div>

                  {/* Live Bidding Box */}
                  <div className="relative border-[1px] border-primary/40 bg-black/60 p-6 lg:p-8 shadow-2xl">
                      <div className="flex items-center justify-between relative z-10">
                          <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <span className="text-[11px] text-primary font-black tracking-[0.4em] uppercase">LIVE BIDDING STATUS</span>
                                <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                              </div>
                              <div className="flex items-baseline gap-4">
                                  <span className="text-6xl lg:text-7xl font-mono font-black text-white">{currentBid}</span>
                                  <span className="text-2xl font-serif text-primary font-bold italic">LAKH</span>
                              </div>
                              {!isSold && !isUnsold && (
                                  <div className="mt-4 flex items-center gap-2">
                                      <Plus size={14} className="text-primary" />
                                      <p className="text-[11px] text-white/70 font-bold uppercase tracking-[0.2em]">
                                          NEXT BID: <span className="text-primary font-mono ml-2 text-sm">{nextValidBid} LAKH</span>
                                      </p>
                                  </div>
                              )}
                          </div>

                          {/* Auctioneer Final Call Status */}
                          <div className="flex flex-col items-center gap-4">
                             {/* Timer Circle */}
                             {isTimerActive && !isSold && !isUnsold && (
                                <div className="relative flex items-center justify-center">
                                    <svg className="w-20 h-20 transform -rotate-90">
                                        <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                                        <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="4" fill="transparent" 
                                            className={cn("transition-all duration-1000", timer <= 10 ? "text-red-600" : "text-primary")}
                                            strokeDasharray="251" strokeDashoffset={251 - (251 * timer) / 30}
                                        />
                                    </svg>
                                    <span className={cn(
                                        "absolute font-bold text-2xl font-mono",
                                        timer <= 5 ? "text-red-600 scale-125 transition-transform animate-pulse" : "text-white"
                                    )}>
                                        {timer}
                                    </span>
                                </div>
                             )}

                             {/* Final Call Indicator */}
                             <div className="flex flex-col items-center gap-1">
                                <span className={cn(
                                    "text-[9px] font-black tracking-[0.4em] uppercase mb-1",
                                    finalCallStatus !== 'none' ? "text-primary" : "text-white/20"
                                )}>Final Call</span>
                                <div className="flex gap-2">
                                    <div className={cn("w-3 h-3 rounded-full transition-all duration-300", finalCallStatus === 'once' || finalCallStatus === 'twice' ? "bg-primary shadow-[0_0_10px_rgba(255,204,0,0.5)]" : "bg-white/10")} />
                                    <div className={cn("w-3 h-3 rounded-full transition-all duration-300", finalCallStatus === 'twice' ? "bg-primary shadow-[0_0_10px_rgba(255,204,0,0.5)]" : "bg-white/10")} />
                                </div>
                             </div>
                          </div>
                      </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : isDrawing ? (
            <div className="flex flex-col items-center gap-8 py-20">
              <div className="w-24 h-24 border-8 border-primary border-t-transparent animate-spin rounded-full shadow-[0_0_40px_rgba(255,204,0,0.4)]" />
              <div className="text-center space-y-4">
                <h1 className="text-5xl lg:text-6xl text-primary font-black font-serif uppercase tracking-[0.4em] animate-pulse">REVEALING LOT</h1>
                <p className="text-primary/40 text-xs font-bold tracking-[0.6em] uppercase">Consulting Official Roster...</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center gap-8 py-20">
              <div className="p-10 border-2 border-primary/20 rounded-full animate-pulse bg-primary/5">
                <Trophy className="h-32 w-32 text-primary/20" />
              </div>
              <div className="space-y-6">
                <h1 className="text-6xl lg:text-8xl font-serif font-black text-primary tracking-tight uppercase">Ready to Begin</h1>
                <div className="flex flex-col items-center gap-2">
                    <p className="text-white/40 text-xl tracking-[0.5em] uppercase font-bold animate-bounce">Press SPACE to reveal Lot</p>
                    <div className="h-1 w-20 bg-primary/30" />
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Control Actions & HUD */}
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center gap-6 pb-12 px-6">
        
        <div className="flex flex-wrap items-center justify-center gap-4 w-full">
          {currentPlayer && !isSold && !isUnsold ? (
            <>
              <Button onClick={handleIncreaseBid} size="lg" className="h-14 px-10 font-serif font-black text-xl rounded-none bg-primary text-primary-foreground tracking-widest uppercase shadow-2xl hover:scale-105 transition-transform active:scale-95 border-b-4 border-black/20">
                + RAISE BID ({getIncrement(currentBid)}L)
              </Button>
              <Button onClick={() => { setTimer(30); setIsTimerActive(true); setFinalCallStatus('none'); }} variant="outline" className="h-14 px-8 font-black rounded-none border-primary/40 bg-[#1a0202] text-white uppercase text-[11px] tracking-[0.3em] hover:bg-primary/20 transition-all flex items-center gap-3">
                <RefreshCw className="h-4 w-4"/> RESET CLOCK
              </Button>
              <Button onClick={advanceFinalCall} variant="secondary" className="h-14 px-8 font-serif font-black text-sm rounded-none bg-orange-600 text-white tracking-widest uppercase shadow-xl hover:scale-105 transition-transform flex items-center gap-3">
                <Clock3 className="h-4 w-4"/> {finalCallStatus === 'none' ? 'GOING ONCE' : finalCallStatus === 'once' ? 'GOING TWICE' : 'FINAL CALL'}
              </Button>
              <Button onClick={handleSold} className="h-14 px-10 font-serif font-black text-xl rounded-none bg-green-600 text-white tracking-widest uppercase shadow-2xl hover:scale-105 transition-transform active:scale-95 border-b-4 border-black/20">
                <Gavel className="mr-3 h-6 w-6"/> SOLD
              </Button>
              <Button onClick={handleUnsold} variant="outline" className="h-14 px-8 font-black rounded-none border-red-600/40 text-red-500 bg-black/60 text-[11px] tracking-[0.3em] uppercase hover:bg-red-950 transition-all">
                <Ban className="mr-2 h-4 w-4"/> UNSOLD
              </Button>
            </>
          ) : undrawnPlayers.length > 0 && !isDrawing && !isSold && !isUnsold ? (
            <Button onClick={handleDrawPlayer} disabled={isDrawing} className="h-16 w-full max-w-[440px] text-2xl font-black font-serif border-4 border-primary bg-primary text-primary-foreground tracking-[0.2em] uppercase shadow-2xl hover:scale-105 transition-transform active:scale-95">
              REVEAL NEXT LOT
            </Button>
          ) : (isSold || isUnsold) ? (
             <Button onClick={handleDrawPlayer} className="h-16 w-80 font-black border-4 border-primary bg-primary text-primary-foreground uppercase tracking-[0.2em] text-xl hover:scale-105 transition-all">
                {undrawnPlayers.length > 0 ? 'NEXT LOT' : 'FINISH SET'}
             </Button>
          ) : undrawnPlayers.length === 0 && !isDrawing && (
            <Button onClick={resetAuction} variant="outline" className="h-16 w-80 font-black border-primary/30 text-primary bg-black/40 uppercase tracking-[0.2em] text-xl hover:bg-primary hover:text-primary-foreground transition-all">RESTART SESSION</Button>
          )}
        </div>

        {/* Global HUD Badge */}
        <div className="flex flex-col items-center gap-3">
          <div className="bg-primary/90 backdrop-blur-md px-10 py-2 text-primary-foreground text-[11px] font-black uppercase tracking-[0.5em] shadow-2xl flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground animate-pulse" />
            {undrawnPlayers.length} LOTS REMAINING
            <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground animate-pulse" />
          </div>
          <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.6em] mt-1">SAAVAN '26 • IIT MADRAS PARADOX</p>
        </div>
      </div>
    </div>
  );
}

