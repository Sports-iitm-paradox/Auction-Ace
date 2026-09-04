'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, Mail, ArrowLeft, Terminal, Globe, Scale } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function IPNoticePage() {
  return (
    <motion.div
      className="w-full max-w-4xl mx-auto px-4"
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

      <Card className="ornate-border bg-card/90 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center border-b border-primary/20 pb-12">
          <div className="flex justify-center mb-6">
            <ShieldCheck className="h-20 w-20 text-primary drop-shadow-[0_0_15px_rgba(255,215,0,0.4)]" />
          </div>
          <CardTitle className="text-4xl font-serif text-primary mb-2 tracking-widest uppercase italic">
            Official IP Notice
          </CardTitle>
          <CardDescription className="text-lg font-headline text-muted-foreground tracking-[0.2em] uppercase">
            SAAVAN '26 - IIT Madras Paradox
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-12 space-y-12">
          {/* Institutional Ownership */}
          <section className="text-center space-y-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Globe className="text-primary h-5 w-5" />
              <h2 className="text-sm font-black text-primary uppercase tracking-[0.4em]">Legal Ownership & Proprietary Rights</h2>
            </div>
            
            <div className="py-8 px-6 bg-secondary/20 border-y border-primary/30 relative overflow-hidden group">
              <h3 className="text-3xl sm:text-5xl font-serif font-black text-foreground tracking-tighter italic">
                Sports Department
              </h3>
              <p className="mt-2 text-primary font-headline text-lg tracking-[0.3em] uppercase">
                IIT Madras Paradox
              </p>
            </div>
            
            <p className="max-w-2xl mx-auto text-muted-foreground leading-relaxed text-sm sm:text-base italic">
              The SAAVAN '26 Auction Hub, including all proprietary algorithms, real-time bidding logic, 
              visual identity, and data structures, is the exclusive Intellectual Property of the 
              Sports Department, IIT Madras Paradox. All rights reserved &copy; 2026.
            </p>
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
                    For legal queries, partnership details, or technical verification regarding the SAAVAN '26 infrastructure, contact the executive desk:
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
                  <Scale className="text-primary h-5 w-5" />
                  <h2 className="text-xs font-black text-primary uppercase tracking-widest">Usage Policy</h2>
                </div>
                <div className="p-6 bg-black/40 border border-primary/10 rounded-lg">
                  <p className="text-xs text-muted-foreground/80 leading-loose">
                    Unauthorized reproduction, redistribution, or modification of this software suite 
                    for any purpose other than official SAAVAN '26 sanctioned events is strictly 
                    prohibited. Any breach is subject to review by the IIT Madras Paradox Organizing Committee.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Subtle Development Credit */}
          <section className="text-center pt-8 border-t border-primary/10 opacity-60">
            <div className="flex items-center justify-center gap-2">
              <Terminal className="text-primary h-3 w-3" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Developed by <span className="text-primary">Krish Gupta</span>
              </p>
            </div>
          </section>
        </CardContent>
      </Card>
      
      <div className="mt-12 text-center pb-12">
        <p className="text-[9px] text-muted-foreground/30 uppercase tracking-[1em] font-black">
          Official Release Hub V.2.0.4
        </p>
      </div>
    </motion.div>
  );
}
