
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, CheckCircle, AlertTriangle, Upload, Loader2, Info, FileText, ImageIcon, Download, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Squad, Player, OFFICIAL_HOUSES, SQUAD_RULES } from '@/lib/player-data';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, writeBatch, doc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

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

    const initializeHouses = async () => {
        if (!firestore || !user) return;
        setIsProcessing(true);
        try {
            const batch = writeBatch(firestore);
            const squadsCollectionRef = collection(firestore, 'squads');
            
            // Clear existing
            const existing = await getDocs(squadsCollectionRef);
            existing.forEach(d => batch.delete(d.ref));

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

            await batch.commit();
            toast({ title: "Franchises Initialized", description: "12 Official Houses ready for auction." });
        } catch (e) {
            toast({ title: "Initialization Failed", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const generatePDF = () => {
        if (!squadData) return;
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text("IPL Auction '26 - Official Standings", 20, 30);
        doc.setFontSize(12);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 40);
        
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
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {squadData.map((house) => (
                                        <TableRow key={house.id} className="hover:bg-primary/5 border-b border-primary/5">
                                            <TableCell className="font-serif text-2xl text-white py-8 px-6">{house.name}</TableCell>
                                            <TableCell className="text-right font-mono text-muted-foreground">{house.moneySpent}Cr</TableCell>
                                            <TableCell className="text-right font-mono text-primary font-black text-3xl">{house.moneyLeft}Cr</TableCell>
                                            <TableCell className="text-center font-mono font-black text-2xl text-white">{house.totalPoints}</TableCell>
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
        </motion.div>
    );
}
