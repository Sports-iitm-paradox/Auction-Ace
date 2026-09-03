
import { DocumentData } from "firebase/firestore";

export interface Player extends DocumentData {
  id: string;
  playerName: string;
  playerNumber: number;
  userId: string;
  firstName: string;
  surname?: string;
  country?: string;
  specialism?: string;
  cua?: string; // Capped/Uncapped/Associate
  reservePrice?: number;
  points?: number;
  setNumber?: number;
  imageUrl?: string;
}

export interface PlayerSet extends DocumentData {
  id: string;
  name: string;
  players: Player[];
  userId: string;
  order: number;
}

export interface Squad extends DocumentData {
    id: string;
    name: string;
    moneySpent: number;
    moneyLeft: number;
    budgetUsed: number;
    budgetStatus: 'OK' | 'OVER';
    eligibilityStatus: string;
    totalPoints: number | 'N/A';
}

export interface ActiveAuctionState extends DocumentData {
  setId: string;
  currentPlayerId: string | null;
  currentBid: number;
  isSold: boolean;
  isUnsold: boolean;
  status: 'idle' | 'drawing' | 'active' | 'sold' | 'unsold';
  updatedAt?: any;
}
