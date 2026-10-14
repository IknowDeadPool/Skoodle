import { useState } from "react";
import { socket } from "../services/socket";
import type { RoomData, ServerResponse } from "../types";
import { useGameState } from "../hooks/useGameState";
import { savePlayerSession } from "../services/playerSession";
import "./HomePage.css";
interface Props {
  onRoomJoined: (room: RoomData) => void;
  initialRoomCode?: string;
}

export default function HomePage({
  onRoomJoined,
  initialRoomCode = "",
}: Props) {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const isInvite = Boolean(initialRoomCode);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  type WordMode = "default" | "custom";

  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [rounds, setRounds] = useState(3);
  const [drawTime, setDrawTime] = useState(80);
  const [wordMode, setWordMode] = useState<WordMode>("default");
  const [customWordsInput, setCustomWordsInput] = useState("");

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

  function createPrivateRoom() {
    const customWords = customWordsInput
      .split(/[,\n]/)
      .map((word) => word.trim())
      .filter(Boolean);

    if (wordMode === "custom" && customWords.length < 3) {
      setError("Please enter at least 3 custom words.");
      return;
    }

    setError("");

    void sendRequest("room:create", {
      playerName,
      settings: {
        rounds,
        drawTime,
        wordMode,
        customWords: wordMode === "custom" ? customWords : [],
      },
    });
  }

  if (isInvite) {
    return (
      <main className="sk-home">
        <header className="sk-home-header">
          <div className="sk-home-brand">
            <div className="sk-home-logo">✏️</div>
            <h1>Skoodle</h1>
          </div>
          <div className="sk-home-tag">🎨 Draw • Guess • Win</div>
        </header>

        <div className="sk-home-main">
          <div className="sk-home-card">
            <h2>You're invited to Skoodle!</h2>
            <p>Your friend invited you to a private drawing game.</p>

            <div className="sk-home-invite-code">
              Room: <strong>{roomCode}</strong>
            </div>

            <label className="sk-home-label" htmlFor="sk-invite-name">
              What should we call you?
            </label>

            <input
              id="sk-invite-name"
              className="sk-home-input"
              placeholder="Enter your player name..."
              value={playerName}
              maxLength={24}
              onChange={(e) => setPlayerName(e.target.value)}
            />

            <button
              className="sk-home-btn sk-home-btn-primary"
              disabled={loading}
              onClick={() =>
                sendRequest("room:join", {
                  roomCode: roomCode.trim(),
                  playerName,
                })
              }
            >
              {loading ? "Joining..." : "Join Room →"}
            </button>

            {error && (
              <div className="sk-home-error" role="alert">
                {error}
              </div>
            )}

            <button
              className="sk-home-btn sk-home-btn-secondary"
              onClick={() => {
                window.location.href = "/";
              }}
            >
              Back to Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="sk-home">
      <header className="sk-home-header">
        <div className="sk-home-brand">
          <div className="sk-home-logo">✏️</div>
          <h1>Skoodle</h1>
        </div>

        <div className="sk-home-tag">🎨 Draw • Guess • Win</div>
      </header>

      <div className="sk-home-main">
        <div className="sk-home-card">
          <label className="sk-home-label" htmlFor="sk-player-name">
            What should we call you?
          </label>

          <input
            id="sk-player-name"
            className="sk-home-input"
            placeholder="Enter your player name..."
            value={playerName}
            maxLength={24}
            onChange={(e) => setPlayerName(e.target.value)}
          />

          <div className="sk-home-actions">
            <button
              className="sk-home-btn sk-home-btn-primary"
              disabled={loading}
              onClick={() =>
                sendRequest("room:quickPlay", {
                  playerName,
                })
              }
            >
              ⚡ Quick Play
            </button>

            {/* <button
            className="sk-home-btn sk-home-btn-secondary"
            disabled={loading}
            onClick={() =>
              sendRequest("room:create", {
                playerName,
                settings: {
                  rounds: 3,
                  drawTime: 80,
                  wordMode: "default",
                  customWords: []
                }
              })
            }
          >
            👥 Create Private Room
          </button> */}

            <button
              className="sk-home-btn sk-home-btn-secondary"
              disabled={loading}
              onClick={() => {
                setError("");
                setShowRoomSettings(true);
              }}
            >
              👥 Create Private Room
            </button>
          </div>

          
{showRoomSettings && (
  <div className="sk-room-settings">
    <h2>⚙️ Private Room Settings</h2>

    <label className="sk-home-label" htmlFor="sk-rounds">
      Number of Rounds
    </label>

    <select
      id="sk-rounds"
      className="sk-home-input"
      value={rounds}
      onChange={(e) => setRounds(Number(e.target.value))}
    >
      {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
        <option key={value} value={value}>
          {value} Rounds
        </option>
      ))}
    </select>

    <label className="sk-home-label" htmlFor="sk-draw-time">
      Drawing Time
    </label>

    <select
      id="sk-draw-time"
      className="sk-home-input"
      value={drawTime}
      onChange={(e) => setDrawTime(Number(e.target.value))}
    >
      {[30, 60, 80, 120].map((value) => (
        <option key={value} value={value}>
          {value} Seconds
        </option>
      ))}
    </select>

    <label className="sk-home-label" htmlFor="sk-word-mode">
      Word List
    </label>

    <select
      id="sk-word-mode"
      className="sk-home-input"
      value={wordMode}
      onChange={(e) =>
        setWordMode(e.target.value as WordMode)
      }
    >
      <option value="default">Default Words</option>
      <option value="custom">Custom Words</option>
    </select>

    {wordMode === "custom" && (
      <>
        <label className="sk-home-label" htmlFor="sk-custom-words">
          Custom Words
        </label>

        <textarea
          id="sk-custom-words"
          className="sk-home-input"
          rows={4}
          placeholder="apple, airplane, mountain, elephant"
          value={customWordsInput}
          onChange={(e) => setCustomWordsInput(e.target.value)}
        />

        <p className="sk-room-settings-hint">
          Enter at least 3 words, separated by commas or new lines.
        </p>
      </>
    )}

    <div className="sk-room-settings-actions">
      <button
        className="sk-home-btn sk-home-btn-secondary"
        disabled={loading}
        onClick={() => {
          setShowRoomSettings(false);
          setError("");
        }}
      >
        Cancel
      </button>

      <button
        className="sk-home-btn sk-home-btn-primary"
        disabled={loading}
        onClick={createPrivateRoom}
      >
        {loading ? "Creating..." : "Create Room →"}
      </button>
    </div>
  </div>
)}


          <div className="sk-home-divider">OR JOIN A FRIEND</div>

          <div className="sk-home-join">
            <input
              className="sk-home-input"
              placeholder="Room code"
              aria-label="Room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            />

            <button
              className="sk-home-btn sk-home-btn-dark"
              disabled={loading || !roomCode.trim()}
              onClick={() =>
                sendRequest("room:join", {
                  roomCode: roomCode.trim(),
                  playerName,
                })
              }
            >
              Join →
            </button>
          </div>

          {loading && (
            <p className="sk-home-loading">Connecting to Skoodle...</p>
          )}

          {error && (
            <div className="sk-home-error" role="alert">
              {error}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
