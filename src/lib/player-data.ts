
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
  auctionInsight?: string;
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

export interface ActiveAuctionState extends DocumentData {
  currentPlayerId: string;
  setId: string;
  currentBid: number;
  status: 'idle' | 'drawing' | 'bidding' | 'sold' | 'unsold';
  isSold: boolean;
  isUnsold: boolean;
  userId: string;
  lastUpdated: any;
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
