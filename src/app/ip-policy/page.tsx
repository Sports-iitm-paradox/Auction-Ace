'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function IPPolicyPage() {
  return (
    <motion.div
      className="w-full max-w-3xl mx-auto"
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
        <CardHeader className="text-center border-b border-primary/20 pb-8">
          <div className="flex justify-center mb-4">
            <ShieldAlert className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-4xl font-serif text-primary mb-2">Intellectual Property Notice</CardTitle>
          <CardDescription className="text-lg italic text-muted-foreground">
            Legal Statement regarding Margazhi'27
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8 space-y-6 text-center">
          <div className="space-y-4">
            <p className="text-xl leading-relaxed">
              This application, including its source code, design elements, algorithms, and overall structure, 
              is the <span className="text-primary font-bold">exclusive Intellectual Property</span> of the:
            </p>
            <div className="py-6 px-4 bg-secondary/30 border-y-2 border-primary/20">
              <h2 className="text-2xl font-serif font-bold text-foreground">
                Sports Department
              </h2>
              <p className="text-lg font-medium text-primary">
                Paradox Event Core
              </p>
            </div>
          </div>

          <div className="pt-4 text-muted-foreground text-sm max-w-xl mx-auto leading-loose">
            <p>
              Unauthorized reproduction, distribution, or modification of this software, 
              in whole or in part, without the express written consent of the 
              Sports Department is strictly prohibited.
            </p>
            <p className="mt-4">
              &copy; 2027 Sports Department. All rights reserved.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
