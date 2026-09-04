
"use client";

import Link from 'next/link';
import { Trophy, Users, PlusCircle, LogOut, LogIn, Menu, BookOpen, ShieldCheck, ChevronDown, Upload, ShieldAlert } from 'lucide-react';
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
            <Button variant="ghost" asChild>
                <Link href="/squads" onClick={() => setIsSheetOpen(false)}>
                    <ShieldCheck className="mr-2 h-4 w-4" /> Squads
                </Link>
            </Button>
            <Button variant="ghost" asChild>
                <Link href="/rulebook" onClick={() => setIsSheetOpen(false)}>
                    <BookOpen className="mr-2 h-4 w-4" /> Rulebook
                </Link>
            </Button>
            <Button variant="ghost" asChild>
                <Link href="/credits" onClick={() => setIsSheetOpen(false)}>
                    <ShieldAlert className="mr-2 h-4 w-4" /> System Info
                </Link>
            </Button>

            { user &&
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="ghost">Manage <ChevronDown className="ml-1 h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                      <DropdownMenuItem asChild>
                          <Link href="/players">
                              <Users className="mr-2 h-4 w-4" />
                              <span>Manage Players</span>
                          </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                          <Link href="/sets/create">
                              <PlusCircle className="mr-2 h-4 w-4" />
                              <span>Create Set</span>
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
      <div className="flex items-center gap-2">
      {isUserLoading ? (
         <div className="h-10 w-24 animate-pulse rounded-md bg-muted/50" />
      ) : user ? (
        <Button variant="ghost" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Button>
      ) : (
        <Button asChild>
          <Link href="/login" onClick={() => setIsSheetOpen(false)}>
            <LogIn className="mr-2 h-4 w-4" /> Login
          </Link>
        </Button>
      )}
      </div>
    </>
  );

  return (
    <header className="w-full border-b border-primary/30 bg-background/80 backdrop-blur-sm z-20 sticky top-0">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3 group">
          <Trophy className="h-7 w-7 text-primary transition-transform group-hover:scale-110" />
          <span className="text-2xl font-serif font-bold tracking-tight text-primary">IPL Auction</span>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4">
          <NavContent />
        </nav>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[250px] bg-card/80 backdrop-blur-md border-l border-primary/30">
              <nav className="flex flex-col gap-4 pt-8">
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
