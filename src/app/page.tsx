"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Layers, PlusCircle, Lock, Upload, Trophy, ArrowRight } from 'lucide-react';
import { PlayerSet } from '@/lib/player-data';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const setsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
        collection(firestore, 'sets'),
        orderBy('order')
    );
  }, [firestore]);

  const { data: sets, isLoading: isLoadingSets } = useCollection<PlayerSet>(setsQuery);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  const isLoading = isUserLoading || isLoadingSets;

  if (isLoading && !sets) {
    return (
      <div className="w-full max-w-5xl mx-auto py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-none bg-muted/30 border border-border" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div 
      className="w-full max-w-6xl mx-auto py-6 sm:py-10 gpu-layer"
      initial="hidden"
      animate="visible"
    >
      <div className="mb-10 text-center space-y-4">
        <h1 className="text-4xl sm:text-6xl font-serif font-black italic tracking-tighter text-foreground uppercase border-b-4 border-primary inline-block pb-2">
          Floor Selection
        </h1>
        <p className="text-muted-foreground uppercase tracking-[0.3em] text-[10px] font-bold">
          {user ? "Administrative Access Granted // Select Active Set" : "Live Floor Monitor // Select Active Feed"}
        </p>
      </div>

      <AnimatePresence>
        {sets && sets.length > 0 ? (
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {sets.map((set) => (
              <motion.div key={set.id} variants={cardVariants}>
                <Card className="rounded-none border-2 border-border hover:border-primary transition-all flex flex-col h-full bg-white hover:-translate-y-1 shadow-sm hover:shadow-xl group">
                  <CardHeader className="p-6 border-b border-border">
                     <div className="flex items-center gap-3 mb-2">
                       <Trophy className="h-4 w-4 text-primary" />
                       <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Active Round</span>
                     </div>
                     <CardTitle className="text-2xl truncate font-serif font-black italic uppercase">{set.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 flex-grow bg-muted/5">
                     <div className="flex flex-col items-start">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-primary mb-1">Lot Quantity</span>
                        <span className="text-5xl font-mono font-black text-foreground">{set.players.length}</span>
                     </div>
                  </CardContent>
                  <CardFooter className="p-6 mt-auto">
                     <Button asChild className="w-full rounded-none h-12 font-headline uppercase tracking-widest text-xs group-hover:scale-[1.02] transition-transform">
                        <Link href={user ? `/auction/present/${set.id}` : `/live/${user?.uid || 'live'}`}>
                          {user ? "Enter Floor" : "View Live Feed"}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            className="text-center py-32 border-2 border-dashed border-border rounded-none bg-white/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
              <Layers className="mx-auto h-16 w-16 text-muted-foreground opacity-20" />
              <h3 className="mt-6 text-2xl font-serif font-black uppercase tracking-widest italic">{user ? "No Sets Established" : "Auction Standby"}</h3>
              <p className="mt-2 text-xs text-muted-foreground uppercase tracking-[0.2em] font-medium">{user ? "Import Paradox Roster to begin session." : "Waiting for Moderator to initialize floor."}</p>
              
              {!user && !isUserLoading && (
                <div className="mt-10">
                  <Button asChild className="rounded-none px-12 h-14 font-headline uppercase tracking-[0.2em]">
                      <Link href="/login">
                          <Lock className="mr-3 h-4 w-4" /> Admin Portal
                      </Link>
                  </Button>
                </div>
              )}
               {user && !isLoadingSets && (
                <div className="mt-10">
                  <Button asChild className="rounded-none px-12 h-14 font-headline uppercase tracking-[0.2em]">
                      <Link href="/import">
                          <Upload className="mr-3 h-4 w-4" /> Import Ledger
                      </Link>
                  </Button>
                </div>
              )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}