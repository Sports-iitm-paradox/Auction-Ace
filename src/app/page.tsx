"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';
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

  const isLoading = isUserLoading || isLoadingSets;

  if (isLoading && !sets) {
    return (
      <div className="w-full max-w-7xl mx-auto py-24 px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-80 animate-pulse bg-foreground/5 border-2 border-foreground/10" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto py-16 sm:py-24 px-6 gpu-layer">
      <div className="mb-24 text-center">
        <h1 className="text-6xl sm:text-9xl font-headline font-black tracking-tighter text-foreground uppercase border-b-8 border-primary inline-block pb-6 leading-none italic">
          Floor Select
        </h1>
        <p className="mt-8 text-foreground/40 uppercase tracking-[1em] text-[12px] font-black">
          Official Round Roster // Active Session
        </p>
      </div>

      <AnimatePresence mode="wait">
        {sets && sets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {sets.map((set) => (
              <motion.div 
                key={set.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="rounded-none border-2 border-foreground hover:border-primary transition-all flex flex-col h-full bg-white hover:-translate-x-2 hover:-translate-y-2 shadow-none hover:shadow-[10px_10px_0px_rgba(0,0,0,1)] group relative overflow-hidden">
                  <CardHeader className="p-10 border-b-2 border-foreground bg-accent/20">
                     <span className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground/40 mb-4 block">Official Entry</span>
                     <CardTitle className="text-4xl truncate font-headline font-black italic uppercase tracking-tight">{set.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-10 flex-grow">
                     <div className="flex flex-col items-start">
                        <span className="text-[12px] uppercase font-black tracking-[0.5em] text-primary mb-3">Lot Count</span>
                        <div className="flex items-baseline gap-3">
                           <span className="text-8xl font-mono font-black text-foreground leading-none">{set.players.length}</span>
                           <span className="text-2xl font-headline font-black text-foreground/20 italic uppercase">Assets</span>
                        </div>
                     </div>
                  </CardContent>
                  <CardFooter className="p-10 mt-auto">
                     <Button asChild className="w-full vector-button h-16 text-sm font-black bg-foreground text-white hover:bg-foreground/90">
                        <Link href={user ? `/auction/present/${set.id}` : `/live/${user?.uid || 'live'}`}>
                          {user ? "Open Floor" : "Watch Live"}
                          <ArrowRight className="ml-4 h-6 w-6" />
                        </Link>
                      </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-48 border-4 border-dashed border-foreground/10 bg-white shadow-sm">
              <h3 className="text-5xl font-headline font-black uppercase tracking-[0.4em] italic text-foreground/20 mb-12">Roster Pending</h3>
              
              {!user && !isUserLoading && (
                <Button asChild className="vector-button px-20 h-16 text-lg bg-foreground text-white">
                    <Link href="/login">Admin Portal</Link>
                </Button>
              )}
               {user && !isLoadingSets && (
                <Button asChild className="vector-button px-20 h-16 text-lg bg-foreground text-white">
                    <Link href="/import">Sync Ledger</Link>
                </Button>
              )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}