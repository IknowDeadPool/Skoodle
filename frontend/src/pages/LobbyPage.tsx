
import { useEffect, useState } from "react";
import { socket } from "../services/socket";
import type { Player, RoomData } from "../types";
import { useGameState } from "../hooks/useGameState";
import "./LobbyPage.css";

interface Props {
  room: RoomData;
  onLeave: () => void;
}

type PlayersUpdatedPayload =
  | Player[]
  | {
      players: Player[];
      hostId?: string | null;
    };

export default function LobbyPage({
  room,
  onLeave
}: Props) {
  const [players, setPlayers] = useState<Player[]>(room.players);
  const [hostId, setHostId] = useState<string | null>(
    room.hostId ?? null
  );

  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const { playerId } = useGameState();

  const isHost =
    hostId !== null && playerId === hostId;

  const isPrivate = hostId !== null;

  const inviteLink =
    `${window.location.origin}/room/${encodeURIComponent(room.roomCode)}`;

  useEffect(() => {
    setPlayers(room.players);
    setHostId(room.hostId ?? null);
  }, [room.roomCode, room.players, room.hostId]);

  useEffect(() => {
    const updatePlayers = (data: PlayersUpdatedPayload) => {
      if (Array.isArray(data)) {
        setPlayers(data);
      } else {
        setPlayers(data.players);
        if (data.hostId !== undefined) {
          setHostId(data.hostId);
        }
      }
    };

    const updateHost = (data: {
      hostId: string | null;
    }) => {
      setHostId(data.hostId);
    };

    const handleGameStarted = (data: unknown) => {
      console.log("GAME START EVENT RECEIVED:", data);
    };

    socket.on("room:playersUpdated", updatePlayers);
    socket.on("room:hostUpdated", updateHost);
    socket.on("game:turnStarted", handleGameStarted);

    return () => {
      socket.off("room:playersUpdated", updatePlayers);
      socket.off("room:hostUpdated", updateHost);
      socket.off("game:turnStarted", handleGameStarted);
    };
  }, []);



  function startGame() {
    setStarting(true);
    setError("");

    socket.timeout(5000).emit(
      "game:start",
      {},
      (
        timeoutError: Error | null,
        response?: {
          success: boolean;
          error?: string;
        }
      ) => {
        setStarting(false);

        if (timeoutError) {
          setError("Server did not respond. Please try again.");
          return;
        }

        if (!response?.success) {
          setError(
            response?.error || "Cannot start game"
          );
        }
      }
    );
  }

  function leaveRoom() {
  setLeaving(true);
  setError("");

  socket.timeout(5000).emit(
    "room:leave",
    {},
    (
      timeoutError: Error | null,
      response?: { success: boolean; error?: string }
    ) => {
      setLeaving(false);

      if (timeoutError) {
        setError("Unable to leave room. Please try again.");
        return;
      }

      if (response?.success) {
        onLeave();
      } else {
        setError(response?.error || "Unable to leave room");
      }
    }
  );
}

  async function copyInviteLink() {
  try {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setError("");
  } catch {
    setCopied(false);
    setError("Could not copy the invite link. Please copy it manually.");
  }
}

  return (
    <main className="sk-lobby">
      <div className="sk-lobby-container">

        <header className="sk-lobby-header">
          <div className="sk-lobby-brand">
            <div className="sk-lobby-logo">✏️</div>

            <div>
              <h1>Skoodle</h1>
              <p className="sk-lobby-subtitle">
                Multiplayer drawing & guessing
              </p>
            </div>
          </div>

          <button
            className="sk-lobby-btn sk-lobby-btn-danger"
            onClick={leaveRoom}
            disabled={leaving}
          >
            {leaving ? "Leaving..." : "Leave Room"}
          </button>
        </header>

        <section className="sk-lobby-card">
          <h2>
            {isPrivate ? "Private Room" : "Public Lobby"}
          </h2>

          <p className="sk-lobby-card-description">
            {isPrivate
              ? "Invite your friends to join the game."
              : "Waiting for other players to join."}
          </p>

          {isPrivate && (
            <>
              <div className="sk-lobby-invite">
                <span className="sk-lobby-invite-link">
                  {inviteLink}
                </span>

                <button
                  className="sk-lobby-btn sk-lobby-btn-primary"
                  onClick={copyInviteLink}
                >
                  {copied ? "✓ Copied" : "🔗 Copy Link"}
                </button>
              </div>

              {copied && (
                <p className="sk-lobby-success">
                  Invite link copied! Share it with friends.
                </p>
              )}
            </>
          )}

          <div className="sk-lobby-room-code">
            Room code: <strong>{room.roomCode}</strong>
          </div>
        </section>

        <section className="sk-lobby-card">
          <h2>Players ({players.length})</h2>

          <p className="sk-lobby-card-description">
            {players.length < 2
              ? "At least two players are needed to start."
              : "Players are ready for the game!"}
          </p>

          <div className="sk-lobby-players">
            {players.map(player => (
              <div
                className="sk-lobby-player"
                key={player.id}
              >
                <div className="sk-lobby-avatar">
                  {player.name.charAt(0).toUpperCase()}
                </div>

                <div>
                  <div className="sk-lobby-player-name">
                    {player.name}
                    {player.id === playerId
                      ? " (You)"
                      : ""}
                  </div>

                  {player.id === hostId && (
                    <div className="sk-lobby-player-role">
                      👑 Host
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="sk-lobby-actions">
            <span className="sk-lobby-waiting">
              {players.length < 2
                ? "Waiting for more players..."
                : isHost
                  ? "Everyone is ready. Start when you like!"
                  : "Waiting for the host to start..."}
            </span>

            {isHost && (
              <button
                className="sk-lobby-btn sk-lobby-btn-primary"
                disabled={players.length < 2 || starting}
                onClick={startGame}
              >
                {starting ? "Starting..." : "▶ Start Game"}
              </button>
            )}
          </div>

          {error && (
            <p className="sk-lobby-error">{error}</p>
          )}
        </section>
      </div>
    </main>
  );
}
