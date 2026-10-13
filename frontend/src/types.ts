
export interface Player {
  id: string;
  name: string;
  score: number;
}

export interface RoomSettings {
  rounds: number;
  drawTime: number;
  wordMode: string;
  customWords: string[];
}

export interface RoomData {
  roomCode: string;
  players: Player[];
  settings: RoomSettings;
  hostId?: string | null;
  status?: "WAITING" | "PLAYING" | "FINISHED";
}

export interface ServerResponse extends Partial<RoomData> {
  success: boolean;
  error?: string;
  playerId?: string;
  reconnectToken?: string;
}
