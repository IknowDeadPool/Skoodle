function createGameController(io, getGame, games) {


    function clearGameTimer(game) {
        if (game.timer) {
            clearTimeout(game.timer);
        }

        game.timer = null;
        game.turnEndsAt = null;
        game.wordSelectionEndsAt = null;
    }


    function finishGame(roomCode, game, forcedWinner = null) {
        if (games.get(roomCode) !== game) return;

        clearGameTimer(game);

        game.state = "FINISHED";
        game.room.status = "FINISHED";

        const scores = game.room.players
            .map(player => ({
                id: player.getId(),
                name: player.getName(),
                score: player.getScore()
            }))
            .sort((a, b) => b.score - a.score);

        const winner = forcedWinner
            ? {
                id: forcedWinner.getId(),
                name: forcedWinner.getName(),
                score: forcedWinner.getScore()
            }
            : scores[0] || null;

        io.to(roomCode).emit("game:finished", {
            winner,
            scores
        });

        games.delete(roomCode);
    }

    function advanceTurn(roomCode, game) {
        if (games.get(roomCode) !== game) return;

        clearGameTimer(game);

        if (game.state === "FINISHED") {
            finishGame(roomCode, game);
            return;
        }

        const result = game.checkGameOver();

        if (result?.gameOver) {
            finishGame(roomCode, game, result.winner);
            return;
        }

        // Reveal the previous word before moving to the next turn.
        if (game.currentWord) {
            io.to(roomCode).emit("game:turnEnded", {
                word: game.currentWord
            });
        }

        const drawer = game.nextTurn();

        if (game.state === "FINISHED") {
            finishGame(roomCode, game);
            return;
        }

        if (drawer) {
            sendWordChoices(roomCode, game);
        }
    }

    function scheduleTurnEnd(roomCode, game) {
        clearGameTimer(game);

        const duration = Number(game.room.settings.drawTime) || 80;
        game.turnEndsAt = Date.now() + duration * 1000;
        game.wordSelectionEndsAt = null;

        game.timer = setTimeout(() => {
            if (games.get(roomCode) !== game) return;
            if (game.state !== "DRAWING") return;

            advanceTurn(roomCode, game);
        }, duration * 1000);
    }

    function sendWordChoices(roomCode, game) {
        clearGameTimer(game);

        const drawer = game.getCurrentDrawer();

        if (!drawer) {
            advanceTurn(roomCode, game);
            return;
        }

        const choices = game.generateWordChoices();

        game.wordSelectionEndsAt = Date.now() + 10000;


        io.to(roomCode).emit("game:turnStarted", {
            drawerId: drawer.getId(),
            round: game.currentRound,
            endsAt: game.wordSelectionEndsAt
        });


        io.to(roomCode).emit("draw:state", game.drawing.snapshot());

        // Only the drawer receives the actual word choices.
        //io.to(drawer.getId()).emit("game:wordChoices", choices);
        emitToPlayer(game, drawer.getId(), "game:wordChoices", choices);


        // Automatically choose a word if the drawer does not
        // select one within 10 seconds.
        game.timer = setTimeout(() => {
            if (games.get(roomCode) !== game) return;
            if (game.state !== "WORD_SELECTION") return;

            const currentDrawer = game.getCurrentDrawer();

            if (!currentDrawer) {
                advanceTurn(roomCode, game);
                return;
            }

            try {
                selectWord(
                    roomCode,
                    currentDrawer.getId(),
                    choices[0]
                );
            } catch (error) {
                console.error(
                    "Automatic word selection failed:",
                    error.message
                );

                advanceTurn(roomCode, game);
            }
        }, 10000);
    }

    function startGame(roomCode) {
        const game = getGame(roomCode);

        game.startGame();
        sendWordChoices(roomCode, game);

        return game;
    }



    function selectWord(roomCode, playerId, word) {
        const game = getGame(roomCode);

        const maskedWord = game.selectWord(playerId, word);

        if (maskedWord === null) {
            throw new Error("Invalid word selection");
        }

        const duration = Number(game.room.settings.drawTime) || 80;

        // Establish the server deadline before notifying players.
        scheduleTurnEnd(roomCode, game);

        // Only the drawer receives the actual word.
        emitToPlayer(game, playerId, "game:selectedWord", {
            word: game.currentWord
        });

        // Everyone receives the same drawing deadline.
        io.to(roomCode).emit("game:drawingStarted", {
            drawerId: playerId,
            maskedWord,
            duration,
            endsAt: game.turnEndsAt
        });

        return maskedWord;
    }



    // function handlePlayerLeave(roomCode, wasDrawer = false) {
    //     const game = games.get(roomCode);

    //     if (!game) return;

    //     if (game.state === "FINISHED") {
    //         finishGame(roomCode, game);
    //         return;
    //     }

    //     if (game.state === "WAITING") {
    //         // No active game timer needs to be advanced.
    //         return;
    //     }

    //     const result = game.checkGameOver();

    //     if (result?.gameOver) {
    //         finishGame(roomCode, game, result.winner);
    //         return;
    //     }

    //     // If the current drawer left, move to the next turn.
    //     if (wasDrawer) {
    //         advanceTurn(roomCode, game);
    //     }
    // }



    function handlePlayerLeave(roomCode, wasDrawer = false) {
    const game = games.get(roomCode);

    if (!game) return;

    if (game.state === "FINISHED") {
        finishGame(roomCode, game);
        return;
    }

    if (game.state === "WAITING") {
        return;
    }

    const result = game.checkGameOver();

    if (result?.gameOver) {
        finishGame(roomCode, game, result.winner);
        return;
    }

    if (wasDrawer) {
        advanceTurn(roomCode, game);
    }
}

    function getExistingGame(roomCode) {
        return games.get(roomCode) || null;
    }

    function emitToPlayer(game, playerId, event, data) {
        const player = game.room.players.find(
            p => p.getId() === playerId
        );

        if (!player?.getSocketId()) return;

        io.to(player.getSocketId()).emit(event, data);
    }

    return {
        startGame,
        selectWord,
        advanceTurn,
        finishGame,
        handlePlayerLeave,
        getGame,
        getExistingGame
    };
}


