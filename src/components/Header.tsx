"use client";

import Link from 'next/link';
import { Trophy, Users, PlusCircle, LogOut, LogIn, Menu, BookOpen, ShieldCheck, ChevronDown, Upload, Info } from 'lucide-react';
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
            <Button variant="ghost" asChild className="font-bold text-xs uppercase tracking-widest">
                <Link href="/squads" onClick={() => setIsSheetOpen(false)}>
                    Squads
                </Link>
            </Button>
            <Button variant="ghost" asChild className="font-bold text-xs uppercase tracking-widest">
                <Link href="/rulebook" onClick={() => setIsSheetOpen(false)}>
                    Rulebook
                </Link>
            </Button>
            <Button variant="ghost" asChild className="font-bold text-xs uppercase tracking-widest">
                <Link href="/credits" onClick={() => setIsSheetOpen(false)}>
                    Info
                </Link>
            </Button>

            { user &&
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="font-bold text-xs uppercase tracking-widest">Manage <ChevronDown className="ml-1 h-3 w-3" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                          <Link href="/players">
                              <Users className="mr-2 h-4 w-4" />
                              <span>Players</span>
                          </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                          <Link href="/sets/create">
                              <PlusCircle className="mr-2 h-4 w-4" />
                              <span>Sets</span>
                          </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                          <Link href="/import">
                              <Upload className="mr-2 h-4 w-4" />
                              <span>Import CSV</span>
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
        <Button variant="secondary" size="sm" onClick={handleSignOut} className="font-bold text-xs uppercase tracking-widest h-9">
          Sign Out
        </Button>
      ) : (
        <Button size="sm" asChild className="font-bold text-xs uppercase tracking-widest h-9">
          <Link href="/login" onClick={() => setIsSheetOpen(false)}>
            Login
          </Link>
        </Button>
      )}
      </div>
    </>
  );

  return (
    <header className="w-full border-b border-border bg-white/80 backdrop-blur-md z-20 sticky top-0 shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-primary" />
          <span className="text-xl font-serif font-black tracking-tight text-foreground uppercase italic">IPL AUCTION HUB</span>
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
            <SheetContent side="right" className="bg-white border-l border-border">
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