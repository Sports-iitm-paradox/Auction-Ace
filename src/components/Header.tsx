"use client";

import Link from 'next/link';
import { Trophy, Users, PlusCircle, Menu, ChevronDown, Upload } from 'lucide-react';
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
        <div className='flex flex-col md:flex-row items-stretch md:items-center gap-1'>
            <Button variant="ghost" asChild className="font-bold text-[10px] uppercase tracking-[0.2em]">
                <Link href="/squads" onClick={() => setIsSheetOpen(false)}>
                    Squad Ledger
                </Link>
            </Button>
            <Button variant="ghost" asChild className="font-bold text-[10px] uppercase tracking-[0.2em]">
                <Link href="/rulebook" onClick={() => setIsSheetOpen(false)}>
                    Rulebook
                </Link>
            </Button>
            <Button variant="ghost" asChild className="font-bold text-[10px] uppercase tracking-[0.2em]">
                <Link href="/credits" onClick={() => setIsSheetOpen(false)}>
                    System Info
                </Link>
            </Button>

            { user &&
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="font-bold text-[10px] uppercase tracking-[0.2em]">Moderator <ChevronDown className="ml-1 h-3 w-3" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-none border-2">
                      <DropdownMenuItem asChild>
                          <Link href="/players">
                              <Users className="mr-2 h-4 w-4" />
                              <span>Master Roster</span>
                          </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                          <Link href="/sets/create">
                              <PlusCircle className="mr-2 h-4 w-4" />
                              <span>Create Sets</span>
                          </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                          <Link href="/import">
                              <Upload className="mr-2 h-4 w-4" />
                              <span>Import Ledger</span>
                          </Link>
                      </DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
            }
        </div>
      )}
      <div className="flex items-center gap-2 ml-2">
      {isUserLoading ? (
         <div className="h-9 w-24 animate-pulse rounded bg-muted" />
      ) : user ? (
        <Button variant="secondary" size="sm" onClick={handleSignOut} className="font-bold text-[10px] uppercase tracking-widest h-9 px-6 rounded-none">
          Sign Out
        </Button>
      ) : (
        <Button size="sm" asChild className="font-bold text-[10px] uppercase tracking-widest h-9 px-6 rounded-none">
          <Link href="/login" onClick={() => setIsSheetOpen(false)}>
            Admin Login
          </Link>
        </Button>
      )}
      </div>
    </>
  );

  return (
    <header className="w-full border-b border-border bg-white/95 backdrop-blur-md z-20 sticky top-0 shadow-sm gpu-layer">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3">
          <Trophy className="h-5 w-5 text-primary" />
          <span className="text-lg font-serif font-black tracking-tight text-foreground uppercase italic">IPL AUCTION HUB</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-2">
          <NavContent />
        </nav>

        <div className="md:hidden">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-white border-l border-border rounded-none">
              <nav className="flex flex-col gap-6 pt-12">
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