
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { X, Gavel, Trophy, Ban, RefreshCw, Keyboard, Clock3, Shield } from 'lucide-react';
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
      <main className="flex-1 w-full flex items-center justify-center p-6 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {!isDrawing && currentPlayer ? (
            <motion.div 
              key={currentPlayer.id} 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 1.1 }}
              className="relative w-full max-w-5xl lg:max-w-6xl aspect-[16/9] lg:aspect-[2/1] ornate-border bg-card/95 backdrop-blur-xl shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col lg:flex-row"
              style={{ maxHeight: '75vh' }}
            >
              {/* Sold/Unsold Overlay (Centered inside the frame) */}
              <AnimatePresence>
                {(isSold || isUnsold) && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                        className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md"
                    >
                        <motion.div 
                          initial={{ scale: 0.8, rotate: -5 }} animate={{ scale: 1, rotate: 0 }}
                          className={cn(
                            "p-12 border-4 bg-[#1a0202] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center ornate-border",
                            isSold ? "border-primary" : "border-destructive"
                        )}>
                            <h2 className={cn(
                                "text-7xl lg:text-9xl font-black uppercase italic mb-4 text-center tracking-tighter",
                                isSold ? "text-primary" : "text-destructive"
                            )}>
                                {isSold ? 'SOLD' : 'UNSOLD'}
                            </h2>
                            <h3 className="text-3xl font-serif text-white uppercase tracking-[0.3em] mb-8">{currentPlayer.playerName}</h3>
                            {isSold && (
                                <div className="flex items-baseline gap-4 mb-8">
                                    <span className="text-7xl font-mono font-black text-white">{currentBid}</span>
                                    <span className="text-2xl font-serif text-primary italic font-black uppercase">LAKH</span>
                                </div>
                            )}
                            <Button onClick={handleDrawPlayer} className="h-14 px-12 bg-primary text-primary-foreground font-black uppercase tracking-[0.4em]">
                                NEXT PLAYER →
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
              </AnimatePresence>

              {/* Left Column: Player Visuals (approx 40% of card) */}
              <div className="w-full lg:w-[40%] flex flex-col border-r border-primary/20 bg-black/20">
                <div className="relative flex-1 min-h-0">
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                    {currentPlayer.imageUrl ? (
                      <div className="relative w-full h-full p-4">
                        <Image 
                          src={currentPlayer.imageUrl} 
                          alt={currentPlayer.playerName} 
                          fill 
                          className="object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
                          sizes="(max-width: 768px) 100vw, 40vw"
                          priority
                        />
                      </div>
                    ) : (
                      <div className="opacity-10 flex flex-col items-center">
                        <Shield className="h-32 w-32 text-primary" />
                        <span className="text-2xl font-serif mt-4 text-primary">LOT {currentPlayer.playerNumber}</span>
                      </div>
                    )}
                  </div>
                  {/* Lot ID Badge */}
                  <div className="absolute top-4 left-4 bg-primary px-3 py-1 text-primary-foreground font-black text-[10px] tracking-[0.2em] shadow-lg">
                    LOT #{currentPlayer.playerNumber}
                  </div>
                </div>
                {/* Insight Box (Under Image) */}
                <div className="h-[120px] lg:h-[150px] bg-black/60 border-t border-primary/20 p-5 flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[9px] font-black tracking-[0.4em] text-primary uppercase">Scout Analysis</span>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <p className="text-xs italic font-serif leading-relaxed text-foreground/80">
                      "{currentPlayer.auctionInsight || 'High-potential tactical asset. Balanced performance record.'}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Information & Bidding (approx 60% of card) */}
              <div className="w-full lg:w-[60%] flex flex-col p-8 lg:p-12 justify-between relative">
                {/* Top Section: Name & Stats */}
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] text-primary/60 font-black tracking-[0.6em] uppercase block mb-1">System Registered Asset</span>
                    <h1 className="text-5xl lg:text-7xl font-serif font-black text-white uppercase italic tracking-tighter leading-none">
                      {currentPlayer.playerName}
                    </h1>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Origin', value: currentPlayer.country },
                      { label: 'Specialism', value: currentPlayer.specialism },
                      { label: 'Category', value: currentPlayer.cua },
                      { label: 'Base Points', value: currentPlayer.points },
                    ].map((stat, i) => (
                      <div key={i} className="bg-white/5 border-l-2 border-primary/30 p-3 hover:bg-white/10 transition-colors">
                        <span className="text-[8px] text-primary font-black uppercase tracking-[0.2em] block mb-0.5">{stat.label}</span>
                        <span className="font-serif text-lg text-white font-bold tracking-wider">{stat.value || 'N/A'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Section: The Bidding Console */}
                <div className="mt-8 pt-8 border-t border-primary/20 flex flex-col items-center lg:items-start">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[10px] text-primary font-black tracking-[0.5em] uppercase">Current Valuation</span>
                    {isTimerActive && (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-red-600/20 rounded-full">
                        <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_8px_red]" />
                        <span className="text-[9px] font-mono text-white font-bold">{timer}s</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-baseline gap-4 mb-6">
                    <motion.span 
                      key={currentBid}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="text-8xl lg:text-9xl font-mono font-black text-white leading-none tracking-tighter"
                    >
                      {currentBid}
                    </motion.span>
                    <span className="text-2xl lg:text-3xl font-serif text-primary italic font-black tracking-[0.2em] uppercase">Lakh</span>
                  </div>

                  {/* Increment/Hammer Status */}
                  <div className="flex items-center gap-6 w-full">
                    <div className="flex-1 px-4 py-3 bg-white/5 border border-primary/20 flex flex-col">
                      <span className="text-[8px] text-primary/50 font-black uppercase tracking-[0.2em]">Minimum Next Bid</span>
                      <span className="text-xl font-mono text-white font-black">{nextValidBid} LAKH</span>
                    </div>
                    
                    <div className="flex-1 flex flex-col items-center">
                       <div className="flex gap-1 mb-2">
                        {[1, 2, 3].map((idx) => (
                          <div key={idx} className={cn(
                            "w-10 h-1 rounded-full transition-all duration-500", 
                            ((idx === 1 && finalCallStatus !== 'none') || (idx === 2 && (finalCallStatus === 'twice' || finalCallStatus === 'final')) || (idx === 3 && finalCallStatus === 'final')) 
                              ? "bg-primary shadow-[0_0_15px_gold]" 
                              : "bg-white/10"
                          )} />
                        ))}
                      </div>
                      <AnimatePresence mode="wait">
                        {finalCallStatus !== 'none' && (
                          <motion.span 
                            key={finalCallStatus}
                            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                            className="text-sm font-serif font-black tracking-[0.3em] text-primary uppercase italic"
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
            <div className="flex flex-col items-center gap-8">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent animate-spin rounded-full shadow-[0_0_30px_hsl(var(--primary))]" />
              <h1 className="text-3xl text-primary font-black font-serif tracking-[0.5em] animate-pulse">Syncing Next Lot...</h1>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-10 text-center"
            >
              <Shield className="h-32 w-32 text-primary opacity-20" />
              <div className="space-y-4">
                <h1 className="text-7xl font-serif font-black text-primary tracking-[0.3em] uppercase italic drop-shadow-2xl">Saavan '26</h1>
                <p className="text-white/40 text-xs tracking-[1em] font-black uppercase">Official Auction Terminal</p>
              </div>
              <Button onClick={handleDrawPlayer} className="h-16 px-24 text-xl font-black font-serif bg-primary text-primary-foreground tracking-[0.5em] uppercase hover:scale-105 transition-transform shadow-2xl">
                Open Floor
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Moderator Deck: Fixed Bottom */}
      <footer className="w-full bg-[#1a0202] border-t border-primary/30 py-6 px-10 z-50 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
             <div className="flex flex-col items-start">
               <span className="text-[9px] text-primary/40 font-black tracking-[0.4em] uppercase">Roster Status</span>
               <span className="text-xl font-mono font-black text-white tracking-widest">{undrawnPlayers.length} LOTS REMAINING</span>
             </div>
          </div>

          <div className="flex items-center gap-4">
            {currentPlayer && !isSold && !isUnsold ? (
              <>
                <Button onClick={handleIncreaseBid} size="lg" className="h-14 px-16 font-serif font-black text-xl bg-primary text-primary-foreground tracking-widest uppercase hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,215,0,0.3)]">
                  RAISE BID
                </Button>
                <Button onClick={startHammerSequence} disabled={finalCallStatus !== 'none'} variant="secondary" className="h-14 px-8 font-serif font-black text-xs bg-orange-600 text-white tracking-[0.3em] uppercase hover:bg-orange-500 transition-all">
                  <Clock3 className="mr-2 h-4 w-4"/> {finalCallStatus === 'none' ? 'Initiate Hammer' : 'Hammer Active'}
                </Button>
                <Button onClick={() => { setTimer(DEFAULT_TIMER); setIsTimerActive(true); setFinalCallStatus('none'); }} variant="outline" className="h-14 w-14 p-0 border-white/20 text-white hover:bg-white/10">
                  <RefreshCw size={20}/>
                </Button>
                <Button onClick={handleUnsold} variant="outline" className="h-14 px-6 font-black border-red-600 text-red-600 hover:bg-red-600 hover:text-white uppercase text-[10px] tracking-[0.2em] transition-all">
                  UNSOLD
                </Button>
              </>
            ) : (undrawnPlayers.length > 0 && !isDrawing) || (isSold || isUnsold) ? (
              <Button onClick={handleDrawPlayer} className="h-14 px-20 font-black font-serif text-lg border-2 border-primary bg-primary text-primary-foreground tracking-[0.4em] uppercase">
                {undrawnPlayers.length > 0 ? 'Reveal Next Lot' : 'Conclude Session'}
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
                <div className="space-y-3">
                    {[
                        { key: 'Space', action: 'Reveal / Increment Bid' },
                        { key: 'F', action: 'Initiate Hammer Sequence' },
                        { key: 'U', action: 'Mark Lot as Unsold' },
                        { key: 'R', action: 'Reset 20s Timer' },
                        { key: 'Esc', action: 'Exit Room' },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between bg-white/5 p-4 border border-white/5 transition-all hover:border-primary">
                            <span className="text-[10px] font-black bg-primary text-primary-foreground px-3 py-1 uppercase">{item.key}</span>
                            <span className="text-[10px] uppercase font-bold text-white/50 tracking-widest">{item.action}</span>
                        </div>
                    ))}
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
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

