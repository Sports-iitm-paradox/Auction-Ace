
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, ChevronRight, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const rules = [
    {
        section: "1. Auction Overview",
        content: [
            "Platform: Google Meet",
            "Each house acts as one franchise.",
            "Auction is conducted in live sessions under moderator supervision.",
        ],
    },
    {
        section: "2. Auction Purse & Squad Limits",
        subsections: [
            {
                title: "2.1 Purse",
                content: [
                    "Each house receives a fixed virtual purse of ₹80 crore.",
                    "Purse cannot be replenished.",
                ],
            },
            {
                title: "2.2 Squad Size",
                content: [
                    "Minimum: 11 players",
                    "Maximum: 15 players",
                    "Failure to meet minimum squad size results in disqualification.",
                ],
            },
        ],
    },
    {
        section: "3. Player Pool & Randomisation System",
        content: [
            "Players are grouped into predefined sets.",
            "Player order will be randomised live using a dedicated auction randomisation website.",
            "No manual interference is permitted.",
            "The draw order is final and non-negotiable.",
        ],
    },
    {
        section: "4. Auction Roles & Authority",
        content: [
            "Each house must nominate:",
            "House Representative (Bidder) – only person allowed to bid",
            "Strategic Members – internal discussion only",
            "House Representative Substitution:",
            "Each house must nominate one backup bidder before the auction begins.",
            "Backup bidder may take over only with OC approval.",
            "Mid-bid substitutions are not permitted.",
            "If no valid bidder is available, the house forfeits bidding until resolved.",
            "Any bid by an unauthorised member is invalid.",
        ],
    },
    {
        section: "5. Bidding Mechanics",
        subsections: [
            {
                title: "5.1 Base Price & Fixed Bid Increment Structure",
                content: [
                    "Each player shall enter the auction at a predefined base price.",
                    "To ensure uniformity, fairness, and controlled bidding progression, all bids must strictly follow the fixed incremental slabs defined below.",
                    "No custom, fractional, or off-slab bids shall be permitted.",
                ],
                table: {
                    headers: ["Current Bid Value", "Mandatory Increment"],
                    rows: [
                        ["Up to ₹1.00 crore", "₹5 lakh"],
                        ["₹1.00 crore – ₹2.00 crore", "₹10 lakh"],
                        ["₹2.00 crore – ₹5.00 crore", "₹20 lakh"],
                        ["Above ₹5.00 crore", "₹50 lakh"],
                    ],
                },
            },
            {
                title: "5.1.1 Increment Transition Rule",
                content: [
                    "Once a bid crosses into a higher slab, the new increment immediately applies.",
                    "The auctioneer will announce the applicable increment whenever a slab transition occurs.",
                ],
            },
            {
                title: "5.1.2 Validity of Bids",
                content: [
                    "Any bid not conforming to the prescribed increment structure will be deemed invalid.",
                    "The auctioneer may:",
                    "Reject the bid outright, or",
                    "Ask the bidder to restate a valid bid immediately.",
                    "Repeated violation of increment rules may attract penalties under Auction Floor Misconduct."
                ],
            },
            {
                title: "5.1.3 Authority Clause",
                content: [
                    "The auctioneer’s declaration of the current bid slab and increment shall be considered final during live bidding.",
                    "No post-bid objections regarding increments will be entertained."
                ]
            },
            {
                title: "5.2 – Live Bidding Participation Protocol (Google Meet)",
                content: [
                    "To ensure orderly conduct, clarity, and fairness during live bidding, the following participation protocol shall be strictly enforced:",
                ]
            },
            {
                title: "5.2.1 Active Bidder Limit",
                content: [
                    "At any given moment, only two (2) houses may actively participate in bidding for a player.",
                    "Active participation is indicated exclusively via the Google Meet “Raise Hand” feature.",
                    "Verbal bidding or visual gestures other than those specified shall not be recognised."
                ]
            },
            {
                title: "5.2.2 Entry into Active Bidding",
                content: [
                    "Houses wishing to enter a bid must raise their hand while the bidding window is open.",
                    "The first two valid hand raises, as acknowledged by the auctioneer, shall become the active bidders.",
                    "Any subsequent hand raises will be placed in a waiting queue and will not be acknowledged until a slot becomes available."
                ]
            },
            {
                title: "5.2.3 Exit from Active Bidding",
                content: [
                    "A house may voluntarily exit an ongoing bid by:",
                    "Clearly displaying a thumbs-down gesture (👎) on Google Meet, and",
                    "Lowering their raised hand on Google Meet.",
                    "Once a house exits:",
                    "It cannot re-enter the same bid cycle until another house has placed a valid bid or the bid value changes, and",
                    "The auctioneer may invite the next waiting house to enter active bidding."
                ]
            },
            {
                title: "5.2.4 Rotation & Re-entry",
                content: [
                    "When one active bidder exits, other houses may enter the bidding by raising their hand.",
                    "The auctioneer will acknowledge new entrants strictly on a first-come, first-recognised basis.",
                    "This rotation continues until:",
                    "Only one active bidder remains, or",
                    "The hammer falls."
                ]
            },
            {
                title: "5.2.5 Final Bid Condition",
                content: [
                    "If only one active house remains and no new valid entry occurs within the auctioneer’s final call:",
                    "The player shall be sold to the remaining active house at the last valid bid."
                ]
            },
            {
                title: "5.2.6 Enforcement & Misconduct",
                content: [
                    "Any attempt to:",
                    "Bypass the hand-raise system",
                    "Verbally interrupt active bidding",
                    "Re-enter immediately after backing out will be treated as Auction Floor Misconduct and penalised accordingly.",
                    "The auctioneer’s recognition of:",
                    "Active bidders",
                    "Entry order",
                    "Exit confirmation shall be final and binding."
                ]
            }
        ]
    },
    {
        section: "6. Auctioneer Protocol",
        content: [
            "Base price announced",
            "Bidding opens",
            "Auctioneer calls:",
            "“Going once”",
            "“Going twice”",
            "“Sold”",
            "Hammer fall confirms sale",
            "No bids are accepted after “Sold”.",
        ],
    },
    {
        section: "7. Playing XI Composition (Mandatory)",
        content: [
            "Each house must submit one Playing XI:",
            "4 Specialist Batters",
            "1 Specialist Wicketkeeper",
            "2 Recognised All-Rounders",
            "3 Specialist Bowlers",
            "1 Floating Player (any role)",
            "At least 3 players in the Playing XI must be from the uncapped category.",
            "A maximum of 4 overseas players may be included in the Playing XI.",
            "Failure to meet the required Playing XI composition shall result in rejection of the submitted XI. The house shall be given the correction window specified by the Organising Committee. If the house fails to submit a valid XI within that window, the OC may impose the predefined late-submission penalty or make an automatic assignment as specified in this rulebook.",
        ],
    },
    {
        section: "8. Player Points & Captaincy System",
        subsections: [
            {
                title: "8.1 Scoring Mechanics",
                content: [
                    "Each player is assigned a performance value between 0–100 points, based on a predefined formula.",
                    "Multipliers:",
                    "Captain: 3×",
                    "Vice-Captain: 2×",
                    "Others: 1×",
                    "Total team score = sum of all player points after multipliers.",
                ],
            },
            {
                title: "8.2 Playing XI & Captaincy Lock",
                content: [
                    "Playing XI, Captain, and Vice-Captain must be submitted within the deadline announced by the OC.",
                    "Once submitted, no changes are permitted.",
                    "Late submission may result in: Point penalties or Auto-assignment by OC.",
                ],
            },
        ],
    },
    {
        section: "9. Penalties & Enforcement Framework",
        subsections: [
            {
                title: "9.1 Violation Categories",
                content: [
                    "Minor Violations (e.g., speaking out of turn, delays). Penalty: Warning or point deduction (-20 points).",
                    "Major Violations (e.g., bidding beyond purse, collusion, consecutive bidding, rule manipulation). Penalty: Bid cancellation, player forfeiture, heavy point deduction (-100 points).",
                    "Severe Violations (e.g., repeated breaches, external interference). Penalty: Immediate disqualification, nullification of results.",
                ]
            },
            {
                title: "9.2 Penalty Matrix",
                table: {
                    headers: ["Category", "Violation Type", "Penalty", "Notes"],
                    rows: [
                        ["Minor", "Speaking Out of Turn", "–20 pts", "Repeated → Major"],
                        ["Minor", "Accidental Disruption", "Warning", "Repeated: –20 pts"],
                        ["Minor", "Late XI Submission", "–50 pts", "Auto-assignment"],
                        ["Major", "Unauthorized Bidding", "–50 pts", "Bid cancelled"],
                        ["Major", "Bidding Beyond Purse", "–100 pts", "Bid cancelled"],
                        ["Major", "Collusion Attempt", "–50 pts", "Immediate Severe"],
                        ["Major", "Floor Misconduct", "–100 pts", "Repeat → Severe"],
                        ["Major", "Consecutive Bidding", "Warning / –50 pts", "Repeat → Severe"],
                        ["Severe", "Repeated Violations", "Disqual.", "Final"],
                        ["Severe", "External Assistance", "Disqual.", "Final"],
                        ["Severe", "Refusal to Comply", "Disqual.", "Final"],
                        ["Severe", "Public Misconduct", "Disqual.", "Result Nullified"],
                        ["Severe", "Unauthorised Access", "Disqual.", "Immediate DQ"],
                        ["Severe", "Meet Link Sharing", "Disqual.", "Immediate DQ"],
                        ["Severe", "Unauthorised Representation", "Disqual.", "Immediate DQ"],
                    ],
                }
            },
            {
                title: "9.3 Enforcement & Escalation",
                content: [
                    "All penalties are applied at the discretion of the Organising Committee.",
                    "Penalties may be imposed immediately or cumulatively, depending on severity.",
                    "Point deductions are applied to the final team score.",
                    "Disqualification results in: Removal from rankings, Nullification of auction outcomes, Forfeiture of prizes and certificates.",
                    "Escalation Principle: Any repeated violation automatically escalates to the next severity level, regardless of intent.",
                ]
            }
        ]
    }
];

