import { useEffect, useState, type ReactNode } from "react";

import { socket } from "../services/socket";
import type { Player, RoomData } from "../types";
import { GameContext } from "./gameContext";

interface ChatMessage {
  playerId?: string;
  message: string;
}

interface Winner {
  id: string;
  name: string;
  score: number;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [room, setRoomState] = useState<RoomData | null>(null);
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

  const [finished, setFinished] = useState(false);

  function setRoom(nextRoom: RoomData | null) {
    setRoomState(nextRoom);

    if (nextRoom) {
      setPlayers(nextRoom.players);
    } else {
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
    }
  }

  useEffect(() => {
    function onPlayersUpdated(updatedPlayers: Player[]) {
      setPlayers(updatedPlayers);
    }

    function onTurnStarted(data: { drawerId: string; round: number }) {
      setDrawerId(data.drawerId);
      setRound(data.round);
      setSelectedWord("");
      setWordChoices([]);
      setMaskedWord("");
      setIsDrawing(false);
      setTimeLeft(10);
    }

    function onWordChoices(choices: string[]) {
      setWordChoices(choices);
    }

    function onDrawingStarted(data: {
      drawerId: string;
      maskedWord: string;
      duration: number;
    }) {
      setDrawerId(data.drawerId);
      setMaskedWord(data.maskedWord);
      setWordChoices([]);
      setIsDrawing(true);
      setTimeLeft(data.duration);
    }

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
    }

    function onSelectedWord(data: { word: string }) {
      setSelectedWord(data.word);
    }

    socket.on("room:playersUpdated", onPlayersUpdated);
    socket.on("game:turnStarted", onTurnStarted);
    socket.on("game:wordChoices", onWordChoices);
    socket.on("game:drawingStarted", onDrawingStarted);
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
      socket.off("chat:message", onChatMessage);
      socket.off("game:closeGuess", onCloseGuess);
      socket.off("game:correctGuess", onCorrectGuess);
      socket.off("game:turnEnded", onTurnEnded);
      socket.off("game:finished", onFinished);
      socket.off("game:selectedWord", onSelectedWord);
    };
  }, []);

  useEffect(() => {
  if (round === 0 || finished || timeLeft <= 0) return;

  const timer = setTimeout(() => {
    setTimeLeft(previous => Math.max(0, previous - 1));
  }, 1000);

  return () => clearTimeout(timer);
}, [round, finished, timeLeft]);

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
          setRoom(null);
        } else {
          console.error(response.error);
        }
      },
    );
  }
  console.log("GAME PROVIDER STATE:", {
    room: room?.roomCode,
    round,
    drawerId,
  });

  return (
    <GameContext.Provider
      value={{
        room,
        setRoom,
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
