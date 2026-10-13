
import { useState, type FormEvent } from "react";
import { useGameState } from "../hooks/useGameState";
import { socket } from "../services/socket";
import DrawingCanvas from "../components/game/DrawingCanvas/DrawingCanvas";

export default function GamePage() {
  const {
    room,
    players,
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

  const isDrawer = socket.id === drawerId;

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
    return <p>No room found.</p>;
  }

  if (finished) {
    return (
      <main>
        <h1>Game Over</h1>
        <h2>Winner: {winner?.name || "No winner"}</h2>

        <h3>Final Scores</h3>
        {finalScores.map(player => (
          <p key={player.id}>
            {player.name}: {player.score}
          </p>
        ))}

        <button onClick={leaveRoom}>Leave Game</button>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Skoodle</h1>

      <p>Room: {room.roomCode}</p>
      <p>Round: {round} / {room.settings.rounds}</p>

      <p>
        Drawing:{" "}
        {players.find(player => player.id === drawerId)?.name ||
          "Waiting..."}
      </p>

      <p>
  {isDrawing ? "Drawing Time" : "Word Selection Time"}: {timeLeft}s
</p>

      {/* Word selection */}
      {isDrawer && wordChoices.length > 0 && !isDrawing && (
        <section>
          <h3>Choose a word</h3>
          {wordChoices.map(word => (
            <button
              key={word}
              onClick={() => selectWord(word)}
            >
              {word}
            </button>
          ))}
        </section>
      )}

      {/* Word hint */}
      {isDrawing && (
  <h3>
    {isDrawer
      ? `Word : ${selectedWord || "Loading word..."}`
      : `Guess the word: ${maskedWord}`}
  </h3>
)}

      <div
        style={{
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        {/* Canvas */}
        <section style={{ flex: "2 1 500px" }}>
          <h3>Canvas</h3>
          <DrawingCanvas />
        </section>

        {/* Sidebar */}
        <aside style={{ flex: "1 1 260px" }}>
          <h3>Scoreboard</h3>

          {players.map(player => (
            <p key={player.id}>
              {player.name}: {player.score}
              {player.id === drawerId ? " (Drawing)" : ""}
            </p>
          ))}

          <h3>Chat / Guesses</h3>

          <div
            style={{
              height: 260,
              overflowY: "auto",
              border: "1px solid gray",
              padding: 10,
              backgroundColor: "white",
            }}
          >
            {messages.map((entry, index) => (
              <p key={index}>
                <strong>
                  {entry.playerId
                    ? players.find(p => p.id === entry.playerId)?.name ||
                      "Player"
                    : "System"}
                  :
                </strong>{" "}
                {entry.message}
              </p>
            ))}
          </div>

          <form onSubmit={sendGuess}>
            <input
              value={guess}
              onChange={event => setGuess(event.target.value)}
              placeholder="Type your guess"
              disabled={!isDrawing || isDrawer}
            />

            <button
              type="submit"
              disabled={!isDrawing || isDrawer || !guess.trim()}
            >
              Send
            </button>
          </form>

          {error && <p style={{ color: "red" }}>{error}</p>}
        </aside>
      </div>

      <button onClick={leaveRoom}>Leave Room</button>
    </main>
  );
}
