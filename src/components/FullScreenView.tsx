'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { X, RefreshCw, Keyboard, Clock3, Shield, History, Trophy, Gavel } from 'lucide-react';
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
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
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
      setIsTimerActive(true);
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
        setIsTimerActive(false);
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
      } else if (event.key === 'h') {
        setIsHistoryOpen(prev => !prev);
      } else if (event.key === '?') {
        setIsHelpOpen(prev => !prev);
      }
    }, [handleDrawPlayer, router, currentPlayer, isSold, isUnsold, handleIncreaseBid, startHammerSequence]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#2b0303] sunburst-bg select-none overflow-hidden h-screen text-foreground">
      
      {/* Top Header Controls */}
      <div className="absolute top-6 right-6 z-40 flex gap-3">
        <button onClick={() => setIsHistoryOpen(!isHistoryOpen)} className={cn(
          "h-10 w-10 flex items-center justify-center rounded-lg backdrop-blur-md transition-all border",
          isHistoryOpen ? "bg-primary text-primary-foreground border-primary" : "bg-black/40 border-primary/20 text-primary hover:bg-primary/20"
        )}>
          <History size={20} />
        </button>
        <button onClick={() => setIsHelpOpen(true)} className="h-10 w-10 flex items-center justify-center bg-black/40 border border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground rounded-lg backdrop-blur-md transition-all">
          <Keyboard size={20} />
        </button>
        <button onClick={resetAuction} className="h-10 w-10 flex items-center justify-center bg-black/40 border border-red-900/40 text-red-500 hover:bg-red-600 hover:text-white rounded-lg backdrop-blur-md transition-all">
          <RefreshCw size={18} />
        </button>
        <button onClick={() => router.push('/')} className="h-10 w-10 flex items-center justify-center bg-black/40 border border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground rounded-lg backdrop-blur-md transition-all">
          <X size={22} />
        </button>
      </div>

      {/* Side History Panel (Left Side) */}
      <AnimatePresence>
        {isHistoryOpen && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="fixed left-0 top-0 bottom-0 w-72 bg-black/60 backdrop-blur-xl border-r border-primary/20 z-30 pt-20 px-4 flex flex-col"
          >
            <div className="flex items-center gap-2 mb-6 border-b border-primary/20 pb-4">
              <History className="text-primary h-5 w-5" />
              <h2 className="font-serif text-lg text-primary uppercase tracking-widest">History</h2>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-24">
              {drawnPlayers.length > 0 ? (
                drawnPlayers.map((p, i) => (
                  <div key={i} className="bg-black/40 border border-primary/10 p-3 rounded flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-10 shrink-0",
                      p.status === 'sold' ? "bg-primary" : "bg-destructive"
                    )} />
                    <div className="flex-1">
                      <p className="font-serif text-xs text-white uppercase tracking-wider truncate">{p.playerName}</p>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest",
                          p.status === 'sold' ? "text-primary/60" : "text-destructive/60"
                        )}>
                          {p.status}
                        </span>
                        {p.status === 'sold' && (
                          <span className="text-xs font-mono font-bold text-white">{p.finalPrice}L</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-20 text-center px-4">
                  <Gavel size={48} className="text-primary mb-4" />
                  <p className="text-xs uppercase tracking-[0.2em] font-bold">No Records Yet</p>
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <main className={cn(
        "flex-1 w-full flex flex-col items-center justify-center p-4 transition-all duration-500",
        isHistoryOpen ? "pl-80" : ""
      )}>
        <AnimatePresence mode="wait">
          {!isDrawing && currentPlayer ? (
            <motion.div 
              key={currentPlayer.id} 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 1.05 }}
              className="relative w-full max-w-[960px] max-h-[68vh] aspect-[16/9] ornate-border bg-[#1a0202]/95 backdrop-blur-xl shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden flex"
              style={{ border: '4px double hsl(var(--primary))' }}
            >
              {/* Internal Thin Border */}
              <div className="absolute inset-1 pointer-events-none border border-primary/20 z-10" />

              {/* Left Column: Image & Insight */}
              <div className="w-[300px] h-full flex flex-col p-6 bg-black/20 border-r border-primary/20">
                <div className="w-full aspect-[3/4] relative border border-primary/30 p-1 bg-black/40 overflow-hidden">
                    <div className="absolute inset-0 border border-primary/10 z-10" />
                    <div className="bg-background w-full h-full flex items-center justify-center relative">
                        {currentPlayer.imageUrl ? (
                            <Image 
                                src={currentPlayer.imageUrl} 
                                alt={currentPlayer.playerName} 
                                fill 
                                className="object-cover"
                                sizes="300px"
                                priority
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center opacity-10">
                                <Shield size={80} className="text-primary" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Insight Box under player image */}
                <div className="mt-4 flex-1 border border-primary/20 bg-black/40 p-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-primary/40" />
                    <span className="text-[9px] text-primary/60 font-black tracking-[0.2em] uppercase block mb-2">Scout Analysis</span>
                    <div className="h-[calc(100%-25px)] overflow-y-auto custom-scrollbar">
                        <p className="text-[11px] font-sans italic text-foreground/80 leading-relaxed pr-2">
                            {currentPlayer.auctionInsight || 'High-value strategic asset for the upcoming season. Expected to command a massive premium in the bidding war.'}
                        </p>
                    </div>
                </div>
              </div>

              {/* Right Column: Profile & Bidding */}
              <div className="flex-1 flex flex-col p-8 relative">
                {/* Lot Identification */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] text-primary font-black tracking-[0.4em] uppercase border-l-2 border-primary pl-3">Official Lot</span>
                  <div className="bg-primary/10 border border-primary/30 px-3 py-1">
                    <span className="text-[9px] text-primary font-black tracking-widest uppercase italic">NO. {currentPlayer.playerNumber}</span>
                  </div>
                </div>

                {/* Player Name */}
                <h1 className="text-5xl font-serif font-black text-white uppercase italic tracking-tighter mb-8 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                  {currentPlayer.playerName}
                </h1>

                {/* Stats Matrix */}
                <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-8">
                    {[
                      { label: 'Origin', value: currentPlayer.country },
                      { label: 'Specialism', value: currentPlayer.specialism },
                      { label: 'Category', value: currentPlayer.cua },
                      { label: 'Points', value: currentPlayer.points },
                    ].map((stat, i) => (
                      <div key={i} className="flex flex-col border-b border-primary/10 pb-2">
                        <span className="text-[9px] text-primary/40 font-black tracking-[0.2em] uppercase mb-1">{stat.label}</span>
                        <span className="font-serif text-base text-white font-bold tracking-wider">{stat.value || 'N/A'}</span>
                      </div>
                    ))}
                </div>

                {/* Bidding Console */}
                <div className="mt-auto border-2 border-primary/30 bg-black/60 p-6 relative">
                    {/* 20s Countdown Timer Overlay */}
                    {isTimerActive && (
                        <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-[#1a0202] border-2 border-primary flex items-center justify-center z-20 shadow-[0_0_20px_gold]">
                            <span className={cn(
                                "text-lg font-mono font-black",
                                timer <= 5 ? "text-destructive animate-pulse" : "text-primary"
                            )}>
                                {timer}
                            </span>
                        </div>
                    )}

                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_8px_red]" />
                        <span className="text-[10px] text-primary font-black tracking-[0.2em] uppercase">Live Floor</span>
                        
                        {/* Final Call Indicator */}
                        <div className="ml-auto flex gap-2">
                             {[1, 2, 3].map((idx) => (
                                <div key={idx} className={cn(
                                    "w-12 h-2 rounded-sm transition-all duration-500", 
                                    ((idx === 1 && finalCallStatus !== 'none') || (idx === 2 && (finalCallStatus === 'twice' || finalCallStatus === 'final')) || (idx === 3 && finalCallStatus === 'final')) 
                                    ? "bg-primary shadow-[0_0_15px_gold]" 
                                    : "bg-white/5"
                                )} />
                            ))}
                        </div>
                    </div>

                    <div className="flex items-baseline gap-4 mb-3">
                        <motion.span 
                            key={currentBid}
                            initial={{ scale: 0.8, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-7xl font-mono font-black text-white leading-none tracking-tighter"
                        >
                            {currentBid}
                        </motion.span>
                        <span className="text-3xl font-serif text-primary italic font-black uppercase tracking-widest">Lakh</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-primary/20 pt-3">
                        <div className="text-[10px] text-primary/60 font-bold uppercase tracking-[0.2em]">
                            Base: <span className="text-white ml-1">{currentPlayer.reservePrice}L</span>
                        </div>
                        <div className="text-[10px] text-primary font-black uppercase tracking-[0.2em] bg-primary/10 px-2 py-0.5">
                            Next: <span className="text-white ml-2">{nextValidBid}L</span>
                        </div>
                    </div>
                    
                    {/* Hammer Text Overlay (Larger View) */}
                    <AnimatePresence>
                        {finalCallStatus !== 'none' && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 1.2, y: 10 }} 
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className="absolute left-1/2 -translate-x-1/2 -top-12 bg-primary px-10 py-2 text-xl font-serif font-black text-primary-foreground uppercase italic tracking-[0.4em] shadow-[0_0_30px_gold] z-50 whitespace-nowrap"
                            >
                                {finalCallStatus === 'once' ? 'GOING ONCE' : finalCallStatus === 'twice' ? 'GOING TWICE' : 'FINAL CALL'}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
              </div>

              {/* Sold/Unsold Global Overlay (Massive View) */}
              <AnimatePresence>
                {(isSold || isUnsold) && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        className="absolute inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-xl"
                    >
                        <motion.div 
                          initial={{ scale: 0.6, opacity: 0, rotate: -5 }} 
                          animate={{ scale: 1, opacity: 1, rotate: 0 }}
                          className={cn(
                            "p-20 border-[8px] bg-[#1a0202] shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col items-center ornate-border relative",
                            isSold ? "border-primary" : "border-destructive"
                        )}>
                            <div className="absolute -top-10 bg-background px-8 py-2 border-2 border-primary/30">
                                <Trophy className={cn("w-12 h-12", isSold ? "text-primary" : "text-destructive")} />
                            </div>
                            
                            <h2 className={cn(
                                "text-[10rem] font-black uppercase italic mb-2 tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)] leading-none",
                                isSold ? "text-primary" : "text-destructive"
                            )}>
                                {isSold ? 'SOLD' : 'UNSOLD'}
                            </h2>
                            
                            <h3 className="text-3xl font-serif text-white uppercase tracking-[0.5em] mb-10 border-y border-primary/20 py-2 w-full text-center">
                              {currentPlayer.playerName}
                            </h3>

                            {isSold && (
                                <div className="flex items-baseline gap-4 mb-12 bg-primary/10 px-12 py-4 border-2 border-primary/40">
                                    <span className="text-8xl font-mono font-black text-white">{currentBid}</span>
                                    <span className="text-4xl font-serif text-primary italic font-black uppercase">Lakh</span>
                                </div>
                            )}

                            <Button onClick={handleDrawPlayer} className="h-16 px-16 bg-primary text-primary-foreground font-black uppercase tracking-[0.4em] hover:scale-110 transition-transform rounded-none shadow-[0_0_40px_gold] text-lg">
                                Next Lot
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : isDrawing ? (
            <div className="flex flex-col items-center gap-6">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent animate-spin rounded-full shadow-[0_0_30px_gold]" />
              <h1 className="text-2xl text-primary font-black font-serif tracking-[0.5em] animate-pulse uppercase">Lot Entry...</h1>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-10 text-center"
            >
              <div className="space-y-3">
                <h1 className="text-8xl font-serif font-black text-primary tracking-[0.3em] uppercase italic drop-shadow-[0_0_20px_rgba(255,215,0,0.4)]">Saavan '26</h1>
                <p className="text-white/40 text-[12px] tracking-[1.5em] font-black uppercase ml-[1.5em]">Official Auction Terminal</p>
              </div>
              <Button onClick={handleDrawPlayer} className="h-16 px-24 text-xl font-black font-serif bg-primary text-primary-foreground tracking-[0.5em] uppercase hover:scale-105 transition-transform shadow-[0_0_20px_gold] rounded-none">
                Open Floor
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Moderator Deck */}
      <footer className={cn(
        "w-full flex flex-col items-center gap-4 pb-8 px-8 z-50 transition-all duration-500",
        isHistoryOpen ? "pl-80" : ""
      )}>
        <div className="flex items-center gap-4 w-full max-w-[960px]">
          {currentPlayer && !isSold && !isUnsold ? (
            <>
              <Button 
                onClick={handleIncreaseBid} 
                className="h-14 flex-1 bg-primary text-primary-foreground font-serif font-black text-lg tracking-[0.2em] uppercase rounded-none shadow-[0_5px_20px_rgba(255,215,0,0.2)]"
              >
                + Raise Bid ({getIncrement(currentBid)}L)
              </Button>
              
              <Button 
                onClick={() => { setTimer(DEFAULT_TIMER); setIsTimerActive(true); setFinalCallStatus('none'); }} 
                variant="outline" 
                className="h-14 px-8 border-white/20 bg-black/40 text-white font-serif font-black text-[10px] tracking-[0.2em] uppercase rounded-none hover:bg-white/10"
              >
                <Clock3 className="mr-3 h-4 w-4"/> Reset Timer
              </Button>

              <Button 
                onClick={startHammerSequence} 
                disabled={finalCallStatus !== 'none'} 
                className="h-14 px-10 bg-[#e65100] hover:bg-[#ef6c00] text-white font-serif font-black text-[11px] tracking-[0.2em] uppercase rounded-none shadow-lg"
              >
                Start Hammer
              </Button>

              <Button 
                onClick={handleUnsold} 
                className="h-14 px-8 bg-[#1a0202] border border-red-900/40 text-red-500 font-serif font-black text-[10px] tracking-[0.2em] uppercase rounded-none hover:bg-red-600 hover:text-white"
              >
                Unsold
              </Button>
            </>
          ) : (undrawnPlayers.length > 0 && !isDrawing) || (isSold || isUnsold) ? (
            <Button onClick={handleDrawPlayer} className="h-14 w-full font-black font-serif text-base bg-primary text-primary-foreground tracking-[0.5em] uppercase rounded-none">
              {undrawnPlayers.length > 0 ? 'Reveal Next Lot' : 'Session Concluded'}
            </Button>
          ) : null}
        </div>

        {/* Set Remaining Info */}
        <div className="bg-primary/5 border border-primary/20 px-8 py-1.5">
            <span className="text-[10px] font-mono font-black text-primary tracking-[0.4em] uppercase">
                {undrawnPlayers.length} Lots Remaining • {set.name}
            </span>
        </div>
      </footer>

      {/* Shortcuts Overlay */}
      <AnimatePresence>
        {isHelpOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6"
            onClick={() => setIsHelpOpen(false)}
          >
            <div className="max-w-md w-full bg-[#1a0202] border border-primary/40 p-8 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => setIsHelpOpen(false)} className="absolute top-4 right-4 text-primary hover:text-white">
                    <X size={24} />
                </button>
                <h2 className="text-xl font-serif text-primary uppercase tracking-[0.3em] border-b border-primary/20 pb-4 mb-6">Moderator Terminal</h2>
                <div className="space-y-2">
                    {[
                        { key: 'Space', action: 'Reveal / Increment Bid' },
                        { key: 'F', action: 'Initiate Hammer Sequence' },
                        { key: 'U', action: 'Mark Lot as Unsold' },
                        { key: 'R', action: 'Reset 20s Countdown' },
                        { key: 'H', action: 'Toggle Side History' },
                        { key: 'Esc', action: 'Exit to Dashboard' },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between bg-white/5 p-3 border border-white/5 hover:border-primary transition-all">
                            <span className="text-[9px] font-black bg-primary text-primary-foreground px-2 py-0.5 uppercase">{item.key}</span>
                            <span className="text-[9px] uppercase font-bold text-white/50 tracking-widest">{item.action}</span>
                        </div>
                    ))}
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
