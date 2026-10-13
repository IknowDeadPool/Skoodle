import { useState } from "react";
import { socket } from "../services/socket";
import type { RoomData, ServerResponse } from "../types";
import { useGameState } from "../hooks/useGameState";
import { savePlayerSession } from "../services/playerSession";

interface Props {
  onRoomJoined: (room: RoomData) => void;
}

export default function HomePage({ onRoomJoined }: Props) {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { setPlayerId } = useGameState();

  function connect(): Promise<void> {
    if (socket.connected) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Cannot connect to backend"));
      }, 5000);

      function onConnect() {
        cleanup();
        resolve();
      }

      function onError(error: Error) {
        cleanup();
        reject(error);
      }

      function cleanup() {
        clearTimeout(timeout);
        socket.off("connect", onConnect);
        socket.off("connect_error", onError);
      }

      socket.once("connect", onConnect);
      socket.once("connect_error", onError);
      socket.connect();
    });
  }

  async function sendRequest(event: string, payload: object) {
    setLoading(true);
    setError("");

    try {
      await connect();

      const response = (await socket
        .timeout(5000)
        .emitWithAck(event, payload)) as ServerResponse;

      console.log("HOME RESPONSE:", {
        event,
        success: response.success,
        playerId: response.playerId,
        hostId: response.hostId,
        roomCode: response.roomCode,
        hasReconnectToken: Boolean(response.reconnectToken),
      });

      if (
        !response.success ||
        !response.roomCode ||
        !response.players ||
        !response.settings ||
        !response.playerId ||
        !response.reconnectToken
      ) {
        throw new Error(response.error || "Incomplete room response");
      }
      setPlayerId(response.playerId);

      savePlayerSession({
        roomCode: response.roomCode,
        playerId: response.playerId,
        reconnectToken: response.reconnectToken,
      });

      onRoomJoined({
        roomCode: response.roomCode,
        players: response.players,
        settings: response.settings,
        hostId: response.hostId,
        status: response.status || "WAITING",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Skoodle</h1>
      <p>Draw and guess with friends</p>

      <input
        placeholder="Your name"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
      />

      <div>
        <button
          disabled={loading}
          onClick={() =>
            sendRequest("room:quickPlay", {
              playerName,
            })
          }
        >
          Quick Play
        </button>

        <button
          disabled={loading}
          onClick={() =>
            sendRequest("room:create", {
              playerName,
              settings: {
                rounds: 3,
                drawTime: 80,
                wordMode: "default",
                customWords: [],
              },
            })
          }
        >
          Create Private Room
        </button>
      </div>

      <div>
        <input
          placeholder="Room code"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
        />

        <button
          disabled={loading || !roomCode.trim()}
          onClick={() =>
            sendRequest("room:join", {
              roomCode,
              playerName,
            })
          }
        >
          Join Room
        </button>
      </div>

      {loading && <p>Connecting...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
