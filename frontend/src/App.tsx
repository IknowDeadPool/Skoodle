
import HomePage from "./pages/HomePage";
import LobbyPage from "./pages/LobbyPage";
import GamePage from "./pages/GamePage";
import { useGameState } from "./hooks/useGameState";

export default function App() {
  const { room, setRoom, round, drawerId, finished } = useGameState();

  console.log("APP STATE:", {
    roomCode: room?.roomCode,
    round,
    drawerId,
    finished,
  });

  if (!room) {
    return <HomePage onRoomJoined={setRoom} />;
  }

  // Once the backend announces a turn, show the game.
  if (round > 0 || drawerId !== null || finished) {
    return <GamePage />;
  }

  return (
    <LobbyPage
      room={room}
      onLeave={() => setRoom(null)}
    />
  );
}
