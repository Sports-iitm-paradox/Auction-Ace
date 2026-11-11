'use client';

import { Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="w-full border-t border-border bg-white py-12 mt-auto gpu-layer">
      <div className="container mx-auto px-4 flex flex-col items-center justify-center text-center space-y-6">
        <div className="flex items-center gap-3 text-sm text-foreground/60 hover:text-primary transition-colors">
          <Mail className="h-4 w-4" />
          <a href="mailto:sports@iitmparadox.org" className="font-bold tracking-widest uppercase text-[10px]">
            sports@iitmparadox.org
          </a>
        </div>

        <div className="pt-6 border-t border-border w-full max-w-lg">
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.4em]">
                &copy; 2026 OFFICIAL IPL AUCTION HUB • MATGAZHI '27 VECTOR EDITION
            </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;