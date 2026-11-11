'use client';

import { useEffect, useState } from 'react';

const AnimatedBackground = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="fixed inset-0 -z-10 bg-background" />;

  return (
    <div className="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden bg-background">
      {/* Subtle Vector Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(var(--primary) 0.5px, transparent 0.5px)', backgroundSize: '40px 40px' }} />
      
      {/* Gradient Accents */}
      <div className="absolute top-0 right-0 w-[60vw] h-[60vh] bg-primary/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-0 left-0 w-[40vw] h-[40vh] bg-secondary/5 blur-[100px] rounded-full" />
    </div>
  );
};

export { AnimatedBackground };