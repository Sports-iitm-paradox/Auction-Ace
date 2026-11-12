'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, Mail, ArrowLeft, Info, Zap, Database, Gavel, RefreshCw, Eye, Terminal } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function SystemNoticePage() {
  return (
    <motion.div
      className="w-full max-w-5xl mx-auto px-4 pb-20"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-8">
        <Button variant="ghost" asChild className="vector-button h-10 px-6 bg-white text-foreground">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Return to Dashboard
          </Link>
        </Button>
      </div>

      <Card className="rounded-none border-2 border-foreground bg-white shadow-[16px_16px_0px_rgba(0,0,0,1)] overflow-hidden">
        <CardHeader className="text-center border-b-2 border-foreground pb-16 relative bg-accent/5">
          <div className="flex justify-center mb-8">
            <div className="p-6 border-2 border-foreground bg-white shadow-[8px_8px_0px_rgba(59,130,246,1)]">
              <Terminal className="h-16 w-16 text-primary" />
            </div>
          </div>
          <CardTitle className="text-5xl font-headline font-black text-foreground mb-4 tracking-tighter uppercase italic leading-none">
            Official System & IP Notice
          </CardTitle>
          <CardDescription className="text-sm font-black text-foreground/40 tracking-[0.6em] uppercase">
            Margazhi'27 // Auction Infrastructure
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-16 space-y-20">
          {/* Institutional Ownership */}
          <section className="text-center space-y-8">
            <div className="flex items-center justify-center gap-4 mb-2">
              <div className="h-0.5 w-12 bg-primary" />
              <h2 className="text-xs font-black text-primary uppercase tracking-[0.5em]">Proprietary Rights</h2>
              <div className="h-0.5 w-12 bg-primary" />
            </div>
            
            <div className="py-12 px-8 bg-foreground text-white shadow-[10px_10px_0px_rgba(59,130,246,1)] max-w-3xl mx-auto">
              <h3 className="text-4xl sm:text-6xl font-headline font-black italic tracking-tighter uppercase leading-none mb-4">
                Sports Department
              </h3>
              <p className="text-primary font-black text-lg tracking-[0.4em] uppercase">
                IIT Madras Paradox
              </p>
            </div>
            
            <p className="max-w-3xl mx-auto text-foreground/60 leading-relaxed text-sm sm:text-base font-medium italic">
              The IPL Auction Hub infrastructure, including real-time synchronization, slab-based bidding increments, and the visual presentation engine, is the exclusive Intellectual Property of the Sports Department, IIT Madras Paradox. All rights reserved &copy; 2027.
            </p>
          </section>

          {/* Operational Architecture */}
          <section className="space-y-12 border-t-2 border-foreground/5 pt-16">
            <div className="text-center">
              <h2 className="text-3xl font-headline font-black text-foreground uppercase tracking-tighter italic mb-4">Operational Architecture</h2>
              <p className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.4em]">Official Technical Specifications</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {[
                {
                  icon: RefreshCw,
                  title: "Deterministic Randomization",
                  desc: "Utilizes a Fisher-Yates shuffle stored in the backend to ensure entry order integrity is absolute and unchangeable once a session begins."
                },
                {
                  icon: Gavel,
                  title: "Slab-Based Precision",
                  desc: "Enforces mandatory increments (5L/10L/20L/50L) directly via system logic to eliminate floor negotiation delays and human error."
                },
                {
                  icon: Eye,
                  title: "Sub-Second Synchronization",
                  desc: "Powered by Firestore real-time listeners, ensuring the gavel fall and valuation updates are broadcasted to all terminals simultaneously."
                },
                {
                  icon: Zap,
                  title: "Automated Ledger Sync",
                  desc: "Instantly reconciles franchise purse reductions and roster points across the entire database without manual data entry."
                }
              ].map((item, i) => (
                <div key={i} className="p-8 bg-white border-2 border-foreground shadow-[8px_8px_0px_rgba(0,0,0,1)] group hover:-translate-x-1 hover:-translate-y-1 transition-transform">
                  <div className="flex items-center gap-4 text-primary mb-6">
                    <item.icon className="h-6 w-6" />
                    <h3 className="font-headline font-black uppercase italic tracking-widest text-lg">{item.title}</h3>
                  </div>
                  <p className="text-xs text-foreground/60 leading-relaxed font-medium uppercase tracking-wider">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Contact & Governance */}
          <section className="pt-12 border-t-2 border-foreground/5">
            <div className="grid md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Mail className="text-primary h-5 w-5" />
                  <h2 className="text-xs font-black text-foreground uppercase tracking-widest">Inquiry Protocol</h2>
                </div>
                <div className="p-8 bg-accent/10 border-2 border-foreground">
                  <p className="text-sm font-medium text-foreground/70 mb-6 uppercase tracking-wider leading-relaxed">
                    For technical verification regarding the Margazhi'27 infrastructure:
                  </p>
                  <a 
                    href="mailto:sports@iitmparadox.org" 
                    className="text-primary font-black text-lg hover:underline tracking-widest flex items-center gap-3 italic"
                  >
                    SPORTS@IITMPARADOX.ORG
                  </a>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <ShieldCheck className="text-primary h-5 w-5" />
                  <h2 className="text-xs font-black text-foreground uppercase tracking-widest">Governance</h2>
                </div>
                <div className="p-8 bg-accent/10 border-2 border-foreground">
                  <p className="text-[10px] text-foreground/40 font-black uppercase tracking-[0.3em] leading-loose italic">
                    Unauthorized redistribution or commercial exploitation of this platform is strictly prohibited. Technical breaches are subject to review by the official Core Team.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Development Credit */}
          <section className="text-center pt-16 opacity-30">
            <p className="text-[10px] font-black text-foreground uppercase tracking-[1em]">
              Dev // KRISH GUPTA
            </p>
          </section>
        </CardContent>
      </Card>
    </motion.div>
  );
}
