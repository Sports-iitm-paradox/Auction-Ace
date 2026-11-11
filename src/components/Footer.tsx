'use client';

import { Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="w-full border-t border-border bg-white py-12 mt-auto">
      <div className="container mx-auto px-4 flex flex-col items-center justify-center text-center space-y-6">
        <div className="flex items-center gap-3 text-sm text-foreground/60 hover:text-primary transition-colors">
          <Mail className="h-4 w-4" />
          <a href="mailto:sports@iitmparadox.org" className="font-bold tracking-widest uppercase">
            sports@iitmparadox.org
          </a>
        </div>

        <div className="pt-6 border-t border-border w-full max-w-lg">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.3em]">
                &copy; 2026 OFFICIAL IPL AUCTION HUB • POWERED BY MATGAZHI '27
            </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;