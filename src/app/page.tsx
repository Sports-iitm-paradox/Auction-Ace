
"use client";

import Link from 'next/link';
import { Card, CardContent, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
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
      <div className="w-full max-w-[1800px] mx-auto py-24 px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse bg-foreground/5 border-2 border-foreground/10" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[1800px] mx-auto py-12 sm:py-16 px-6 gpu-layer">
      <div className="mb-12 text-center">
        <h1 className="text-3xl sm:text-5xl font-headline font-black tracking-tighter text-foreground uppercase border-b-4 border-primary inline-block pb-3 leading-none italic">
          Floor Select
        </h1>
      </div>

      <AnimatePresence mode="wait">
        {sets && sets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
            {sets.map((set) => (
              <motion.div 
                key={set.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="rounded-none border-2 border-foreground hover:border-primary transition-all flex flex-col h-full bg-white hover:-translate-x-1 hover:-translate-y-1 shadow-none hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] group relative overflow-hidden">
                  <div className="p-5 border-b-2 border-foreground bg-accent/20">
                     <CardTitle className="text-3xl truncate font-headline font-black italic uppercase tracking-tight">{set.name}</CardTitle>
                  </div>
                  <CardContent className="p-5 flex-grow">
                     <div className="flex flex-col items-start">
                        <div className="flex items-baseline gap-2">
                           <span className="text-5xl font-mono font-black text-foreground leading-none">{set.players.length}</span>
                           <span className="text-lg font-headline font-black text-foreground/20 italic uppercase">Assets</span>
                        </div>
                     </div>
                  </CardContent>
                  <CardFooter className="p-5 mt-auto">
                     <Button asChild className="w-full vector-button h-10 text-[11px] font-black bg-foreground text-white hover:bg-foreground/90">
                        <Link href={user && user.uid === set.userId ? `/auction/present/${set.id}` : `/live/${set.id}`}>
                          {user && user.uid === set.userId ? "Open Floor" : "Watch Live"}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-32 border-4 border-dashed border-foreground/10 bg-white shadow-sm">
              <h3 className="text-3xl font-headline font-black uppercase tracking-[0.4em] italic text-foreground/20 mb-8">Roster Pending</h3>
              
              {!user && !isUserLoading && (
                <Button asChild className="vector-button px-12 h-12 text-sm bg-foreground text-white">
                    <Link href="/login">Admin Portal</Link>
                </Button>
              )}
               {user && !isLoadingSets && (
                <Button asChild className="vector-button px-12 h-12 text-sm bg-foreground text-white">
                    <Link href="/import">Sync Ledger</Link>
                </Button>
              )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