function registerGameHandlers(io, socket, controller) {
    function currentGame() {
        const roomCode = socket.data.roomCode;
        const playerId = socket.data.playerId;

        if (!roomCode || !playerId || !socket.rooms.has(roomCode)) {
            throw new Error("Not in a room");
        }

        const game = controller.getGame(roomCode);

        const player = game.room.players.find(
            p => p.getId() === playerId
        );

        if (
            !player ||
            !player.isConnected() ||
            player.getSocketId() !== socket.id
        ) {
            throw new Error("Invalid player session");
        }

        return { roomCode, game };
    }

    function handleError(callback, error) {
        callback?.({
            success: false,
            error: error.message
        });
    }

    // -------------------------
    // START GAME
    // -------------------------

    socket.on("game:start", (data, callback) => {
        try {
            const { roomCode, game } = currentGame();

            if (
                game.room.type === "PRIVATE" &&
                // game.room.host?.getId() !== socket.id
                game.room.host?.getId() !== socket.data.playerId
            ) {
                throw new Error("Only the host can start the game");
            }

            // Public games are started automatically by matchmaking.
            if (game.room.type === "PUBLIC") {
                throw new Error("Public games start automatically");
            }

            controller.startGame(roomCode);

            callback?.({ success: true });

        } catch (error) {
            handleError(callback, error);
        }
    });

    // -------------------------
    // SELECT WORD
    // -------------------------

    socket.on("game:selectWord", (data, callback) => {
        try {
            const { roomCode } = currentGame();

            controller.selectWord(
                roomCode,
                socket.data.playerId,
                data?.word
            );

            callback?.({ success: true });

        } catch (error) {
            handleError(callback, error);
        }
    });

    socket.on("game:sync", callback => {
        try {
            const roomCode = socket.data.roomCode;

            if (!roomCode || !socket.rooms.has(roomCode)) {
                throw new Error("Not in a room");
            }

            const game = controller.getExistingGame(roomCode);

            if (!game) {
                callback?.({
                    success: true,
                    game: null
                });
                return;
            }

      
            const isPlayer = game.room.players.some(
                player =>
                    player.getId() === socket.data.playerId &&
                    player.getSocketId() === socket.id &&
                    player.isConnected()
            );

            if (!isPlayer) {
                throw new Error("Not a member of this room");
            }

            // Current game state, without the secret word
            const snapshot = game.getPublicSnapshot();

            // Only the drawer receives the word choices
            if (
                game.state === "WORD_SELECTION" &&
                // game.getCurrentDrawer()?.getId() === socket.id
                game.getCurrentDrawer()?.getId() === socket.data.playerId
            ) {
                snapshot.wordChoices = game.wordChoices;
            }

            callback?.({
                success: true,
                game: snapshot
            });

        } catch (error) {
            callback?.({
                success: false,
                error: error.message
            });
        }
    });


    // -------------------------
    // CHAT / GUESSING
    // -------------------------

    socket.on("chat:message", (data, callback) => {
        try {
            const { roomCode, game } = currentGame();

            const message = data?.message;

            if (
                typeof message !== "string" ||
                !message.trim() ||
                message.length > 200
            ) {
                throw new Error("Invalid message");
            }

            // Ordinary chat is allowed before drawing starts.
            if (game.state !== "DRAWING") {
                io.to(roomCode).emit("chat:message", {
                    //playerId: socket.id,
                    playerId: socket.data.playerId,
                    message
                });

                callback?.({
                    success: true,
                    status: "CHAT"
                });

                return;
            }

            //const result = game.submitGuess(socket.id, message);
            const result = game.submitGuess(socket.data.playerId, message);
            if (result.status === "CORRECT") {
                io.to(roomCode).emit("game:correctGuess", {
             
                    playerId: socket.data.playerId,
                    points: result.points
                });

            } else if (result.status === "CLOSE") {
                socket.emit("game:closeGuess", {
                    message: "You're very close!"
                });

            } else if (
                result.status === "INCORRECT" ||
                result.status === "ALREADY_GUESSED"
            ) {
               
                // A player who has already guessed can still chat,
                // but must not leak the current word.
                if (result.status === "INCORRECT") {
                    io.to(roomCode).emit("chat:message", {
                        // playerId: socket.id,
                        playerId: socket.data.playerId,
                        message
                    });
                } else {
                    socket.emit("chat:message", {
                        // playerId: socket.id,
                        playerId: socket.data.playerId,
                        message: "You already guessed correctly!"
                    });
                }
            }

            callback?.({
                success: true,
                status: result.status
            });

        } catch (error) {
            handleError(callback, error);
        }
    });

}

module.exports = {
    createGameController,
    registerGameHandlers
};
