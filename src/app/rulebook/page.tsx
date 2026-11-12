'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, ChevronRight, Menu, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const rules = [
    {
        section: "01 // OPERATIONAL OVERVIEW",
        content: [
            "Official Platform: Google Meet Infrastructure",
            "Entity Representation: Each House acts as one unified Franchise.",
            "Auction Environment: Live sessions conducted under strict moderator supervision.",
        ],
    },
    {
        section: "02 // PURSE & SQUAD METRICS",
        subsections: [
            {
                title: "2.1 Virtual Capital",
                content: [
                    "Initial Allocation: Fixed virtual purse of ₹80.00 crore per franchise.",
                    "Replenishment Policy: Purse is static and cannot be replenished post-draw.",
                ],
            },
            {
                title: "2.2 Roster Constraints",
                content: [
                    "Minimum Asset Threshold: 11 players required for a valid squad.",
                    "Maximum Asset Threshold: 15 players maximum capacity.",
                    "Non-Compliance Penalty: Disqualification from the final leaderboard.",
                ],
            },
        ],
    },
    {
        section: "03 // RANDOMISATION SYSTEM",
        content: [
            "Clustering: Players are grouped into predefined tactical sets.",
            "Entry Algorithm: Draw order is determined live via the Official Randomiser.",
            "Integrity Clause: No manual interference permitted; draw sequence is final.",
        ],
    },
    {
        section: "04 // COMMAND & AUTHORITY",
        content: [
            "Designated Roles: House Representative (Active Bidder) and Strategic Council.",
            "Substitution Protocol: One backup bidder must be registered pre-event.",
            "Mid-Bid Lock: No representative changes allowed during an active auction lot.",
            "Invalid Bids: Any bid placed by unauthorized personnel is void.",
        ],
    },
    {
        section: "05 // BIDDING MECHANICS",
        subsections: [
            {
                title: "5.1 Fixed Increment Structure",
                content: [
                    "Mandatory Progression: All bids must adhere to the official slab structure.",
                    "Non-Standard Bids: Fractional or custom increments are prohibited.",
                ],
                table: {
                    headers: ["Current Valuation", "Mandatory Step"],
                    rows: [
                        ["Up to ₹1.00 Cr", "₹5 Lakh"],
                        ["₹1.00 Cr – ₹2.00 Cr", "₹10 Lakh"],
                        ["₹2.00 Cr – ₹5.00 Cr", "₹20 Lakh"],
                        ["Above ₹5.00 Cr", "₹50 Lakh"],
                    ],
                },
            },
            {
                title: "5.2 Google Meet Protocol",
                content: [
                    "Primary Input: Exclusive use of 'Raise Hand' feature for bid intent.",
                    "Active Floor Limit: Maximum of two (2) franchises in active rotation.",
                    "Exit Confirmation: Must lower hand and signal 'Thumbs Down' to exit.",
                ]
            }
        ]
    },
    {
        section: "06 // HAMMER PROTOCOL",
        content: [
            "Initiation: Base price announced; bidding window opens.",
            "Final Sequence: 'Going Once', 'Going Twice', 'Final Call'.",
            "Sale Execution: Hammer fall ('Sold') signals a binding transaction.",
            "Post-Hammer Logic: No bids accepted after the 'Sold' signal.",
        ],
    },
    {
        section: "07 // SQUAD COMPOSITION",
        content: [
            "Specialist Batters: 04",
            "Wicketkeeper: 01",
            "All-Rounders: 02",
            "Specialist Bowlers: 03",
            "Floating Asset: 01",
            "Uncapped Requirement: Minimum 03 players.",
            "Overseas Limit: Maximum 04 players in Playing XI.",
        ],
    },
    {
        section: "08 // PENALTY FRAMEWORK",
        subsections: [
            {
                title: "8.1 Violation Matrix",
                table: {
                    headers: ["Classification", "Violation Type", "Deduction"],
                    rows: [
                        ["Minor", "Speaking Out of Turn", "–20 pts"],
                        ["Minor", "Late XI Submission", "–50 pts"],
                        ["Major", "Bidding Beyond Purse", "–100 pts"],
                        ["Major", "Floor Misconduct", "–100 pts"],
                        ["Severe", "Meet Link Sharing", "Disqual."],
                        ["Severe", "External Assistance", "Disqual."],
                    ],
                }
            }
        ]
    }
];

