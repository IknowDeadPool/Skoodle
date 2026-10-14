
import {
  useEffect,
  useRef,
  useState,
  type FormEvent
} from "react";

import { useGameState } from "../hooks/useGameState";
import { socket } from "../services/socket";
import DrawingCanvas from "../components/game/DrawingCanvas/DrawingCanvas";
import "./GamePage.css";

export default function GamePage() {
  const {
    room,
    players,
    playerId,
    drawerId,
    round,
    wordChoices,
    maskedWord,
    isDrawing,
    timeLeft,
    messages,
    finished,
    winner,
    finalScores,
    selectWord,
    leaveRoom,
    selectedWord,
  } = useGameState();

  const [guess, setGuess] = useState("");
  const [error, setError] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  const isDrawer =
    playerId !== null && playerId === drawerId;

  const drawer = players.find(
    player => player.id === drawerId
  );

  const sortedPlayers = [...players].sort(
    (a, b) => b.score - a.score
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  }, [messages]);

  function sendGuess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = guess.trim();

    if (!message || !isDrawing || isDrawer) return;

    socket.emit(
      "chat:message",
      { message },
      (response: {
        success: boolean;
        status?: string;
        error?: string;
      }) => {
        if (!response.success) {
          setError(response.error || "Unable to send guess");
        } else if (response.status === "INVALID") {
          setError("You cannot guess right now");
        } else {
          setError("");
        }
      }
    );

    setGuess("");
  }

  if (!room) {
    return (
      <main className="sk-game">
        <p>No room found.</p>
      </main>
    );
  }

  if (finished) {
    return (
      <main className="sk-game">
        <div className="sk-game-finished">
          <div style={{ fontSize: 48 }}>🏆</div>

          <h1>Game Over!</h1>

          <h2>
            Winner: {winner?.name || "No winner"}
          </h2>

          <h3>Final Scores</h3>

          {[...finalScores]
            .sort((a, b) => b.score - a.score)
            .map((player, index) => (
              <div
                className="sk-game-final-row"
                key={player.id}
              >
                <span>
                  {index === 0 ? "🥇 " : ""}
                  {player.name}
                </span>

                <strong>{player.score} pts</strong>
              </div>
            ))}

          <button
            className="sk-game-btn sk-game-btn-danger"
            style={{ marginTop: 24 }}
            onClick={leaveRoom}
          >
            Leave Game
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="sk-game">
      <div className="sk-game-shell">

        {/* Header */}
        <header className="sk-game-header">
          <div className="sk-game-brand">
            <div className="sk-game-logo">✏️</div>

            <div>
              <h1>Skoodle</h1>
              <p className="sk-game-room">
                Room: {room.roomCode}
              </p>
            </div>
          </div>

          <button
            className="sk-game-btn sk-game-btn-danger"
            onClick={leaveRoom}
          >
            Leave Room
          </button>
        </header>

        {/* Game statistics */}
        <section className="sk-game-stats">
          <div className="sk-game-stat">
            <div>
              <div className="sk-game-stat-label">
                ROUND
              </div>
              <div className="sk-game-stat-value">
                {round} / {room.settings.rounds}
              </div>
            </div>
            <span>🎯</span>
          </div>

          <div className="sk-game-stat">
            <div>
              <div className="sk-game-stat-label">
                {isDrawing
                  ? "DRAWING TIME"
                  : "WORD SELECTION"}
              </div>
              <div
                className={`sk-game-stat-value ${
                  timeLeft <= 10
                    ? "sk-game-timer-low"
                    : ""
                }`}
              >
                {timeLeft}s
              </div>
            </div>
            <span>⏱️</span>
          </div>

          <div className="sk-game-stat">
            <div>
              <div className="sk-game-stat-label">
               Drawing
              </div>
              <div className="sk-game-stat-value">
                {drawer?.name || "Waiting..."}
              </div>
            </div>
            <span>🎨</span>
          </div>
        </section>

        {/* Word selection */}
        {isDrawer &&
          wordChoices.length > 0 &&
          !isDrawing && (
            <section className="sk-game-choices">
              <h3>Choose a word to draw</h3>

              <div className="sk-game-choice-row">
                {wordChoices.map(word => (
                  <button
                    key={word}
                    className="sk-game-btn sk-game-btn-primary"
                    onClick={() => selectWord(word)}
                  >
                    {word}
                  </button>
                ))}
              </div>
            </section>
          )}

        {/* Word hint */}
        {isDrawing && (
          <section className="sk-game-word">
            <div className="sk-game-word-label">
              {isDrawer
                ? "YOUR WORD"
                : "GUESS THE WORD"}
            </div>

            <div className="sk-game-word-value">
              {isDrawer
                ? selectedWord || "Loading word..."
                : maskedWord}
            </div>
          </section>
        )}

        {/* Main layout */}
        <div className="sk-game-layout">
          <section className="sk-game-canvas-section">
            <DrawingCanvas />
          </section>

          <aside className="sk-game-sidebar">

            {/* Scoreboard */}
            <section className="sk-game-panel">
              <div className="sk-game-panel-title">
                <span>🏆 Scoreboard</span>
                <span>{players.length} players</span>
              </div>

              <div className="sk-game-player-list">
                {sortedPlayers.map(player => (
                  <div
                    key={player.id}
                    className="sk-game-player"
                  >
                    <div className="sk-game-player-info">
                      <div className="sk-game-avatar">
                        {player.name.charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <div className="sk-game-player-name">
                          {player.name}
                          {player.id === playerId
                            ? " (You)"
                            : ""}
                        </div>

                        {player.id === drawerId && (
                          <div className="sk-game-player-role">
                            ✏️ Drawing
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="sk-game-score">
                      {player.score} pts
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Chat */}
            <section className="sk-game-panel">
              <div className="sk-game-panel-title">
                <span>💬 Live Chat</span>
                <span>Guesses</span>
              </div>

              <div className="sk-game-chat">
                <div className="sk-game-chat-messages">
                  {messages.length === 0 && (
                    <p
                      style={{
                        color: "#94a3b8",
                        fontSize: 13,
                        textAlign: "center"
                      }}
                    >
                      No guesses yet. Be the first!
                    </p>
                  )}

                  {messages.map((entry, index) => {
                    const isSystem = !entry.playerId;
                    const isMine =
                      entry.playerId === playerId;

                    const name = isSystem
                      ? "System"
                      : players.find(
                          p => p.id === entry.playerId
                        )?.name || "Player";

                    return (
                      <div
                        key={index}
                        className={`sk-game-message ${
                          isSystem
                            ? "system"
                            : isMine
                              ? "mine"
                              : ""
                        }`}
                      >
                        <span className="sk-game-message-name">
                          {name}
                        </span>

                        <span>{entry.message}</span>
                      </div>
                    );
                  })}

                  <div ref={chatEndRef} />
                </div>

                <form
                  className="sk-game-chat-form"
                  onSubmit={sendGuess}
                >
                  <input
                    className="sk-game-chat-input"
                    value={guess}
                    onChange={event =>
                      setGuess(event.target.value)
                    }
                    placeholder={
                      isDrawer
                        ? "You're drawing..."
                        : isDrawing
                          ? "Type your guess..."
                          : "Waiting for next turn..."
                    }
                    disabled={!isDrawing || isDrawer}
                  />

                  <button
                    className="sk-game-btn sk-game-btn-primary"
                    type="submit"
                    disabled={
                      !isDrawing ||
                      isDrawer ||
                      !guess.trim()
                    }
                  >
                    Send ➤
                  </button>
                </form>

                {error && (
                  <div className="sk-game-error">
                    {error}
                  </div>
                )}
              </div>
            </section>

          </aside>
        </div>
      </div>
    </main>
  );
}
