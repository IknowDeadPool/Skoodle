
const SESSION_KEY = "skoodle:playerSession";

export interface PlayerSession {
  roomCode: string;
  playerId: string;
  reconnectToken: string;
}

export function savePlayerSession(session: PlayerSession): void {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify(session)
  );
}

export function getPlayerSession(): PlayerSession | null {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);

    if (!stored) return null;

    const session: unknown = JSON.parse(stored);

    if (
      typeof session !== "object" ||
      session === null ||
      !("roomCode" in session) ||
      !("playerId" in session) ||
      !("reconnectToken" in session) ||
      typeof session.roomCode !== "string" ||
      typeof session.playerId !== "string" ||
      typeof session.reconnectToken !== "string"
    ) {
      return null;
    }

    return {
      roomCode: session.roomCode,
      playerId: session.playerId,
      reconnectToken: session.reconnectToken,
    };
  } catch {
    return null;
  }
}

export function clearPlayerSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
