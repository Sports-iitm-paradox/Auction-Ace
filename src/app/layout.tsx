"use client";

import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { FirebaseClientProvider } from '@/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { AnimatedBackground } from '@/components/ParticleBackground';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAuctionPage = pathname.includes('/auction/present/');

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
      </head>
      <body className="bg-background">
        <FirebaseClientProvider>
          <AnimatedBackground />
          <div className="flex min-h-screen w-full flex-col relative z-10">
            {!isAuctionPage && <Header />}
            <AnimatePresence mode="wait">
              <motion.main
                key={pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className={!isAuctionPage ? "flex flex-1 flex-col items-center p-4 sm:p-6 md:p-8" : "flex-1"}
              >
                {children}
              </motion.main>
            </AnimatePresence>
            {!isAuctionPage && <Footer />}
          </div>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}