
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

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#2b0303] sunburst-bg select-none overflow-hidden h-screen text-foreground">
      
      {/* Top Header Controls */}
      <div className="absolute top-6 right-6 z-40 flex gap-3">
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

      {/* Main Container */}
      <main className="flex-1 w-full flex flex-col items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {!isDrawing && currentPlayer ? (
            <motion.div 
              key={currentPlayer.id} 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 1.05 }}
              className="relative w-full max-w-[1000px] ornate-border bg-[#1a0202]/95 backdrop-blur-xl shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col md:flex-row min-h-[500px]"
              style={{ border: '2px solid hsl(var(--primary))', padding: '24px' }}
            >
              {/* Internal Thin Border */}
              <div className="absolute inset-1 pointer-events-none border border-primary/20" />

              {/* Left Column: Image & Lot Info */}
              <div className="w-full md:w-[320px] flex flex-col items-center gap-4">
                <div className="w-full aspect-[3/4] relative border border-primary/30 p-1 bg-black/20">
                    <div className="absolute inset-0 border border-primary/10" />
                    {currentPlayer.imageUrl ? (
                        <Image 
                            src={currentPlayer.imageUrl} 
                            alt={currentPlayer.playerName} 
                            fill 
                            className="object-cover"
                            sizes="320px"
                            priority
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-10">
                            <Shield size={120} className="text-primary" />
                        </div>
                    )}
                </div>

                {/* Lot Badge */}
                <div className="w-full bg-primary py-2 text-center text-primary-foreground font-black text-xs tracking-[0.2em] uppercase">
                    LIST SR.NO {currentPlayer.playerNumber}
                </div>

                {/* Insight Box - Added as requested */}
                <div className="w-full border border-primary/20 bg-black/40 p-3 mt-2">
                    <span className="text-[9px] text-primary/60 font-black tracking-[0.2em] uppercase block mb-1">AUCTION INSIGHT</span>
                    <p className="text-[11px] font-sans italic text-foreground/80 leading-relaxed">
                        {currentPlayer.auctionInsight || 'High-value strategic asset for the upcoming season.'}
                    </p>
                </div>
              </div>

              {/* Right Column: Profile Details & Bidding */}
              <div className="flex-1 flex flex-col pl-0 md:pl-10 pt-6 md:pt-0">
                {/* Header Label */}
                <div className="flex items-center gap-3 mb-1">
                    <div className="h-px bg-primary/30 flex-1" />
                    <span className="text-[10px] text-primary font-black tracking-[0.4em] uppercase">LOT PROFILE</span>
                    <div className="h-px bg-primary/30 flex-1" />
                </div>

                {/* Player Name */}
                <h1 className="text-5xl font-serif font-black text-white uppercase italic tracking-tighter mb-8 text-center md:text-left">
                  {currentPlayer.playerName}
                </h1>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-y-6 gap-x-12 mb-10">
                    {[
                      { label: 'ORIGIN', value: currentPlayer.country },
                      { label: 'SPECIALISM', value: currentPlayer.specialism },
                      { label: 'CATEGORY', value: currentPlayer.cua },
                      { label: 'POINTS', value: currentPlayer.points },
                    ].map((stat, i) => (
                      <div key={i} className="flex flex-col border-b border-primary/10 pb-2">
                        <span className="text-[9px] text-primary/50 font-black tracking-[0.2em] uppercase mb-1">{stat.label}</span>
                        <span className="font-serif text-lg text-white font-bold tracking-wider">{stat.value || 'N/A'}</span>
                      </div>
                    ))}
                </div>

                {/* Reserve Price */}
                <div className="mb-10">
                    <span className="text-[9px] text-primary/50 font-black tracking-[0.2em] uppercase block mb-1">RESERVE</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-serif text-white font-bold tracking-widest">{currentPlayer.reservePrice}</span>
                        <span className="text-sm font-serif text-primary uppercase italic font-black">L</span>
                    </div>
                </div>

                {/* Live Hammer Box */}
                <div className="mt-auto border border-primary/30 bg-black/40 p-6 relative">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-[10px] text-primary font-black tracking-[0.2em] uppercase">LIVE HAMMER STATUS</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                        
                        {/* Hammer Sequence Dots */}
                        <div className="ml-auto flex gap-2">
                             {[1, 2, 3].map((idx) => (
                                <div key={idx} className={cn(
                                    "w-10 h-2.5 rounded-sm transition-all duration-300", 
                                    ((idx === 1 && finalCallStatus !== 'none') || (idx === 2 && (finalCallStatus === 'twice' || finalCallStatus === 'final')) || (idx === 3 && finalCallStatus === 'final')) 
                                    ? "bg-primary shadow-[0_0_10px_gold]" 
                                    : "bg-white/5 border border-white/5"
                                )} />
                            ))}
                        </div>
                    </div>

                    <div className="flex items-baseline gap-4 mb-2">
                        <motion.span 
                            key={currentBid}
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                            className="text-7xl font-mono font-black text-white leading-none tracking-tighter"
                        >
                            {currentBid}
                        </motion.span>
                        <span className="text-3xl font-serif text-primary italic font-black uppercase tracking-widest">LAKH</span>
                    </div>

                    <div className="text-[10px] text-primary font-bold uppercase tracking-[0.2em]">
                        + NEXT BID: <span className="text-white ml-2">{nextValidBid} LAKH</span>
                    </div>

                    {/* Final Call Text Overlay */}
                    <AnimatePresence>
                        {finalCallStatus !== 'none' && (
                            <motion.div 
                                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                className="absolute right-6 bottom-4 text-[9px] font-serif font-black text-primary uppercase italic tracking-[0.3em]"
                            >
                                {finalCallStatus === 'once' ? 'Going Once' : finalCallStatus === 'twice' ? 'Going Twice' : 'Final Call'}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
              </div>

              {/* Sold/Unsold Overlay */}
              <AnimatePresence>
                {(isSold || isUnsold) && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                        className="absolute inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md"
                    >
                        <motion.div 
                          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                          className={cn(
                            "p-12 border-4 bg-[#1a0202] shadow-2xl flex flex-col items-center ornate-border",
                            isSold ? "border-primary" : "border-destructive"
                        )}>
                            <h2 className={cn(
                                "text-8xl font-black uppercase italic mb-2 tracking-tighter",
                                isSold ? "text-primary" : "text-destructive"
                            )}>
                                {isSold ? 'SOLD' : 'UNSOLD'}
                            </h2>
                            <h3 className="text-xl font-serif text-white uppercase tracking-[0.4em] mb-6">{currentPlayer.playerName}</h3>
                            {isSold && (
                                <div className="flex items-baseline gap-2 mb-8">
                                    <span className="text-6xl font-mono font-black text-white">{currentBid}</span>
                                    <span className="text-2xl font-serif text-primary italic font-black uppercase">LAKH</span>
                                </div>
                            )}
                            <Button onClick={handleDrawPlayer} className="h-14 px-12 bg-primary text-primary-foreground font-black uppercase tracking-[0.3em] hover:scale-105 transition-transform">
                                NEXT PLAYER
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : isDrawing ? (
            <div className="flex flex-col items-center gap-6">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent animate-spin rounded-full shadow-[0_0_30px_gold]" />
              <h1 className="text-2xl text-primary font-black font-serif tracking-[0.5em] animate-pulse uppercase">Syncing Next Lot...</h1>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-10 text-center"
            >
              <div className="space-y-3">
                <h1 className="text-8xl font-serif font-black text-primary tracking-[0.3em] uppercase italic drop-shadow-[0_0_20px_rgba(255,215,0,0.4)]">Saavan '26</h1>
                <p className="text-white/40 text-[12px] tracking-[1em] font-black uppercase">Official Auction Terminal</p>
              </div>
              <Button onClick={handleDrawPlayer} className="h-16 px-24 text-xl font-black font-serif bg-primary text-primary-foreground tracking-[0.5em] uppercase hover:scale-105 transition-transform shadow-[0_0_20px_gold]">
                Open Floor
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Moderator Deck - Precise Match to Reference */}
      <footer className="w-full flex flex-col items-center gap-6 pb-10 px-8 z-50">
        <div className="flex items-center gap-4 w-full max-w-[1000px]">
          {currentPlayer && !isSold && !isUnsold ? (
            <>
              <Button 
                onClick={handleIncreaseBid} 
                className="h-16 flex-1 bg-primary text-primary-foreground font-serif font-black text-xl tracking-[0.2em] uppercase rounded-none shadow-[0_0_20px_rgba(255,215,0,0.3)]"
              >
                + RAISE BID ({getIncrement(currentBid)}L)
              </Button>
              
              <Button 
                onClick={() => { setTimer(DEFAULT_TIMER); setIsTimerActive(true); setFinalCallStatus('none'); }} 
                variant="outline" 
                className="h-16 px-8 border-white/20 bg-black/40 text-white font-serif font-black text-[10px] tracking-[0.2em] uppercase rounded-none hover:bg-white/10"
              >
                <RefreshCw className="mr-3 h-4 w-4"/> RESET / CLEAR
              </Button>

              <Button 
                onClick={startHammerSequence} 
                disabled={finalCallStatus !== 'none'} 
                className="h-16 px-10 bg-[#e65100] hover:bg-[#ef6c00] text-white font-serif font-black text-[11px] tracking-[0.2em] uppercase rounded-none shadow-[0_0_20px_rgba(230,81,0,0.3)]"
              >
                <Clock3 className="mr-3 h-4 w-4"/> {finalCallStatus === 'none' ? 'START HAMMER DOWN' : 'HAMMER ACTIVE'}
              </Button>

              <Button 
                onClick={handleUnsold} 
                className="h-16 px-8 bg-[#1a0202] border border-red-900/40 text-red-500 font-serif font-black text-[10px] tracking-[0.2em] uppercase rounded-none hover:bg-red-600 hover:text-white"
              >
                UNSOLD
              </Button>
            </>
          ) : (undrawnPlayers.length > 0 && !isDrawing) || (isSold || isUnsold) ? (
            <Button onClick={handleDrawPlayer} className="h-16 w-full font-black font-serif text-lg bg-primary text-primary-foreground tracking-[0.5em] uppercase rounded-none">
              {undrawnPlayers.length > 0 ? 'Reveal Next Lot' : 'Session Concluded'}
            </Button>
          ) : null}
        </div>

        {/* Set Remaining Info */}
        <div className="bg-primary px-10 py-2.5 shadow-[0_0_15px_rgba(255,215,0,0.3)]">
            <span className="text-[11px] font-mono font-black text-primary-foreground tracking-[0.4em] uppercase">
                {undrawnPlayers.length} LOTS REMAINING IN {set.name}
            </span>
        </div>

        {/* Footer Branding */}
        <div className="text-[9px] text-primary/30 font-black tracking-[0.8em] uppercase italic">
            SAAVAN '26 • SPORTS DEPT • IIT MADRAS PARADOX
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
    </div>
  );
}
