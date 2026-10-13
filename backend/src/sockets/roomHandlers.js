const Player = require("../models/Player");
const { generateServerRandomName } = require("../utils/nameGenerator");
const crypto = require("crypto");
function registerRoomHandlers(
    io,
    socket,
    roomService,
    matchmakingService,
    gameController
) {

    // -------------------------
    // CREATE PRIVATE ROOM
    // -------------------------

    socket.on("room:create", (data, callback) => {
        try {
            if (socket.data.roomCode) {
                throw new Error("Player is already in a room");
            }

            const { playerName, settings } = data || {};

            const name =
                typeof playerName === "string" && playerName.trim()
                    ? playerName.trim()
                    : generateServerRandomName();


            // const player = new Player(socket.id, name);
            // player.connect(socket.id);
            const player = new Player(crypto.randomUUID(), name);

            const room = roomService.createRoom(
                "PRIVATE",
                player,
                settings
            );

            const roomCode = room.getRoomCode();

            const reconnectToken = roomService.createSession(
                roomCode,
                player,
                socket.id
            );

            socket.join(roomCode);

            socket.data.roomCode = roomCode;
            socket.data.playerId = player.id;

            callback?.({
                success: true,
                roomCode,
                playerId: player.getId(),
                reconnectToken,
                players: room.players,
                settings: room.settings,
                hostId: room.host?.id
            });

        } catch (error) {
            callback?.({
                success: false,
                error: error.message
            });
        }
    });


    // -------------------------
    // QUICK PLAY - PUBLIC ROOM
    // -------------------------

    // socket.on("room:quickPlay", (data, callback) => {
    //     try {
    //         if (socket.data.roomCode) {
    //             throw new Error("Player is already in a room");
    //         }

    //         const playerName = data?.playerName;

    //         const name =
    //             typeof playerName === "string" && playerName.trim()
    //                 ? playerName.trim()
    //                 : generateServerRandomName();

    //         // const player = new Player(socket.id, name);
    //         // player.connect(socket.id);

    //         const player = new Player(crypto.randomUUID(), name);

            

    //         const room = matchmakingService.findOrCreateRoom(player);

    //         const roomCode = room.getRoomCode();

    //         const reconnectToken = roomService.createSession(
    //             roomCode,
    //             player,
    //             socket.id
    //         );

    //         socket.join(roomCode);

    //         socket.data.roomCode = roomCode;
    //         socket.data.playerId = player.id;

    //         io.to(roomCode).emit(
    //             "room:playersUpdated",
    //             room.players
    //         );

    //         callback?.({
    //             success: true,
    //             roomCode,
    //             playerId: player.getId(),
    //             reconnectToken,
    //             players: room.players,
    //             settings: room.settings,
    //             hostId: room.host?.id ?? null,
    //             status: room.status
    //         });

    //         // Public games start when the second player joins.
    //         if (
    //             room.status === "WAITING" &&
    //             room.players.length >= 2
    //         ) {
    //             gameController.startGame(roomCode);
    //         }

    //     } catch (error) {
    //         callback?.({
    //             success: false,
    //             error: error.message
    //         });
    //     }
    // });


    


socket.on("room:quickPlay", (data, callback) => {
    try {
        if (socket.data.roomCode) {
            return callback?.({
                success: false,
                error: "Player is already in a room"
            });
        }

        const playerName = data?.playerName;

        const name =
            typeof playerName === "string" && playerName.trim()
                ? playerName.trim()
                : generateServerRandomName();

        // Every new Quick Play join gets a new identity.
        const player = new Player(crypto.randomUUID(), name);

        // Reuse an available public room or create a new one.
        // This service must add the player to the chosen room.
        const room = matchmakingService.findOrCreateRoom(player);

        const roomCode = room.getRoomCode();

        // Verify matchmaking added this player.
        if (!room.players.some(p => p.getId() === player.getId())) {
            throw new Error("Matchmaking did not add player to room");
        }

        // Create a reconnect session for this specific player.
        const reconnectToken = roomService.createSession(
            roomCode,
            player,
            socket.id
        );

        socket.join(roomCode);

        socket.data.roomCode = roomCode;
        socket.data.playerId = player.getId();

        callback?.({
            success: true,
            roomCode,
            playerId: player.getId(),
            reconnectToken,
            players: room.players,
            settings: room.settings,
            hostId: room.host?.id ?? null,
            status: room.status
        });

        io.to(roomCode).emit(
            "room:playersUpdated",
            room.players
        );

        // Public games begin when two players are present.
        if (
            room.status === "WAITING" &&
            room.players.length >= 2
        ) {
            gameController.startGame(roomCode);
        }

    } catch (error) {
        console.error("Quick Play error:", error);

        callback?.({
            success: false,
            error: error.message || "Unable to join Quick Play"
        });
    }
});


// socket.on("room:quickPlay", (data, callback) => {
//   try {
//     const playerName = data?.playerName?.trim();

//     if (!playerName) {
//       return callback?.({
//         success: false,
//         error: "Player name is required",
//       });
//     }

//     // Prevent an already-joined socket from entering another room.
//     if (socket.data.roomCode) {
//       return callback?.({
//         success: false,
//         error: "Leave your current room before joining another.",
//       });
//     }

//     // Generate a unique player identity.
//     const player = new Player(
//       crypto.randomUUID(),
//       playerName
//     );

//     // Find an available public room.
//     const availableRooms = roomService.getAvailableRooms();

//     let room = availableRooms[0];

//     // Create a room only if no suitable room exists.
//     if (!room) {
//       room = roomService.createRoom("PUBLIC", null);
//     }

//     const roomCode = room.getRoomCode();

//     // Always add the player, including when the room is new.
//     roomService.joinRoom(roomCode, player);

//     // Create the secure reconnect session.
//     const reconnectToken = roomService.createSession(
//       roomCode,
//       player,
//       socket.id
//     );

//     // Join the Socket.IO room.
//     socket.join(roomCode);

//     // Associate this connection with the permanent player UUID.
//     socket.data.roomCode = roomCode;
//     socket.data.playerId = player.getId();

//     // Send the complete room/session information to the client.
//     callback?.({
//       success: true,
//       roomCode,
//       playerId: player.getId(),
//       reconnectToken,
//       players: room.players,
//       settings: room.settings,
//       hostId: null,
//       status: room.status,
//     });

//     // Notify everyone in the room.
//     io.to(roomCode).emit("room:playersUpdated", {
//       players: room.players,
//       hostId: null,
//     });

//     console.log("QUICK PLAY:", {
//       roomCode,
//       playerId: player.getId(),
//       playerName,
//       playerCount: room.players.length,
//       status: room.status,
//     });

//   } catch (error) {
//     console.error("Quick Play error:", error);

//     callback?.({
//       success: false,
//       error: error.message || "Unable to join Quick Play",
//     });
//   }
// });


    // -------------------------
    // JOIN PRIVATE ROOM
    // -------------------------

    socket.on("room:join", (data, callback) => {
        try {
            if (socket.data.roomCode) {
                throw new Error("Player is already in a room");
            }

            const { roomCode, playerName } = data || {};

            if (
                typeof roomCode !== "string" ||
                !roomCode.trim()
            ) {
                throw new Error("Room code is required");
            }

            const normalizedCode = roomCode
                .trim()
                .toUpperCase();

            const room = roomService.getRoom(normalizedCode);

            if (room.type !== "PRIVATE") {
                throw new Error(
                    "Cannot join a public room using a code"
                );
            }

            const name =
                typeof playerName === "string" && playerName.trim()
                    ? playerName.trim()
                    : generateServerRandomName();

            // const player = new Player(socket.id, name);
            // player.connect(socket.id);
            const player = new Player(crypto.randomUUID(), name);
            const reconnectToken = roomService.createSession(
                normalizedCode,
                player,
                socket.id
            );

            const updatedRoom = roomService.joinRoom(
                normalizedCode,
                player
            );

            socket.join(normalizedCode);

            socket.data.roomCode = normalizedCode;
            socket.data.playerId = player.id;

            io.to(normalizedCode).emit(
                "room:playersUpdated",
                updatedRoom.players
            );

            callback?.({
                success: true,
                roomCode: normalizedCode,
                playerId: player.getId(),
                reconnectToken,
                players: updatedRoom.players,
                settings: updatedRoom.settings,
                hostId: updatedRoom.host?.id,
                status: updatedRoom.status
            });

        } catch (error) {
            callback?.({
                success: false,
                error: error.message
            });
        }
    });


    // -------------------------
    // SHARED LEAVE / DISCONNECT
    // -------------------------

    socket.on("room:reconnect", (data, callback) => {
        try {
            if (socket.data.roomCode) {
                throw new Error("Already in a room");
            }

            const { roomCode, playerId, reconnectToken } = data || {};

            if (
                typeof roomCode !== "string" ||
                typeof playerId !== "string" ||
                typeof reconnectToken !== "string"
            ) {
                throw new Error("Invalid reconnect request");
            }

            const normalizedCode = roomCode.trim().toUpperCase();

            const result = roomService.reconnectPlayer(
                normalizedCode,
                playerId,
                reconnectToken,
                socket.id
            );

            const { room, player } = result;

            socket.join(normalizedCode);

            socket.data.roomCode = normalizedCode;
            socket.data.playerId = player.getId();

            const game =
                gameController.getExistingGame(normalizedCode);

            const snapshot = game?.getPublicSnapshot() ?? null;

            if (game && snapshot) {
                const isDrawer =
                    game.getCurrentDrawer()?.getId() === player.getId();

                if (
                    isDrawer &&
                    game.state === "WORD_SELECTION"
                ) {
                    snapshot.wordChoices = game.wordChoices;
                }
            }

            callback?.({
                success: true,
                roomCode: normalizedCode,
                playerId: player.getId(),
                reconnectToken: result.reconnectToken,
                players: room.players,
                settings: room.settings,
                hostId: room.host?.id ?? null,
                status: room.status,
                game: snapshot,
                selectedWord:
                    game?.state === "DRAWING" &&
                        game.getCurrentDrawer()?.getId() === player.getId()
                        ? game.currentWord
                        : null
            });

            io.to(normalizedCode).emit(
                "room:playersUpdated",
                room.players
            );

        } catch (error) {
            callback?.({
                success: false,
                error: error.message
            });
        }
    });


    
// function expireDisconnectedPlayer(roomCode, playerId) {
//     let room;

//     try {
//         room = roomService.getRoom(roomCode);
//     } catch {
//         roomService.deleteSession(playerId);
//         return;
//     }

//     const player = room.players.find(
//         p => p.getId() === playerId
//     );

//     if (!player || player.isConnected()) return;

//     const game = gameController.getExistingGame(roomCode);

//     const wasDrawer =
//         game?.getCurrentDrawer()?.getId() === playerId;

//     roomService.removePlayer(roomCode, playerId);

//     gameController.handlePlayerLeave(roomCode, wasDrawer);

//     try {
//         room = roomService.getRoom(roomCode);
//     } catch {
//         return;
//     }

//     io.to(roomCode).emit(
//         "room:playersUpdated",
//         room.players
//     );

//     io.to(roomCode).emit("room:hostUpdated", {
//         hostId: room.host?.id ?? null
//     });
// }




function expireDisconnectedPlayer(roomCode, playerId) {
    let room;

    try {
        room = roomService.getRoom(roomCode);
    } catch {
        roomService.deleteSession(playerId);
        return;
    }

    const player = room.players.find(
        p => p.getId() === playerId
    );

    // Player already left or successfully reconnected.
    if (!player) {
        roomService.deleteSession(playerId);
        return;
    }

    if (player.isConnected()) return;

    const game = gameController.getExistingGame(roomCode);

    // Determine drawer identity BEFORE removing the player.
    const wasDrawer =
        game?.getCurrentDrawer()?.getId() === playerId;

    // Remove the player exactly once.
    const updatedRoom = roomService.removePlayer(
        roomCode,
        playerId
    );

    // Advance the turn if the departing player was drawing.
    gameController.handlePlayerLeave(roomCode, wasDrawer);

    // Room is empty and has been deleted.
    if (!updatedRoom) {
        return;
    }

    io.to(roomCode).emit(
        "room:playersUpdated",
        updatedRoom.players
    );

    io.to(roomCode).emit("room:hostUpdated", {
        hostId: updatedRoom.host?.id ?? null
    });
}



    function leaveCurrentRoom() {
        const roomCode = socket.data.roomCode;
        const playerId = socket.data.playerId;

        if (!roomCode || !playerId) {
            return false;
        }

        // Check whether this player is the drawer
        // BEFORE removing them from the room.
        const game = gameController.getExistingGame(roomCode);

        const wasDrawer =
            game?.getCurrentDrawer()?.getId() === playerId;

        roomService.removePlayer(roomCode, playerId);

        socket.leave(roomCode);

        socket.data.roomCode = null;
        socket.data.playerId = null;

        // Handles last-player victory, turn advancement,
        // and timer cleanup through the shared controller.
        gameController.handlePlayerLeave(
            roomCode,
            wasDrawer
        );

        let room;

        try {
            room = roomService.getRoom(roomCode);
        } catch (_) {
            // The room was deleted because it is empty.
            return true;
        }

        io.to(roomCode).emit(
            "room:playersUpdated",
            room.players
        );

        io.to(roomCode).emit(
            "room:hostUpdated",
            {
                hostId: room.host?.id || null
            }
        );

        return true;
    }


    // -------------------------
    // LEAVE ROOM
    // -------------------------

    socket.on("room:leave", (data, callback) => {
        try {
            const left = leaveCurrentRoom();

            if (!left) {
                throw new Error("Player is not in a room");
            }

            callback?.({
                success: true
            });

        } catch (error) {
            callback?.({
                success: false,
                error: error.message
            });
        }
    });


    // -------------------------
    // DISCONNECT
    // -------------------------

    
socket.on("disconnect", () => {
    try {
        const roomCode = socket.data.roomCode;
        const playerId = socket.data.playerId;

        if (!roomCode || !playerId) return;

        const marked = roomService.markDisconnected(
            playerId,
            socket.id,
            expireDisconnectedPlayer
        );

        if (!marked) return;

        const room = roomService.getRoom(roomCode);

        io.to(roomCode).emit(
            "room:playersUpdated",
            room.players
        );

    } catch (error) {
        console.error(
            "Disconnect cleanup error:",
            error.message
        );
    }
});

}

module.exports = registerRoomHandlers;
