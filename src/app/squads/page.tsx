
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, Loader2, FileText, ImageIcon, Download, RotateCcw, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Squad, Player, OFFICIAL_HOUSES, SQUAD_RULES } from '@/lib/player-data';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, writeBatch, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { toPng } from 'html-to-image';
import { SquadPoster } from '@/components/SquadPoster';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export default function SquadsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewSquad, setPreviewSquad] = useState<Squad | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const squadsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'squads'), orderBy('order'));
    }, [firestore]);

    const { data: squadData, isLoading: isLoadingSquads } = useCollection<Squad>(squadsQuery);

    const playersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'players'));
    }, [firestore]);

    const { data: allPlayers } = useCollection<Player>(playersQuery);

    const initializeHouses = async () => {
        if (!firestore || !user) return;
        if (!confirm("This will reset all house budgets and rosters. Continue?")) return;
        
        setIsProcessing(true);
        try {
            const batch = writeBatch(firestore);
            const squadsCollectionRef = collection(firestore, 'squads');
            
            // 1. Clear existing squads
            const existing = await getDocs(squadsCollectionRef);
            existing.forEach(d => batch.delete(d.ref));

            // 2. Initialize official 12 houses
            OFFICIAL_HOUSES.forEach((name, index) => {
                const newRef = doc(squadsCollectionRef);
                batch.set(newRef, {
                    name,
                    moneySpent: 0,
                    moneyLeft: SQUAD_RULES.TOTAL_PURSE,
                    budgetStatus: 'OK',
                    totalPoints: 0,
                    playersList: '',
                    userId: user.uid,
                    order: index
                });
            });

            await batch.commit().catch(async (err) => {
                const permissionError = new FirestorePermissionError({
                    path: 'squads-init',
                    operation: 'write',
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
                throw err;
            });

            toast({ title: "Franchises Initialized", description: "12 Official Houses ready for auction." });
        } catch (e: any) {
            console.error("Initialization failed:", e);
            if (!(e instanceof FirestorePermissionError)) {
                toast({ title: "Initialization Failed", description: e.message || "Could not reset houses.", variant: "destructive" });
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadPoster = async (squadId: string) => {
        const node = document.getElementById(`poster-${squadId}`);
        if (!node) return;
        
        setIsDownloading(true);
        try {
            const dataUrl = await toPng(node, { quality: 0.95, pixelRatio: 2 });
            const link = document.createElement('a');
            link.download = `Squad_Poster_${squadId}.png`;
            link.href = dataUrl;
            link.click();
            toast({ title: "Poster Downloaded", description: "High-resolution squad poster is ready." });
        } catch (err) {
            toast({ title: "Download Failed", variant: "destructive" });
        } finally {
            setIsDownloading(false);
        }
    };

    const generatePDF = () => {
        if (!squadData) return;
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text("IPL Auction '26 - Official Standings", 20, 30);
        
        const rows = squadData.map(s => [s.name, `${s.moneyLeft} Cr`, s.totalPoints, s.budgetStatus]);
        (doc as any).autoTable({
            startY: 50,
            head: [['House', 'Purse Left', 'Points', 'Budget']],
            body: rows,
            headStyles: { fillColor: [184, 134, 11] }
        });

        doc.save(`IPL_Auction_Standings.pdf`);
    };

    return (
        <motion.div className="w-full max-w-7xl mx-auto px-4 pb-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="bg-card/90 backdrop-blur-sm ornate-border">
                <CardHeader className="border-b border-primary/20 pb-8">
                    <CardTitle className="flex items-center text-4xl gap-3 font-serif text-primary">
                        <ShieldCheck className="h-10 w-10" />
                        Live Ledger & Standings
                    </CardTitle>
                    <CardDescription className="text-lg italic">Official Real-time tracking for IPL Auction</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pt-8">
                    {user && (
                      <div className="flex flex-wrap gap-4">
                        <Button onClick={initializeHouses} disabled={isProcessing} className="bg-primary font-bold">
                            {isProcessing ? <Loader2 className="animate-spin mr-2"/> : <RotateCcw className="mr-2"/>}
                            Reset/Initialize Official Houses
                        </Button>
                        <Button variant="outline" onClick={generatePDF} className="border-primary text-primary font-bold">
                            <FileText className="mr-2"/> Download Official Standings
                        </Button>
                      </div>
                    )}

                    {isLoadingSquads ? (
                        <div className="py-20 text-center"><Loader2 className="h-12 w-12 animate-spin mx-auto text-primary"/></div>
                    ) : squadData && squadData.length > 0 ? (
                        <div className="border border-primary/20 rounded-lg overflow-x-auto shadow-2xl bg-black/20">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30 border-b border-primary/20">
                                        <TableHead className="font-black text-primary uppercase tracking-widest p-6">House</TableHead>
                                        <TableHead className="text-right font-black text-primary uppercase tracking-widest">Spent (Cr)</TableHead>
                                        <TableHead className="text-right font-black text-primary uppercase tracking-widest text-lg">Purse Left (Cr)</TableHead>
                                        <TableHead className="text-center font-black text-primary uppercase tracking-widest">Points</TableHead>
                                        <TableHead className="text-right font-black text-primary uppercase tracking-widest w-[100px]">Asset</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {squadData.map((house) => (
                                        <TableRow key={house.id} className="hover:bg-primary/5 border-b border-primary/5">
                                            <TableCell className="font-serif text-2xl text-white py-8 px-6">{house.name}</TableCell>
                                            <TableCell className="text-right font-mono text-muted-foreground">{house.moneySpent}Cr</TableCell>
                                            <TableCell className="text-right font-mono text-primary font-black text-3xl">{house.moneyLeft}Cr</TableCell>
                                            <TableCell className="text-center font-mono font-black text-2xl text-white">{house.totalPoints}</TableCell>
                                            <TableCell className="text-right">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="text-primary hover:bg-primary/10"
                                                    onClick={() => setPreviewSquad(house)}
                                                >
                                                    <ImageIcon className="h-5 w-5" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                         <div className="text-center py-20 border-2 border-dashed border-primary/20 rounded-lg">
                            <Info className="mx-auto h-20 w-20 opacity-10 mb-4" />
                            <h3 className="text-2xl font-serif text-primary uppercase tracking-widest">Standings Ledger Empty</h3>
                            <p className="mt-2 text-sm text-muted-foreground">Admin must initialize houses to begin tracking.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Poster Preview & Generation Dialog */}
            <Dialog open={!!previewSquad} onOpenChange={() => setPreviewSquad(null)}>
                <DialogContent className="max-w-[800px] h-[90vh] bg-black border-primary/30 flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-6 border-b border-primary/20 flex-shrink-0">
                        <DialogTitle className="font-serif text-primary text-2xl uppercase">Official Squad Poster</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto bg-black p-4 flex justify-center custom-scrollbar">
                        {previewSquad && (
                            <div className="scale-[0.5] origin-top">
                                <SquadPoster squad={previewSquad} allPlayers={allPlayers || []} />
                            </div>
                        )}
                    </div>
                    <div className="p-6 border-t border-primary/20 flex justify-end gap-3 flex-shrink-0">
                        <Button variant="ghost" onClick={() => setPreviewSquad(null)}>Close</Button>
                        <Button 
                            className="bg-primary font-bold" 
                            disabled={isDownloading}
                            onClick={() => previewSquad && downloadPoster(previewSquad.id)}
                        >
                            {isDownloading ? <Loader2 className="animate-spin mr-2"/> : <Download className="mr-2"/>}
                            Download PNG
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
