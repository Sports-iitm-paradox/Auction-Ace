
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { X, Gavel, ChevronsLeft, ChevronsRight, Plus, RefreshCw, Trophy, Ban } from 'lucide-react';
import { Player, PlayerSet } from '@/lib/player-data';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
    }, 2500);
  }, [isDrawing, undrawnPlayers, stopDrawingAnimation]);
  
  const resetAuction = () => {
    if (window.confirm("Are you sure you want to reset the auction session?")) {
        stopDrawingAnimation();
        onReset();
        setIsDrawing(false);
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
        if (!currentPlayer) {
            handleDrawPlayer();
        } else if (!isSold && !isUnsold) {
            handleIncreaseBid();
        }
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
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      stopDrawingAnimation();
    };
  }, [handleKeyDown, stopDrawingAnimation]);

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
    exit: { opacity: 0, scale: 0.95 },
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-4 overflow-hidden bg-[#3d0606] sunburst-bg h-screen select-none">
      <div className="hidden">
        {Object.entries(SOUNDS).map(([key, url]) => (
            <audio key={key} src={url} preload="auto" />
        ))}
      </div>

      {/* Sidebar Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            className="absolute top-0 left-0 h-full z-50 w-72"
          >
            <div className="h-full w-full bg-card/95 backdrop-blur-md border-r-4 border-primary p-6 space-y-6 shadow-2xl">
              <h3 className="text-2xl font-bold text-primary font-serif border-b-2 border-primary pb-3">
                Lot Roster
              </h3>
              <ul className="space-y-3 h-[calc(100%-6rem)] overflow-y-auto pr-2 custom-scrollbar">
                {drawnPlayers.map((player) => (
                  <li key={player.id} className={cn(
                      "flex flex-col gap-1.5 p-3 border transition-colors",
                      player.status === 'sold' ? "bg-primary/10 border-primary" : "bg-destructive/10 border-destructive/50"
                  )}>
                    <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider", player.status === 'sold' ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground")}>
                            {player.status}
                        </span>
                        <span className="font-medium truncate text-foreground text-sm">{player.playerName}</span>
                    </div>
                    {player.status === 'sold' && (
                        <span className="text-xs font-mono text-primary font-bold">{player.finalPrice} Lakh</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drawer Toggle */}
      <div className={cn(
        'absolute top-1/2 -translate-y-1/2 z-40 transition-all duration-300',
        isSidebarOpen ? 'left-72' : 'left-0'
      )}>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="w-10 h-14 bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform rounded-r-md"
        >
          {isSidebarOpen ? <ChevronsLeft size={20} /> : <ChevronsRight size={20} />}
        </button>
      </div>

      {/* Close Button */}
      <div className="absolute top-6 right-6 z-40">
        <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
            className="h-10 w-10 rounded-none border border-primary/30 bg-black/20 text-primary hover:bg-primary hover:text-primary-foreground"
        >
            <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-7xl flex flex-col items-center gap-8 relative px-4">
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPlayer ? currentPlayer.id : 'waiting'}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full flex justify-center"
          >
            <div className="w-full max-w-[1100px] relative">
              
              {/* Profile Card Overlay Content */}
              <div className="flex flex-col lg:flex-row items-start justify-center gap-12 w-full min-h-[500px]">
                
                {/* Left: Player Photo Frame */}
                <div className="w-full lg:w-[350px] flex-shrink-0 flex flex-col items-center">
                    <div className="relative w-full aspect-[3/4] border-4 border-primary p-2 bg-black/10">
                        <div className="w-full h-full relative overflow-hidden ornate-border border-0 p-0">
                            {currentPlayer?.imageUrl ? (
                                <Image src={currentPlayer.imageUrl} alt={currentPlayer.playerName} fill className="object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-background/20">
                                    <span className="font-serif text-[15rem] text-primary/5">{currentPlayer?.playerName[0] || '?' }</span>
                                </div>
                            )}
                        </div>
                    </div>
                    {currentPlayer && (
                      <div className="mt-4 font-bold text-[11px] uppercase tracking-[0.4em] text-primary">
                          LIST SR.NO {currentPlayer.playerNumber}
                      </div>
                    )}
                </div>

                {/* Right: Info Section */}
                <div className="flex-1 flex flex-col w-full py-4 relative">
                    
                    {/* Status Stamps */}
                    {(isSold || isUnsold) && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 1.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
                        >
                            <div className={cn(
                                "border-[10px] p-8 rotate-[-12deg] bg-[#2a0404]/80 backdrop-blur-sm shadow-2xl",
                                isSold ? "border-primary" : "border-red-600"
                            )}>
                                <h2 className={cn(
                                    "text-8xl font-serif font-black uppercase tracking-tight px-8",
                                    isSold ? 'text-primary' : 'text-red-600'
                                )}>
                                    {isSold ? 'SOLD' : 'UNSOLD'}
                                </h2>
                            </div>
                        </motion.div>
                    )}

                    {!isDrawing && currentPlayer ? (
                      <div className="space-y-12">
                          <div>
                            <p className="font-serif text-[12px] text-primary/70 font-bold uppercase tracking-[0.5em] mb-3">LOT PROFILE</p>
                            <h1 className="text-6xl lg:text-8xl font-bold font-serif text-white tracking-tight leading-[0.9] uppercase truncate max-w-2xl">
                              {currentPlayer.playerName}
                            </h1>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-x-16 gap-y-10">
                              {[
                                { label: 'ORIGIN', value: currentPlayer.country },
                                { label: 'SPECIALISM', value: currentPlayer.specialism },
                                { label: 'CATEGORY', value: currentPlayer.cua },
                                { label: 'POINTS', value: currentPlayer.points },
                              ].map((stat, i) => stat.value && (
                                <div key={i} className="flex flex-col">
                                  <span className="text-[11px] text-primary/60 font-bold uppercase mb-2 tracking-[0.4em]">{stat.label}</span>
                                  <span className="font-serif text-3xl text-white font-medium uppercase">{stat.value}</span>
                                </div>
                              ))}
                          </div>

                          <div className="flex flex-col">
                              <span className="text-[11px] text-primary/60 font-bold uppercase mb-2 tracking-[0.4em]">RESERVE PRICE</span>
                              <span className="font-serif text-3xl text-white font-medium uppercase">{currentPlayer.reservePrice} LAKH</span>
                          </div>

                          {/* Live Bid Box */}
                          <div className="w-full p-8 border border-primary/40 bg-black/30 relative">
                               <span className="text-[11px] font-bold text-primary uppercase mb-3 tracking-[0.4em] block">LIVE BIDDING STATUS</span>
                               <div className="flex items-baseline gap-4">
                                  <span className="text-8xl font-mono font-black text-white leading-none">{currentBid}</span>
                                  <span className="text-4xl font-serif text-primary uppercase font-bold">LAKH</span>
                               </div>
                               {!isSold && !isUnsold && (
                                  <p className="text-[12px] font-bold text-white/70 mt-4 flex items-center tracking-widest uppercase">
                                      <span className="mr-2 text-primary opacity-60 text-lg font-mono">+</span> 
                                      Next Valid Bid: <span className="text-primary ml-2 text-base font-mono">{nextValidBid} Lakh</span>
                                  </p>
                               )}

                               {/* Timer Hub in Bid Box */}
                               {isTimerActive && !isSold && !isUnsold && (
                                  <div className="absolute top-8 right-8">
                                      <div className={cn(
                                          "w-16 h-16 rounded-full border-[6px] flex items-center justify-center font-bold text-3xl shadow-lg transition-colors",
                                          timer <= 5 ? "border-red-600 text-red-600 animate-pulse" : "border-primary text-primary"
                                      )}>
                                          {timer}
                                      </div>
                                  </div>
                               )}
                          </div>
                      </div>
                    ) : isDrawing ? (
                      <div className="h-full flex flex-col justify-center items-center gap-10">
                        <div className="w-24 h-24 border-8 border-primary border-t-transparent animate-spin rounded-full" />
                        <h1 className="text-6xl text-primary font-bold font-serif animate-pulse tracking-[0.3em] uppercase">DRAWING LOT...</h1>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col justify-center items-center text-center gap-8 py-20">
                        <Trophy className="h-32 w-32 text-primary/50 animate-bounce" />
                        <div className="space-y-4">
                          <h1 className="text-6xl font-bold font-serif text-primary tracking-tighter uppercase">SESSION READY</h1>
                          <p className="text-white/40 italic text-2xl tracking-[0.2em] uppercase">Prepare the Auction Floor</p>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Control Section */}
        <div className="w-full max-w-5xl flex flex-col items-center gap-8 mt-4">
          {currentPlayer && !isSold && !isUnsold ? (
              <div className="flex flex-col items-center gap-6 w-full">
                  <div className="flex flex-wrap justify-center items-center gap-6">
                      <Button
                          onClick={handleIncreaseBid}
                          size="lg"
                          className="h-16 px-12 font-bold font-serif rounded-none bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xl text-2xl uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                      >
                          + RAISE BID ({getIncrement(currentBid)}L)
                      </Button>
                      
                      <Button
                          onClick={() => { setTimer(30); setIsTimerActive(true); }}
                          variant="outline"
                          className="h-16 px-10 font-bold font-serif rounded-none border-2 border-white/20 text-white bg-black/40 hover:bg-white/10 text-xl uppercase tracking-widest"
                      >
                          <RefreshCw className="mr-3 h-6 w-6" /> RESET CLOCK
                      </Button>

                      <Button
                          onClick={handleSold}
                          className="h-16 px-12 font-bold font-serif rounded-none bg-[#FF5722] text-white hover:bg-[#E64A19] shadow-xl text-2xl uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                      >
                          <Gavel className="mr-3 h-7 w-7" /> FINAL SOLD
                      </Button>
                  </div>
                  
                  <Button
                    onClick={handleUnsold}
                    variant="outline"
                    className="h-12 px-10 font-bold font-serif rounded-none border-2 border-red-600/30 text-red-500 bg-black/40 hover:bg-red-600/10 text-sm uppercase tracking-[0.3em]"
                  >
                    <Ban className="mr-2 h-5 w-5" /> UNSOLD
                  </Button>
              </div>
          ) : undrawnPlayers.length > 0 ? (
            <Button
              onClick={handleDrawPlayer}
              disabled={isDrawing}
              className="h-20 w-[450px] text-3xl font-bold font-serif rounded-none border-4 border-primary shadow-2xl bg-primary text-primary-foreground hover:scale-105 transition-all uppercase tracking-[0.2em]"
            >
              {isDrawing ? 'CONSULTING...' : 'REVEAL NEXT LOT'}
            </Button>
          ) : (
              <Button
                  onClick={resetAuction}
                  variant="outline"
                  className="h-16 w-96 font-bold font-serif rounded-none border-2 border-primary/30 text-primary bg-black/40 hover:bg-primary hover:text-primary-foreground uppercase tracking-widest"
              >
                  RESTART SESSION
              </Button>
          )}
        </div>

        {/* Footer HUD */}
        <div className="flex flex-col items-center gap-4 mt-8">
          <div className="py-2.5 px-10 bg-primary text-primary-foreground text-[12px] font-bold uppercase tracking-[0.4em] shadow-lg rounded-full">
              {undrawnPlayers.length} LOTS REMAINING IN SET
          </div>
          <p className="text-[11px] text-white/30 font-bold uppercase tracking-[0.6em] text-center max-w-md leading-relaxed">
              SAAVAN '26 • SPORTS DEPARTMENT • IIT MADRAS PARADOX
          </p>
        </div>
      </div>
    </div>
  );
}
