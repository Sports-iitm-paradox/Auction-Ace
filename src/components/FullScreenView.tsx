
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { X, Gavel, Users, ChevronsLeft, ChevronsRight, Plus, RefreshCw, Trophy, Ban } from 'lucide-react';
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

    drawingInterval.current = setInterval(() => {
    }, 100);

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
    <div className="fixed inset-0 flex flex-col items-center justify-center p-4 overflow-hidden bg-[#3d0606] sunburst-bg">
      <div className="hidden">
        {Object.entries(SOUNDS).map(([key, url]) => (
            <audio key={key} src={url} preload="auto" />
        ))}
      </div>

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            className="absolute top-0 left-0 h-full z-30 w-72"
          >
            <div className="h-full w-full bg-card/95 backdrop-blur-md border-r-4 border-primary p-4 space-y-4 shadow-2xl">
              <h3 className="text-2xl font-bold text-primary font-serif border-b-2 border-primary pb-2">
                Lot Roster
              </h3>
              <ul className="space-y-2 h-[calc(100%-4rem)] overflow-y-auto pr-2 custom-scrollbar">
                {drawnPlayers.map((player) => (
                  <li key={player.id} className={cn(
                      "flex flex-col gap-1 p-3 border transition-colors",
                      player.status === 'sold' ? "bg-primary/10 border-primary" : "bg-destructive/10 border-destructive/50"
                  )}>
                    <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] font-bold px-1 rounded-sm uppercase", player.status === 'sold' ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground")}>
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

      <Collapsible
        open={isSidebarOpen}
        onOpenChange={setIsSidebarOpen}
        className={cn(
          'absolute top-1/2 -translate-y-1/2 z-40 transition-all duration-300',
          isSidebarOpen ? 'left-72' : 'left-0'
        )}
      >
        <CollapsibleTrigger asChild>
          <button className="w-10 h-10 bg-[#FFD700] text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform">
            {isSidebarOpen ? <ChevronsLeft /> : <ChevronsRight />}
          </button>
        </CollapsibleTrigger>
      </Collapsible>

      <div className="absolute top-6 right-6 z-40">
        <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
            className="h-10 w-10 rounded-none border border-[#FFD700]/30 bg-black/20 text-[#FFD700] hover:bg-[#FFD700] hover:text-black"
        >
            <X className="h-6 w-6" />
        </Button>
      </div>

      <div className="w-full max-w-6xl flex-1 flex flex-col justify-center items-center relative py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPlayer ? currentPlayer.id : 'waiting'}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full flex justify-center"
          >
            <div className="w-full max-w-[1000px] bg-[#4a0808]/80 backdrop-blur-sm shadow-2xl relative overflow-hidden border-2 border-[#FFD700]/40 p-1">
              <div className="border border-[#FFD700]/20 p-8 sm:p-12 min-h-[500px] flex items-center justify-center relative">
                
                {currentPlayer && !isSold && !isUnsold && isTimerActive && (
                    <div className="absolute top-8 right-8 flex flex-col items-center z-20">
                        <div className={cn(
                            "w-16 h-16 rounded-full border-4 flex items-center justify-center font-bold text-3xl shadow-lg",
                            timer <= 5 ? "border-red-600 text-red-600 animate-pulse bg-red-600/10" : "border-[#FFD700] text-[#FFD700] bg-[#FFD700]/10"
                        )}>
                            {timer}
                        </div>
                    </div>
                )}

                {(isSold || isUnsold) && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 2 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none"
                    >
                        <div className={cn(
                            "border-8 p-10 rotate-[-12deg] bg-[#2a0404] shadow-2xl",
                            isSold ? "border-[#FFD700]" : "border-red-600"
                        )}>
                            <h2 className={cn(
                                "text-8xl font-serif font-black uppercase tracking-tighter px-4",
                                isSold ? 'text-[#FFD700]' : 'text-red-600'
                            )}>
                                {isSold ? 'SOLD' : 'UNSOLD'}
                            </h2>
                        </div>
                    </motion.div>
                )}

                {isDrawing ? (
                   <div className="text-center flex flex-col justify-center items-center">
                      <div className="w-20 h-20 border-4 border-[#FFD700] border-t-transparent animate-spin rounded-full mb-6" />
                      <h1 className="text-5xl text-[#FFD700] font-bold font-serif animate-pulse tracking-widest uppercase">Consulting...</h1>
                    </div>
                ) : currentPlayer ? (
                  <div className="flex flex-col lg:flex-row items-start justify-center gap-12 w-full">
                    {/* Left: Player Photo Section */}
                    <div className="w-full lg:w-[320px] flex-shrink-0 flex flex-col items-center">
                        <div className="relative w-full aspect-[3/4] border-4 border-[#FFD700] shadow-2xl p-1">
                            <div className="border border-[#FFD700]/40 w-full h-full bg-black/40 relative overflow-hidden">
                                {currentPlayer.imageUrl ? (
                                    <Image src={currentPlayer.imageUrl} alt={currentPlayer.playerName} fill className="object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="font-serif text-[12rem] text-[#FFD700]/10">{currentPlayer.playerName[0]}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="mt-4 py-1.5 px-6 bg-[#FFD700] text-black font-bold text-[11px] uppercase tracking-widest shadow-md">
                            List Sr.No {currentPlayer.playerNumber}
                        </div>
                    </div>

                    {/* Right: Info Section */}
                    <div className="flex-1 flex flex-col w-full">
                        <div className="mb-8">
                          <p className="font-serif text-[11px] text-[#FFD700]/80 font-bold uppercase tracking-[0.4em] mb-2">Lot Profile</p>
                          <h1 className="text-6xl lg:text-7xl font-bold font-serif text-white tracking-tight leading-tight">
                            {currentPlayer.playerName}
                          </h1>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            {[
                              { label: 'Origin', value: currentPlayer.country },
                              { label: 'Specialism', value: currentPlayer.specialism },
                              { label: 'Category', value: currentPlayer.cua },
                              { label: 'Points', value: currentPlayer.points },
                            ].map((stat, i) => stat.value && (
                              <div key={i} className="flex flex-col p-4 bg-black/20 border border-[#FFD700]/10">
                                <span className="text-[10px] text-[#FFD700]/60 font-bold uppercase mb-1 tracking-widest">{stat.label}</span>
                                <span className="font-serif text-2xl text-white font-medium">{stat.value}</span>
                              </div>
                            ))}
                        </div>

                        {/* Reserve Price Box */}
                        <div className="mb-8 p-4 bg-black/20 border border-[#FFD700]/10 w-full lg:w-1/2">
                            <span className="text-[10px] text-[#FFD700]/60 font-bold uppercase mb-1 tracking-widest block">Reserve Price</span>
                            <span className="font-serif text-2xl text-white font-medium">{currentPlayer.reservePrice} LAKH</span>
                        </div>

                        {/* Live Bid Box */}
                        <div className="w-full p-6 border-2 border-[#FFD700]/60 bg-black/30 relative">
                             <span className="text-[11px] font-bold text-[#FFD700] uppercase mb-2 tracking-[0.3em] block">Live Bidding Status</span>
                             <div className="flex items-baseline gap-3">
                                <span className="text-7xl font-mono font-black text-white">{currentBid}</span>
                                <span className="text-3xl font-serif text-[#FFD700]">LAKH</span>
                             </div>
                             {!isSold && !isUnsold && (
                                <p className="text-[12px] font-bold text-white/40 mt-3 flex items-center">
                                    <span className="mr-2">+</span> Next Valid Bid: <span className="text-[#FFD700] ml-1">{nextValidBid} Lakh</span>
                                </p>
                             )}
                        </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center flex flex-col justify-center items-center space-y-6">
                    <Trophy className="h-24 w-24 text-[#FFD700] animate-bounce" />
                    <h1 className="text-6xl font-bold font-serif text-[#FFD700] tracking-tighter uppercase">
                      Commence Bidding
                    </h1>
                    <p className="text-white/40 italic text-xl tracking-widest uppercase">Ready the Next Lot</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Control Section */}
      <div className="w-full max-w-4xl p-8 flex flex-col items-center gap-6 z-10">
        {currentPlayer && !isSold && !isUnsold ? (
            <div className="flex flex-col items-center gap-4">
                <div className="flex flex-wrap justify-center items-center gap-6">
                    <Button
                        onClick={handleIncreaseBid}
                        size="lg"
                        className="h-16 px-10 font-bold font-serif rounded-none bg-[#FFD700] text-black hover:bg-[#FFD700]/90 shadow-2xl text-2xl"
                    >
                        <Plus className="mr-3 h-8 w-8" /> RAISE BID ({getIncrement(currentBid)}L)
                    </Button>
                    
                    <Button
                        onClick={() => { setTimer(30); setIsTimerActive(true); }}
                        variant="outline"
                        className="h-16 px-10 font-bold font-serif rounded-none border-2 border-[#FFD700]/20 text-white bg-black/40 hover:bg-black/60 text-xl uppercase tracking-widest"
                    >
                        <RefreshCw className="mr-3 h-6 w-6" /> Reset Clock
                    </Button>

                    <Button
                        onClick={handleSold}
                        className="h-16 px-10 font-bold font-serif rounded-none bg-[#ff4d4d] text-white hover:bg-red-600 shadow-xl text-2xl uppercase tracking-tighter"
                    >
                        <Gavel className="mr-3 h-8 w-8" /> Final Sold
                    </Button>
                </div>
                
                <Button
                    onClick={handleUnsold}
                    variant="ghost"
                    className="h-12 px-10 font-bold font-serif rounded-none border border-red-600/30 text-red-500 hover:bg-red-600/10 text-lg uppercase tracking-widest"
                >
                    <Ban className="mr-3 h-5 w-5" /> Unsold
                </Button>
            </div>
        ) : undrawnPlayers.length > 0 ? (
          <Button
            onClick={handleDrawPlayer}
            disabled={isDrawing}
            className="h-20 w-80 text-3xl font-bold font-serif rounded-none border-4 border-[#FFD700] shadow-2xl bg-[#FFD700] text-black hover:scale-105 transition-transform uppercase tracking-widest"
          >
            {isDrawing ? 'Consulting...' : 'Reveal Next Lot'}
          </Button>
        ) : (
            <Button
                onClick={resetAuction}
                variant="outline"
                className="h-16 w-80 font-bold font-serif rounded-none border-2 border-[#FFD700]/30 text-[#FFD700] bg-black/40 hover:bg-[#FFD700] hover:text-black uppercase tracking-widest"
            >
                Restart Session
            </Button>
        )}
      </div>
      
      {/* Footer HUD */}
      <div className="w-full flex flex-col items-center gap-2 pointer-events-none opacity-80 pb-6">
        <div className="py-2 px-8 bg-[#FFD700] text-black border border-[#FFD700] text-[12px] font-bold uppercase tracking-[0.3em] shadow-lg">
            {undrawnPlayers.length} Lots Remaining in Set
        </div>
        <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.5em] mt-2">
            SAAVAN '26 • SPORTS DEPARTMENT • IIT MADRAS PARADOX
        </p>
      </div>
    </div>
  );
}
