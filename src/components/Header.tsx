"use client";

import Link from 'next/link';
import { Trophy, Users, PlusCircle, Menu, ChevronDown, Upload, Shield } from 'lucide-react';
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
        <div className='flex flex-col md:flex-row items-stretch md:items-center gap-3'>
            <Button variant="ghost" asChild className="font-black text-[11px] uppercase tracking-[0.4em] hover:text-primary transition-colors">
                <Link href="/squads" onClick={() => setIsSheetOpen(false)}>
                    Squads
                </Link>
            </Button>
            <Button variant="ghost" asChild className="font-black text-[11px] uppercase tracking-[0.4em] hover:text-primary transition-colors">
                <Link href="/rulebook" onClick={() => setIsSheetOpen(false)}>
                    Statutes
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
                      <Button variant="ghost" className="font-black text-[11px] uppercase tracking-[0.4em] hover:text-primary">Moderator <ChevronDown className="ml-2 h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-none border-2 border-foreground shadow-[4px_4px_0px_rgba(10,25,47,1)] p-2">
                      <DropdownMenuItem asChild className="rounded-none h-12 font-black uppercase tracking-widest text-[10px]">
                          <Link href="/players">
                              <Users className="mr-3 h-5 w-5" />
                              <span>Master Roster</span>
                          </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="rounded-none h-12 font-black uppercase tracking-widest text-[10px]">
                          <Link href="/sets/create">
                              <PlusCircle className="mr-3 h-5 w-5" />
                              <span>Round Creation</span>
                          </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-foreground/10 mx-2" />
                      <DropdownMenuItem asChild className="rounded-none h-12 font-black uppercase tracking-widest text-[10px]">
                          <Link href="/import">
                              <Upload className="mr-3 h-5 w-5" />
                              <span>Ledger Sync</span>
                          </Link>
                      </DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
            }
        </div>
      )}
      <div className="flex items-center gap-4 ml-4">
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
    <header className="w-full border-b-2 border-foreground bg-white/95 backdrop-blur-md z-20 sticky top-0 shadow-sm gpu-layer">
      <div className="container mx-auto flex h-20 items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-4 group">
          <Shield className="h-6 w-6 text-foreground group-hover:text-primary transition-colors" />
          <span className="text-2xl font-headline font-black tracking-tight text-foreground uppercase italic leading-none">IPL AUCTION HUB</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-4">
          <NavContent />
        </nav>

        <div className="md:hidden">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-12 w-12 border-2 border-foreground">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-white border-l-2 border-foreground rounded-none w-full sm:w-[400px]">
              <nav className="flex flex-col gap-10 pt-20 px-8">
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