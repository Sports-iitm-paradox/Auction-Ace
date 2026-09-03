'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { X, Gavel, ChevronsLeft, ChevronsRight, Trophy, Ban, RefreshCw } from 'lucide-react';
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
    }, 1500);
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
    <div className="fixed inset-0 flex flex-col items-center justify-between py-6 px-4 bg-[#3d0606] sunburst-bg select-none overflow-hidden h-screen">
      
      {/* Drawer & Close UI */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            className="absolute top-0 left-0 h-full z-50 w-64 bg-card/95 border-r-4 border-primary p-6 shadow-2xl"
          >
            <h3 className="text-xl font-bold text-primary font-serif border-b border-primary pb-2 mb-4">Lot Roster</h3>
            <ul className="space-y-2 h-[calc(100%-4rem)] overflow-y-auto custom-scrollbar">
              {drawnPlayers.map((p) => (
                <li key={p.id} className={cn("p-2 border text-xs", p.status === 'sold' ? "bg-primary/10 border-primary" : "bg-destructive/10 border-destructive/50")}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium truncate">{p.playerName}</span>
                    <span className="uppercase font-bold text-[8px]">{p.status}</span>
                  </div>
                  {p.status === 'sold' && <div className="font-mono text-primary font-bold mt-1">{p.finalPrice}L</div>}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn('absolute top-1/2 -translate-y-1/2 z-40 transition-all', isSidebarOpen ? 'left-64' : 'left-0')}>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-8 h-12 bg-primary text-primary-foreground flex items-center justify-center rounded-r-md">
          {isSidebarOpen ? <ChevronsLeft size={16} /> : <ChevronsRight size={16} />}
        </button>
      </div>

      <div className="absolute top-4 right-4 z-40">
        <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="h-8 w-8 border border-primary/30 text-primary">
          <X size={18} />
        </Button>
      </div>

      {/* Main Lot View */}
      <div className="flex-1 flex items-center justify-center w-full max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {!isDrawing && currentPlayer ? (
            <motion.div 
              key={currentPlayer.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="flex flex-col lg:flex-row items-center gap-8 w-full"
            >
              {/* Image Frame */}
              <div className="w-full lg:w-[280px] shrink-0 text-center">
                <div className="ornate-border border-4 border-primary p-1 bg-black/20 aspect-[3/4] relative">
                  <div className="w-full h-full relative overflow-hidden">
                    {currentPlayer.imageUrl ? (
                      <Image src={currentPlayer.imageUrl} alt={currentPlayer.playerName} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-background/20 font-serif text-8xl text-primary/10">?</div>
                    )}
                  </div>
                </div>
                <div className="mt-2 font-bold text-[9px] uppercase tracking-[0.3em] text-primary">LIST SR.NO {currentPlayer.playerNumber}</div>
              </div>

              {/* Info Column */}
              <div className="flex-1 flex flex-col justify-center space-y-6 relative">
                 {/* Status Stamps */}
                 {(isSold || isUnsold) && (
                  <motion.div initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                    <div className={cn("border-8 p-6 -rotate-12 bg-background/80 shadow-2xl", isSold ? "border-primary text-primary" : "border-red-600 text-red-600")}>
                      <h2 className="text-6xl font-black uppercase tracking-tight">{isSold ? 'SOLD' : 'UNSOLD'}</h2>
                    </div>
                  </motion.div>
                )}

                <div>
                  <p className="text-[10px] text-primary font-bold tracking-[0.4em] mb-1">LOT PROFILE</p>
                  <h1 className="text-4xl lg:text-5xl font-serif font-bold text-white uppercase truncate">{currentPlayer.playerName}</h1>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {[
                    { label: 'ORIGIN', value: currentPlayer.country },
                    { label: 'SPECIALISM', value: currentPlayer.specialism },
                    { label: 'CATEGORY', value: currentPlayer.cua },
                    { label: 'POINTS', value: currentPlayer.points },
                  ].map((s, i) => s.value && (
                    <div key={i}>
                      <span className="text-[9px] text-primary/60 font-bold uppercase tracking-[0.3em] block">{s.label}</span>
                      <span className="font-serif text-lg text-white uppercase">{s.value}</span>
                    </div>
                  ))}
                  <div>
                    <span className="text-[9px] text-primary/60 font-bold uppercase tracking-[0.3em] block">RESERVE PRICE</span>
                    <span className="font-serif text-lg text-white uppercase">{currentPlayer.reservePrice} LAKH</span>
                  </div>
                </div>

                {/* Bidding Console */}
                <div className="p-4 border border-primary/40 bg-black/40 relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-bold text-primary uppercase tracking-[0.4em] block mb-1">LIVE BIDDING STATUS</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-mono font-black text-white">{currentBid}</span>
                        <span className="text-xl font-serif text-primary font-bold">LAKH</span>
                      </div>
                      {!isSold && !isUnsold && (
                        <p className="text-[10px] text-white/70 mt-2 uppercase font-bold tracking-widest">
                          + Next Valid Bid: <span className="text-primary font-mono">{nextValidBid} Lakh</span>
                        </p>
                      )}
                    </div>
                    {isTimerActive && !isSold && !isUnsold && (
                      <div className={cn("w-12 h-12 rounded-full border-4 flex items-center justify-center font-bold text-xl", timer <= 5 ? "border-red-600 text-red-600 animate-pulse" : "border-primary text-primary")}>
                        {timer}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : isDrawing ? (
            <div className="flex flex-col items-center gap-6">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent animate-spin rounded-full" />
              <h1 className="text-3xl text-primary font-bold font-serif uppercase tracking-[0.2em]">DRAWING LOT...</h1>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center gap-4">
              <Trophy className="h-20 w-20 text-primary/40 animate-pulse" />
              <h1 className="text-4xl font-serif font-bold text-primary tracking-tight">SESSION READY</h1>
              <p className="text-white/30 text-lg tracking-[0.3em] uppercase">Press SPACE to reveal lot</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Control Actions */}
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-4">
        {currentPlayer && !isSold && !isUnsold ? (
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="flex gap-4">
              <Button onClick={handleIncreaseBid} size="lg" className="h-12 px-8 font-serif font-bold text-lg rounded-none bg-primary text-primary-foreground tracking-widest uppercase">+ RAISE BID ({getIncrement(currentBid)}L)</Button>
              <Button onClick={() => { setTimer(30); setIsTimerActive(true); }} variant="outline" className="h-12 px-6 font-bold rounded-none border-white/20 bg-black/40 text-white uppercase text-xs"><RefreshCw className="mr-2 h-4 w-4"/> RESET</Button>
              <Button onClick={handleSold} className="h-12 px-8 font-serif font-bold text-lg rounded-none bg-[#FF5722] text-white tracking-widest uppercase"><Gavel className="mr-2 h-5 w-5"/> SOLD</Button>
            </div>
            <Button onClick={handleUnsold} variant="outline" className="h-8 px-6 font-bold rounded-none border-red-600/30 text-red-500 bg-black/40 text-[9px] tracking-widest uppercase"><Ban className="mr-2 h-4 w-4"/> MARK UNSOLD</Button>
          </div>
        ) : undrawnPlayers.length > 0 ? (
          <Button onClick={handleDrawPlayer} disabled={isDrawing} className="h-14 w-80 text-xl font-bold font-serif border-4 border-primary bg-primary text-primary-foreground tracking-widest uppercase">
            {isDrawing ? 'CONSULTING...' : 'REVEAL NEXT LOT'}
          </Button>
        ) : (
          <Button onClick={resetAuction} variant="outline" className="h-12 w-64 font-bold border-primary/30 text-primary bg-black/40 uppercase tracking-widest">RESTART SESSION</Button>
        )}

        <div className="flex flex-col items-center gap-2 mt-2">
          <div className="px-6 py-1 bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-[0.3em] rounded-full">{undrawnPlayers.length} LOTS REMAINING</div>
          <p className="text-[9px] text-white/20 font-bold uppercase tracking-[0.4em]">SAAVAN '26 • IIT MADRAS PARADOX</p>
        </div>
      </div>
    </div>
  );
}
