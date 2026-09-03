
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
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
    exit: { opacity: 0, y: -50, scale: 0.95 },
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-4 overflow-hidden bg-background">
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
          <button className="w-10 h-10 bg-primary text-primary-foreground border-2 border-primary/50 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform">
            {isSidebarOpen ? <ChevronsLeft /> : <ChevronsRight />}
          </button>
        </CollapsibleTrigger>
      </Collapsible>

      <div className="absolute top-6 right-6 z-40">
        <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
            className="h-10 w-10 rounded-none border-2 border-primary bg-background/50 text-primary hover:bg-primary hover:text-primary-foreground"
        >
            <X className="h-6 w-6" />
        </Button>
      </div>

      <div className="w-full max-w-5xl flex-1 flex flex-col justify-center items-center relative py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPlayer ? currentPlayer.id : 'waiting'}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full flex justify-center"
          >
            <Card className="w-full max-w-[900px] ornate-border bg-card/90 backdrop-blur-md shadow-2xl relative overflow-hidden">
              <CardContent className="p-6 sm:p-10 relative min-h-[400px] flex items-center justify-center">
                
                {currentPlayer && !isSold && !isUnsold && isTimerActive && (
                    <div className="absolute top-6 right-6 flex flex-col items-center z-20">
                        <div className={cn(
                            "w-14 h-14 rounded-full border-4 flex items-center justify-center font-bold text-2xl shadow-lg",
                            timer <= 5 ? "border-destructive text-destructive animate-pulse bg-destructive/10" : "border-primary text-primary bg-primary/10"
                        )}>
                            {timer}
                        </div>
                    </div>
                )}

                {(isSold || isUnsold) && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 2 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm pointer-events-none"
                    >
                        <div className={cn(
                            "border-8 p-8 rotate-[-12deg] bg-card shadow-2xl",
                            isSold ? "border-primary" : "border-destructive"
                        )}>
                            <h2 className={cn(
                                "text-7xl font-serif font-black uppercase tracking-tighter",
                                isSold ? 'text-primary' : 'text-destructive'
                            )}>
                                {isSold ? 'SOLD' : 'UNSOLD'}
                            </h2>
                        </div>
                    </motion.div>
                )}

                {isDrawing ? (
                   <div className="text-center flex flex-col justify-center items-center">
                      <div className="w-16 h-16 border-4 border-primary border-t-transparent animate-spin rounded-full mb-4" />
                      <h1 className="text-4xl text-primary font-bold font-serif animate-pulse">Consulting...</h1>
                    </div>
                ) : currentPlayer ? (
                  <div className="flex flex-col lg:flex-row items-stretch justify-center gap-10 w-full">
                    {/* Left: Player Photo */}
                    <div className="w-full lg:w-[280px] flex-shrink-0 flex flex-col items-center">
                        <div className="relative w-full aspect-[3/4] ornate-border shadow-xl">
                            <div className="bg-background w-full h-full flex items-center justify-center overflow-hidden">
                                {currentPlayer.imageUrl ? (
                                    <Image src={currentPlayer.imageUrl} alt={currentPlayer.playerName} fill className="object-cover" />
                                ) : (
                                    <span className="font-serif text-9xl text-primary/20">{currentPlayer.playerName[0]}</span>
                                )}
                            </div>
                        </div>
                        <div className="mt-2 py-1 px-4 bg-primary text-primary-foreground font-bold text-[10px] uppercase tracking-widest border border-primary/50">
                            List Sr.No {currentPlayer.playerNumber}
                        </div>
                    </div>

                    {/* Right: Stats and Bid */}
                    <div className="flex-1 flex flex-col justify-between text-center lg:text-left space-y-6">
                        <div>
                          <p className="font-serif text-[10px] text-primary font-bold uppercase tracking-[0.3em] mb-1">Lot Profile</p>
                          <h1 className="text-5xl lg:text-6xl font-bold font-serif text-foreground drop-shadow-md uppercase tracking-tight">
                            {currentPlayer.playerName}
                          </h1>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            {[
                              { label: 'Origin', value: currentPlayer.country },
                              { label: 'Specialism', value: currentPlayer.specialism },
                              { label: 'Category', value: currentPlayer.cua },
                              { label: 'Points', value: currentPlayer.points },
                              { label: 'Reserve Price', value: `${currentPlayer.reservePrice} Lakh` },
                            ].map((stat, i) => stat.value && (
                              <div key={i} className="flex flex-col p-3 bg-secondary/20 border-l-2 border-primary/50">
                                <span className="text-[9px] text-primary/60 font-bold uppercase mb-0.5 tracking-wider">{stat.label}</span>
                                <span className="font-serif text-lg text-foreground font-medium">{stat.value}</span>
                              </div>
                            ))}
                        </div>

                        {/* Live Bid Box */}
                        <div className="w-full p-4 border-2 border-primary/60 bg-background/40 relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rotate-45 translate-x-8 -translate-y-8" />
                             <span className="text-[10px] font-bold text-primary/80 uppercase mb-1 tracking-widest block">Live Bidding Status</span>
                             <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-mono font-black text-foreground">{currentBid}</span>
                                <span className="text-2xl font-serif text-primary/80">Lakh</span>
                             </div>
                             {!isSold && !isUnsold && (
                                <p className="text-[10px] font-bold text-muted-foreground mt-1">
                                    + Next Valid Bid: <span className="text-primary">{nextValidBid} Lakh</span>
                                </p>
                             )}
                        </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center flex flex-col justify-center items-center space-y-4">
                    <Trophy className="h-20 w-20 text-primary animate-bounce" />
                    <h1 className="text-5xl font-bold font-serif text-primary tracking-tighter">
                      {undrawnPlayers.length > 0 ? 'Commence Bidding' : 'Auction Concluded'}
                    </h1>
                    <p className="text-muted-foreground italic">Prepare for the next lot reveal</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Control Buttons HUD */}
      <div className="w-full max-w-4xl p-4 flex flex-col items-center gap-4 z-10">
        {currentPlayer && !isSold && !isUnsold ? (
            <div className="flex flex-wrap justify-center items-center gap-4">
                <Button
                    onClick={handleIncreaseBid}
                    size="lg"
                    className="h-14 px-8 font-bold font-serif rounded-none border-2 border-primary bg-primary text-primary-foreground shadow-2xl hover:scale-105 active:scale-95 transition-transform text-lg"
                >
                    <Plus className="mr-2 h-6 w-6" /> Raise Bid ({getIncrement(currentBid)}L)
                </Button>
                
                <Button
                    onClick={() => { setTimer(30); setIsTimerActive(true); }}
                    variant="outline"
                    className="h-14 px-8 font-bold font-serif rounded-none border-2 border-primary/30 text-foreground hover:bg-secondary/50 text-lg"
                >
                    <RefreshCw className="mr-2 h-5 w-5" /> Reset Clock
                </Button>

                <Button
                    onClick={handleSold}
                    className="h-14 px-8 font-bold font-serif rounded-none border-2 border-destructive/50 bg-[#ff4d4d] text-white hover:bg-destructive shadow-lg text-lg"
                >
                    <Gavel className="mr-2 h-6 w-6" /> Final Sold
                </Button>

                <Button
                    onClick={handleUnsold}
                    variant="outline"
                    className="h-14 px-8 font-bold font-serif rounded-none border-2 border-destructive/20 text-destructive/70 hover:bg-destructive/10 text-lg"
                >
                    <Ban className="mr-2 h-5 w-5" /> Unsold
                </Button>
            </div>
        ) : undrawnPlayers.length > 0 ? (
          <Button
            onClick={handleDrawPlayer}
            disabled={isDrawing}
            className="h-16 w-72 text-2xl font-bold font-serif rounded-none border-4 border-primary shadow-2xl bg-primary text-primary-foreground hover:scale-105 transition-transform"
          >
            {isDrawing ? 'Consulting...' : 'Reveal Next Lot'}
          </Button>
        ) : (
            <Button
                onClick={resetAuction}
                variant="outline"
                className="h-14 w-72 font-bold font-serif rounded-none border-2"
            >
                Restart Session
            </Button>
        )}

        {/* Lots Remaining Badge */}
        {undrawnPlayers.length > 0 && (
            <div className="mt-4 py-1.5 px-6 bg-primary/20 text-primary border border-primary/40 text-[11px] font-bold uppercase tracking-[0.2em] shadow-inner">
                {undrawnPlayers.length} Lots Remaining in Set
            </div>
        )}
      </div>
      
      {/* Footer Branding */}
      <div className="absolute bottom-6 w-full text-center pointer-events-none opacity-40">
        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.4em]">
            SAAVAN '26 • Sports Department • IIT Madras Paradox
        </p>
      </div>
    </div>
  );
}

