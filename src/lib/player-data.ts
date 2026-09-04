
import { DocumentData } from "firebase/firestore";

export interface Player extends DocumentData {
  id: string;
  playerName: string;
  playerNumber: number;
  userId: string;
  firstName: string;
  surname?: string;
  country?: string;
  specialism?: string; // e.g., Batter, Bowler, All-Rounder, Wicketkeeper
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

export interface ActionEvent {
  type: 'sold' | 'unsold';
  playerId: string;
  bid?: number;
  houseId?: string;
  houseName?: string;
  timestamp: string;
}

export interface ActiveAuctionState extends DocumentData {
  currentPlayerId: string;
  setId: string;
  currentBid: number;
  status: 'idle' | 'drawing' | 'bidding' | 'sold' | 'unsold';
  hammerStep: number; // 0: None, 1: Once, 2: Twice, 3: Final Call, 4: Sold
  isSold: boolean;
  isUnsold: boolean;
  userId: string;
  lastUpdated: any;
  history: ActionEvent[];
  undrawnIds: string[];
}

export interface Squad extends DocumentData {
    id: string;
    name: string;
    moneySpent: number;
    moneyLeft: number;
    budgetStatus: 'OK' | 'OVER';
    totalPoints: number;
    playersList?: string; // Format: "Name:Price:Role:Category;..."
    userId: string;
    order: number;
}

export const OFFICIAL_HOUSES = [
  "Sundarbans", "Kanha", "Wayanad", "Kaziranga", "Corbett", "Bandipur",
  "Nilgiri", "Gir", "Nallamala", "Saranda", "Pichavaram", "Namdapha"
];

export const SQUAD_RULES = {
  MIN_PLAYERS: 11,
  MAX_PLAYERS: 15,
  BATTERS: 4,
  WK: 1,
  AR: 2,
  BOWLERS: 3,
  FLOATER: 1,
  MIN_UNCAPPED: 3,
  MAX_OVERSEAS: 4,
  TOTAL_PURSE: 80 // Crore
};
