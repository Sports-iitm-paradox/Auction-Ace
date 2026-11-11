'use client';

import { Mail, Shield } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="w-full border-t-2 border-foreground bg-white py-16 mt-auto gpu-layer">
      <div className="container mx-auto px-6 flex flex-col items-center justify-center text-center space-y-10">
        <div className="flex flex-col items-center gap-4">
            <Shield className="h-10 w-10 text-foreground opacity-10" />
            <div className="flex items-center gap-4 text-foreground/60 hover:text-primary transition-colors group">
              <Mail className="h-5 w-5" />
              <a href="mailto:sports@iitmparadox.org" className="font-black tracking-[0.5em] uppercase text-[11px]">
                sports@iitmparadox.org
              </a>
            </div>
        </div>

        <div className="pt-10 border-t-2 border-foreground/5 w-full max-w-2xl">
            <p className="text-[10px] text-foreground/30 font-black uppercase tracking-[0.6em] leading-relaxed">
                Official IPL Auction Hub Infrastructure // Matgazhi '27 Vector Edition
            </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;