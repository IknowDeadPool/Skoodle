
// import HomePage from "./pages/HomePage";
// import LobbyPage from "./pages/LobbyPage";
// import GamePage from "./pages/GamePage";
// import { useGameState } from "./hooks/useGameState";

// export default function App() {
//   const { room, setRoom, round, drawerId, finished } = useGameState();

//   console.log("APP STATE:", {
//     roomCode: room?.roomCode,
//     round,
//     drawerId,
//     finished,
//   });

//   if (!room) {
//     return <HomePage onRoomJoined={setRoom} />;
//   }

//   // Once the backend announces a turn, show the game.
//   if (round > 0 || drawerId !== null || finished) {
//     return <GamePage />;
//   }

//   return (
//     <LobbyPage
//       room={room}
//       onLeave={() => setRoom(null)}
//     />
//   );
// }




import HomePage from "./pages/HomePage";
import LobbyPage from "./pages/LobbyPage";
import GamePage from "./pages/GamePage";
import { useGameState } from "./hooks/useGameState";

function getInviteRoomCode(): string {
  const match = window.location.pathname.match(
    /^\/room\/([A-Za-z0-9_-]+)\/?$/
  );

  return match ? match[1] : "";
}

export default function App() {
  const { room, setRoom, round, drawerId, finished } = useGameState();

  const inviteRoomCode = getInviteRoomCode();

  if (!room) {
    return (
      <HomePage
        initialRoomCode={inviteRoomCode}
        onRoomJoined={(joinedRoom) => {
          setRoom(joinedRoom);

          // Clear the invitation URL after successfully joining.
          window.history.replaceState({}, "", "/");
        }}
      />
    );
  }

  if (round > 0 || drawerId !== null || finished) {
    return <GamePage />;
  }

  return (
    <LobbyPage
      room={room}
      onLeave={() => {
        setRoom(null);
        window.history.replaceState({}, "", "/");
      }}
    />
  );
}
