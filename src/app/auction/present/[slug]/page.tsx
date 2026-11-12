'use client';

import { useEffect } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import { PlayerSet } from '@/lib/player-data';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, DocumentReference } from 'firebase/firestore';
import FullScreenView from '@/components/FullScreenView';
import { Loader2 } from 'lucide-react';

export default function PresentPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug;

  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const setRef = useMemoFirebase(() => {
    if (!firestore || typeof slug !== 'string') return null;
    return doc(firestore, 'sets', slug) as DocumentReference<PlayerSet>;
  }, [firestore, slug]);

  const { data: set, isLoading: isLoadingSet } = useDoc<PlayerSet>(setRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const isLoading = isLoadingSet || isUserLoading;

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-[100] vector-grid-bg">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-foreground/40 font-headline uppercase tracking-[0.5em] text-[11px]">Syncing Floor Session</p>
      </div>
    );
  }

  // Only trigger 404 if loading finished and no set was returned for a valid ref
  if (!set && !isLoadingSet && setRef) {
    notFound();
    return null;
  }

  if (!set || !user) return null;

  return <FullScreenView set={set} />;
}