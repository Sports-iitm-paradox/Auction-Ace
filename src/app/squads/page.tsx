
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, FileText, ImageIcon, Download, Search, Users, ChevronDown, ChevronUp, TrendingUp, Wallet, ShieldCheck, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Squad, Player } from '@/lib/player-data';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { toPng } from 'html-to-image';
import { SquadPoster } from '@/components/SquadPoster';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function SquadsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [previewSquad, setPreviewSquad] = useState<Squad | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedSquads, setExpandedSquads] = useState<string[]>([]);

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

    const filteredSquads = useMemo(() => {
        return squadData?.filter(s => 
            s.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [squadData, searchQuery]);

    const toggleExpand = (id: string) => {
        setExpandedSquads(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const downloadPoster = async (squadId: string) => {
        const node = document.getElementById(`poster-${squadId}`);
        if (!node) return;
        
        setIsDownloading(true);
        try {
            const dataUrl = await toPng(node, { quality: 1, pixelRatio: 3 });
            const link = document.createElement('a');
            link.download = `Margazhi27_Squad_${squadId}.png`;
            link.href = dataUrl;
            link.click();
            toast({ title: "Poster Exported", description: "Official squad graphic saved successfully." });
        } catch (err) {
            toast({ title: "Export Failed", variant: "destructive" });
        } finally {
            setIsDownloading(false);
        }
    };

    const generatePDF = () => {
        if (!squadData) return;
        
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        // Margazhi'27 Master Header
        const addHeader = (pageTitle: string) => {
            doc.setFillColor(15, 23, 42); 
            doc.rect(0, 0, 210, 45, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(26);
            doc.text("MARGAZHI'27", 20, 25);
            doc.setFontSize(10);
            doc.setTextColor(59, 130, 246);
            doc.text(pageTitle.toUpperCase(), 20, 35);
        };

        addHeader("Official Franchise Ledger // Summary Standings");

        // Summary Statistics Table
        const summaryRows = squadData.map(s => [
            s.name.toUpperCase(), 
            `${s.moneyLeft.toFixed(2)} CR`, 
            `${s.moneySpent.toFixed(2)} CR`,
            s.totalPoints, 
            s.budgetStatus === 'OK' ? 'ELIGIBLE' : 'OVER BUDGET'
        ]);

        (doc as any).autoTable({
            startY: 55,
            head: [['FRANCHISE', 'PURSE LEFT', 'MONEY SPENT', 'TOTAL POINTS', 'STATUS']],
            body: summaryRows,
            headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
            bodyStyles: { halign: 'center', fontSize: 9 },
            columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
            theme: 'grid',
            margin: { left: 20, right: 20 }
        });

        // Detailed Roster per Squad
        squadData.forEach((s) => {
            doc.addPage();
            addHeader(`Franchise Roster // ${s.name}`);
            
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.text(`FRANCHISE: ${s.name.toUpperCase()}`, 20, 55);
            doc.text(`TOTAL POINTS: ${s.totalPoints}`, 20, 60);
            doc.text(`REMAINING PURSE: ${s.moneyLeft.toFixed(2)} CR`, 20, 65);

            const players = s.playersList?.split(';').filter(Boolean).map(p => {
                const parts = p.split(':');
                return [parts[0], `${parts[1]} CR`, parts[2], parts[3]];
            }) || [];

            (doc as any).autoTable({
                startY: 75,
                head: [['PLAYER NAME', 'PRICE', 'ROLE', 'CATEGORY']],
                body: players.length > 0 ? players : [['NO ASSETS ACQUIRED', '-', '-', '-']],
                headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
                bodyStyles: { halign: 'center', fontSize: 9 },
                columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
                theme: 'striped',
                margin: { left: 20, right: 20 }
            });
        });

        // Add page numbers
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Margazhi'27 Official Documentation // Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
        }

        doc.save(`Margazhi27_Squad_Ledger.pdf`);
        toast({ title: "PDF Exported", description: "Comprehensive Franchise Ledger saved successfully." });
    };

    return (
        <motion.div className="w-full max-w-7xl mx-auto px-4 pb-24" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
                <div>
                    <h1 className="text-6xl sm:text-7xl font-headline font-black italic text-foreground tracking-tighter uppercase leading-none mb-4">
                        Franchise Ledger
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className="w-3 h-3 bg-primary animate-pulse" />
                        <span className="text-[11px] font-black uppercase tracking-[0.6em] text-foreground/40 italic">Live Margazhi'27 Sync</span>
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-initial">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/20" />
                        <Input 
                            placeholder="Find Franchise..." 
                            className="w-full md:w-64 pl-12 border-2 border-foreground rounded-none bg-white font-black uppercase text-[10px] tracking-widest h-14 shadow-[4px_4px_0px_rgba(0,0,0,1)]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {user && (
                        <Button onClick={generatePDF} className="vector-button h-14 bg-foreground text-white px-10">
                            <FileText className="mr-3 h-4 w-4" /> Export Ledger PDF
                        </Button>
                    )}
                </div>
            </div>

            {/* Live Trackers HUD */}
            {squadData && squadData.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    {[
                        { label: 'Highest Purse', value: `${Math.max(...squadData.map(s => s.moneyLeft))} Cr`, icon: Wallet, color: 'primary' },
                        { label: 'Top Points', value: `${Math.max(...squadData.map(s => s.totalPoints))} Pts`, icon: Trophy, color: 'foreground' },
                        { label: 'Total Assets', value: squadData.reduce((acc, s) => acc + (s.playersList?.split(';').length || 0), 0), icon: TrendingUp, color: 'foreground' },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white border-2 border-foreground p-8 shadow-[8px_8px_0px_rgba(0,0,0,1)] flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground/40 block mb-2">{stat.label}</span>
                                <span className="text-4xl font-headline font-black italic uppercase tracking-tighter text-foreground leading-none">{stat.value}</span>
                            </div>
                            <stat.icon className={cn("h-10 w-10", stat.color === 'primary' ? 'text-primary' : 'text-foreground/10')} />
                        </div>
                    ))}
                </div>
            )}

            <Card className="rounded-none border-2 border-foreground bg-white shadow-[12px_12px_0px_rgba(0,0,0,1)] overflow-hidden">
                <CardContent className="p-0">
                    {isLoadingSquads ? (
                        <div className="py-40 flex flex-col items-center justify-center">
                            <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
                            <span className="text-[11px] font-black uppercase tracking-[1em] text-foreground/30 animate-pulse">Syncing Standings</span>
                        </div>
                    ) : filteredSquads && filteredSquads.length > 0 ? (
                        <div className="divide-y-2 divide-foreground">
                            {filteredSquads.map((house) => {
                                const isExpanded = expandedSquads.includes(house.id);
                                const players = house.playersList?.split(';').filter(Boolean).map(p => {
                                    const parts = p.split(':');
                                    return { name: parts[0], price: parts[1], role: parts[2], cat: parts[3] };
                                }) || [];
                                
                                return (
                                    <div key={house.id} className="bg-white hover:bg-accent/5 transition-colors group">
                                        <div className="flex flex-col lg:flex-row items-center py-10 px-10 gap-10">
                                            <div className="flex-1 flex items-center gap-10">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-14 w-14 border-2 border-foreground hover:bg-foreground hover:text-white shrink-0 shadow-[4px_4px_0px_rgba(0,0,0,1)] p-0 flex items-center justify-center"
                                                    onClick={() => toggleExpand(house.id)}
                                                >
                                                    {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                                </Button>
                                                <div className="flex flex-col">
                                                    <span className="font-headline text-4xl font-black italic uppercase tracking-tighter text-foreground leading-none group-hover:text-primary transition-colors">{house.name}</span>
                                                    <div className="flex items-center gap-3 mt-3">
                                                        <Users size={12} className="text-foreground/40" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-foreground/40">{players.length} Active Roster Items</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap lg:flex-nowrap items-center gap-x-12 gap-y-6 lg:gap-x-16 shrink-0 h-full">
                                                <div className="border-l-2 border-foreground/10 pl-8 min-w-[140px] flex flex-col justify-center">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 block mb-2">Purse Left</span>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="font-mono text-5xl font-black text-primary italic leading-none">{house.moneyLeft}</span>
                                                        <span className="text-[12px] font-black text-foreground/20 italic uppercase">Cr</span>
                                                    </div>
                                                </div>
                                                <div className="border-l-2 border-foreground/10 pl-8 min-w-[100px] flex flex-col justify-center">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 block mb-2">Points</span>
                                                    <span className="font-mono text-5xl font-black text-foreground italic leading-none">{house.totalPoints}</span>
                                                </div>
                                                <div className="border-l-2 border-foreground/10 pl-8 flex items-center h-full min-w-[140px]">
                                                    <Badge className={cn(
                                                        "rounded-none h-12 px-8 font-black tracking-[0.2em] uppercase border-2 text-[10px] transition-all",
                                                        house.budgetStatus === 'OK' ? "bg-accent/20 border-primary/20 text-primary" : "bg-destructive/10 border-destructive/20 text-destructive"
                                                    )}>
                                                        {house.budgetStatus === 'OK' ? 'ELIGIBLE' : 'OVER BUDGET'}
                                                    </Badge>
                                                </div>
                                                <div className="border-l-2 border-foreground/10 pl-8 flex items-center h-full">
                                                     <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-16 w-16 border-2 border-foreground hover:bg-foreground hover:text-white transition-all shadow-[6px_6px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 p-0 flex items-center justify-center"
                                                        onClick={() => setPreviewSquad(house)}
                                                    >
                                                        <ImageIcon size={24} />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div 
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden bg-accent/5 border-t-2 border-foreground/5"
                                                >
                                                    <div className="p-10">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
                                                            {players.map((p, idx) => (
                                                                <div key={idx} className="bg-white border-2 border-foreground p-6 flex flex-col justify-between shadow-[8px_8px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 transition-transform">
                                                                    <div>
                                                                        <h4 className="font-headline font-black uppercase italic tracking-tighter text-xl leading-tight mb-4 truncate">{p.name}</h4>
                                                                        <div className="flex flex-wrap gap-2">
                                                                            <span className="text-[9px] font-black px-2 py-1 bg-foreground text-white uppercase tracking-[0.2em]">{p.role}</span>
                                                                            <span className="text-[9px] font-black px-2 py-1 border-2 border-foreground/10 uppercase tracking-[0.2em]">{p.cat}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="mt-8 pt-5 border-t-2 border-foreground/5 flex items-baseline gap-2">
                                                                        <span className="font-mono text-3xl font-black text-primary italic leading-none">{p.price}</span>
                                                                        <span className="text-[11px] font-black text-foreground/20 italic uppercase">Cr</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {players.length === 0 && (
                                                                <div className="col-span-full py-24 text-center border-4 border-dashed border-foreground/5">
                                                                    <span className="text-[12px] font-black uppercase tracking-[1em] text-foreground/10 italic">Awaiting Roster Assignment</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                         <div className="text-center py-56 flex flex-col items-center border-4 border-dashed border-foreground/5 m-12 bg-accent/5">
                            <ShieldCheck className="h-24 w-24 opacity-5 mb-8 text-foreground" />
                            <h3 className="text-5xl font-headline font-black text-foreground/10 uppercase tracking-[0.4em] italic">Official Ledger Standby</h3>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Poster Preview Dialog */}
            <Dialog open={!!previewSquad} onOpenChange={() => setPreviewSquad(null)}>
                <DialogContent className="max-w-[1000px] h-[95vh] bg-white border-2 border-foreground rounded-none flex flex-col p-0 overflow-hidden shadow-2xl">
                    <DialogHeader className="p-10 border-b-2 border-foreground flex-shrink-0 bg-white">
                        <DialogTitle className="font-headline text-foreground text-4xl uppercase tracking-tighter italic font-black">Official Media Release</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto bg-accent/10 p-16 flex justify-center custom-scrollbar">
                        {previewSquad && (
                            <div className="scale-[0.5] origin-top shadow-2xl border-4 border-foreground bg-white">
                                <SquadPoster squad={previewSquad} allPlayers={allPlayers || []} />
                            </div>
                        )}
                    </div>
                    <div className="p-10 border-t-2 border-foreground flex justify-end gap-6 flex-shrink-0 bg-white">
                        <Button variant="ghost" onClick={() => setPreviewSquad(null)} className="h-16 px-12 vector-button bg-white text-foreground">Close</Button>
                        <Button 
                            className="bg-primary text-white h-16 px-16 vector-button shadow-[6px_6px_0px_rgba(0,0,0,1)]" 
                            disabled={isDownloading}
                            onClick={() => previewSquad && downloadPoster(previewSquad.id)}
                        >
                            {isDownloading ? <Loader2 className="animate-spin mr-3"/> : <Download className="mr-3"/>}
                            Download High-Res Graphic
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
