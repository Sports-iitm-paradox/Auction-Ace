
'use client';

import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, DocumentReference } from 'firebase/firestore';
import { Player, PlayerSet, ActiveAuctionState } from '@/lib/player-data';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Gavel } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function PublicLivePage() {
  const params = useParams();
  // slug is now the admin's persistent UID
  const slug = params.slug as string;
  const firestore = useFirestore();

  const auctionRef = useMemoFirebase(() => {
    if (!firestore || !slug) return null;
    return doc(firestore, 'activeAuctions', slug) as DocumentReference<ActiveAuctionState>;
  }, [firestore, slug]);

  const { data: auction, isLoading: isLoadingAuction } = useDoc<ActiveAuctionState>(auctionRef);

  // Dynamically fetch the set based on the currentsetId in the active auction state
  const setRef = useMemoFirebase(() => {
    if (!firestore || !auction?.setId) return null;
    return doc(firestore, 'sets', auction.setId) as DocumentReference<PlayerSet>;
  }, [firestore, auction?.setId]);

  const { data: set, isLoading: isLoadingSet } = useDoc<PlayerSet>(setRef);

  const currentPlayer = set?.players.find(p => p.id === auction?.currentPlayerId) || null;

  if (isLoadingAuction || (auction?.setId && isLoadingSet)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <p className="text-primary font-serif animate-pulse text-2xl">Joining Live Floor...</p>
      </div>
    );
  }

  if (!auction || (auction.status === 'idle' && !auction.currentPlayerId)) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background p-4 text-center">
        <Trophy className="h-20 w-20 text-primary mb-4" />
        <h1 className="text-4xl font-serif text-primary mb-2">Floor Currently Closed</h1>
        <p className="text-muted-foreground">The moderator hasn't started the session yet. Stay tuned.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-4 bg-background overflow-hidden">
      <div className="absolute top-6 left-6 flex items-center gap-3">
        <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
        <span className="text-red-600 font-bold uppercase tracking-[0.2em] text-xs">Live View</span>
        <div className="hidden sm:block h-4 w-px bg-primary/20 mx-2" />
        <span className="text-primary font-serif font-bold text-lg hidden sm:block">{set?.name || 'Session Active'}</span>
      </div>

      <div className="w-full max-w-4xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={auction.status === 'drawing' ? 'drawing' : (currentPlayer?.id || 'idle')}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full"
          >
            <Card className="ornate-border bg-card/90 backdrop-blur-md shadow-2xl">
              <CardContent className="p-8 relative min-h-[350px] flex items-center justify-center">
                
                {(auction.isSold || auction.isUnsold) && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 2 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-background/40 backdrop-blur-sm pointer-events-none"
                    >
                        <div className={cn(
                            "border-8 p-6 rotate-[-12deg] bg-card shadow-2xl",
                            auction.isSold ? "border-primary" : "border-destructive"
                        )}>
                            <h2 className={cn(
                                "text-6xl font-serif font-black uppercase",
                                auction.isSold ? "text-primary" : "text-destructive"
                            )}>
                                {auction.isSold ? 'SOLD' : 'UNSOLD'}
                            </h2>
                        </div>
                    </motion.div>
                )}

                {auction.status === 'drawing' ? (
                   <div className="text-center flex flex-col justify-center items-center">
                      <div className="w-16 h-16 border-4 border-primary border-t-transparent animate-spin rounded-full mb-4" />
                      <h1 className="text-4xl text-primary font-bold font-serif animate-pulse">Next Lot Incoming...</h1>
                    </div>
                ) : currentPlayer ? (
                  <div className="flex flex-col lg:flex-row items-center justify-center gap-8 w-full">
                    <div className="w-full lg:w-1/3 flex-shrink-0">
                        <div className="relative aspect-[3/4] max-w-[250px] mx-auto lg:mx-0 ornate-border">
                            <div className="bg-background w-full h-full flex items-center justify-center overflow-hidden">
                                {currentPlayer.imageUrl ? (
                                    <Image src={currentPlayer.imageUrl} alt={currentPlayer.playerName} fill className="object-cover" />
                                ) : (
                                    <span className="font-serif text-8xl text-primary/20">{currentPlayer.playerName[0]}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="w-full lg:w-2/3 flex flex-col items-center lg:items-start text-center lg:text-left space-y-4">
                        <div>
                          <p className="font-serif text-sm text-primary/80 uppercase tracking-widest">Active Lot</p>
                          <h1 className="text-4xl lg:text-6xl font-bold font-serif text-foreground drop-shadow-md">
                            {currentPlayer.playerName}
                          </h1>
                        </div>
                        
                        <div className="w-full grid grid-cols-2 gap-3">
                            {[
                              { label: 'Origin', value: currentPlayer.country },
                              { label: 'Role', value: currentPlayer.specialism },
                              { label: 'Category', value: currentPlayer.cua },
                              { label: 'Rating', value: currentPlayer.points },
                            ].map((stat, i) => stat.value && (
                              <div key={i} className="flex flex-col p-3 bg-secondary/30 border-l-4 border-primary">
                                <span className="text-[10px] text-primary font-bold uppercase mb-1">{stat.label}</span>
                                <span className="font-serif text-xl text-foreground">{stat.value}</span>
                              </div>
                            ))}
                        </div>

                        <div className="w-full p-4 border-2 border-primary bg-background/50 flex flex-col items-center lg:items-start">
                             <span className="text-[10px] font-bold text-primary uppercase mb-1">Current Bid</span>
                             <div className="flex items-baseline gap-3">
                                <span className="text-5xl font-mono font-black text-foreground">{auction.currentBid}</span>
                                <span className="text-2xl font-serif text-primary">Lakh</span>
                             </div>
                        </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center flex flex-col justify-center items-center space-y-6">
                    <Gavel className="h-24 w-24 text-primary opacity-50" />
                    <h1 className="text-4xl font-bold font-serif text-primary">Floor Waiting...</h1>
                    <p className="text-muted-foreground">The moderator is preparing the next lot.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
      
      <div className="mt-12 text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.3em] font-bold">
            SAAVAN '26 • IIT Madras Paradox
        </p>
      </div>
    </div>
  );
}
