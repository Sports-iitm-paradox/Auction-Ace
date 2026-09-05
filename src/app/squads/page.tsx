
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, Loader2, FileText, ImageIcon, Download, Info, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Squad, Player } from '@/lib/player-data';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, writeBatch, doc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { toPng } from 'html-to-image';
import { SquadPoster } from '@/components/SquadPoster';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import Papa from 'papaparse';

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

    const handleSquadImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user || !firestore) return;

        setIsProcessing(true);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const batch = writeBatch(firestore);
                    const squadsCollectionRef = collection(firestore, 'squads');
                    
                    const existingQuery = query(squadsCollectionRef, where('userId', '==', user.uid));
                    const existingSnap = await getDocs(existingQuery);
                    existingSnap.forEach(d => batch.delete(d.ref));

                    results.data.forEach((row: any, index: number) => {
                        const name = row['House Name'];
                        if (!name) return;

                        const moneySpent = parseFloat(row['Total Money Spent']) || 0;
                        const moneyLeft = parseFloat(row['Money Left']) || 0;
                        const totalPoints = parseInt(row['Total No. of Points'], 10) || 0;
                        const playersList = row['Players List'] || '';
                        const rawStatus = row['Budget Status'] || '';
                        const budgetStatus = rawStatus.includes('OK') ? 'OK' : 'OVER';

                        const newRef = doc(squadsCollectionRef);
                        batch.set(newRef, {
                            name,
                            moneySpent,
                            moneyLeft,
                            budgetStatus,
                            totalPoints,
                            playersList,
                            userId: user.uid,
                            order: index
                        });
                    });

                    await batch.commit();
                    toast({ title: "Standings Updated", description: "Paradox official squads imported successfully." });
                } catch (e: any) {
                    toast({ title: "Import Failed", description: e.message, variant: "destructive" });
                } finally {
                    setIsProcessing(false);
                }
            }
        });
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
            toast({ title: "Poster Exported" });
        } catch (err) {
            toast({ title: "Export Failed", variant: "destructive" });
        } finally {
            setIsDownloading(false);
        }
    };

    const generatePDF = () => {
        if (!squadData) return;
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text("Paradox IPL Auction Standings", 20, 30);
        const rows = squadData.map(s => [s.name, `${s.moneyLeft} Cr`, s.totalPoints, s.budgetStatus]);
        (doc as any).autoTable({
            startY: 50,
            head: [['House', 'Remaining Purse', 'Total Points', 'Status']],
            body: rows,
            headStyles: { fillColor: [184, 134, 11] }
        });
        doc.save(`Standings.pdf`);
    };

    return (
        <motion.div className="w-full max-w-7xl mx-auto px-4 pb-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="bg-card/90 backdrop-blur-sm ornate-border shadow-2xl">
                <CardHeader className="border-b border-primary/20 pb-8">
                    <CardTitle className="flex items-center text-4xl gap-4 font-serif text-primary">
                        <ShieldCheck className="h-10 w-10" />
                        Franchise Ledger
                    </CardTitle>
                    <CardDescription className="text-lg italic tracking-wider">Official Paradox Standings & Metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pt-8">
                    {user && (
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="relative group">
                            <Button variant="outline" className="border-primary text-primary font-black uppercase tracking-widest relative h-12">
                                <Upload className="mr-2 h-4 w-4"/> Import Official CSV
                                <Input type="file" accept=".csv" onChange={handleSquadImport} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </Button>
                        </div>
                        <Button variant="outline" onClick={generatePDF} className="border-primary text-primary font-black uppercase tracking-widest h-12">
                            <FileText className="mr-2"/> Export Standings PDF
                        </Button>
                      </div>
                    )}

                    {isLoadingSquads ? (
                        <div className="py-20 text-center"><Loader2 className="h-12 w-12 animate-spin mx-auto text-primary"/></div>
                    ) : squadData && squadData.length > 0 ? (
                        <div className="border border-primary/20 rounded-xl overflow-x-auto bg-black/40 shadow-2xl">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30 border-b border-primary/20">
                                        <TableHead className="font-black text-primary uppercase tracking-[0.2em] p-8">Franchise</TableHead>
                                        <TableHead className="text-right font-black text-primary uppercase tracking-[0.2em]">Money Left (Cr)</TableHead>
                                        <TableHead className="text-center font-black text-primary uppercase tracking-[0.2em]">Total Points</TableHead>
                                        <TableHead className="text-center font-black text-primary uppercase tracking-[0.2em]">Budget Status</TableHead>
                                        <TableHead className="text-right font-black text-primary uppercase tracking-[0.2em] w-[80px]">Assets</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {squadData.map((house) => (
                                        <TableRow key={house.id} className="hover:bg-primary/5 border-b border-primary/5">
                                            <TableCell className="font-serif text-3xl text-white py-12 px-8 font-black italic">{house.name}</TableCell>
                                            <TableCell className="text-right font-mono text-primary font-black text-4xl">{house.moneyLeft}Cr</TableCell>
                                            <TableCell className="text-center font-mono font-black text-3xl text-white">{house.totalPoints}</TableCell>
                                            <TableCell className="text-center">
                                                <span className={cn("px-6 py-2 rounded-full text-[10px] font-black tracking-widest uppercase border", house.budgetStatus === 'OK' ? "border-green-500 text-green-500 bg-green-500/10" : "border-red-500 text-red-500 bg-red-500/10")}>
                                                    {house.budgetStatus}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="text-primary hover:bg-primary/20 h-14 w-14"
                                                    onClick={() => setPreviewSquad(house)}
                                                >
                                                    <ImageIcon className="h-8 w-8" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                         <div className="text-center py-24 border-2 border-dashed border-primary/20 rounded-xl bg-black/20">
                            <Info className="mx-auto h-24 w-24 opacity-10 mb-8 text-primary" />
                            <h3 className="text-4xl font-serif text-primary uppercase tracking-[0.4em] italic">No Standings Data</h3>
                            <p className="mt-4 text-sm text-muted-foreground uppercase tracking-widest">Upload Paradox Official CSV to populate Franchise ledger</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!previewSquad} onOpenChange={() => setPreviewSquad(null)}>
                <DialogContent className="max-w-[900px] h-[95vh] bg-black border-primary/40 flex flex-col p-0 overflow-hidden shadow-2xl">
                    <DialogHeader className="p-10 border-b border-primary/20 flex-shrink-0 bg-black/80 backdrop-blur-md">
                        <DialogTitle className="font-serif text-primary text-4xl uppercase tracking-widest italic">Official Paradox Squad Poster</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto bg-[#1a0202] p-10 flex justify-center custom-scrollbar">
                        {previewSquad && (
                            <div className="scale-[0.5] origin-top shadow-2xl shadow-primary/20">
                                <SquadPoster squad={previewSquad} allPlayers={allPlayers || []} />
                            </div>
                        )}
                    </div>
                    <div className="p-10 border-t border-primary/20 flex justify-end gap-6 flex-shrink-0 bg-black/80 backdrop-blur-md">
                        <Button variant="ghost" onClick={() => setPreviewSquad(null)} className="font-bold uppercase tracking-widest text-white h-14 px-10">Dismiss</Button>
                        <Button 
                            className="bg-primary font-black uppercase tracking-widest px-12 h-14" 
                            disabled={isDownloading}
                            onClick={() => previewSquad && downloadPoster(previewSquad.id)}
                        >
                            {isDownloading ? <Loader2 className="animate-spin mr-2"/> : <Download className="mr-2"/>}
                            Export high-res PNG
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
