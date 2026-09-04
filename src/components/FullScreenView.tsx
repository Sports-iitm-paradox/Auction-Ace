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
    <div className="fixed inset-0 flex flex-col items-center justify-between bg-[#2b0303] sunburst-bg transition-colors duration-1000 select-none overflow-hidden h-screen text-foreground">
      
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
            className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6"
            onClick={() => setIsHelpOpen(false)}
          >
            <div className="max-w-2xl w-full bg-[#1a0202] border-2 border-primary/50 p-6 sm:p-8 shadow-2xl ornate-border overflow-y-auto max-h-[90vh]">
                <div className="flex items-center gap-4 mb-6 sm:mb-8 border-b border-primary/20 pb-4">
                    <Keyboard className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                    <h2 className="text-xl sm:text-3xl font-serif text-primary uppercase">Moderator Controls</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 sm:gap-y-6">
                    {[
                        { key: 'Space', action: 'Draw Player / Increase Bid' },
                        { key: 'F', action: 'Start Automated Hammer Down' },
                        { key: 'U', action: 'Mark as UNSOLD' },
                        { key: 'R', action: 'Reset/Clear Sequence' },
                        { key: 'H / ?', action: 'Toggle this help menu' },
                        { key: 'Esc', action: 'Exit Presentation' },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between group">
                            <span className="text-[10px] font-black bg-primary/20 text-primary px-2 py-1 rounded border border-primary/30 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">{item.key}</span>
                            <span className="text-[10px] sm:text-sm font-bold text-white/70 uppercase tracking-widest text-right ml-2">{item.action}</span>
                        </div>
                    ))}
                </div>
                <p className="mt-8 sm:mt-12 text-center text-[10px] text-primary/40 uppercase font-black tracking-[0.3em]">Tap anywhere to close</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            className="absolute top-0 left-0 h-full z-50 w-full sm:w-80 bg-[#1a0202]/98 border-r-2 border-primary/50 p-6 shadow-2xl backdrop-blur-md"
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

      <div className={cn('absolute top-1/2 -translate-y-1/2 z-40 transition-all', isSidebarOpen ? 'left-80 hidden lg:block' : 'left-0')}>
        <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="w-8 lg:w-10 h-16 lg:h-20 bg-primary text-primary-foreground flex flex-col items-center justify-center rounded-r-2xl shadow-2xl hover:brightness-110 transition-all group"
        >
          {isSidebarOpen ? <ChevronsLeft size={24} /> : <ChevronsRight size={24} />}
          <span className="hidden lg:block [writing-mode:vertical-rl] text-[10px] font-black tracking-widest mt-2 uppercase">History</span>
        </button>
      </div>

      <div className="absolute top-4 lg:top-8 right-4 lg:right-8 z-40 flex gap-2 lg:gap-4">
        <button onClick={() => setIsHelpOpen(true)} title="Keyboard Shortcuts" className="h-9 w-9 lg:h-12 lg:w-12 flex items-center justify-center bg-black/40 border border-white/20 text-white/60 hover:text-white transition-all rounded-lg backdrop-blur-sm">
          <Keyboard size={20} />
        </button>
        <button onClick={resetAuction} title="Reset Session" className="h-9 w-9 lg:h-12 lg:w-12 flex items-center justify-center bg-black/40 border border-white/20 text-white/60 hover:text-red-500 transition-all rounded-lg backdrop-blur-sm">
          <RefreshCw size={20} />
        </button>
        <button onClick={() => router.push('/')} title="Exit" className="h-9 w-9 lg:h-12 lg:w-12 flex items-center justify-center bg-black/40 border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all rounded-lg backdrop-blur-sm">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center w-full px-4 lg:px-12 mt-16 lg:mt-0 overflow-y-auto lg:overflow-visible custom-scrollbar">
        <AnimatePresence mode="wait">
          {!isDrawing && currentPlayer ? (
            <motion.div 
              key={currentPlayer.id} 
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 1.02 }}
              className="relative w-full max-w-[1200px] bg-[#1a0202]/85 backdrop-blur-xl p-1 lg:p-2 shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-primary/40 ornate-border"
            >
              <AnimatePresence>
                {(isSold || isUnsold) && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 1.1 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 lg:p-12"
                    >
                        <div className={cn(
                            "relative p-8 lg:p-16 border-8 rotate-[-3deg] bg-[#1a0202] shadow-[0_0_150px_rgba(0,0,0,1)] flex flex-col items-center w-full lg:max-w-xl ornate-border",
                            isSold ? "border-primary" : "border-red-600"
                        )}>
                            <div className="absolute -top-8 lg:-top-16 -right-8 lg:-right-16">
                                {isSold ? <Trophy className="h-20 w-20 lg:h-32 lg:w-32 text-primary drop-shadow-[0_0_30px_rgba(255,204,0,0.6)]" /> : <Ban className="h-20 w-20 lg:h-32 lg:w-32 text-red-600 drop-shadow-[0_0_30px_rgba(220,38,38,0.6)]" />}
                            </div>
                            <p className="text-[10px] lg:text-[12px] text-white/40 font-black tracking-[0.5em] lg:tracking-[1em] uppercase mb-6">Official Declaration</p>
                            <h2 className={cn(
                                "text-6xl lg:text-9xl font-black uppercase tracking-tighter italic drop-shadow-2xl mb-4 text-center leading-none",
                                isSold ? "text-primary" : "text-red-600"
                            )}>
                                {isSold ? 'SOLD' : 'UNSOLD'}
                            </h2>
                            <div className="h-px w-32 lg:w-64 bg-white/10 my-6" />
                            <h3 className="text-2xl lg:text-4xl font-serif text-white uppercase mb-8 text-center">{currentPlayer.playerName}</h3>
                            
                            {isSold && (
                                <div className="text-center">
                                    <p className="text-white/40 font-bold uppercase tracking-[0.3em] lg:tracking-[0.5em] text-[10px] lg:text-[12px] mb-4">FINAL HAMMER PRICE</p>
                                    <div className="flex items-baseline justify-center gap-3">
                                        <span className="text-6xl lg:text-9xl font-mono font-black text-white leading-none">{currentBid}</span>
                                        <span className="text-2xl lg:text-4xl font-serif text-primary font-bold italic">LAKH</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 p-4 lg:p-8">
                
                {/* Left Side: Photo + Insight */}
                <div className="flex flex-col items-center shrink-0 w-full lg:w-[380px]">
                  <div className="p-1 border-2 border-primary/60 bg-black/40 shadow-2xl w-full">
                      <div className="border border-primary/30 p-2">
                           <div className="relative aspect-[3/4] overflow-hidden bg-[#2a0303] ornate-border">
                              {currentPlayer.imageUrl ? (
                                  <Image src={currentPlayer.imageUrl} alt={currentPlayer.playerName} fill className="object-cover" />
                              ) : (
                                  <div className="w-full h-full flex items-center justify-center font-serif text-7xl lg:text-9xl text-primary/5">?</div>
                              )}
                           </div>
                      </div>
                  </div>
                  <div className="mt-4 bg-primary px-8 py-2 w-full text-center shadow-2xl border-b-4 border-black/20">
                      <span className="text-[10px] lg:text-[12px] font-black tracking-[0.4em] text-primary-foreground uppercase">LIST SR.NO {currentPlayer.playerNumber}</span>
                  </div>

                  {/* Auction Insight Placement */}
                  {currentPlayer.auctionInsight && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 p-6 bg-secondary/20 border-l-4 border-primary/80 w-full shadow-xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <Info size={40} className="text-primary" />
                        </div>
                        <p className="text-[9px] text-primary font-black tracking-widest uppercase mb-3">Scout Insight</p>
                        <p className="text-[13px] lg:text-[15px] leading-relaxed text-white/90 italic font-medium font-sans">
                            "{currentPlayer.auctionInsight}"
                        </p>
                    </motion.div>
                  )}
                </div>

                {/* Right Side: Data + Bidding */}
                <div className="flex-1 flex flex-col justify-start w-full space-y-8 lg:space-y-10">
                  
                  <div className="text-center lg:text-left">
                    <div className="flex items-center gap-3 lg:gap-4 mb-3 justify-center lg:justify-start">
                        <span className="h-px w-8 lg:w-16 bg-primary/40" />
                        <p className="text-[10px] lg:text-[12px] text-primary font-black tracking-[0.4em] lg:tracking-[0.6em] uppercase opacity-80">LOT PROFILE</p>
                        <span className="h-px w-8 lg:w-16 bg-primary/40" />
                    </div>
                    <h1 className="text-4xl lg:text-7xl font-serif font-bold text-white uppercase tracking-tight leading-none text-center lg:text-left drop-shadow-2xl">{currentPlayer.playerName}</h1>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 lg:gap-4">
                      {[
                          { label: 'ORIGIN', value: currentPlayer.country },
                          { label: 'SPECIALISM', value: currentPlayer.specialism },
                          { label: 'CATEGORY', value: currentPlayer.cua },
                          { label: 'POINTS', value: currentPlayer.points },
                          { label: 'RESERVE PRICE', value: `${currentPlayer.reservePrice} L` },
                      ].map((s, i) => (
                          <div key={i} className={cn(
                              "bg-black/50 border-l-4 border-primary/40 p-4 lg:p-6 shadow-lg transition-all hover:bg-primary/5",
                              i === 4 && "col-span-2 border-primary bg-primary/10"
                          )}>
                              <span className="text-[8px] lg:text-[10px] text-primary/70 font-black tracking-[0.3em] lg:tracking-[0.4em] block mb-2 uppercase">{s.label}</span>
                              <span className="font-serif text-lg lg:text-2xl text-white uppercase tracking-wider block font-bold">{s.value || 'N/A'}</span>
                          </div>
                      ))}
                  </div>

                  {/* Live Bidding Console */}
                  <div className="relative border-2 border-primary/50 bg-black/80 p-6 lg:p-10 shadow-[0_0_50px_rgba(255,204,0,0.15)] ornate-border">
                      <div className="flex flex-col lg:flex-row items-center justify-between relative z-10 gap-8 lg:gap-0">
                          <div className="flex-1 text-center lg:text-left">
                              <div className="flex items-center gap-3 mb-4 justify-center lg:justify-start">
                                <span className="text-[10px] lg:text-[12px] text-primary font-black tracking-[0.4em] lg:tracking-[0.6em] uppercase">LIVE HAMMER STATUS</span>
                                <div className="h-3 w-3 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_red]" />
                              </div>
                              <div className="flex items-baseline gap-4 justify-center lg:justify-start">
                                  <span className="text-6xl lg:text-8xl font-mono font-black text-white leading-none tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">{currentBid}</span>
                                  <span className="text-3xl lg:text-5xl font-serif text-primary font-black italic">LAKH</span>
                              </div>
                              {!isSold && !isUnsold && (
                                  <div className="mt-6 flex items-center gap-3 justify-center lg:justify-start text-primary">
                                      <Plus size={16} strokeWidth={3} />
                                      <p className="text-[11px] lg:text-[14px] font-black uppercase tracking-[0.3em] lg:tracking-[0.4em]">
                                          NEXT BID: <span className="font-mono text-white ml-2 text-lg">{nextValidBid} LAKH</span>
                                      </p>
                                  </div>
                              )}
                          </div>

                          <div className="flex flex-col items-center gap-6 lg:gap-8 border-t lg:border-t-0 lg:border-l border-white/10 pt-8 lg:pt-0 lg:pl-12 lg:ml-12 min-w-full lg:min-w-[280px]">
                             {isTimerActive && !isSold && !isUnsold && finalCallStatus === 'none' && (
                                <div className={cn(
                                    "relative flex items-center justify-center transition-transform scale-125 lg:scale-[1.7]",
                                    timer <= 5 && "animate-[shake_0.1s_infinite]"
                                )}>
                                    <svg className="w-16 h-16 transform -rotate-90">
                                        <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                                        <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="4" fill="transparent" 
                                            className={cn("transition-all duration-1000", timer <= 10 ? "text-red-600" : "text-primary")}
                                            strokeDasharray="251" strokeDashoffset={251 - (251 * timer) / DEFAULT_TIMER}
                                        />
                                    </svg>
                                    <span className={cn(
                                        "absolute font-black text-xl font-mono",
                                        timer <= 5 ? "text-red-600 scale-125" : "text-white"
                                    )}>
                                        {timer}
                                    </span>
                                </div>
                             )}

                             <div className="flex flex-col items-center gap-4 lg:gap-6 w-full">
                                <div className="flex gap-3 lg:gap-4 justify-center">
                                    {[1, 2, 3].map((idx) => {
                                        const isActive = (idx === 1 && finalCallStatus !== 'none') || 
                                                       (idx === 2 && (finalCallStatus === 'twice' || finalCallStatus === 'final')) ||
                                                       (idx === 3 && finalCallStatus === 'final');
                                        return (
                                            <div key={idx} className={cn(
                                                "w-12 lg:w-16 h-2 lg:h-3 rounded-full transition-all duration-700", 
                                                isActive ? (idx === 3 ? "bg-red-600 shadow-[0_0_25px_rgba(220,38,38,1)]" : "bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.8)]") : "bg-white/10"
                                            )} />
                                        );
                                    })}
                                </div>
                                <div className="h-10 lg:h-12 flex items-center justify-center w-full">
                                    <AnimatePresence mode="wait">
                                        {finalCallStatus !== 'none' && (
                                            <motion.span 
                                                key={finalCallStatus}
                                                initial={{ opacity: 0, scale: 0.8, y: 15 }}
                                                animate={{ opacity: 1, scale: 1.2, y: 0 }}
                                                exit={{ opacity: 0, scale: 1.3, y: -15 }}
                                                className="text-lg lg:text-3xl font-black tracking-[0.4em] lg:tracking-[0.6em] uppercase text-primary text-center whitespace-nowrap drop-shadow-[0_0_15px_rgba(255,204,0,0.8)] italic"
                                            >
                                                {finalCallStatus === 'once' ? 'GOING ONCE' : finalCallStatus === 'twice' ? 'GOING TWICE' : 'FINAL CALL'}
                                            </motion.span>
                                        )}
                                        {finalCallStatus === 'none' && isTimerActive && (
                                             <span className="text-[12px] font-black tracking-[0.6em] uppercase text-white/30 text-center">BIDDING SESSION ACTIVE</span>
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
            <div className="flex flex-col items-center gap-8 py-20">
              <div className="w-24 h-24 border-8 border-primary border-t-transparent animate-spin rounded-full shadow-[0_0_60px_rgba(255,204,0,0.6)]" />
              <div className="text-center space-y-4">
                <h1 className="text-4xl lg:text-7xl text-primary font-black font-serif uppercase tracking-[0.5em] animate-pulse">REVEALING NEXT LOT</h1>
                <p className="text-primary/40 text-[10px] lg:text-[14px] font-black tracking-[1em] uppercase">ACCESSING PARADOX PLAYER POOL</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center gap-10 py-20">
              <div className="p-10 lg:p-16 border-4 border-primary/20 rounded-full animate-pulse bg-primary/5 shadow-2xl relative">
                <Gavel className="h-32 w-32 lg:h-48 lg:w-48 text-primary/20" />
                <div className="absolute inset-0 border-4 border-primary/10 rounded-full animate-ping" />
              </div>
              <div className="space-y-6 lg:space-y-8">
                <h1 className="text-4xl lg:text-8xl font-serif font-black text-primary tracking-tight uppercase px-4 leading-none">Auction Floor Open</h1>
                <div className="flex flex-col items-center gap-6">
                    <p className="text-white/40 text-lg lg:text-2xl tracking-[0.6em] uppercase font-bold animate-bounce">MODERATOR: REVEAL TO START</p>
                    <div className="flex items-center gap-3 bg-black/40 px-6 py-3 rounded-full border border-primary/20 backdrop-blur-sm">
                        <Keyboard size={18} className="text-primary/60" />
                        <span className="text-[10px] lg:text-[12px] text-primary/60 uppercase font-black tracking-widest text-center">SPACE: Draw/Bid • F: Hammer • U: Unsold</span>
                    </div>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Controls */}
      <div className="w-full max-w-7xl mx-auto flex flex-col items-center gap-6 pb-8 lg:pb-12 px-6">
        
        <div className="flex flex-wrap items-center justify-center gap-3 lg:gap-4 w-full">
          {currentPlayer && !isSold && !isUnsold ? (
            <>
              <Button onClick={handleIncreaseBid} size="lg" className="h-14 lg:h-20 px-10 lg:px-16 font-serif font-black text-xl lg:text-3xl rounded-none bg-primary text-primary-foreground tracking-widest uppercase shadow-[0_8px_0_rgba(0,0,0,0.4)] hover:scale-105 active:translate-y-1 active:shadow-none transition-all flex-1 lg:flex-none">
                + RAISE BID
              </Button>
              <Button onClick={() => { setTimer(DEFAULT_TIMER); setIsTimerActive(true); setFinalCallStatus('none'); }} variant="outline" className="h-14 lg:h-20 px-6 lg:px-10 font-black rounded-none border-white/20 bg-[#1a0202] text-white uppercase text-[10px] lg:text-[14px] tracking-[0.4em] flex items-center gap-3 flex-1 lg:flex-none hover:bg-white hover:text-black">
                <RefreshCw size={20}/> RESET
              </Button>
              <Button 
                onClick={startHammerSequence} 
                disabled={finalCallStatus !== 'none'}
                variant="secondary" 
                className="h-14 lg:h-20 px-10 lg:px-14 font-serif font-black text-[12px] lg:text-lg rounded-none bg-orange-600 text-white tracking-widest uppercase shadow-[0_8px_0_rgba(0,0,0,0.4)] hover:scale-105 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 w-full lg:w-auto"
              >
                <Clock3 className="mr-3 h-6 w-6"/> {finalCallStatus === 'none' ? 'START HAMMER' : 'HAMMER RUNNING'}
              </Button>
              <Button onClick={handleUnsold} variant="outline" className="h-14 lg:h-20 px-6 lg:px-10 font-black rounded-none border-red-600 text-red-500 bg-black/60 text-[10px] lg:text-[14px] tracking-[0.4em] uppercase w-full lg:w-auto hover:bg-red-600 hover:text-white">
                <Ban className="mr-3 h-6 w-6"/> MARK UNSOLD
              </Button>
            </>
          ) : undrawnPlayers.length > 0 && !isDrawing && !isSold && !isUnsold ? (
            <Button onClick={handleDrawPlayer} disabled={isDrawing} className="h-16 lg:h-24 w-full max-w-[600px] text-2xl lg:text-4xl font-black font-serif border-4 border-primary bg-primary text-primary-foreground tracking-[0.4em] uppercase shadow-[0_12px_0_rgba(0,0,0,0.4)] hover:scale-105 active:translate-y-2 active:shadow-none transition-all">
              REVEAL NEXT LOT
            </Button>
          ) : (isSold || isUnsold) ? (
             <Button onClick={handleDrawPlayer} className="h-16 lg:h-24 w-full lg:w-[500px] font-black border-4 border-primary bg-primary text-primary-foreground uppercase tracking-[0.3em] text-2xl lg:text-3xl shadow-[0_12px_0_rgba(0,0,0,0.4)] hover:scale-105 active:translate-y-2">
                {undrawnPlayers.length > 0 ? 'NEXT PLAYER' : 'FINISH AUCTION'}
             </Button>
          ) : undrawnPlayers.length === 0 && !isDrawing && (
            <Button onClick={() => router.push('/')} variant="outline" className="h-16 lg:h-24 w-full lg:w-[500px] font-black border-primary/30 text-primary bg-black/40 uppercase tracking-[0.3em] text-2xl lg:text-3xl hover:bg-primary hover:text-white transition-all">CLOSE SESSION</Button>
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="bg-primary/90 px-8 py-2 text-primary-foreground text-[10px] lg:text-[13px] font-black uppercase tracking-[0.6em] shadow-2xl flex items-center gap-4 text-center border-x-4 border-white/20">
            {undrawnPlayers.length} LOTS REMAINING • {set.name}
          </div>
          <p className="text-[8px] lg:text-[11px] text-white/20 font-black uppercase tracking-[0.8em] mt-3 text-center">SAAVAN '26 • SPORTS DEPARTMENT • IIT MADRAS PARADOX</p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-3px, 0); }
          75% { transform: translate(3px, 0); }
        }
      `}</style>
    </div>
  );
}
