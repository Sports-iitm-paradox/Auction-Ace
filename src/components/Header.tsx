
"use client";

import Link from 'next/link';
import { Menu, ChevronDown, Upload, Users, PlusCircle } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useUser } from '@/firebase';
import { getAuth, signOut } from 'firebase/auth';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { useState } from 'react';

const Header = () => {
  const { user, isUserLoading } = useUser();
  const auth = getAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleSignOut = () => {
    signOut(auth);
    setIsSheetOpen(false);
  }

  const NavContent = () => (
    <>
      { !isUserLoading && (
        <div className='flex flex-col md:flex-row items-stretch md:items-center gap-2'>
            <Button variant="ghost" asChild className="font-black text-[11px] uppercase tracking-[0.4em] hover:text-primary transition-colors">
                <Link href="/squads" onClick={() => setIsSheetOpen(false)}>
                    Squads
                </Link>
            </Button>
            <Button variant="ghost" asChild className="font-black text-[11px] uppercase tracking-[0.4em] hover:text-primary transition-colors">
                <Link href="/rulebook" onClick={() => setIsSheetOpen(false)}>
                    Rulebook
                </Link>
            </Button>
            <Button variant="ghost" asChild className="font-black text-[11px] uppercase tracking-[0.4em] hover:text-primary transition-colors">
                <Link href="/credits" onClick={() => setIsSheetOpen(false)}>
                    Systems
                </Link>
            </Button>

            { user &&
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="font-black text-[11px] uppercase tracking-[0.4em] hover:text-primary">Admin <ChevronDown className="ml-2 h-3 w-3" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-none border-2 border-foreground shadow-[6px_6px_0px_rgba(0,0,0,1)] p-0">
                      <DropdownMenuItem asChild className="rounded-none h-12 font-black uppercase tracking-widest text-[10px] cursor-pointer hover:bg-accent">
                          <Link href="/players">
                              <Users className="mr-3 h-4 w-4" />
                              <span>Master Roster</span>
                          </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="rounded-none h-12 font-black uppercase tracking-widest text-[10px] cursor-pointer hover:bg-accent">
                          <Link href="/sets/create">
                              <PlusCircle className="mr-3 h-4 w-4" />
                              <span>Round Creation</span>
                          </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-foreground/10 m-0" />
                      <DropdownMenuItem asChild className="rounded-none h-12 font-black uppercase tracking-widest text-[10px] cursor-pointer hover:bg-accent">
                          <Link href="/import">
                              <Upload className="mr-3 h-4 w-4" />
                              <span>Ledger Sync</span>
                          </Link>
                      </DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
            }
        </div>
      )}
      <div className="flex items-center gap-4 md:ml-4">
      {isUserLoading ? (
         <div className="h-10 w-28 animate-pulse bg-foreground/10 border-2 border-foreground/20" />
      ) : user ? (
        <Button variant="secondary" onClick={handleSignOut} className="vector-button h-10 px-8 bg-foreground text-white hover:bg-foreground/90">
          Sign Out
        </Button>
      ) : (
        <Button asChild className="vector-button h-10 px-8 bg-foreground text-white hover:bg-foreground/90">
          <Link href="/login" onClick={() => setIsSheetOpen(false)}>
            Admin Login
          </Link>
        </Button>
      )}
      </div>
    </>
  );

  return (
    <header className="w-full border-b-2 border-foreground bg-white/95 backdrop-blur-md z-20 sticky top-0 gpu-layer">
      <div className="container mx-auto flex h-20 items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-headline font-black tracking-tighter text-foreground uppercase italic leading-none">Margazhi'27</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-2">
          <NavContent />
        </nav>

        <div className="md:hidden">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 border-2 border-foreground">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-white border-l-2 border-foreground rounded-none w-full sm:w-[400px]">
              <nav className="flex flex-col gap-8 pt-20 px-8">
                <NavContent />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
