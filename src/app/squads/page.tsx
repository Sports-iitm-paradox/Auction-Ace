'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LayoutGrid, Loader2, FileText, ImageIcon, Download, Info, Upload, Search } from 'lucide-react';
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
import { cn } from '@/lib/utils';

export default function SquadsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewSquad, setPreviewSquad] = useState<Squad | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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

    const filteredSquads = squadData?.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                    toast({ title: "Standings Updated", description: "Franchise ledger successfully synced." });
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
            const dataUrl = await toPng(node, { quality: 1, pixelRatio: 3 });
            const link = document.createElement('a');
            link.download = `Squad_Announcement_${squadId}.png`;
            link.href = dataUrl;
            link.click();
            toast({ title: "Graphic Exported", description: "Official poster saved at high resolution." });
        } catch (err) {
            toast({ title: "Export Failed", variant: "destructive" });
        } finally {
            setIsDownloading(false);
        }
    };

    const generatePDF = () => {
        if (!squadData) return;
        const doc = new jsPDF();
        doc.setFontSize(24);
        doc.text("IPL Auction Official Standings", 20, 30);
        doc.setFontSize(10);
        doc.text(`Margazhi '27 Paradox // ${new Date().toLocaleString()}`, 20, 38);
        
        const rows = squadData.map(s => [s.name, `${s.moneyLeft} Cr`, s.totalPoints, s.budgetStatus]);
        (doc as any).autoTable({
            startY: 50,
            head: [['Franchise', 'Remaining Purse', 'Total Points', 'Status']],
            body: rows,
            headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
            theme: 'grid'
        });
        doc.save(`Margazhi27_Auction_Standings.pdf`);
    };

    return (
        <motion.div className="w-full max-w-7xl mx-auto px-4 pb-20" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8">
                <div>
                    <h1 className="text-6xl font-headline font-black italic text-foreground tracking-tighter uppercase leading-none mb-4">
                        Franchise Ledger
                    </h1>
                    <p className="text-[11px] font-black uppercase tracking-[0.5em] text-foreground/40">Official Margazhi '27 Standings Feed</p>
                </div>
                
                <div className="flex flex-wrap gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
                        <Input 
                            placeholder="Find Franchise..." 
                            className="w-64 pl-10 border-2 border-foreground rounded-none bg-white font-black uppercase text-[10px] tracking-widest h-12"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {user && (
                        <>
                             <div className="relative group">
                                <Button className="vector-button h-12 bg-white text-foreground hover:bg-accent px-8">
                                    <Upload className="mr-3 h-4 w-4" /> Ledger Sync
                                    <Input type="file" accept=".csv" onChange={handleSquadImport} className="absolute inset-0 opacity-0 cursor-pointer" />
                                </Button>
                            </div>
                            <Button onClick={generatePDF} className="vector-button h-12 bg-foreground text-white px-8">
                                <FileText className="mr-3 h-4 w-4" /> Export PDF
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <Card className="bg-white border-2 border-foreground shadow-[12px_12px_0px_rgba(0,0,0,1)] overflow-hidden">
                <CardContent className="p-0">
                    {isLoadingSquads ? (
                        <div className="py-32 flex flex-col items-center justify-center">
                            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Fetching Data...</span>
                        </div>
                    ) : filteredSquads && filteredSquads.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-accent/20 hover:bg-accent/20 border-b-2 border-foreground">
                                        <TableHead className="h-16 font-black text-foreground uppercase tracking-[0.2em] px-8 text-[11px]">Franchise</TableHead>
                                        <TableHead className="text-right font-black text-foreground uppercase tracking-[0.2em] text-[11px]">Money Left (Cr)</TableHead>
                                        <TableHead className="text-center font-black text-foreground uppercase tracking-[0.2em] text-[11px]">Points</TableHead>
                                        <TableHead className="text-center font-black text-foreground uppercase tracking-[0.2em] text-[11px]">Budget</TableHead>
                                        <TableHead className="text-right font-black text-foreground uppercase tracking-[0.2em] text-[11px] w-[100px] pr-8">Assets</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSquads.map((house) => (
                                        <TableRow key={house.id} className="hover:bg-accent/10 border-b-2 border-foreground/5 transition-colors">
                                            <TableCell className="py-10 px-8">
                                                <span className="font-headline text-3xl font-black italic uppercase tracking-tighter text-foreground">{house.name}</span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-baseline justify-end gap-2">
                                                    <span className="font-mono text-4xl font-black text-primary">{house.moneyLeft}</span>
                                                    <span className="text-xs font-black text-foreground/30 uppercase italic">CR</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="font-mono text-3xl font-black text-foreground">{house.totalPoints}</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className={cn(
                                                    "px-6 py-2 border-2 text-[10px] font-black tracking-widest uppercase",
                                                    house.budgetStatus === 'OK' ? "border-green-500 text-green-500 bg-green-50" : "border-red-500 text-red-500 bg-red-50"
                                                )}>
                                                    {house.budgetStatus}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right pr-8">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-12 w-12 border-2 border-foreground hover:bg-foreground hover:text-white transition-all"
                                                    onClick={() => setPreviewSquad(house)}
                                                >
                                                    <ImageIcon size={20} />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                         <div className="text-center py-32 flex flex-col items-center">
                            <Info className="h-16 w-16 opacity-10 mb-6 text-foreground" />
                            <h3 className="text-2xl font-headline font-black text-foreground/20 uppercase tracking-[0.4em] italic">No Entries</h3>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!previewSquad} onOpenChange={() => setPreviewSquad(null)}>
                <DialogContent className="max-w-[1000px] h-[95vh] bg-white border-2 border-foreground rounded-none flex flex-col p-0 overflow-hidden shadow-2xl">
                    <DialogHeader className="p-8 border-b-2 border-foreground flex-shrink-0 bg-white">
                        <DialogTitle className="font-headline text-foreground text-3xl uppercase tracking-tighter italic font-black">Margazhi '27 Official Poster</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto bg-accent/20 p-12 flex justify-center custom-scrollbar">
                        {previewSquad && (
                            <div className="scale-[0.5] origin-top shadow-2xl border-4 border-foreground">
                                <SquadPoster squad={previewSquad} allPlayers={allPlayers || []} />
                            </div>
                        )}
                    </div>
                    <div className="p-8 border-t-2 border-foreground flex justify-end gap-4 flex-shrink-0 bg-white">
                        <Button variant="ghost" onClick={() => setPreviewSquad(null)} className="h-14 px-10 vector-button bg-white text-foreground">Dismiss</Button>
                        <Button 
                            className="bg-primary text-white h-14 px-12 vector-button" 
                            disabled={isDownloading}
                            onClick={() => previewSquad && downloadPoster(previewSquad.id)}
                        >
                            {isDownloading ? <Loader2 className="animate-spin mr-3"/> : <Download className="mr-3"/>}
                            Download Poster
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
