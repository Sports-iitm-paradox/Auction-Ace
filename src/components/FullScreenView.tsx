
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
    <div className="fixed inset-0 flex flex-col items-center justify-center p-4 overflow-hidden bg-[#3d0606] sunburst-bg h-screen">
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
            className="absolute top-0 left-0 h-full z-30 w-64"
          >
            <div className="h-full w-full bg-card/95 backdrop-blur-md border-r-4 border-primary p-4 space-y-4 shadow-2xl">
              <h3 className="text-xl font-bold text-primary font-serif border-b-2 border-primary pb-2">
                Lot Roster
              </h3>
              <ul className="space-y-2 h-[calc(100%-4rem)] overflow-y-auto pr-2 custom-scrollbar">
                {drawnPlayers.map((player) => (
                  <li key={player.id} className={cn(
                      "flex flex-col gap-1 p-2 border transition-colors",
                      player.status === 'sold' ? "bg-primary/10 border-primary" : "bg-destructive/10 border-destructive/50"
                  )}>
                    <div className="flex items-center gap-2">
                        <span className={cn("text-[9px] font-bold px-1 rounded-sm uppercase", player.status === 'sold' ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground")}>
                            {player.status}
                        </span>
                        <span className="font-medium truncate text-foreground text-xs">{player.playerName}</span>
                    </div>
                    {player.status === 'sold' && (
                        <span className="text-[10px] font-mono text-primary font-bold">{player.finalPrice} Lakh</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drawer Toggle */}
      <Collapsible
        open={isSidebarOpen}
        onOpenChange={setIsSidebarOpen}
        className={cn(
          'absolute top-1/2 -translate-y-1/2 z-40 transition-all duration-300',
          isSidebarOpen ? 'left-64' : 'left-0'
        )}
      >
        <CollapsibleTrigger asChild>
          <button className="w-8 h-12 bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform rounded-r-md">
            {isSidebarOpen ? <ChevronsLeft size={18} /> : <ChevronsRight size={18} />}
          </button>
        </CollapsibleTrigger>
      </Collapsible>

      {/* Close Button */}
      <div className="absolute top-4 right-4 z-40">
        <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
            className="h-8 w-8 rounded-none border border-primary/30 bg-black/20 text-primary hover:bg-primary hover:text-primary-foreground"
        >
            <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-6xl flex flex-col items-center gap-6 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPlayer ? currentPlayer.id : 'waiting'}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full flex justify-center"
          >
            {/* Ornate Main Card */}
            <div className="w-full max-w-[1000px] bg-[#3a0505] shadow-2xl relative p-1 border-2 border-primary/40 rounded-sm">
              <div className="border border-primary/20 p-8 sm:p-10 flex items-center justify-center relative min-h-[450px]">
                
                {/* Timer Overlay */}
                {currentPlayer && !isSold && !isUnsold && isTimerActive && (
                    <div className="absolute top-6 right-6 flex flex-col items-center z-20">
                        <div className={cn(
                            "w-14 h-14 rounded-full border-4 flex items-center justify-center font-bold text-2xl shadow-lg",
                            timer <= 5 ? "border-red-600 text-red-600 animate-pulse bg-red-600/10" : "border-primary text-primary bg-primary/10"
                        )}>
                            {timer}
                        </div>
                    </div>
                )}

                {/* Status Stamps */}
                {(isSold || isUnsold) && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 2 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px] pointer-events-none"
                    >
                        <div className={cn(
                            "border-[12px] p-8 rotate-[-12deg] bg-[#2a0404]/90 shadow-2xl",
                            isSold ? "border-primary" : "border-red-600"
                        )}>
                            <h2 className={cn(
                                "text-7xl font-serif font-black uppercase tracking-tight px-6",
                                isSold ? 'text-primary' : 'text-red-600'
                            )}>
                                {isSold ? 'SOLD' : 'UNSOLD'}
                            </h2>
                        </div>
                    </motion.div>
                )}

                {isDrawing ? (
                   <div className="text-center flex flex-col justify-center items-center">
                      <div className="w-20 h-20 border-4 border-primary border-t-transparent animate-spin rounded-full mb-6" />
                      <h1 className="text-5xl text-primary font-bold font-serif animate-pulse tracking-widest uppercase">Drawing...</h1>
                    </div>
                ) : currentPlayer ? (
                  <div className="flex flex-col lg:flex-row items-stretch justify-center gap-10 w-full">
                    {/* Left: Player Photo Frame */}
                    <div className="w-full lg:w-[320px] flex-shrink-0 flex flex-col items-center">
                        <div className="relative w-full aspect-[3/4] border-[6px] border-primary shadow-2xl p-1 bg-black/20">
                            <div className="border-2 border-primary/30 w-full h-full relative overflow-hidden">
                                {currentPlayer.imageUrl ? (
                                    <Image src={currentPlayer.imageUrl} alt={currentPlayer.playerName} fill className="object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="font-serif text-[12rem] text-primary/10">{currentPlayer.playerName[0]}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="mt-3 font-bold text-[11px] uppercase tracking-[0.2em] text-primary">
                            LIST SR.NO {currentPlayer.playerNumber}
                        </div>
                    </div>

                    {/* Right: Info Section */}
                    <div className="flex-1 flex flex-col w-full justify-between py-2">
                        <div>
                          <p className="font-serif text-[11px] text-primary/70 font-bold uppercase tracking-[0.5em] mb-2">LOT PROFILE</p>
                          <h1 className="text-5xl lg:text-7xl font-bold font-serif text-white tracking-tight leading-[0.9] mb-8 truncate uppercase">
                            {currentPlayer.playerName}
                          </h1>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8">
                            {[
                              { label: 'Origin', value: currentPlayer.country },
                              { label: 'Specialism', value: currentPlayer.specialism },
                              { label: 'Category', value: currentPlayer.cua },
                              { label: 'Points', value: currentPlayer.points },
                            ].map((stat, i) => stat.value && (
                              <div key={i} className="flex flex-col border-l-2 border-primary/30 pl-4 py-1">
                                <span className="text-[10px] text-primary/60 font-bold uppercase mb-1 tracking-widest">{stat.label}</span>
                                <span className="font-serif text-2xl text-white font-medium">{stat.value}</span>
                              </div>
                            ))}
                        </div>

                        {/* Reserve Price Box */}
                        <div className="mb-6 border-l-2 border-primary/30 pl-4 py-1">
                            <span className="text-[10px] text-primary/60 font-bold uppercase mb-1 tracking-widest block">RESERVE PRICE</span>
                            <span className="font-serif text-2xl text-white font-medium">{currentPlayer.reservePrice} LAKH</span>
                        </div>

                        {/* Live Bid Box */}
                        <div className="w-full p-6 border-2 border-primary bg-black/40 relative">
                             <span className="text-[11px] font-bold text-primary uppercase mb-1 tracking-[0.4em] block">LIVE BIDDING STATUS</span>
                             <div className="flex items-baseline gap-3">
                                <span className="text-6xl font-mono font-black text-white">{currentBid}</span>
                                <span className="text-3xl font-serif text-primary uppercase">LAKH</span>
                             </div>
                             {!isSold && !isUnsold && (
                                <p className="text-[11px] font-bold text-white/50 mt-2 flex items-center">
                                    <span className="mr-1">+</span> Next Valid Bid: <span className="text-primary ml-1">{nextValidBid} Lakh</span>
                                </p>
                             )}
                        </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center flex flex-col justify-center items-center space-y-6">
                    <Trophy className="h-24 w-24 text-primary animate-bounce" />
                    <h1 className="text-5xl font-bold font-serif text-primary tracking-tighter uppercase">
                      READY TO START
                    </h1>
                    <p className="text-white/40 italic text-xl tracking-widest uppercase">Reveal the first lot of the session</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Control Section */}
        <div className="w-full max-w-4xl flex flex-col items-center gap-6">
          {currentPlayer && !isSold && !isUnsold ? (
              <div className="flex flex-col items-center gap-4 w-full">
                  <div className="flex flex-wrap justify-center items-center gap-4">
                      <Button
                          onClick={handleIncreaseBid}
                          size="lg"
                          className="h-14 px-10 font-bold font-serif rounded-none bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xl text-xl uppercase tracking-widest"
                      >
                          <Plus className="mr-2 h-6 w-6" /> RAISE BID ({getIncrement(currentBid)}L)
                      </Button>
                      
                      <Button
                          onClick={() => { setTimer(30); setIsTimerActive(true); }}
                          variant="outline"
                          className="h-14 px-8 font-bold font-serif rounded-none border-2 border-primary/20 text-white bg-black/40 hover:bg-black/60 text-base uppercase tracking-widest"
                      >
                          <RefreshCw className="mr-2 h-5 w-5" /> RESET CLOCK
                      </Button>

                      <Button
                          onClick={handleSold}
                          className="h-14 px-10 font-bold font-serif rounded-none bg-accent text-accent-foreground hover:bg-accent/90 shadow-xl text-xl uppercase tracking-widest"
                      >
                          <Gavel className="mr-2 h-6 w-6" /> FINAL SOLD
                      </Button>

                      <Button
                        onClick={handleUnsold}
                        variant="outline"
                        className="h-14 px-8 font-bold font-serif rounded-none border-2 border-red-600/30 text-red-500 bg-black/40 hover:bg-red-600/10 text-base uppercase tracking-widest"
                      >
                        <Ban className="mr-2 h-5 w-5" /> UNSOLD
                    </Button>
                  </div>
              </div>
          ) : undrawnPlayers.length > 0 ? (
            <Button
              onClick={handleDrawPlayer}
              disabled={isDrawing}
              className="h-16 w-80 text-2xl font-bold font-serif rounded-none border-4 border-primary shadow-2xl bg-primary text-primary-foreground hover:scale-105 transition-transform uppercase tracking-widest"
            >
              {isDrawing ? 'Consulting...' : 'REVEAL NEXT LOT'}
            </Button>
          ) : (
              <Button
                  onClick={resetAuction}
                  variant="outline"
                  className="h-14 w-80 font-bold font-serif rounded-none border-2 border-primary/30 text-primary bg-black/40 hover:bg-primary hover:text-primary-foreground uppercase tracking-widest"
              >
                  RESTART SESSION
              </Button>
          )}
        </div>

        {/* Footer HUD */}
        <div className="flex flex-col items-center gap-2 mt-4">
          <div className="py-1.5 px-8 bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-[0.4em] shadow-lg">
              {undrawnPlayers.length} LOTS REMAINING IN SET
          </div>
          <p className="text-[10px] text-white/20 font-bold uppercase tracking-[0.5em]">
              SAAVAN '26 • SPORTS DEPARTMENT • IIT MADRAS PARADOX
          </p>
        </div>
      </div>
    </div>
  );
}
