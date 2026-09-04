
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { X, Gavel, ChevronsLeft, ChevronsRight, Trophy, Ban, RefreshCw, Plus, History, Clock3, Keyboard, Info } from 'lucide-react';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
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
    }, 1200);
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
      } else if (event.key === '?' || event.key === 'h') {
        setIsHelpOpen(prev => !prev);
      }
    }, [handleDrawPlayer, router, currentPlayer, isSold, isUnsold, handleIncreaseBid, startHammerSequence]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const progressPercentage = ((players.length - undrawnPlayers.length) / players.length) * 100;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-between bg-[#2b0303] sunburst-bg select-none overflow-hidden h-screen text-foreground transition-all duration-700">
      
      {/* Top Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-white/5 z-50">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            className="h-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]"
          />
      </div>

      <AnimatePresence>
        {isHelpOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setIsHelpOpen(false)}
          >
            <div className="max-w-xl w-full bg-[#1a0202] border-2 border-primary/50 p-6 shadow-2xl ornate-border">
                <div className="flex items-center gap-4 mb-6 border-b border-primary/20 pb-4">
                    <Keyboard className="h-6 w-6 text-primary" />
                    <h2 className="text-xl font-serif text-primary uppercase">Shortcuts</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        { key: 'Space', action: 'Draw / Bid' },
                        { key: 'F', action: 'Start Hammer' },
                        { key: 'U', action: 'Unsold' },
                        { key: 'R', action: 'Reset Timer' },
                        { key: 'Esc', action: 'Exit' },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <span className="text-[10px] font-black bg-primary/20 text-primary px-2 py-1 rounded border border-primary/30">{item.key}</span>
                            <span className="text-[10px] uppercase font-bold text-white/70">{item.action}</span>
                        </div>
                    ))}
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            className="absolute top-0 left-0 h-full z-50 w-full sm:w-72 bg-[#1a0202]/98 border-r-2 border-primary/50 p-6 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-center justify-between border-b border-primary/30 pb-4 mb-6">
                <h3 className="text-lg font-bold text-primary font-serif tracking-wider flex items-center gap-2">
                    <History className="h-4 w-4" /> ROSTER
                </h3>
                <button onClick={() => setIsSidebarOpen(false)} className="text-primary hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>
            <div className="space-y-3 h-[calc(100%-6rem)] overflow-y-auto custom-scrollbar pr-2">
              {drawnPlayers.length === 0 ? (
                <div className="text-center py-10 opacity-30">
                    <History size={40} className="mx-auto mb-2" />
                    <p className="text-[10px] uppercase font-bold">No results yet</p>
                </div>
              ) : drawnPlayers.map((p) => (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    key={p.id} 
                    className={cn(
                        "p-3 border-l-4 rounded-r-md text-sm", 
                        p.status === 'sold' ? "bg-primary/5 border-primary" : "bg-destructive/5 border-destructive"
                    )}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-white uppercase text-xs leading-tight">{p.playerName}</span>
                    <span className={cn(
                        "uppercase text-[8px] font-black px-1.5 py-0.5 rounded", 
                        p.status === 'sold' ? "bg-primary text-primary-foreground" : "bg-destructive text-white"
                    )}>
                        {p.status}
                    </span>
                  </div>
                  {p.status === 'sold' && <div className="text-[9px] text-primary font-mono mt-1">{p.finalPrice} LAKH</div>}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn('absolute top-1/2 -translate-y-1/2 z-40 transition-all', isSidebarOpen ? 'left-72 hidden lg:block' : 'left-0')}>
        <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="w-8 h-20 bg-primary text-primary-foreground flex flex-col items-center justify-center rounded-r-2xl shadow-2xl hover:brightness-110 transition-all"
        >
          {isSidebarOpen ? <ChevronsLeft size={20} /> : <ChevronsRight size={20} />}
        </button>
      </div>

      <div className="absolute top-6 right-6 z-40 flex gap-2">
        <button onClick={() => setIsHelpOpen(true)} className="h-10 w-10 flex items-center justify-center bg-black/40 border border-white/20 text-white/60 hover:text-white rounded-lg backdrop-blur-sm">
          <Keyboard size={18} />
        </button>
        <button onClick={resetAuction} className="h-10 w-10 flex items-center justify-center bg-black/40 border border-white/20 text-white/60 hover:text-red-500 rounded-lg backdrop-blur-sm">
          <RefreshCw size={18} />
        </button>
        <button onClick={() => router.push('/')} className="h-10 w-10 flex items-center justify-center bg-black/40 border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground rounded-lg backdrop-blur-sm">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center w-full px-4 mt-8 lg:mt-0 max-h-[75vh]">
        <AnimatePresence mode="wait">
          {!isDrawing && currentPlayer ? (
            <motion.div 
              key={currentPlayer.id} 
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 1.02 }}
              className="relative w-full max-w-[1100px] bg-[#1a0202]/85 backdrop-blur-xl p-2 shadow-2xl border border-primary/40 ornate-border overflow-hidden"
            >
              <AnimatePresence>
                {(isSold || isUnsold) && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 1.1 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl p-6"
                    >
                        <div className={cn(
                            "relative p-8 lg:p-12 border-8 rotate-[-2deg] bg-[#1a0202] shadow-2xl flex flex-col items-center w-full max-w-lg ornate-border",
                            isSold ? "border-primary" : "border-red-600"
                        )}>
                            <div className="absolute -top-10 -right-10">
                                {isSold ? <Trophy className="h-20 w-20 text-primary drop-shadow-xl" /> : <Ban className="h-20 w-20 text-red-600 drop-shadow-xl" />}
                            </div>
                            <p className="text-[10px] text-white/40 font-black tracking-[0.5em] uppercase mb-4">Official Declaration</p>
                            <h2 className={cn(
                                "text-6xl lg:text-8xl font-black uppercase tracking-tighter italic mb-2 text-center",
                                isSold ? "text-primary" : "text-red-600"
                            )}>
                                {isSold ? 'SOLD' : 'UNSOLD'}
                            </h2>
                            <h3 className="text-xl lg:text-3xl font-serif text-white uppercase mb-6 text-center">{currentPlayer.playerName}</h3>
                            {isSold && (
                                <div className="text-center">
                                    <p className="text-white/40 font-bold uppercase tracking-[0.3em] text-[10px] mb-2">FINAL PRICE</p>
                                    <div className="flex items-baseline justify-center gap-2">
                                        <span className="text-5xl lg:text-7xl font-mono font-black text-white">{currentBid}</span>
                                        <span className="text-xl font-serif text-primary italic">LAKH</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col lg:flex-row gap-6 p-4 lg:p-6 overflow-hidden">
                
                {/* Left Side */}
                <div className="flex flex-col items-center shrink-0 w-full lg:w-[320px]">
                  <div className="p-1 border-2 border-primary/60 bg-black/40 w-full">
                      <div className="border border-primary/30 p-1">
                           <div className="relative aspect-[3/4] overflow-hidden bg-[#2a0303] ornate-border max-h-[300px]">
                              {currentPlayer.imageUrl ? (
                                  <Image src={currentPlayer.imageUrl} alt={currentPlayer.playerName} fill className="object-cover" />
                              ) : (
                                  <div className="w-full h-full flex items-center justify-center font-serif text-6xl text-primary/5">?</div>
                              )}
                           </div>
                      </div>
                  </div>
                  <div className="mt-2 bg-primary px-6 py-1 w-full text-center shadow-lg">
                      <span className="text-[9px] font-black tracking-[0.3em] text-primary-foreground uppercase">LOT #{currentPlayer.playerNumber}</span>
                  </div>

                  {currentPlayer.auctionInsight && (
                    <div className="mt-4 p-4 bg-secondary/20 border-l-4 border-primary/80 w-full shadow-md overflow-y-auto max-h-[120px]">
                        <p className="text-[8px] text-primary font-black tracking-widest uppercase mb-1">Insight</p>
                        <p className="text-xs leading-relaxed text-white/90 italic font-medium">
                            "{currentPlayer.auctionInsight}"
                        </p>
                    </div>
                  )}
                </div>

                {/* Right Side */}
                <div className="flex-1 flex flex-col justify-start w-full space-y-6 lg:space-y-8">
                  <div className="text-center lg:text-left">
                    <p className="text-[10px] text-primary font-black tracking-[0.5em] uppercase opacity-60 mb-1">LOT PROFILE</p>
                    <h1 className="text-3xl lg:text-5xl font-serif font-bold text-white uppercase tracking-tight leading-tight">{currentPlayer.playerName}</h1>
                  </div>

                  <div className="grid grid-cols-2 gap-2 lg:gap-3">
                      {[
                          { label: 'ORIGIN', value: currentPlayer.country },
                          { label: 'SPECIALISM', value: currentPlayer.specialism },
                          { label: 'CATEGORY', value: currentPlayer.cua },
                          { label: 'POINTS', value: currentPlayer.points },
                          { label: 'RESERVE PRICE', value: `${currentPlayer.reservePrice} L` },
                      ].map((s, i) => (
                          <div key={i} className={cn(
                              "bg-black/50 border-l-2 border-primary/40 p-3 lg:p-4 shadow-md",
                              i === 4 && "col-span-2 border-primary bg-primary/10"
                          )}>
                              <span className="text-[8px] text-primary/70 font-black tracking-[0.2em] block mb-1 uppercase">{s.label}</span>
                              <span className="font-serif text-sm lg:text-lg text-white uppercase tracking-wider block font-bold">{s.value || 'N/A'}</span>
                          </div>
                      ))}
                  </div>

                  <div className="relative border-2 border-primary/50 bg-black/80 p-6 shadow-xl ornate-border">
                      <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                          <div className="flex-1 text-center lg:text-left">
                              <div className="flex items-center gap-2 mb-2 justify-center lg:justify-start">
                                <span className="text-[10px] text-primary font-black tracking-[0.4em] uppercase">LIVE HAMMER</span>
                                <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                              </div>
                              <div className="flex items-baseline gap-3 justify-center lg:justify-start">
                                  <span className="text-5xl lg:text-6xl font-mono font-black text-white leading-none tracking-tighter">{currentBid}</span>
                                  <span className="text-2xl lg:text-3xl font-serif text-primary font-black italic">LAKH</span>
                              </div>
                              {!isSold && !isUnsold && (
                                  <div className="mt-2 text-primary text-[10px] font-black uppercase tracking-[0.3em]">
                                      NEXT BID: <span className="font-mono text-white ml-2 text-sm">{nextValidBid} LAKH</span>
                                  </div>
                              )}
                          </div>

                          <div className="flex flex-col items-center gap-4 lg:pl-8 lg:ml-8 lg:border-l border-white/10 min-w-[200px]">
                             {isTimerActive && !isSold && !isUnsold && finalCallStatus === 'none' && (
                                <div className={cn("relative transition-transform", timer <= 5 && "animate-[shake_0.1s_infinite]")}>
                                    <svg className="w-12 h-12 transform -rotate-90">
                                        <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-white/5" />
                                        <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="3" fill="transparent" 
                                            className={cn("transition-all duration-1000", timer <= 10 ? "text-red-600" : "text-primary")}
                                            strokeDasharray="188" strokeDashoffset={188 - (188 * timer) / DEFAULT_TIMER}
                                        />
                                    </svg>
                                    <span className="absolute inset-0 flex items-center justify-center font-black text-base font-mono text-white">
                                        {timer}
                                    </span>
                                </div>
                             )}

                             <div className="flex flex-col items-center gap-3 w-full">
                                <div className="flex gap-2 justify-center">
                                    {[1, 2, 3].map((idx) => (
                                        <div key={idx} className={cn(
                                            "w-8 lg:w-10 h-1.5 rounded-full transition-all duration-700", 
                                            ((idx === 1 && finalCallStatus !== 'none') || (idx === 2 && (finalCallStatus === 'twice' || finalCallStatus === 'final')) || (idx === 3 && finalCallStatus === 'final')) 
                                                ? "bg-primary shadow-[0_0_10px_gold]" 
                                                : "bg-white/10"
                                        )} />
                                    ))}
                                </div>
                                <div className="h-8 flex items-center justify-center">
                                    <AnimatePresence mode="wait">
                                        {finalCallStatus !== 'none' && (
                                            <motion.span 
                                                key={finalCallStatus}
                                                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                                animate={{ opacity: 1, scale: 1.1, y: 0 }}
                                                exit={{ opacity: 0, scale: 1.2, y: -10 }}
                                                className="text-xs lg:text-base font-black tracking-[0.4em] uppercase text-primary italic text-center"
                                            >
                                                {finalCallStatus === 'once' ? 'GOING ONCE' : finalCallStatus === 'twice' ? 'GOING TWICE' : 'FINAL CALL'}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </div>
                             </div>
                          </div>
                      </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : isDrawing ? (
            <div className="flex flex-col items-center gap-6 py-20">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent animate-spin rounded-full shadow-[0_0_20px_gold]" />
              <div className="text-center space-y-2">
                <h1 className="text-2xl lg:text-4xl text-primary font-black font-serif uppercase tracking-[0.3em] animate-pulse">REVEALING NEXT LOT</h1>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center gap-8 py-20">
              <Gavel className="h-24 w-24 text-primary/20 animate-pulse" />
              <div className="space-y-4">
                <h1 className="text-4xl lg:text-6xl font-serif font-black text-primary tracking-tight uppercase">Floor Open</h1>
                <p className="text-white/40 text-sm lg:text-lg tracking-[0.4em] uppercase font-bold animate-bounce">MODERATOR: REVEAL TO START</p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Controls */}
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-4 pb-6 px-4">
        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
          {currentPlayer && !isSold && !isUnsold ? (
            <>
              <Button onClick={handleIncreaseBid} size="lg" className="h-12 lg:h-16 px-10 font-serif font-black text-lg lg:text-xl rounded-none bg-primary text-primary-foreground tracking-widest uppercase flex-1 lg:flex-none">
                + RAISE BID
              </Button>
              <Button onClick={() => { setTimer(DEFAULT_TIMER); setIsTimerActive(true); setFinalCallStatus('none'); }} variant="outline" className="h-12 lg:h-16 px-6 font-black rounded-none border-white/20 bg-[#1a0202] text-white uppercase text-[10px] tracking-[0.2em] flex items-center gap-2 hover:bg-white hover:text-black">
                <RefreshCw size={16}/> RESET
              </Button>
              <Button 
                onClick={startHammerSequence} 
                disabled={finalCallStatus !== 'none'}
                variant="secondary" 
                className="h-12 lg:h-16 px-10 font-serif font-black text-[12px] lg:text-base rounded-none bg-orange-600 text-white tracking-widest uppercase flex-1 lg:flex-none"
              >
                <Clock3 className="mr-2 h-5 w-5"/> {finalCallStatus === 'none' ? 'START HAMMER' : 'HAMMER...'}
              </Button>
              <Button onClick={handleUnsold} variant="outline" className="h-12 lg:h-16 px-6 font-black rounded-none border-red-600 text-red-500 bg-black/60 text-[10px] tracking-[0.2em] uppercase hover:bg-red-600 hover:text-white">
                <Ban className="mr-2 h-5 w-5"/> UNSOLD
              </Button>
            </>
          ) : undrawnPlayers.length > 0 && !isDrawing && !isSold && !isUnsold ? (
            <Button onClick={handleDrawPlayer} disabled={isDrawing} className="h-14 lg:h-20 w-full max-w-[500px] text-xl lg:text-3xl font-black font-serif border-2 border-primary bg-primary text-primary-foreground tracking-[0.2em] uppercase shadow-xl hover:scale-105 transition-all">
              REVEAL NEXT LOT
            </Button>
          ) : (isSold || isUnsold) ? (
             <Button onClick={handleDrawPlayer} className="h-14 lg:h-20 w-full lg:w-[400px] font-black border-2 border-primary bg-primary text-primary-foreground uppercase tracking-[0.2em] text-xl lg:text-2xl hover:scale-105">
                {undrawnPlayers.length > 0 ? 'NEXT PLAYER' : 'FINISH'}
             </Button>
          ) : undrawnPlayers.length === 0 && !isDrawing && (
            <Button onClick={() => router.push('/')} variant="outline" className="h-14 lg:h-20 w-full lg:w-[400px] font-black border-primary/30 text-primary bg-black/40 uppercase tracking-[0.2em] text-xl hover:bg-primary hover:text-white">CLOSE SESSION</Button>
          )}
        </div>

        <div className="bg-primary/90 px-6 py-1 text-primary-foreground text-[10px] font-black uppercase tracking-[0.4em] shadow-xl border-x-4 border-white/20">
            {undrawnPlayers.length} LOTS REMAINING • {set.name}
        </div>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-2px, 0); }
          75% { transform: translate(2px, 0); }
        }
      `}</style>
    </div>
  );
}
