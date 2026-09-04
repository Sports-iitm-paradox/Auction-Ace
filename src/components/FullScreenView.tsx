
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { X, RefreshCw, Keyboard, Clock3, Shield } from 'lucide-react';
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
    <div className="fixed inset-0 flex flex-col bg-[#2b0303] sunburst-bg select-none overflow-hidden h-screen text-foreground">
      
      {/* Header Progress Bar */}
      <div className="w-full h-1 bg-black/40 z-50">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            className="h-full bg-primary shadow-[0_0_15px_hsl(var(--primary))]"
          />
      </div>

      {/* Navigation Controls */}
      <div className="absolute top-4 right-6 z-40 flex gap-2">
        <button onClick={() => setIsHelpOpen(true)} className="h-8 w-8 flex items-center justify-center bg-black/60 border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground rounded-full backdrop-blur-md transition-all">
          <Keyboard size={16} />
        </button>
        <button onClick={resetAuction} className="h-8 w-8 flex items-center justify-center bg-black/60 border border-red-900/40 text-red-500 hover:bg-red-600 hover:text-white rounded-full backdrop-blur-md transition-all">
          <RefreshCw size={16} />
        </button>
        <button onClick={() => router.push('/')} className="h-8 w-8 flex items-center justify-center bg-black/60 border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground rounded-full backdrop-blur-md transition-all">
          <X size={18} />
        </button>
      </div>

      {/* Main Container: Centered Layout */}
      <main className="flex-1 w-full flex items-center justify-center p-4 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {!isDrawing && currentPlayer ? (
            <motion.div 
              key={currentPlayer.id} 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 1.05 }}
              className="relative w-full max-w-5xl aspect-[16/9] ornate-border bg-card/95 backdrop-blur-xl shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col lg:flex-row"
              style={{ maxHeight: '68vh' }}
            >
              {/* Sold/Unsold Overlay */}
              <AnimatePresence>
                {(isSold || isUnsold) && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                        className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md"
                    >
                        <motion.div 
                          initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                          className={cn(
                            "p-8 border-4 bg-[#1a0202] shadow-2xl flex flex-col items-center ornate-border",
                            isSold ? "border-primary" : "border-destructive"
                        )}>
                            <h2 className={cn(
                                "text-6xl lg:text-8xl font-black uppercase italic mb-2 tracking-tighter",
                                isSold ? "text-primary" : "text-destructive"
                            )}>
                                {isSold ? 'SOLD' : 'UNSOLD'}
                            </h2>
                            <h3 className="text-xl font-serif text-white uppercase tracking-[0.3em] mb-4">{currentPlayer.playerName}</h3>
                            {isSold && (
                                <div className="flex items-baseline gap-2 mb-6">
                                    <span className="text-5xl font-mono font-black text-white">{currentBid}</span>
                                    <span className="text-xl font-serif text-primary italic font-black uppercase">LAKH</span>
                                </div>
                            )}
                            <Button onClick={handleDrawPlayer} className="h-12 px-8 bg-primary text-primary-foreground font-black uppercase tracking-[0.2em]">
                                NEXT PLAYER
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
              </AnimatePresence>

              {/* Left Column: Player Visuals */}
              <div className="w-full lg:w-[40%] flex flex-col border-r border-primary/20 bg-black/20 overflow-hidden">
                <div className="relative flex-1 min-h-0 flex items-center justify-center p-4">
                  {currentPlayer.imageUrl ? (
                    <div className="relative w-full h-full max-h-[300px]">
                      <Image 
                        src={currentPlayer.imageUrl} 
                        alt={currentPlayer.playerName} 
                        fill 
                        className="object-contain drop-shadow-2xl"
                        sizes="40vw"
                        priority
                      />
                    </div>
                  ) : (
                    <div className="opacity-10 flex flex-col items-center">
                      <Shield className="h-24 w-24 text-primary" />
                    </div>
                  )}
                  {/* Lot ID Badge */}
                  <div className="absolute top-4 left-4 bg-primary px-3 py-1 text-primary-foreground font-black text-[10px] tracking-[0.2em]">
                    LOT #{currentPlayer.playerNumber}
                  </div>
                </div>
                {/* Insight Box */}
                <div className="bg-black/60 border-t border-primary/20 p-4 flex flex-col max-h-[140px]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[8px] font-black tracking-[0.3em] text-primary uppercase">Scout Analysis</span>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <p className="text-[11px] italic font-serif leading-relaxed text-foreground/90">
                      "{currentPlayer.auctionInsight || 'High-potential tactical asset. Balanced performance record.'}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Information & Bidding */}
              <div className="w-full lg:w-[60%] flex flex-col p-6 lg:p-10 justify-between overflow-hidden">
                {/* Top Section */}
                <div className="space-y-4">
                  <div>
                    <span className="text-[9px] text-primary/60 font-black tracking-[0.4em] uppercase block mb-0.5">System Registered Asset</span>
                    <h1 className="text-4xl lg:text-5xl font-serif font-black text-white uppercase italic tracking-tighter leading-tight truncate">
                      {currentPlayer.playerName}
                    </h1>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Origin', value: currentPlayer.country },
                      { label: 'Specialism', value: currentPlayer.specialism },
                      { label: 'Category', value: currentPlayer.cua },
                      { label: 'Base Points', value: currentPlayer.points },
                    ].map((stat, i) => (
                      <div key={i} className="bg-white/5 border-l-2 border-primary/30 p-2.5">
                        <span className="text-[8px] text-primary font-black uppercase tracking-[0.1em] block mb-0.5">{stat.label}</span>
                        <span className="font-serif text-base text-white font-bold tracking-wider">{stat.value || 'N/A'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Section: Bidding Console */}
                <div className="mt-4 pt-4 border-t border-primary/20 flex flex-col items-center lg:items-start overflow-hidden">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] text-primary font-black tracking-[0.3em] uppercase">Current Valuation</span>
                    {isTimerActive && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-600/20 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                        <span className="text-[9px] font-mono text-white font-bold">{timer}s</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-baseline gap-3 mb-4 max-h-[100px]">
                    <motion.span 
                      key={currentBid}
                      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                      className="text-6xl lg:text-7xl font-mono font-black text-white leading-none tracking-tighter"
                    >
                      {currentBid}
                    </motion.span>
                    <span className="text-xl font-serif text-primary italic font-black uppercase">Lakh</span>
                  </div>

                  {/* Increment/Hammer Status */}
                  <div className="flex items-center gap-4 w-full">
                    <div className="flex-1 px-3 py-2 bg-white/5 border border-primary/20">
                      <span className="text-[8px] text-primary/50 font-black uppercase block">Minimum Next</span>
                      <span className="text-lg font-mono text-white font-black">{nextValidBid} L</span>
                    </div>
                    
                    <div className="flex-1 flex flex-col items-center">
                       <div className="flex gap-1 mb-1.5">
                        {[1, 2, 3].map((idx) => (
                          <div key={idx} className={cn(
                            "w-8 h-1 rounded-full", 
                            ((idx === 1 && finalCallStatus !== 'none') || (idx === 2 && (finalCallStatus === 'twice' || finalCallStatus === 'final')) || (idx === 3 && finalCallStatus === 'final')) 
                              ? "bg-primary shadow-[0_0_10px_gold]" 
                              : "bg-white/10"
                          )} />
                        ))}
                      </div>
                      <AnimatePresence mode="wait">
                        {finalCallStatus !== 'none' && (
                          <motion.span 
                            key={finalCallStatus}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="text-[10px] font-serif font-black tracking-[0.2em] text-primary uppercase italic"
                          >
                            {finalCallStatus === 'once' ? 'Going Once' : finalCallStatus === 'twice' ? 'Going Twice' : 'Final Call'}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : isDrawing ? (
            <div className="flex flex-col items-center gap-6">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent animate-spin rounded-full shadow-[0_0_20px_gold]" />
              <h1 className="text-xl text-primary font-black font-serif tracking-[0.4em] animate-pulse uppercase">Syncing Next Lot...</h1>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-8 text-center"
            >
              <div className="space-y-2">
                <h1 className="text-6xl font-serif font-black text-primary tracking-[0.2em] uppercase italic drop-shadow-2xl">Saavan '26</h1>
                <p className="text-white/40 text-[10px] tracking-[0.8em] font-black uppercase">Official Auction Terminal</p>
              </div>
              <Button onClick={handleDrawPlayer} className="h-14 px-16 text-lg font-black font-serif bg-primary text-primary-foreground tracking-[0.4em] uppercase hover:scale-105 transition-transform">
                Open Floor
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Moderator Deck */}
      <footer className="w-full bg-[#1a0202] border-t border-primary/30 py-4 px-8 z-50 shadow-2xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex flex-col items-start">
            <span className="text-[9px] text-primary/40 font-black tracking-[0.3em] uppercase">Roster Status</span>
            <span className="text-lg font-mono font-black text-white tracking-widest">{undrawnPlayers.length} LOTS REMAINING</span>
          </div>

          <div className="flex items-center gap-3">
            {currentPlayer && !isSold && !isUnsold ? (
              <>
                <Button onClick={handleIncreaseBid} size="lg" className="h-12 px-12 font-serif font-black text-lg bg-primary text-primary-foreground tracking-widest uppercase shadow-lg">
                  RAISE BID
                </Button>
                <Button onClick={startHammerSequence} disabled={finalCallStatus !== 'none'} variant="secondary" className="h-12 px-6 font-serif font-black text-[10px] bg-orange-600 text-white tracking-[0.2em] uppercase">
                  <Clock3 className="mr-2 h-4 w-4"/> {finalCallStatus === 'none' ? 'Initiate Hammer' : 'Hammer Active'}
                </Button>
                <Button onClick={() => { setTimer(DEFAULT_TIMER); setIsTimerActive(true); setFinalCallStatus('none'); }} variant="outline" className="h-12 w-12 p-0 border-white/20 text-white">
                  <RefreshCw size={18}/>
                </Button>
                <Button onClick={handleUnsold} variant="outline" className="h-12 px-5 font-black border-red-600 text-red-600 uppercase text-[9px] tracking-[0.1em]">
                  UNSOLD
                </Button>
              </>
            ) : (undrawnPlayers.length > 0 && !isDrawing) || (isSold || isUnsold) ? (
              <Button onClick={handleDrawPlayer} className="h-12 px-16 font-black font-serif text-base border-2 border-primary bg-primary text-primary-foreground tracking-[0.3em] uppercase">
                {undrawnPlayers.length > 0 ? 'Reveal Next Lot' : 'Session Concluded'}
              </Button>
            ) : null}
          </div>
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
            <div className="max-w-md w-full bg-[#1a0202] border border-primary/40 p-8 ornate-border shadow-2xl" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-serif text-primary uppercase tracking-[0.3em] border-b border-primary/20 pb-4 mb-6">Moderator Commands</h2>
                <div className="space-y-2">
                    {[
                        { key: 'Space', action: 'Reveal / Increment Bid' },
                        { key: 'F', action: 'Initiate Hammer Sequence' },
                        { key: 'U', action: 'Mark Lot as Unsold' },
                        { key: 'R', action: 'Reset 20s Timer' },
                        { key: 'Esc', action: 'Exit Room' },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between bg-white/5 p-3 border border-white/5 transition-all hover:border-primary">
                            <span className="text-[9px] font-black bg-primary text-primary-foreground px-2 py-0.5 uppercase">{item.key}</span>
                            <span className="text-[9px] uppercase font-bold text-white/50 tracking-widest">{item.action}</span>
                        </div>
                    ))}
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--primary));
        }
      `}</style>
    </div>
  );
}
