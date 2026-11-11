'use client';

const Footer = () => {
  return (
    <footer className="w-full border-t-2 border-foreground bg-white py-12 mt-auto gpu-layer">
      <div className="container mx-auto px-6 flex flex-col items-center justify-center text-center space-y-8">
        <div className="flex flex-col items-center gap-2">
            <a href="mailto:sports@iitmparadox.org" className="font-black tracking-[0.5em] uppercase text-[10px] text-foreground/60 hover:text-primary transition-colors">
              sports@iitmparadox.org
            </a>
        </div>

        <div className="pt-8 border-t-2 border-foreground/5 w-full max-w-xl">
            <p className="text-[9px] text-foreground/30 font-black uppercase tracking-[0.6em] leading-relaxed">
                IPL Auction Hub Infrastructure // Official Roster Management
            </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;