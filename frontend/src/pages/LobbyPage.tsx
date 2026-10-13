
import { useEffect, useState } from "react";
import { socket } from "../services/socket";
import type { Player, RoomData } from "../types";

interface Props {
  room: RoomData;
  onLeave: () => void;
}

export default function LobbyPage({ room, onLeave }: Props) {
  const [players, setPlayers] = useState<Player[]>(room.players);
  const [hostId, setHostId] = useState(room.hostId);
  const [error, setError] = useState("");

  useEffect(() => {
    const updatePlayers = (players: Player[]) => {
      setPlayers(players);
    };

    const updateHost = (data: { hostId: string | null }) => {
      setHostId(data.hostId);
    };

    socket.on("room:playersUpdated", updatePlayers);
    socket.on("room:hostUpdated", updateHost);

    const handleGameStarted = (data: unknown) => {
  console.log("GAME START EVENT RECEIVED:", data);
};

socket.on("game:turnStarted", handleGameStarted);

    return () => {
      socket.off("room:playersUpdated", updatePlayers);
      socket.off("room:hostUpdated", updateHost);
      socket.off("game:turnStarted", handleGameStarted);
    };
  }, []);

  
function startGame() {
  console.log("START GAME BUTTON CLICKED");

  socket.emit(
    "game:start",
    {},
    (response: { success: boolean; error?: string }) => {
      console.log("START GAME RESPONSE:", response);

      if (!response.success) {
        setError(response.error || "Cannot start game");
      }
    }
  );
}


  function leaveRoom() {
    socket.emit("room:leave", {}, (response: { success: boolean }) => {
      if (response.success) {
        onLeave();
      }
    });
  }

  return (
    <div>
      <h2>Room: {room.roomCode}</h2>

      <h3>Players ({players.length})</h3>

      {players.map(player => (
        <p key={player.id}>
          {player.name}
          {player.id === hostId ? " (Host)" : ""}
        </p>
      ))}

      {room.hostId != null && socket.id === hostId && (
        <button disabled={players.length < 2} onClick={startGame}>
          Start Game
        </button>
      )}

      {room.hostId == null && (
        <p>Waiting for players or game to start...</p>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}

      <button onClick={leaveRoom}>Leave Room</button>
    </div>
  );
}
