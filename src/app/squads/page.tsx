
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, CheckCircle, AlertTriangle, Clock, Upload, Loader2, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { Squad } from '@/lib/player-data';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, writeBatch, doc, getDocs, query, orderBy } from 'firebase/firestore';

export default function SquadsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);

    const squadsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'squads'), orderBy('order'));
    }, [firestore]);

    const { data: squadData, isLoading: isLoadingSquads } = useCollection<Squad>(squadsQuery);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user || !firestore) return;

        setIsProcessing(true);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const squadsCollectionRef = collection(firestore, 'squads');
                    const batch = writeBatch(firestore);

                    // 1. Clear existing squads for this admin (simple clear all for MVP)
                    const existingSnap = await getDocs(squadsCollectionRef);
                    existingSnap.forEach(d => batch.delete(d.ref));

                    // 2. Add new data
                    const parsedData = results.data as any[];
                    parsedData.forEach((row, index) => {
                        const houseName = row['House Name'] || 'N/A';
                        const newSquadRef = doc(squadsCollectionRef);
                        batch.set(newSquadRef, {
                            name: houseName,
                            moneySpent: parseFloat(row['Total Money Spent']) || 0,
                            moneyLeft: parseFloat(row['Money Left']) || 0,
                            budgetUsed: parseFloat(row['Budget Used (in %)']) || 0,
                            budgetStatus: row['Budget Status']?.includes('OK') ? 'OK' : 'OVER',
                            eligibilityStatus: row['Eligibility Status'] || 'N/A',
                            totalPoints: row['Total No. of Points'] === '#N/A' ? 0 : parseInt(row['Total No. of Points'], 10) || 0,
                            userId: user.uid,
                            order: index
                        });
                    });

                    await batch.commit();

                    toast({
                        title: 'Standings Updated',
                        description: `Live squad data for ${parsedData.length} houses is now persistent.`,
                    });
                } catch(error: any) {
                     toast({
                        title: 'Update Failed',
                        description: 'Could not sync the CSV data to Firestore.',
                        variant: 'destructive',
                    });
                } finally {
                    setIsProcessing(false);
                }
            },
            error: (error: any) => {
                toast({
                    title: 'Parsing Failed',
                    description: error.message,
                    variant: 'destructive',
                });
                setIsProcessing(false);
            },
        });
    };

    return (
        <motion.div
            className="w-full max-w-7xl mx-auto px-2 sm:px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Card className="bg-card/90 backdrop-blur-sm">
                <CardHeader className="text-center sm:text-left">
                    <CardTitle className="flex flex-col sm:flex-row items-center text-2xl sm:text-3xl gap-3">
                        <ShieldCheck className="h-8 w-8 text-primary shrink-0" />
                        Live Squad Status
                    </CardTitle>
                    <CardDescription>
                        Dashboard for house purse, points, and squad eligibility.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {user && (
                        <Card className="bg-secondary/10 border-primary/20">
                            <CardHeader className="p-4 sm:p-6">
                                <CardTitle className="text-lg sm:text-xl flex items-center"><Upload className="mr-2 h-5 w-5"/>Refresh Master Data</CardTitle>
                                <CardDescription>
                                    Upload the latest tracking CSV to update live standings for all participants.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6 pt-0 flex flex-col sm:flex-row gap-4 items-center">
                                <Input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    disabled={isProcessing}
                                    className="file:text-primary-foreground file:bg-primary file:hover:bg-primary/90 file:font-bold file:rounded-md file:px-3 file:py-1 cursor-pointer w-full"
                                />
                                {isProcessing && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
                            </CardContent>
                        </Card>
                    )}

                    {isLoadingSquads ? (
                        <div className="flex justify-center p-20">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        </div>
                    ) : squadData && squadData.length > 0 ? (
                        <div className="border border-primary/20 rounded-lg overflow-hidden w-full overflow-x-auto shadow-2xl">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 hover:bg-muted/80">
                                        <TableHead className="font-bold min-w-[150px]">House Name</TableHead>
                                        <TableHead className="text-right font-bold hidden sm:table-cell">Spent</TableHead>
                                        <TableHead className="text-right font-bold">Purse Left</TableHead>
                                        <TableHead className="text-center font-bold hidden md:table-cell">Used %</TableHead>
                                        <TableHead className="text-center font-bold">Budget</TableHead>
                                        <TableHead className="text-center font-bold hidden sm:table-cell">Eligibility</TableHead>
                                        <TableHead className="text-center font-bold">Points</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {squadData.map((house) => (
                                        <TableRow key={house.id} className="hover:bg-primary/5 transition-colors">
                                            <TableCell className="font-serif text-base sm:text-lg text-foreground">{house.name}</TableCell>
                                            <TableCell className="text-right font-mono text-xs hidden sm:table-cell">{house.moneySpent} Cr</TableCell>
                                            <TableCell className="text-right font-mono text-primary font-black text-sm sm:text-lg">{house.moneyLeft} Cr</TableCell>
                                            <TableCell className="text-center font-mono text-xs hidden md:table-cell">{house.budgetUsed}%</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={house.budgetStatus === 'OK' ? 'default' : 'destructive'} className="gap-1 items-center bg-green-500 hover:bg-green-600 text-white text-[10px] sm:text-xs">
                                                    {house.budgetStatus === 'OK' ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                                                    {house.budgetStatus}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center hidden sm:table-cell">
                                                <Badge variant="outline" className="gap-1 items-center text-[10px] border-primary/30">
                                                    <Clock className="h-3 w-3 text-primary" />
                                                    {house.eligibilityStatus}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center font-mono font-black text-sm sm:text-lg text-primary">{house.totalPoints}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                         <div className="text-center py-20 border-2 border-dashed border-primary/20 rounded-lg bg-background/50">
                            <Info className="mx-auto h-16 w-16 text-muted-foreground opacity-20" />
                            <h3 className="mt-4 text-xl font-serif text-primary">Standings Empty</h3>
                            <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
                                {user ? "Upload the tracking CSV to broadcast live standings." : "The administrator has not uploaded squad data yet."}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
