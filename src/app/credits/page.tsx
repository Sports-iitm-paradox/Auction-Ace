'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Award, ShieldAlert, Cpu, ArrowLeft, Globe, Terminal } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CreditsPage() {
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
            <ArrowLeft className="mr-2 h-4 w-4" /> Return to Terminal
          </Link>
        </Button>
      </div>

      <Card className="ornate-border bg-card/90 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center border-b border-primary/20 pb-12">
          <div className="flex justify-center mb-6">
            <Award className="h-20 w-20 text-primary drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]" />
          </div>
          <CardTitle className="text-5xl font-serif text-primary mb-2 tracking-widest uppercase italic">
            Official Credits
          </CardTitle>
          <CardDescription className="text-xl font-headline text-muted-foreground tracking-[0.3em] uppercase">
            SAAVAN '26 - IIT Madras Paradox
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-12 space-y-12">
          {/* Formal Development Credit */}
          <section className="text-center space-y-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Terminal className="text-primary h-5 w-5" />
              <h2 className="text-sm font-black text-primary uppercase tracking-[0.5em]">Lead Engineering & Architecture</h2>
            </div>
            
            <div className="py-8 px-6 bg-secondary/20 border-y border-primary/30 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <h3 className="text-4xl sm:text-6xl font-serif font-black text-foreground tracking-tighter italic">
                Krish Gupta
              </h3>
              <p className="mt-4 text-primary font-headline text-lg tracking-widest uppercase">
                Software Architect & Full-Stack Developer
              </p>
              <div className="mt-2 text-muted-foreground text-sm italic">
                Sports Department, IIT Madras Paradox'27
              </div>
            </div>
            
            <p className="max-w-2xl mx-auto text-muted-foreground leading-relaxed text-sm sm:text-base">
              Solely responsible for the design, development, and deployment of the SAAVAN '26 Auction Hub. 
              Engineered using Next.js 15, Firebase Cloud Infrastructure, and Genkit AI integration to provide 
              a professional-grade real-time auction experience.
            </p>
          </section>

          {/* Institutional IP Credit */}
          <section className="pt-8 border-t border-primary/10">
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Globe className="text-primary h-5 w-5" />
                  <h2 className="text-xs font-black text-primary uppercase tracking-widest">Ownership & IP</h2>
                </div>
                <div className="p-6 bg-black/40 border border-primary/10 rounded-lg">
                  <h3 className="text-xl font-serif font-bold text-foreground mb-2">Sports Department</h3>
                  <p className="text-primary text-sm font-bold uppercase tracking-widest mb-4">IIT Madras Paradox</p>
                  <p className="text-xs text-muted-foreground leading-loose">
                    This platform and its proprietary auction logic, rulebook integrations, and visual assets 
                    are the exclusive Intellectual Property of the Sports Department, IIT Madras Paradox. 
                    All rights reserved &copy; 2026.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="text-primary h-5 w-5" />
                  <h2 className="text-xs font-black text-primary uppercase tracking-widest">Legal Notice</h2>
                </div>
                <div className="p-6 bg-red-950/20 border border-red-900/20 rounded-lg">
                  <p className="text-xs text-muted-foreground/80 leading-loose italic">
                    Unauthorized reproduction, modification, or distribution of this software 
                    is strictly prohibited. Any unauthorized use of the SAAVAN '26 branding 
                    or the Paradox Auction Hub infrastructure will be subject to institutional 
                    legal review as per the IIT Madras Paradox code of conduct.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Technology Credits */}
          <section className="text-center pt-8 border-t border-primary/10 opacity-60 hover:opacity-100 transition-opacity">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Cpu className="text-primary h-4 w-4" />
              <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Engineered With</h2>
            </div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <span>Next.js 15</span>
              <span>React 19</span>
              <span>Firebase Cloud</span>
              <span>Tailwind CSS</span>
              <span>Framer Motion</span>
            </div>
          </section>
        </CardContent>
      </Card>
      
      <div className="mt-12 text-center pb-12">
        <p className="text-[10px] text-muted-foreground/40 uppercase tracking-[1em] font-black">
          Official Release V.2.0.4
        </p>
      </div>
    </motion.div>
  );
}
