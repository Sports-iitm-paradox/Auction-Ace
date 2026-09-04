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
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Player } from '@/lib/player-data';
import { Trash2, UserPlus, Users, Edit, X } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useUser, useFirestore, useCollection, addDocumentNonBlocking, deleteDocumentNonBlocking, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"

const playerSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  surname: z.string().optional(),
  playerNumber: z.coerce.number().min(0, 'Player number must be a positive number.'),
  country: z.string().optional(),
  specialism: z.string().optional(),
  cua: z.string().optional(),
  reservePrice: z.coerce.number().min(0).optional(),
  points: z.coerce.number().min(0).optional(),
  imageUrl: z.string().url({ message: "Please provide a valid URL." }).optional().or(z.literal('')),
});

type PlayerFormData = z.infer<typeof playerSchema>;

export default function PlayersPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);


  const playersCollection = useMemoFirebase(() => {
      if (!firestore) return null;
      return collection(firestore, 'players');
  }, [firestore]);

  const playersQuery = useMemoFirebase(() => {
    if (!user || !playersCollection) return null;
    return query(playersCollection, where('userId', '==', user.uid));
  }, [user, playersCollection]);

  const { data: players, isLoading: isLoadingPlayers } = useCollection<Player>(playersQuery);

  const form = useForm<PlayerFormData>({
    resolver: zodResolver(playerSchema),
    defaultValues: {
      firstName: '',
      surname: '',
      playerNumber: 0,
      country: '',
      specialism: '',
      cua: '',
      reservePrice: 0,
      points: 0,
      imageUrl: '',
    },
  });

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (editingPlayer) {
      form.reset({
        firstName: editingPlayer.firstName,
        surname: editingPlayer.surname,
        playerNumber: editingPlayer.playerNumber,
        country: editingPlayer.country,
        specialism: editingPlayer.specialism,
        cua: editingPlayer.cua,
        reservePrice: editingPlayer.reservePrice,
        points: editingPlayer.points,
        imageUrl: editingPlayer.imageUrl,
      });
    } else {
        form.reset({
            firstName: '',
            surname: '',
            playerNumber: 0,
            country: '',
            specialism: '',
            cua: '',
            reservePrice: 0,
            points: 0,
            imageUrl: '',
        });
    }
  }, [editingPlayer, form]);


  const onSubmit: SubmitHandler<PlayerFormData> = (data) => {
    if (!user || !playersCollection) return;

    const fullPlayerName = `${data.firstName || ''} ${data.surname || ''}`.trim();

    const playerData = {
      ...data,
      playerName: fullPlayerName,
      userId: user.uid,
    }

    if (editingPlayer) {
        // Update existing player
        const playerRef = doc(firestore, 'players', editingPlayer.id);
        updateDocumentNonBlocking(playerRef, playerData);
        toast({
            title: 'Player Updated',
            description: `${playerData.playerName} has been updated.`,
        });
        setEditingPlayer(null);

    } else {
        // Add new player
        addDocumentNonBlocking(playersCollection, playerData);
        toast({
            title: 'Player Added',
            description: `${playerData.playerName} has been added to your list.`,
        });
    }
    
    form.reset();
  };

  const deletePlayer = (id: string) => {
    if (!firestore) return;
    const playerToDelete = players?.find(p => p.id === id);
    const docRef = doc(firestore, 'players', id);
    deleteDocumentNonBlocking(docRef);
    toast({
      title: 'Player Removed',
      description: `${playerToDelete?.playerName} has been removed.`,
      variant: 'destructive',
    });
  };
  
  const handleEditClick = (player: Player) => {
    setEditingPlayer(player);
     window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const cancelEdit = () => {
    setEditingPlayer(null);
  }

  if (isUserLoading || !user) {
    return <div className="w-full text-center py-20">Loading Dashboard...</div>;
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 sm:space-y-8 px-2 sm:px-4">
      <Card className="bg-card/90 backdrop-blur-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="flex items-center text-xl sm:text-2xl">
                <UserPlus className="mr-2 h-5 w-5 sm:h-6 sm:w-6" /> {editingPlayer ? `Editing ${editingPlayer.playerName}` : 'Add New Player'}
              </CardTitle>
              <CardDescription>
                {editingPlayer ? 'Update the player details below.' : 'Add a new player to your master list.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="surname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Surname</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="playerNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Player Number</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 7" {...field} />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
                  <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., India" {...field} />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
                  <FormField
                  control={form.control}
                  name="specialism"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialism</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Batter" {...field} />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
                  <FormField
                  control={form.control}
                  name="cua"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status (C/U/A)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Capped" {...field} />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
                  <FormField
                  control={form.control}
                  name="reservePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reserve Price (Lakh)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 20" {...field} />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
                  <FormField
                  control={form.control}
                  name="points"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Points</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 100" {...field} />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/player.jpg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-end gap-2">
              {editingPlayer && (
                 <Button type="button" variant="outline" onClick={cancelEdit} className="w-full sm:w-auto">
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                 </Button>
              )}
              <Button type="submit" disabled={form.formState.isSubmitting} className="w-full sm:w-auto">
                {editingPlayer ? 'Update Player' : 'Add Player'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card className="bg-card/90 backdrop-blur-md overflow-hidden">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">Player List</CardTitle>
          <CardDescription>
            Master roster of all registered players.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {isLoadingPlayers && (
            <div className="space-y-3 p-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-md bg-muted/50 animate-pulse h-12"/>
                ))}
            </div>
          )}
          {!isLoadingPlayers && players && players.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <Table>
                  <TableHeader>
                      <TableRow className="bg-muted/50">
                      <TableHead className="w-[60px] text-center">#</TableHead>
                      <TableHead className="min-w-[150px]">Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Country</TableHead>
                      <TableHead className="hidden md:table-cell">Specialism</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Points</TableHead>
                      <TableHead className="text-right w-[100px]">Actions</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                  {players.map((player) => (
                      <TableRow key={player.id}>
                          <TableCell className="font-mono text-muted-foreground text-center">{player.playerNumber}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold">{player.playerName}</span>
                              <span className="text-[10px] sm:hidden text-muted-foreground uppercase">{player.specialism} • {player.country}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{player.country}</TableCell>
                          <TableCell className="hidden md:table-cell">{player.specialism}</TableCell>
                          <TableCell className="text-right font-mono">{player.reservePrice}L</TableCell>
                          <TableCell className="text-right hidden sm:table-cell font-mono">{player.points}</TableCell>
                          <TableCell className="text-right">
                               <div className="flex items-center justify-end gap-1">
                                  <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEditClick(player)}
                                      className="text-muted-foreground hover:text-primary h-8 w-8"
                                  >
                                      <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => deletePlayer(player.id)}
                                      className="text-muted-foreground hover:text-destructive h-8 w-8"
                                  >
                                      <Trash2 className="h-4 w-4" />
                                  </Button>
                              </div>
                          </TableCell>
                      </TableRow>
                  ))}
                  </TableBody>
              </Table>
            </div>
          ) : (
            !isLoadingPlayers && (
              <div className="text-center py-20 border-2 border-dashed border-muted m-6 rounded-lg">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                  <h3 className="mt-4 text-lg font-medium">No Players Yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Add players to begin building sets.</p>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
