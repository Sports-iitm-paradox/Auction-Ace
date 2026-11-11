"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Layers, PlusCircle, Lock, Upload, Trophy, ArrowRight, Shield } from 'lucide-react';
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
        staggerChildren: 0.08,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: [0.23, 1, 0.32, 1],
      },
    },
  };

  const isLoading = isUserLoading || isLoadingSets;

  if (isLoading && !sets) {
    return (
      <div className="w-full max-w-6xl mx-auto py-20 px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-72 animate-pulse bg-foreground/5 border-2 border-foreground/10" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div 
      className="w-full max-w-7xl mx-auto py-12 sm:py-20 px-4 gpu-layer"
      initial="hidden"
      animate="visible"
    >
      <div className="mb-20 text-center space-y-6">
        <h1 className="text-5xl sm:text-8xl font-headline font-black tracking-tighter text-foreground uppercase border-b-8 border-primary inline-block pb-4 leading-none italic">
          Floor Selection
        </h1>
        <p className="text-foreground/40 uppercase tracking-[0.8em] text-[11px] font-black">
          {user ? "Administrative Access Authorized // Active Rounds" : "Live Floor Monitor // Synchronized Access"}
        </p>
      </div>

      <AnimatePresence>
        {sets && sets.length > 0 ? (
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {sets.map((set) => (
              <motion.div key={set.id} variants={cardVariants}>
                <Card className="rounded-none border-2 border-foreground hover:border-primary transition-all flex flex-col h-full bg-white hover:-translate-x-2 hover:-translate-y-2 shadow-none hover:shadow-[12px_12px_0px_rgba(10,25,47,1)] group relative overflow-hidden">
                  <CardHeader className="p-8 border-b-2 border-foreground bg-accent/10">
                     <div className="flex items-center gap-4 mb-4">
                       <Shield className="h-5 w-5 text-foreground" />
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Authorized Round</span>
                     </div>
                     <CardTitle className="text-3xl truncate font-headline font-black italic uppercase tracking-tight">{set.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 flex-grow">
                     <div className="flex flex-col items-start">
                        <span className="text-[11px] uppercase font-black tracking-[0.3em] text-primary mb-2">Total Capacity</span>
                        <div className="flex items-baseline gap-2">
                           <span className="text-7xl font-mono font-black text-foreground leading-none">{set.players.length}</span>
                           <span className="text-xl font-headline font-black text-foreground/20 italic uppercase">Lots</span>
                        </div>
                     </div>
                  </CardContent>
                  <CardFooter className="p-8 mt-auto">
                     <Button asChild className="w-full vector-button h-14 text-sm font-black bg-foreground text-white hover:bg-foreground/90">
                        <Link href={user ? `/auction/present/${set.id}` : `/live/${user?.uid || 'live'}`}>
                          {user ? "Enter Floor" : "View Stream"}
                          <ArrowRight className="ml-3 h-5 w-5" />
                        </Link>
                      </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            className="text-center py-40 border-4 border-dashed border-foreground/10 bg-white shadow-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
              <Trophy className="mx-auto h-24 w-24 text-foreground/5 mb-10" />
              <h3 className="text-4xl font-headline font-black uppercase tracking-widest italic">{user ? "No Sets Found" : "Floor Inactive"}</h3>
              <p className="mt-4 text-[11px] text-foreground/30 uppercase tracking-[0.4em] font-bold">{user ? "Import Paradox Roster to initialize session." : "Waiting for Floor Moderator to broadcast signal."}</p>
              
              {!user && !isUserLoading && (
                <div className="mt-16">
                  <Button asChild className="vector-button px-16 h-16 text-lg bg-foreground text-white hover:bg-foreground/90">
                      <Link href="/login">
                          <Lock className="mr-4 h-5 w-5" /> Administrator Portal
                      </Link>
                  </Button>
                </div>
              )}
               {user && !isLoadingSets && (
                <div className="mt-16">
                  <Button asChild className="vector-button px-16 h-16 text-lg bg-foreground text-white hover:bg-foreground/90">
                      <Link href="/import">
                          <Upload className="mr-4 h-5 w-5" /> Initialize Ledger
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