export default function RulebookPage() {
    const [activeRuleIndex, setActiveRuleIndex] = useState(0);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const activeRule = rules[activeRuleIndex];

    const contentVariants = {
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 },
    };

    const RuleNav = () => (
        <nav className="flex flex-col gap-1 p-2">
            {rules.map((rule, index) => (
                <button
                    key={index}
                    onClick={() => {
                        setActiveRuleIndex(index);
                        setIsMenuOpen(false);
                    }}
                    className={cn(
                        "flex items-center justify-between text-left p-3 rounded-md text-sm font-medium transition-colors w-full",
                        activeRuleIndex === index 
                            ? "bg-primary text-primary-foreground shadow-lg" 
                            : "hover:bg-primary/10 text-muted-foreground hover:text-primary"
                    )}
                >
                    <span className="truncate">{rule.section}</span>
                    {activeRuleIndex === index && <ChevronRight className="h-4 w-4 shrink-0 ml-2" />}
                </button>
            ))}
        </nav>
    );

    return (
        <motion.div
            className="w-full max-w-6xl mx-auto px-2 sm:px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Card className="bg-card/90 backdrop-blur-sm overflow-hidden h-[85vh] sm:h-[80vh] flex flex-col ornate-border">
                <CardHeader className="border-b border-primary/20 pb-4 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center text-xl sm:text-3xl font-serif text-primary">
                            <BookOpen className="mr-3 h-6 w-6 sm:h-8 sm:w-8" />
                            Official Statutes
                        </CardTitle>
                        <CardDescription className="hidden sm:block">SAAVAN '26 - IIT Madras Paradox</CardDescription>
                    </div>
                    
                    {/* Mobile Navigation Trigger */}
                    <div className="md:hidden">
                        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="icon" className="border-primary text-primary">
                                    <Menu />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-[300px] bg-card p-0 border-r border-primary/30">
                                <div className="p-6 border-b border-primary/20">
                                    <h2 className="text-xl font-serif text-primary">Sections</h2>
                                </div>
                                <ScrollArea className="h-[calc(100vh-80px)]">
                                    <RuleNav />
                                </ScrollArea>
                            </SheetContent>
                        </Sheet>
                    </div>
                </CardHeader>

                <CardContent className="grid md:grid-cols-[280px_1fr] gap-0 sm:gap-8 flex-1 min-h-0 p-0">
                    {/* Desktop Navigation Sidebar */}
                    <aside className="hidden md:block border-r border-primary/10 h-full bg-secondary/5">
                        <ScrollArea className="h-full">
                            <RuleNav />
                        </ScrollArea>
                    </aside>

                    {/* Content Display */}
                    <main className="relative min-h-0 flex-1 p-4 sm:p-8 overflow-hidden">
                        <ScrollArea className="h-full pr-2 sm:pr-4">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeRuleIndex}
                                    variants={contentVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    transition={{ duration: 0.3, urea: 'easeInOut' }}
                                    className="space-y-6"
                                >
                                    <h2 className="text-2xl sm:text-4xl font-serif text-primary border-b border-primary/10 pb-4">{activeRule.section}</h2>
                                    
                                    <div className="space-y-4 text-muted-foreground prose prose-invert prose-p:my-2 prose-li:my-1 max-w-none">
                                        {activeRule.content && activeRule.content.map((text, i) => (
                                            <p key={i} className="ml-4 list-item list-disc list-inside text-sm sm:text-base">{text.includes(':') ? <><span className="font-bold text-foreground/90">{text.split(':')[0]}:</span>{text.substring(text.indexOf(':') + 1)}</> : text}</p>
                                        ))}
                                        
                                        {activeRule.subsections && activeRule.subsections.map((sub, subIndex) => (
                                            <div key={subIndex} className="ml-2 sm:ml-4 space-y-3 pt-3">
                                                <h4 className="font-bold text-lg sm:text-xl text-foreground/90 font-serif">{sub.title}</h4>
                                                <div className="ml-2 sm:ml-4 space-y-2 border-l-2 border-primary/20 pl-4">
                                                    {sub.content && sub.content.map((text, i) => (
                                                        <p key={i} className="list-item list-disc list-inside text-sm sm:text-base">{text.includes(':') ? <><span className="font-semibold text-foreground/90">{text.split(':')[0]}:</span>{text.substring(text.indexOf(':') + 1)}</> : text}</p>
                                                    ))}
                                                </div>
                                                {sub.table && (
                                                    <div className="my-4 border border-primary/20 rounded-lg overflow-x-auto bg-black/20">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow className="bg-primary/10 border-b border-primary/20">
                                                                    {sub.table.headers.map(header => <TableHead key={header} className="text-primary font-bold text-xs uppercase">{header}</TableHead>)}
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {sub.table.rows.map((row, rIndex) => (
                                                                    <TableRow key={rIndex} className="hover:bg-primary/5 transition-colors border-b border-primary/5">
                                                                        {row.map((cell, cIndex) => <TableCell key={cIndex} className="text-xs sm:text-sm font-medium">{cell}</TableCell>)}
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
