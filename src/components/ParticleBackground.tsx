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
      {/* Dynamic Vector Gradient Accents */}
      <div className="absolute -top-[10vh] -right-[10vw] w-[60vw] h-[60vh] bg-primary/5 blur-[120px] rounded-full gpu-layer" />
      <div className="absolute -bottom-[10vh] -left-[10vw] w-[40vw] h-[40vh] bg-foreground/5 blur-[100px] rounded-full gpu-layer" />
    </div>
  );
};

export { AnimatedBackground };