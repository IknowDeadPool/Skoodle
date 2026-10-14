import { useEffect, useState, type ReactNode } from "react";

import { socket } from "../services/socket";
import type { Player, RoomData } from "../types";
import { GameContext } from "./gameContext";
import {
  savePlayerSession,
  getPlayerSession,
  clearPlayerSession,
} from "../services/playerSession";

interface ChatMessage {
  playerId?: string;
  message: string;
}

interface Winner {
  id: string;
  name: string;
  score: number;
}

interface GameSnapshot {
  state: "WAITING" | "WORD_SELECTION" | "DRAWING" | "FINISHED";
  round: number;
  drawerId: string | null;
  maskedWord: string | null;
  remainingTime: number | null;
  endsAt: number | null;
  wordChoices?: string[];
  players?: Player[];
}

interface GameSyncResponse {
  success: boolean;
  game?: GameSnapshot | null;
  error?: string;
}

interface ReconnectResponse {
  success: boolean;
  error?: string;
  roomCode?: string;
  playerId?: string;
  reconnectToken?: string;
  players?: Player[];
  settings?: RoomData["settings"];
  hostId?: string | null;
  status?: RoomData["status"];
  game?: GameSnapshot | null;
  selectedWord?: string | null;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [room, setRoomState] = useState<RoomData | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [wordChoices, setWordChoices] = useState<string[]>([]);
  const [selectedWord, setSelectedWord] = useState("");
  const [maskedWord, setMaskedWord] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [winner, setWinner] = useState<Winner | null>(null);
  const [finalScores, setFinalScores] = useState<Player[]>([]);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  function setRoom(nextRoom: RoomData | null) {
    setRoomState(nextRoom);

    if (nextRoom) {
      setPlayers(nextRoom.players);
    } else {
      setPlayerId(null);
      setPlayers([]);
      setDrawerId(null);
      setRound(0);
      setWordChoices([]);
      setMaskedWord("");
      setIsDrawing(false);
      setTimeLeft(0);
      setMessages([]);
      setWinner(null);
      setFinalScores([]);
      setFinished(false);
      setSelectedWord("");
      setEndsAt(null);
    }
  }

  function applyGameSnapshot(game: GameSnapshot) {
    setRound(game.round);
    setDrawerId(game.drawerId);
    setMaskedWord(game.maskedWord ?? "");
    setIsDrawing(game.state === "DRAWING");
    setFinished(game.state === "FINISHED");
    setWordChoices(game.wordChoices ?? []);
    setEndsAt(game.endsAt);

    if (game.players) {
      setPlayers(game.players);
    }
  }

  function syncGame() {
    socket.emit("game:sync", (response: GameSyncResponse) => {
      if (!response.success) {
        console.error("Game sync failed:", response.error);
        return;
      }

      if (!response.game) return;

      applyGameSnapshot(response.game);
    });
  }

  
function restoreSession() {
  const session = getPlayerSession();

  if (!session || !socket.connected) return;

  socket.timeout(5000).emit(
    "room:reconnect",
    session,
    (error: Error | null, response?: ReconnectResponse) => {
      if (error) {
        console.error("Reconnection timed out:", error);
        // Keep the session for a future retry.
        return;
      }

      if (!response?.success) {
        console.error("Room reconnection failed:", response?.error);
        clearPlayerSession();
        setRoom(null);
        return;
      }

      if (
        !response.roomCode ||
        !response.playerId ||
        !response.reconnectToken ||
        !response.players ||
        !response.settings
      ) {
        console.error("Incomplete reconnect response");
        clearPlayerSession();
        setRoom(null);
        return;
      }

      savePlayerSession({
        roomCode: response.roomCode,
        playerId: response.playerId,
        reconnectToken: response.reconnectToken,
      });

      setPlayerId(response.playerId);

      setRoom({
        roomCode: response.roomCode,
        players: response.players,
        settings: response.settings,
        hostId: response.hostId ?? null,
        status: response.status,
      } as RoomData);

      if (response.game) {
        applyGameSnapshot(response.game);
      }

      setSelectedWord(response.selectedWord ?? "");
    }
  );
}


