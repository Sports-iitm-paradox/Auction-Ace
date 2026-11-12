
'use client';

import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { LogIn, ArrowLeft } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthError, signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { motion } from 'framer-motion';

const loginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit: SubmitHandler<LoginFormData> = async (data) => {
    setFirebaseError(null);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      toast({
        title: 'Login Successful',
        description: "You've been successfully logged in.",
      });
      router.push('/');
    } catch (error) {
      const authError = error as AuthError;
      let errorMessage = 'An unexpected error occurred.';
      switch (authError.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          errorMessage = 'Invalid email or password.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        default:
          errorMessage = 'Login failed. Please try again.';
          break;
      }
      setFirebaseError(errorMessage);
      toast({
        title: 'Login Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  return (
    <motion.div 
      className="w-full max-w-md mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mb-6">
        <Button variant="ghost" asChild className="text-primary hover:text-primary/80">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
      </div>
      <Card className="rounded-none border-2 border-foreground bg-white shadow-[12px_12px_0px_rgba(0,0,0,1)]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl flex items-center justify-center font-headline font-black italic text-primary uppercase tracking-tighter">
                <LogIn className="mr-3 h-6 w-6" /> Admin Portal
              </CardTitle>
              <CardDescription className="text-foreground/40 uppercase tracking-widest text-[10px] font-black mt-2">
                Secure Access // Margazhi'27
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {firebaseError && (
                <div className="p-3 bg-destructive/10 border-2 border-destructive/20">
                  <p className="text-center text-[10px] font-black uppercase text-destructive tracking-widest">{firebaseError}</p>
                </div>
              )}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em]">Credential Key</FormLabel>
                    <FormControl>
                      <Input placeholder="admin@margazhi27.org" {...field} className="rounded-none border-2 border-foreground bg-white focus:ring-0 focus:border-primary" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em]">Security Pass</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="rounded-none border-2 border-foreground bg-white focus:ring-0 focus:border-primary" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-14 vector-button bg-foreground text-white mt-6" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Authenticating...' : 'Establish Session'}
              </Button>
            </CardContent>
          </form>
        </Form>
      </Card>
      <div className="mt-8 text-center">
        <p className="text-[10px] text-foreground/30 font-black uppercase tracking-[0.5em] italic">
          Unauthorized entry is prohibited.
        </p>
      </div>
    </motion.div>
  );
}
