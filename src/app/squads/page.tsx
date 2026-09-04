'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, CheckCircle, AlertTriangle, Clock, Upload, Loader2, Info, FileText, ImageIcon, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { Squad, Player } from '@/lib/player-data';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, writeBatch, doc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { toPng } from 'html-to-image';
import { SquadPoster } from '@/components/SquadPoster';

export default function SquadsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const posterContainerRef = useRef<HTMLDivElement>(null);

    const squadsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'squads'), orderBy('order'));
    }, [firestore]);

    const { data: squadData, isLoading: isLoadingSquads } = useCollection<Squad>(squadsQuery);

    const playersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        // In production, we only need to match players by name from the master list
        return query(collection(firestore, 'players'));
    }, [firestore]);

    const { data: allPlayers } = useCollection<Player>(playersQuery);

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

                    // Clear existing squads
                    const existingSnap = await getDocs(squadsCollectionRef);
                    existingSnap.forEach(d => batch.delete(d.ref));

                    const parsedData = results.data as any[];
                    
                    // Robust column finder helper (fuzzy matching)
                    const getVal = (row: any, searchTerms: string[]) => {
                        const keys = Object.keys(row);
                        for (const term of searchTerms) {
                            const foundKey = keys.find(k => k.toLowerCase().includes(term.toLowerCase()));
                            if (foundKey) return row[foundKey];
                        }
                        return '';
                    };

                    parsedData.forEach((row, index) => {
                        const houseName = getVal(row, ['house name', 'house']) || 'N/A';
                        
                        const parseSafeFloat = (val: any) => {
                            if (!val || val === '#NUM!' || val === '#N/A') return 0;
                            const str = String(val).replace(/[^0-9.]/g, '');
                            return parseFloat(str) || 0;
                        };

                        const parseSafeInt = (val: any) => {
                            if (!val || val === '#NUM!' || val === '#N/A') return 0;
                            const str = String(val).replace(/[^0-9]/g, '');
                            return parseInt(str, 10) || 0;
                        };

                        // Specific fuzzy search for "Players List"
                        const playersList = getVal(row, ['players list', 'format', 'squad list', 'squad members']) || '';

                        const newSquadRef = doc(squadsCollectionRef);
                        batch.set(newSquadRef, {
                            name: String(houseName).trim(),
                            moneySpent: parseSafeFloat(getVal(row, ['total money spent', 'spent'])),
                            moneyLeft: parseSafeFloat(getVal(row, ['money left', 'purse'])),
                            budgetUsed: parseSafeFloat(getVal(row, ['budget used'])),
                            budgetStatus: String(getVal(row, ['budget status'])).includes('OK') ? 'OK' : 'OVER',
                            eligibilityStatus: getVal(row, ['eligibility status']) || 'N/A',
                            totalPoints: parseSafeInt(getVal(row, ['total no. of points', 'points'])),
                            playersList: String(playersList).trim(), 
                            userId: user.uid,
                            order: index
                        });
                    });

                    await batch.commit();

                    toast({
                        title: 'Standings Updated',
                        description: `Live squad data for ${parsedData.length} houses has been synchronized.`,
                    });
                } catch(error: any) {
                     toast({
                        title: 'Update Failed',
                        description: 'Could not sync the CSV data. Check console for details.',
                        variant: 'destructive',
                    });
                     console.error(error);
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

    const generatePDF = () => {
        if (!squadData) return;
        
        const doc = new jsPDF();
        const timestamp = new Date().toLocaleString();
        
        doc.setFontSize(22);
        doc.text("SAAVAN '26 - Official Auction Wrap-up", 20, 30);
        doc.setFontSize(12);
        doc.text(`Generated on: ${timestamp}`, 20, 40);
        doc.text('Sports Department, IIT Madras Paradox', 20, 47);
        
        doc.setFontSize(16);
        doc.text('Final House Standings', 20, 65);
        
        const standingsData = squadData.map(s => [
            s.name, 
            `${s.moneyLeft} Cr`, 
            s.totalPoints === 0 ? 'N/A' : s.totalPoints.toString(), 
            s.budgetStatus
        ]);
        
        (doc as any).autoTable({
            startY: 70,
            head: [['House Name', 'Purse Left', 'Total Points', 'Budget Status']],
            body: standingsData,
            theme: 'striped',
            headStyles: { fillColor: [184, 134, 11] }
        });

        doc.addPage();
        doc.setFontSize(18);
        doc.text('Official Sales Ledger', 20, 20);
        
        const ledgerData: string[][] = [];
        squadData.forEach(squad => {
            const players = (squad.playersList || '').split(';').filter(Boolean);
            players.forEach(p => {
                const parts = p.split(':');
                if (parts.length >= 2) {
                    const name = parts[0].trim();
                    const price = parts[1].trim();
                    ledgerData.push([name, `${price} Lakh`, squad.name]);
                }
            });
        });

        (doc as any).autoTable({
            startY: 25,
            head: [['Player Name', 'Final Bid', 'Purchased By']],
            body: ledgerData,
            theme: 'grid',
            headStyles: { fillColor: [139, 0, 0] }
        });

        doc.save(`SAAVAN_26_Auction_Wrapup.pdf`);
        toast({ title: 'PDF Ledger Generated', description: 'The official record has been saved.' });
    };

    const generatePosters = async () => {
        if (!squadData || !allPlayers) return;
        setIsGenerating(true);
        
        try {
            for (const squad of squadData) {
                const element = document.getElementById(`poster-${squad.id}`);
                if (element) {
                    const dataUrl = await toPng(element, { quality: 0.95, pixelRatio: 2 });
                    const link = document.createElement('a');
                    link.download = `Squad_Poster_${squad.name.replace(/\s+/g, '_')}.png`;
                    link.href = dataUrl;
                    link.click();
                }
            }
            toast({ title: 'Posters Generated', description: 'All team posters have been downloaded.' });
        } catch (error) {
            console.error(error);
            toast({ title: 'Poster Generation Failed', variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <motion.div
            className="w-full max-w-7xl mx-auto px-2 sm:px-4 pb-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            {user && squadData && allPlayers && (
                <div className="fixed -left-[4000px] top-0 pointer-events-none" ref={posterContainerRef}>
                    {squadData.map(squad => (
                        <SquadPoster key={squad.id} squad={squad} allPlayers={allPlayers} />
                    ))}
                </div>
            )}

            <Card className="bg-card/90 backdrop-blur-sm ornate-border">
                <CardHeader className="text-center sm:text-left border-b border-primary/20 pb-8">
                    <CardTitle className="flex flex-col sm:flex-row items-center text-3xl sm:text-4xl gap-3 font-serif text-primary">
                        <ShieldCheck className="h-10 w-10 text-primary shrink-0" />
                        Live Ledger & Standings
                    </CardTitle>
                    <CardDescription className="text-lg italic">
                        Real-time tracking for SAAVAN '26 Official Auction
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pt-8">
                    
                    {user && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-secondary/10 border-primary/20">
                            <CardHeader className="p-6">
                                <CardTitle className="text-xl flex items-center font-serif text-primary"><Upload className="mr-2 h-5 w-5"/>Sync Session Data</CardTitle>
                                <CardDescription>
                                    Upload the latest tracking CSV to refresh standings.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-6 pb-6 space-y-4">
                                <Input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    disabled={isProcessing}
                                    className="file:text-primary file:font-bold border-primary/30 bg-background/50 cursor-pointer"
                                />
                                <div className="p-3 bg-black/40 border border-primary/10 rounded-md">
                                  <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">CSV Header Requirement:</p>
                                  <code className="text-[9px] text-muted-foreground break-all">
                                    House Name, Total Money Spent, Money Left, Budget Status, Total No. of Points, Players List (Format: Name:Price;...)
                                  </code>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-primary/5 border-primary/20">
                            <CardHeader className="p-6">
                                <CardTitle className="text-xl flex items-center font-serif text-primary"><Download className="mr-2 h-5 w-5"/>Wrap-up Tools</CardTitle>
                                <CardDescription>
                                    Generate official assets for distribution.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-6 pb-6 grid grid-cols-1 gap-3">
                                <Button 
                                  variant="outline" 
                                  onClick={generatePDF} 
                                  disabled={!squadData || squadData.length === 0}
                                  className="h-12 font-bold border-primary/40 text-primary hover:bg-primary/10"
                                >
                                  <FileText className="mr-2 h-4 w-4" /> Download Official PDF Ledger
                                </Button>
                                <Button 
                                  variant="default" 
                                  onClick={generatePosters} 
                                  disabled={!squadData || squadData.length === 0 || !allPlayers || isGenerating}
                                  className="h-12 font-bold"
                                >
                                  {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                                  Generate Team Posters
                                </Button>
                            </CardContent>
                        </Card>
                      </div>
                    )}

                    {isLoadingSquads ? (
                        <div className="flex flex-col items-center justify-center p-20 gap-4">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <p className="font-serif text-primary animate-pulse tracking-widest uppercase">Fetching Ledger...</p>
                        </div>
                    ) : squadData && squadData.length > 0 ? (
                        <div className="border border-primary/20 rounded-lg overflow-hidden w-full overflow-x-auto shadow-2xl bg-black/20">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30 hover:bg-muted/50 border-b border-primary/20">
                                        <TableHead className="font-black text-primary uppercase tracking-widest min-w-[180px]">House</TableHead>
                                        <TableHead className="text-right font-black text-primary uppercase tracking-widest hidden sm:table-cell">Spent</TableHead>
                                        <TableHead className="text-right font-black text-primary uppercase tracking-widest text-lg">Purse Left</TableHead>
                                        <TableHead className="text-center font-black text-primary uppercase tracking-widest hidden md:table-cell">Used %</TableHead>
                                        <TableHead className="text-center font-black text-primary uppercase tracking-widest">Budget</TableHead>
                                        <TableHead className="text-center font-black text-primary uppercase tracking-widest">Points</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {squadData.map((house) => (
                                        <TableRow key={house.id} className="hover:bg-primary/5 transition-colors border-b border-primary/5">
                                            <TableCell className="font-serif text-lg sm:text-xl text-white py-6">{house.name}</TableCell>
                                            <TableCell className="text-right font-mono text-sm hidden sm:table-cell text-muted-foreground">{house.moneySpent} Cr</TableCell>
                                            <TableCell className="text-right font-mono text-primary font-black text-xl sm:text-2xl">{house.moneyLeft} Cr</TableCell>
                                            <TableCell className="text-center font-mono text-sm hidden md:table-cell">{house.budgetUsed}%</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={house.budgetStatus === 'OK' ? 'default' : 'destructive'} className="gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[10px] sm:text-xs">
                                                    {house.budgetStatus === 'OK' ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                                                    {house.budgetStatus}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center font-mono font-black text-xl sm:text-2xl text-white">{house.totalPoints === 0 ? 'N/A' : house.totalPoints}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                         <div className="text-center py-20 border-2 border-dashed border-primary/20 rounded-lg bg-background/50">
                            <Info className="mx-auto h-20 w-20 text-muted-foreground opacity-10 mb-4" />
                            <h3 className="text-2xl font-serif text-primary uppercase tracking-widest">Standings Ledger Empty</h3>
                            <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto italic">
                                {user ? "Please upload the final tracking CSV to generate posters and reports." : "The administrator has not yet uploaded the session wrap-up data."}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
