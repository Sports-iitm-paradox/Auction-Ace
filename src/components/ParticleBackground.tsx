'use client';

import { useEffect, useState } from 'react';

const AnimatedBackground = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="fixed inset-0 -z-10 bg-[#020408]" />;

  return (
    <div className="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden bg-background cyber-grid">
      {/* Moving scanline for cyberpunk feel */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent h-20 w-full animate-scanline opacity-20 pointer-events-none" />
      
      {/* Radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(15,25,35,0.8)_100%)]" />
      
      {/* Sharp vector accents */}
      <div className="absolute top-0 right-0 w-[40vw] h-px bg-primary/20" />
      <div className="absolute bottom-0 left-0 w-[40vw] h-px bg-secondary/20" />
    </div>
  );
};

export { AnimatedBackground };