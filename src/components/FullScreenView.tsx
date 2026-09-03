
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { X, Gavel, Users, ChevronsLeft, ChevronsRight, Timer, Plus, RefreshCw, Trophy } from 'lucide-react';
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

// Sound Effect URLs
const SOUNDS = {
    REVEAL: 'https://assets.mixkit.co/sfx/preview/mixkit-positive-interface-beep-221.mp3',
    SOLD: 'https://assets.mixkit.co/sfx/preview/mixkit-gavel-hammer-thump-2293.mp3',
    BUZZER: 'https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3',
    TICK: 'https://assets.mixkit.co/sfx/preview/mixkit-simple-game-countdown-921.mp3'
};

export default function FullScreenView({ players, set, onReset }: FullScreenViewProps) {
  const [undrawnPlayers, setUndrawnPlayers] = useState<Player[]>([...players]);
  const [drawnPlayers, setDrawnPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  
  // Bidding State
  const [currentBid, setCurrentBid] = useState<number>(0);
  const [timer, setTimer] = useState<number>(30);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isSold, setIsSold] = useState(false);

  const drawingInterval = useRef<NodeJS.Timeout>();
  const timerInterval = useRef<NodeJS.Timeout>();
  const [drawingDisplayPlayer, setDrawingDisplayPlayer] = useState<Player | null>(null);

  // Audio refs
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({
    reveal: typeof Audio !== 'undefined' ? new Audio(SOUNDS.REVEAL) : null,
    sold: typeof Audio !== 'undefined' ? new Audio(SOUNDS.SOLD) : null,
    buzzer: typeof Audio !== 'undefined' ? new Audio(SOUNDS.BUZZER) : null,
    tick: typeof Audio !== 'undefined' ? new Audio(SOUNDS.TICK) : null,
  });

  const playSound = (key: string) => {
    const audio = audioRefs.current[key];
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {}); // Catch browser blocking autoplay
    }
  };

  useEffect(() => {
    setUndrawnPlayers([...players]);
    setDrawnPlayers([]);
    setCurrentPlayer(null);
  }, [players]);

  // Timer logic
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
    setDrawingDisplayPlayer(null);
  }, []);

  const handleDrawPlayer = useCallback(() => {
    if (undrawnPlayers.length === 0 || isDrawing) return;

    setIsDrawing(true);
    setCurrentPlayer(null);
    setIsSold(false);
    setIsTimerActive(false);
    setTimer(30);

    drawingInterval.current = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * undrawnPlayers.length);
        setDrawingDisplayPlayer(undrawnPlayers[randomIndex]);
    }, 100);

    setTimeout(() => {
      stopDrawingAnimation();
      const randomIndex = Math.floor(Math.random() * undrawnPlayers.length);
      const newDrawnPlayer = undrawnPlayers[randomIndex];
      
      setCurrentPlayer(newDrawnPlayer);
      setCurrentBid(newDrawnPlayer.reservePrice || 0);
      setDrawnPlayers(prev => [newDrawnPlayer, ...prev]);
      setUndrawnPlayers(prev => prev.filter(p => p.id !== newDrawnPlayer.id));
      setIsDrawing(false);
      playSound('reveal');
    }, 2500);
  }, [isDrawing, undrawnPlayers, stopDrawingAnimation]);
  
  const resetAuction = () => {
    stopDrawingAnimation();
    onReset();
    setIsDrawing(false);
  };

  const getIncrement = (value: number) => {
    if (value < 100) return 5; // Up to 1 Cr: 5L
    if (value < 200) return 10; // 1-2 Cr: 10L
    if (value < 500) return 20; // 2-5 Cr: 20L
    return 50; // Above 5 Cr: 50L
  };

  const handleIncreaseBid = () => {
    if (isSold) return;
    const inc = getIncrement(currentBid);
    setCurrentBid(prev => prev + inc);
    setTimer(30);
    setIsTimerActive(true);
  };

  const handleSold = () => {
    setIsSold(true);
    setIsTimerActive(false);
    playSound('sold');
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
      if (event.key === ' ' && !isDrawing) {
        event.preventDefault();
        if (!currentPlayer) {
            handleDrawPlayer();
        } else if (!isSold) {
            handleIncreaseBid();
        }
      } else if (event.key === 'Escape') {
        router.push('/');
      } else if (event.key === 's' && currentPlayer && !isSold) {
        handleSold();
      }
    }, [handleDrawPlayer, router, currentPlayer, isSold]
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
  
  const statItemVariant = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Sound preloader - hidden */}
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
                Sold Roster
              </h3>
              <ul className="space-y-2 h-[calc(100%-4rem)] overflow-y-auto pr-2 custom-scrollbar">
                {drawnPlayers.map((player, index) => (
                  <li key={player.id} className="flex items-center gap-3 p-3 rounded-none bg-secondary/50 border border-primary/30">
                    <span className="text-xs font-bold text-primary">{drawnPlayers.length - index}.</span>
                    <span className="font-medium truncate text-foreground">{player.playerName}</span>
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
          <button className="w-8 h-24 bg-primary text-primary-foreground border-y-2 border-r-2 border-primary/50 flex items-center justify-center shadow-lg">
            {isSidebarOpen ? <ChevronsLeft /> : <ChevronsRight />}
          </button>
        </CollapsibleTrigger>
      </Collapsible>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push('/')}
        className="absolute top-6 right-6 h-12 w-12 rounded-none z-40 border-2 border-primary bg-background/50 text-primary hover:bg-primary hover:text-primary-foreground"
      >
        <X className="h-8 w-8" />
      </Button>

      <div className="w-full max-w-6xl flex-1 flex flex-col justify-center items-center relative py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPlayer ? currentPlayer.id : 'waiting'}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full"
          >
            <Card className="w-full ornate-border bg-card/90 backdrop-blur-md shadow-[0_0_60px_rgba(0,0,0,0.6)]">
              <CardContent className="p-6 sm:p-10 w-full relative">
                
                {/* Timer Overlay */}
                {currentPlayer && !isSold && isTimerActive && (
                    <div className="absolute top-4 right-4 flex flex-col items-center">
                        <div className={cn(
                            "w-16 h-16 rounded-full border-4 flex items-center justify-center font-bold text-2xl transition-colors",
                            timer <= 5 ? "border-destructive text-destructive animate-pulse" : "border-primary text-primary"
                        )}>
                            {timer}
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-widest mt-1 text-muted-foreground">Clock</span>
                    </div>
                )}

                {/* Sold Overlay */}
                {isSold && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 2 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-background/40 backdrop-blur-sm pointer-events-none"
                    >
                        <div className="border-8 border-primary p-8 rotate-[-12deg] bg-card shadow-2xl">
                            <h2 className="text-8xl font-serif font-black text-primary uppercase tracking-tighter">SOLD</h2>
                        </div>
                    </motion.div>
                )}

                {isDrawing ? (
                   <div className="text-center min-h-[450px] flex flex-col justify-center items-center">
                      <div className="w-32 h-32 border-4 border-primary border-t-transparent animate-spin rounded-full mb-8" />
                      <h1 className="text-6xl sm:text-8xl text-primary font-bold font-serif animate-pulse">
                        Choosing...
                      </h1>
                    </div>
                ) : currentPlayer ? (
                  <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 w-full">
                    {/* Artistic Image Frame */}
                    <div className="w-full lg:w-2/5 flex-shrink-0">
                        <div className="relative aspect-[3/4] max-w-[360px] mx-auto lg:mx-0 ornate-border">
                            <div className="bg-background w-full h-full flex items-center justify-center overflow-hidden">
                                {currentPlayer.imageUrl ? (
                                    <Image src={currentPlayer.imageUrl} alt={currentPlayer.playerName} fill className="object-cover" />
                                ) : (
                                    <span className="font-serif text-9xl text-primary/20">{currentPlayer.playerName[0]}</span>
                                )}
                            </div>
                            <div className="absolute bottom-0 left-0 w-full bg-primary py-2 text-center text-primary-foreground font-bold tracking-widest text-xs uppercase">
                                List Sr.No {currentPlayer.playerNumber}
                            </div>
                        </div>
                    </div>

                    {/* Details in SAAVAN Style */}
                    <div className="w-full lg:w-3/5 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
                        <div className="space-y-1">
                          <p className="font-serif text-2xl text-primary/80 tracking-widest uppercase">Lot Profile</p>
                          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold font-serif leading-tight text-foreground filter drop-shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
                            {currentPlayer.playerName}
                          </h1>
                        </div>
                        
                        <div className="w-full grid grid-cols-2 gap-3 mt-4">
                            {[
                              { label: 'Origin', value: currentPlayer.country },
                              { label: 'Specialism', value: currentPlayer.specialism },
                              { label: 'Category', value: currentPlayer.cua },
                              { label: 'Points', value: currentPlayer.points },
                              { label: 'Reserve Price', value: `${currentPlayer.reservePrice} Lakh` },
                            ].map((stat, i) => (stat.value !== undefined && stat.value !== null && stat.value !== '') && (
                              <motion.div 
                                key={i}
                                variants={statItemVariant}
                                initial="hidden"
                                animate="visible"
                                transition={{ delay: 0.05 * i }}
                                className="flex flex-col p-3 bg-secondary/30 border-l-4 border-primary"
                              >
                                <span className="text-[10px] text-primary font-bold uppercase tracking-tighter mb-1">{stat.label}</span>
                                <span className="font-serif text-xl text-foreground">{stat.value}</span>
                              </motion.div>
                            ))}
                        </div>

                        {/* Live Bidding Display */}
                        <div className="w-full mt-6 p-4 border-2 border-primary bg-background/50 flex flex-col items-center lg:items-start">
                             <span className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-2">Live Bidding Status</span>
                             <div className="flex items-baseline gap-4">
                                <span className="text-6xl font-mono font-black text-foreground">{currentBid}</span>
                                <span className="text-2xl font-serif text-primary">Lakh</span>
                             </div>
                             {!isSold && (
                                <div className="mt-2 flex items-center gap-2 text-muted-foreground text-sm font-medium">
                                    <Plus className="h-4 w-4" /> Next Valid Bid: <span className="text-foreground font-bold">{currentBid + getIncrement(currentBid)} Lakh</span>
                                </div>
                             )}
                        </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center min-h-[450px] flex flex-col justify-center items-center space-y-8">
                    <Gavel className="h-32 w-32 text-primary animate-bounce" />
                    <h1 className="text-5xl sm:text-7xl font-bold font-serif text-primary">
                      {undrawnPlayers.length > 0 ? 'Commence Bidding' : 'Auction Concluded'}
                    </h1>
                     <p className="text-foreground/70 text-xl font-medium">
                       {undrawnPlayers.length > 0 ? 'The hammer awaits the first lot.' : 'All portfolios have been allocated.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bidding Console Controls */}
      <div className="w-full max-w-4xl p-6 flex flex-col items-center gap-4 z-10">
        {currentPlayer && !isSold ? (
            <div className="flex flex-wrap justify-center gap-4">
                <Button
                    onClick={handleIncreaseBid}
                    size="lg"
                    className="h-16 px-8 text-xl font-bold font-serif rounded-none border-4 border-primary shadow-xl hover:scale-105 transition-transform"
                >
                    <Plus className="mr-2 h-6 w-6" /> Raise Bid ({getIncrement(currentBid)}L)
                </Button>
                
                <Button
                    onClick={() => { setTimer(30); setIsTimerActive(true); }}
                    variant="secondary"
                    size="lg"
                    className="h-16 px-8 text-xl font-bold font-serif rounded-none border-4 border-primary/30"
                >
                    <RefreshCw className="mr-2 h-6 w-6" /> Reset Clock
                </Button>

                <Button
                    onClick={handleSold}
                    variant="destructive"
                    size="lg"
                    className="h-16 px-8 text-xl font-bold font-serif rounded-none border-4 border-destructive/50 shadow-xl"
                >
                    <Gavel className="mr-2 h-6 w-6" /> Final Sold
                </Button>
            </div>
        ) : undrawnPlayers.length > 0 ? (
          <Button
            onClick={handleDrawPlayer}
            disabled={isDrawing}
            size="lg"
            className="h-20 w-80 text-3xl font-bold font-serif rounded-none border-4 border-primary shadow-2xl hover:scale-105 transition-transform"
          >
            {isDrawing ? 'Consulting...' : drawnPlayers.length === 0 ? 'Reveal First Lot' : 'Next Lot'}
          </Button>
        ) : (
            <div className="flex flex-col items-center gap-4">
                 <div className="flex items-center gap-2 text-primary font-serif text-2xl mb-2">
                    <Trophy className="h-8 w-8" /> Final Results Pending
                </div>
                <Button
                    onClick={resetAuction}
                    size="lg"
                    variant="outline"
                    className="h-16 w-80 text-2xl font-bold font-serif rounded-none border-4"
                >
                    Restart Session
                </Button>
            </div>
        )}
        
        {currentPlayer && (
            <div className="px-6 py-2 bg-primary text-primary-foreground font-bold tracking-widest text-xs shadow-xl">
                {undrawnPlayers.length} LOTS REMAINING IN SET
            </div>
        )}
      </div>
    </div>
  );
}

