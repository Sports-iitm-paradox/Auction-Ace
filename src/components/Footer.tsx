'use client';

import { Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="w-full border-t border-primary/20 bg-background/40 py-8 mt-auto">
      <div className="container mx-auto px-4 flex flex-col items-center justify-center text-center space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-primary/70 hover:text-primary transition-colors">
            <Mail className="h-4 w-4" />
            <a href="mailto:sports@iitmparadox.org" className="font-medium">
              sports@iitmparadox.org
            </a>
          </div>
        </div>

        <div className="pt-4 border-t border-primary/10 w-full max-w-md">
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.2em]">
                &copy; 2026 SAAVAN - IIT MADRAS PARADOX • ALL RIGHTS RESERVED
            </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