export default function RulebookPage() {
    const [activeRuleIndex, setActiveRuleIndex] = useState(0);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const activeRule = rules[activeRuleIndex];

    const contentVariants = {
        hidden: { opacity: 0, x: 5 },
        visible: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -5 },
    };

    const RuleNav = () => (
        <nav className="flex flex-col gap-1 p-4">
            {rules.map((rule, index) => (
                <button
                    key={index}
                    onClick={() => {
                        setActiveRuleIndex(index);
                        setIsMenuOpen(false);
                    }}
                    className={cn(
                        "flex items-center justify-between text-left px-6 py-4 transition-all w-full border-b border-foreground/5",
                        activeRuleIndex === index 
                            ? "bg-foreground text-white border-l-4 border-l-primary" 
                            : "hover:bg-accent/50 text-foreground/60 hover:text-foreground"
                    )}
                >
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] truncate">{rule.section}</span>
                    {activeRuleIndex === index && <ChevronRight className="h-4 w-4 shrink-0 ml-2" />}
                </button>
            ))}
        </nav>
    );

    return (
        <motion.div
            className="w-full max-w-7xl mx-auto px-4 py-8 sm:py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
        >
            <Card className="rounded-none border-2 border-foreground bg-white shadow-[12px_12px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col md:h-[800px]">
                <CardHeader className="border-b-2 border-foreground p-8 flex flex-row items-center justify-between bg-white z-10">
                    <div>
                        <CardTitle className="flex items-center text-4xl font-headline font-black italic text-foreground tracking-tighter uppercase leading-none">
                            Official Rulebook
                        </CardTitle>
                        <CardDescription className="text-[10px] font-black uppercase tracking-[0.5em] text-foreground/30 mt-2">IPL Auction Hub // Protocol Documentation</CardDescription>
                    </div>
                    
                    <div className="md:hidden">
                        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="icon" className="vector-button h-12 w-12 bg-white text-foreground">
                                    <Menu />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-[300px] bg-white p-0 border-l-2 border-foreground rounded-none">
                                <div className="p-8 border-b-2 border-foreground">
                                    <h2 className="text-xl font-headline font-black uppercase italic tracking-widest text-foreground">Navigation</h2>
                                </div>
                                <ScrollArea className="h-[calc(100vh-80px)]">
                                    <RuleNav />
                                </ScrollArea>
                            </SheetContent>
                        </Sheet>
                    </div>
                </CardHeader>

                <CardContent className="grid md:grid-cols-[320px_1fr] gap-0 flex-1 min-h-0 p-0">
                    <aside className="hidden md:block border-r-2 border-foreground h-full bg-accent/10">
                        <ScrollArea className="h-full">
                            <RuleNav />
                        </ScrollArea>
                    </aside>

                    <main className="relative min-h-0 flex-1 p-8 sm:p-12 overflow-hidden bg-white">
                        <ScrollArea className="h-full pr-4">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeRuleIndex}
                                    variants={contentVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    transition={{ duration: 0.2 }}
                                    className="space-y-10"
                                >
                                    <h2 className="text-5xl font-headline font-black italic text-foreground uppercase tracking-tighter border-b-4 border-primary pb-6">
                                        {activeRule.section.split(' // ')[1]}
                                    </h2>
                                    
                                    <div className="space-y-6">
                                        {activeRule.content && activeRule.content.map((text, i) => (
                                            <div key={i} className="flex gap-4 items-start group">
                                                <Square className="h-3 w-3 mt-1.5 fill-primary text-primary shrink-0" />
                                                <p className="text-xl font-medium text-foreground/80 leading-relaxed">
                                                    {text.includes(':') ? (
                                                        <>
                                                            <span className="font-black text-foreground uppercase tracking-wider">{text.split(':')[0]}:</span>
                                                            {text.substring(text.indexOf(':') + 1)}
                                                        </>
                                                    ) : text}
                                                </p>
                                            </div>
                                        ))}
                                        
                                        {activeRule.subsections && activeRule.subsections.map((sub, subIndex) => (
                                            <div key={subIndex} className="space-y-6 pt-4">
                                                <h4 className="text-2xl font-headline font-black text-foreground uppercase tracking-widest bg-accent/20 px-4 py-2 italic w-fit">
                                                    {sub.title}
                                                </h4>
                                                <div className="space-y-4 pl-6 border-l-2 border-primary/20 ml-2">
                                                    {sub.content && sub.content.map((text, i) => (
                                                        <div key={i} className="flex gap-3 items-start">
                                                            <div className="h-1.5 w-1.5 rounded-none bg-primary mt-2.5 shrink-0" />
                                                            <p className="text-lg font-medium text-foreground/70">
                                                                {text.includes(':') ? (
                                                                    <>
                                                                        <span className="font-bold text-foreground uppercase text-sm tracking-wide">{text.split(':')[0]}:</span>
                                                                        {text.substring(text.indexOf(':') + 1)}
                                                                    </>
                                                                ) : text}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                                {sub.table && (
                                                    <div className="my-8 border-2 border-foreground rounded-none overflow-hidden bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)]">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow className="bg-foreground hover:bg-foreground">
                                                                    {sub.table.headers.map(header => (
                                                                        <TableHead key={header} className="text-white font-black text-[11px] uppercase tracking-[0.2em] h-12">
                                                                            {header}
                                                                        </TableHead>
                                                                    ))}
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {sub.table.rows.map((row, rIndex) => (
                                                                    <TableRow key={rIndex} className="hover:bg-accent/30 transition-colors border-b-2 border-foreground/5">
                                                                        {row.map((cell, cIndex) => (
                                                                            <TableCell key={cIndex} className="text-lg font-mono font-black text-foreground py-4">
                                                                                {cell}
                                                                            </TableCell>
                                                                        ))}
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </ScrollArea>
                    </main>
                </CardContent>
            </Card>
        </motion.div>
    );
}
