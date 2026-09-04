
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, Mail, ArrowLeft, Terminal, Info, Zap, Database, Gavel } from 'lucide-react';
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
      <div className="mb-6">
        <Button variant="ghost" asChild className="text-primary hover:text-primary/80">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Return to Dashboard
          </Link>
        </Button>
      </div>

      <Card className="ornate-border bg-card/90 backdrop-blur-xl shadow-2xl overflow-hidden">
        <CardHeader className="text-center border-b border-primary/20 pb-12 relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="flex justify-center mb-6">
            <ShieldCheck className="h-20 w-20 text-primary drop-shadow-[0_0_15px_rgba(255,215,0,0.4)]" />
          </div>
          <CardTitle className="text-4xl font-serif text-primary mb-2 tracking-widest uppercase italic">
            Official System & IP Notice
          </CardTitle>
          <CardDescription className="text-lg font-headline text-muted-foreground tracking-[0.2em] uppercase">
            IPL Auction Hub - IIT Madras Paradox
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-12 space-y-16">
          {/* Institutional Ownership */}
          <section className="text-center space-y-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Info className="text-primary h-5 w-5" />
              <h2 className="text-sm font-black text-primary uppercase tracking-[0.4em]">Legal Ownership & Proprietary Rights</h2>
            </div>
            
            <div className="py-8 px-6 bg-secondary/20 border-y border-primary/30">
              <h3 className="text-3xl sm:text-5xl font-serif font-black text-foreground tracking-tighter italic">
                Sports Department
              </h3>
              <p className="mt-2 text-primary font-headline text-lg tracking-[0.3em] uppercase">
                IIT Madras Paradox
              </p>
            </div>
            
            <p className="max-w-3xl mx-auto text-muted-foreground leading-relaxed text-sm sm:text-base italic">
              The IPL Auction Hub infrastructure, including its real-time synchronization architecture, proprietary bidding logic, visual identity, and performance datasets, is the exclusive Intellectual Property of the Sports Department, IIT Madras Paradox. All rights reserved &copy; 2026.
            </p>
          </section>

          {/* How It Works Section */}
          <section className="space-y-8 border-t border-primary/10 pt-12">
            <div className="text-center">
              <h2 className="text-2xl font-serif text-primary uppercase tracking-widest mb-4">System Architecture & Functionality</h2>
              <p className="text-sm text-muted-foreground italic">A high-fidelity simulation designed for competitive live environments.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4 p-6 bg-black/40 border border-primary/10 rounded-lg">
                <div className="flex items-center gap-3 text-primary">
                  <Gavel size={20} />
                  <h3 className="font-bold uppercase tracking-wider">Dynamic Auction Engine</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-loose">
                  The system employs a live-draw mechanism that randomizes player entry to ensure floor integrity. It utilizes a fixed-increment slab structure (5L, 10L, 20L, 50L) which automatically adjusts based on the current bid valuation, mimicking professional sporting league standards.
                </p>
              </div>

              <div className="space-y-4 p-6 bg-black/40 border border-primary/10 rounded-lg">
                <div className="flex items-center gap-3 text-primary">
                  <Database size={20} />
                  <h3 className="font-bold uppercase tracking-wider">Real-Time Ledger Sync</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-loose">
                  Powered by Firebase, the platform synchronizes budget metrics across multiple endpoints. When a moderator records a sale, the purse balance and squad points of the respective House are updated instantly across all participant and spectator feeds.
                </p>
              </div>

              <div className="space-y-4 p-6 bg-black/40 border border-primary/10 rounded-lg">
                <div className="flex items-center gap-3 text-primary">
                  <Zap size={20} />
                  <h3 className="font-bold uppercase tracking-wider">Hype Celebration System</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-loose">
                  The "Hype Trigger" logic monitors bid values. Once a threshold of 1000L (10 Cr) is breached, the system initiates marquee-status celebrations, including cinematic screen-shakes and high-density confetti effects, designed for large-screen presentation.
                </p>
              </div>

              <div className="space-y-4 p-6 bg-black/40 border border-primary/10 rounded-lg">
                <div className="flex items-center gap-3 text-primary">
                  <Terminal size={20} />
                  <h3 className="font-bold uppercase tracking-wider">Roster Eligibility Monitor</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-loose">
                  Each House squad is tracked against mandatory composition rules: a minimum of 11 players including specialist roles and uncapped player quotas. The system provides real-time warnings if a House breaches its virtual purse limit.
                </p>
              </div>
            </div>
          </section>

          {/* Contact & Governance */}
          <section className="pt-8 border-t border-primary/10">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="text-primary h-5 w-5" />
                  <h2 className="text-xs font-black text-primary uppercase tracking-widest">Official Inquiries</h2>
                </div>
                <div className="p-6 bg-black/40 border border-primary/10 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-4">
                    For technical verification or event coordination regarding the IPL Auction infrastructure, please contact:
                  </p>
                  <a 
                    href="mailto:sports@iitmparadox.org" 
                    className="text-primary font-bold hover:underline tracking-widest flex items-center gap-2"
                  >
                    sports@iitmparadox.org
                  </a>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="text-primary h-5 w-5" />
                  <h2 className="text-xs font-black text-primary uppercase tracking-widest">Usage Governance</h2>
                </div>
                <div className="p-6 bg-black/40 border border-primary/10 rounded-lg">
                  <p className="text-xs text-muted-foreground/80 leading-loose">
                    Unauthorized redistribution or commercial use of this system is strictly prohibited. Any breach of terms is subject to review by the IIT Madras Paradox Organizing Committee.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Development Credit */}
          <section className="text-center pt-8 border-t border-primary/10 opacity-50">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Developed by <span className="text-primary">Krish Gupta</span>
            </p>
          </section>
        </CardContent>
      </Card>
    </motion.div>
  );
}
