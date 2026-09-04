
'use client';

import { useState } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, writeBatch, doc, getDocs, query, where } from 'firebase/firestore';
import { Player } from '@/lib/player-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import Papa from 'papaparse';
import { useRouter } from 'next/navigation';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export default function ImportPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!file || !user || !firestore) {
      toast({
        title: 'Error',
        description: 'File, user, or database not ready.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const batch = writeBatch(firestore);
          const playersCollectionRef = collection(firestore, 'players');
          const setsCollectionRef = collection(firestore, 'sets');

          // 1. Delete all existing players for the user
          const playersQuery = query(playersCollectionRef, where('userId', '==', user.uid));
          const existingPlayersSnap = await getDocs(playersQuery);
          existingPlayersSnap.forEach(doc => batch.delete(doc.ref));

          // 2. Delete all existing sets for the user
          const existingSetsSnap = await getDocs(query(setsCollectionRef, where('userId', '==', user.uid)));
          existingSetsSnap.forEach(doc => batch.delete(doc.ref));

          const importedData = results.data as any[];
          
          const setsMap: { [key: string]: { name: string, order: number, players: Player[] } } = {};

          for (const item of importedData) {
            const playerName = `${item['First Name'] || ''} ${item['Surname'] || ''}`.trim();
            if (!playerName) continue;
            
            const setNumber = item['Set No.'];
            if (!setNumber) continue;

            const playerRef = doc(playersCollectionRef);
            
            const newPlayerData: any = {
              id: playerRef.id,
              playerName: playerName,
              firstName: item['First Name'] || '',
              surname: item['Surname'] || '',
              country: item['Country'] || '',
              specialism: item['Specialism'] || '',
              cua: item['C/U/A'] || '',
              reservePrice: parseFloat(item['Reserve Price Rs Lakh']) || 0,
              points: parseInt(item['Points'], 10) || 0,
              auctionInsight: item['Auction Insight'] || '',
              playerNumber: parseInt(item['List Sr.No.'], 10) || 0,
              setNumber: parseInt(setNumber, 10) || 0,
              userId: user.uid,
            };
            
            const imageUrl = item['Image URL'];
            if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim()) {
              newPlayerData.imageUrl = imageUrl.trim();
            }
            
            batch.set(playerRef, newPlayerData);

            if (!setsMap[setNumber]) {
              setsMap[setNumber] = { 
                name: item['Set'] || `Set ${setNumber}`,
                order: parseInt(setNumber, 10) || 0,
                players: [] 
              };
            }
            setsMap[setNumber].players.push(newPlayerData as Player);
          }

          let setCount = 0;
          for (const setNumber in setsMap) {
            const setData = setsMap[setNumber];
            const setRef = doc(setsCollectionRef);
            batch.set(setRef, {
              name: setData.name,
              order: setData.order,
              players: setData.players,
              userId: user.uid,
            });
            setCount++;
          }
          
          await batch.commit().catch(async (e) => {
             const permissionError = new FirestorePermissionError({
                path: 'batch-import',
                operation: 'write',
             } satisfies SecurityRuleContext);
             errorEmitter.emit('permission-error', permissionError);
             throw e;
          });

          toast({
            title: 'Import Successful',
            description: `All existing data cleared. Created ${setCount} new sets.`,
          });

          router.push('/');

        } catch (error: any) {
          if (!(error instanceof FirestorePermissionError)) {
             toast({
              title: 'Import Failed',
              description: error.message || 'An unknown error occurred.',
              variant: 'destructive',
            });
          }
        } finally {
          setIsProcessing(false);
        }
      },
      error: (error: any) => {
        toast({
          title: 'CSV Parsing Failed',
          description: error.message,
          variant: 'destructive',
        });
        setIsProcessing(false);
      },
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Upload className="mr-2" /> Import Players from CSV</CardTitle>
          <CardDescription>
            <span className="font-bold text-destructive">Warning:</span> This will permanently delete all your existing players and sets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                 <p className="text-sm font-medium text-primary">Required CSV Column Headers:</p>
                 <code className="text-[10px] p-3 bg-secondary/20 border border-primary/20 rounded-sm block whitespace-pre-wrap leading-relaxed text-foreground/80">
                    List Sr.No., Set No., Set, First Name, Surname, Country, Specialism, C/U/A, Reserve Price Rs Lakh, Points, Auction Insight, Image URL
                 </code>
            </div>
          <Input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={isProcessing}
            className="file:text-primary file:font-bold border-primary/20"
          />
           <Button
            onClick={handleImport}
            disabled={!file || isProcessing}
            className="w-full h-12 text-lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="mr-2" />
                Import and Overwrite Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
