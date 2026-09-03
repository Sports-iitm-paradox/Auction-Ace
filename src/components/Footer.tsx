'use client';

import { Mail, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="w-full border-t border-primary/20 bg-background/40 py-8 mt-auto">
      <div className="container mx-auto px-4 flex flex-col items-center justify-center text-center space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-headline text-primary/80 uppercase tracking-widest">Application Credits</p>
          <p className="text-lg font-bold text-foreground font-serif">
            Krish Gupta
          </p>
          <p className="text-sm text-muted-foreground italic">
            Sports Department, IIT Madras Paradox&apos;27
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-primary/70 hover:text-primary transition-colors">
            <Mail className="h-4 w-4" />
            <a href="mailto:sports@iitmparadox.org" className="font-medium">
              sports@iitmparadox.org
            </a>
          </div>
          
          <div className="hidden sm:block text-primary/20">|</div>

          <Link 
            href="/ip-policy" 
            className="flex items-center gap-2 text-primary/70 hover:text-primary transition-colors font-medium"
          >
            <ShieldCheck className="h-4 w-4" />
            IP Notice
          </Link>
        </div>

        <div className="pt-4 border-t border-primary/10 w-full max-w-md">
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.2em]">
                &copy; 2026 SAAVAN - IIT Madras Paradox
            </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
