'use client';

import { useEffect, useState } from 'react';

const AnimatedBackground = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="fixed inset-0 -z-10 bg-background" />;

  return (
    <div className="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden bg-background vector-grid-bg">
      {/* Static Vector Accents for better performance */}
      <div className="absolute top-0 right-0 w-[50vw] h-[50vh] bg-primary/[0.03] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40vw] h-[40vh] bg-foreground/[0.02] blur-[120px] pointer-events-none" />
    </div>
  );
};

export { AnimatedBackground };