
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lock, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function SignupPage() {
  return (
    <motion.div
      className="w-full max-w-md mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-6">
        <Button variant="ghost" asChild className="text-primary hover:text-primary/80">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
      </div>

      <Card className="ornate-border bg-card/90 backdrop-blur-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Lock className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-serif text-primary">Registration Closed</CardTitle>
          <CardDescription className="text-muted-foreground italic">
            Access Restricted
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6 pt-4">
          <p className="text-foreground/80 leading-relaxed">
            Public account creation for the Saavan '26 Auction Hub is currently <span className="text-primary font-bold">disabled</span> to protect event integrity.
          </p>
          
          <div className="p-4 bg-secondary/20 border border-primary/20 rounded-lg">
            <p className="text-sm italic">
              Please contact the <strong>Sports Department Core Team</strong> if you require administrative credentials.
            </p>
          </div>

          <Button asChild className="w-full">
            <Link href="/login">
                Return to Login
            </Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