  useEffect(() => {
    function onPlayersUpdated(updatedPlayers: Player[]) {
      setPlayers(updatedPlayers);
    }

    function onTurnStarted(data: {
      drawerId: string;
      round: number;
      endsAt: number;
    }) {
      setDrawerId(data.drawerId);
      setRound(data.round);
      setSelectedWord("");
      setWordChoices([]);
      setMaskedWord("");
      setIsDrawing(false);
      setEndsAt(data.endsAt);
    }

    function onDrawingStarted(data: {
      drawerId: string;
      maskedWord: string;
      duration: number;
      endsAt: number;
    }) {
      setDrawerId(data.drawerId);
      setMaskedWord(data.maskedWord);
      setWordChoices([]);
      setIsDrawing(true);
      setEndsAt(data.endsAt);
    }

    function onWordChoices(choices: string[]) {
      setWordChoices(choices);
    }

    function onHintUpdated(data: { maskedWord: string }) {
  setMaskedWord(data.maskedWord);
}

    // function onDrawingStarted(data: {
    //   drawerId: string;
    //   maskedWord: string;
    //   duration: number;
    // }) {
    //   setDrawerId(data.drawerId);
    //   setMaskedWord(data.maskedWord);
    //   setWordChoices([]);
    //   setIsDrawing(true);
    //   setTimeLeft(data.duration);
    // }

    function onChatMessage(data: ChatMessage) {
      setMessages((previous) => [...previous, data]);
    }

    function onCloseGuess(data: { message: string }) {
      setMessages((previous) => [...previous, { message: data.message }]);
    }

    function onCorrectGuess(data: { playerId: string; points: number }) {
      setPlayers((previous) =>
        previous.map((player) =>
          player.id === data.playerId
            ? { ...player, score: player.score + data.points }
            : player,
        ),
      );

      setMessages((previous) => [
        ...previous,
        { message: "A player guessed correctly!" },
      ]);
    }

    function onTurnEnded(data: { word: string }) {
      setIsDrawing(false);
      setWordChoices([]);
      setEndsAt(null);

      setMessages((previous) => [
        ...previous,
        { message: `The word was: ${data.word}` },
      ]);
    }

    function onFinished(data: { winner: Winner | null; scores: Player[] }) {
      setFinished(true);
      setWinner(data.winner);
      setFinalScores(data.scores);
      setIsDrawing(false);
      setEndsAt(null);
    }

    function onSelectedWord(data: { word: string }) {
      setSelectedWord(data.word);
    }

    socket.on("room:playersUpdated", onPlayersUpdated);
    socket.on("game:turnStarted", onTurnStarted);
    socket.on("game:wordChoices", onWordChoices);
    socket.on("game:drawingStarted", onDrawingStarted);
    socket.on("game:hintUpdated", onHintUpdated);
    socket.on("chat:message", onChatMessage);
    socket.on("game:closeGuess", onCloseGuess);
    socket.on("game:correctGuess", onCorrectGuess);
    socket.on("game:turnEnded", onTurnEnded);
    socket.on("game:finished", onFinished);
    socket.on("game:selectedWord", onSelectedWord);

    return () => {
      socket.off("room:playersUpdated", onPlayersUpdated);
      socket.off("game:turnStarted", onTurnStarted);
      socket.off("game:wordChoices", onWordChoices);
      socket.off("game:drawingStarted", onDrawingStarted);
      socket.off("game:hintUpdated", onHintUpdated);
      socket.off("chat:message", onChatMessage);
      socket.off("game:closeGuess", onCloseGuess);
      socket.off("game:correctGuess", onCorrectGuess);
      socket.off("game:turnEnded", onTurnEnded);
      socket.off("game:finished", onFinished);
      socket.off("game:selectedWord", onSelectedWord);
    };
  }, []);

  useEffect(() => {
    if (!room?.roomCode || !socket.connected) return;

    syncGame();
  }, [room?.roomCode]);

  useEffect(() => {
    function handleConnect() {
      restoreSession();
    }

    socket.on("connect", handleConnect);

    if (socket.connected) {
      restoreSession();
    }

    return () => {
      socket.off("connect", handleConnect);
    };
  }, []);

  useEffect(() => {
    if (endsAt === null) {
      setTimeLeft(0);
      return;
    }

    function updateTimer() {
      const remaining = Math.max(0, Math.ceil((endsAt! - Date.now()) / 1000));

      setTimeLeft(remaining);
    }

    updateTimer();

    const interval = setInterval(updateTimer, 250);

    return () => clearInterval(interval);
  }, [endsAt]);

  function selectWord(word: string) {
    socket.emit(
      "game:selectWord",
      { word },
      (response: { success: boolean; error?: string }) => {
        if (response.success) {
          setSelectedWord(word);
        } else {
          console.error(response.error);
        }
      },
    );
  }

  function leaveRoom() {
    socket.emit(
      "room:leave",
      {},
      (response: { success: boolean; error?: string }) => {
        if (response.success) {
          clearPlayerSession();
          setRoom(null);
        } else {
          console.error(response.error);
        }
      },
    );
  }

  console.log("PROVIDER STATE:", {
    playerId,
    roomCode: room?.roomCode,
  });
  return (
    <GameContext.Provider
      value={{
        room,
        setRoom,
        playerId,
        setPlayerId,
        players,
        drawerId,
        round,
        wordChoices,
        maskedWord,
        isDrawing,
        timeLeft,
        messages,
        winner,
        finalScores,
        finished,
        selectWord,
        leaveRoom,
        selectedWord,
        setSelectedWord,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
