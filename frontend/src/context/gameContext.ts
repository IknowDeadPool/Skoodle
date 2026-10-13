
import { createContext } from "react";
import type { Player, RoomData } from "../types";

export interface ChatMessage {
  playerId?: string;
  message: string;
}

export interface Winner {
  id: string;
  name: string;
  score: number;
}

export interface GameContextType {
  room: RoomData | null;
  setRoom: (room: RoomData | null) => void;
  players: Player[];
  drawerId: string | null;
  round: number;
  wordChoices: string[];
  maskedWord: string;
  isDrawing: boolean;
  timeLeft: number;
  messages: ChatMessage[];
  winner: Winner | null;
  finalScores: Player[];
  finished: boolean;
  
  selectWord: (word: string) => void;
  leaveRoom: () => void;
  selectedWord: string;
  setSelectedWord: (word: string) => void;
}

export const GameContext = createContext<GameContextType | null>(null);
