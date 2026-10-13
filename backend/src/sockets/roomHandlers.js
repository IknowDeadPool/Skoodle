// const Player = require("../models/Player");
// const { generateServerRandomName } = require("../utils/nameGenerator");

// function registerRoomHandlers(io, socket, roomService, matchmakingService, games, gameController) {

//     // CREATE PRIVATE ROOM
//     socket.on("room:create", (data, callback) => {
//         try {
//             if (socket.data.roomCode) {
//                 throw new Error("Player is already in a room");
//             }

//             const { playerName, settings } = data || {};
//             const name = playerName?.trim() || generateServerRandomName();

//             const player = new Player(socket.id, name);

//             const room = roomService.createRoom(
//                 "PRIVATE",
//                 player,
//                 settings
//             );

//             const roomCode = room.getRoomCode();

//             socket.join(roomCode);

//             socket.data.roomCode = roomCode;
//             socket.data.playerId = player.id;

//             callback?.({
//                 success: true,
//                 roomCode,
//                 players: room.players,
//                 settings: room.settings,
//                 hostId: room.host?.id
//             });

//         } catch (error) {
//             callback?.({
//                 success: false,
//                 error: error.message
//             });
//         }
//     });


//     // QUICK PLAY - PUBLIC MATCHMAKING
//     socket.on("room:quickPlay", (data, callback) => {
//         try {
//             if (socket.data.roomCode) {
//                 throw new Error("Player is already in a room");
//             }

//             const name =
//                 data?.playerName?.trim() ||
//                 generateServerRandomName();

//             const player = new Player(socket.id, name);

//             const room = matchmakingService.findOrCreateRoom(player);
//             const roomCode = room.getRoomCode();

//             socket.join(roomCode);
//             if (room.status === "WAITING" && room.players.length >= 2) {
//     gameController.startGame(roomCode);
// }

//             socket.data.roomCode = roomCode;
//             socket.data.playerId = player.id;

//             io.to(roomCode).emit(
//                 "room:playersUpdated",
//                 room.players
//             );

            

//             callback?.({
//                 success: true,
//                 roomCode,
//                 players: room.players,
//                 settings: room.settings
//             });

//         } catch (error) {
//             callback?.({
//                 success: false,
//                 error: error.message
//             });
//         }
//     });


//     // JOIN PRIVATE ROOM
//     socket.on("room:join", (data, callback) => {
//         try {
//             if (socket.data.roomCode) {
//                 throw new Error("Player is already in a room");
//             }

//             const { roomCode, playerName } = data || {};

//             if (!roomCode || typeof roomCode !== "string") {
//                 throw new Error("Room code is required");
//             }

//             const normalizedCode = roomCode.trim().toUpperCase();

//             const room = roomService.getRoom(normalizedCode);

//             if (room.type !== "PRIVATE") {
//                 throw new Error("Cannot join public room using a code");
//             }

//             const name =
//                 playerName?.trim() ||
//                 generateServerRandomName();

//             const player = new Player(socket.id, name);

//             const updatedRoom = roomService.joinRoom(
//                 normalizedCode,
//                 player
//             );

//             socket.join(normalizedCode);

//             socket.data.roomCode = normalizedCode;
//             socket.data.playerId = player.id;

//             io.to(normalizedCode).emit(
//                 "room:playersUpdated",
//                 updatedRoom.players
//             );

//             callback?.({
//                 success: true,
//                 roomCode: normalizedCode,
//                 players: updatedRoom.players,
//                 settings: updatedRoom.settings,
//                 hostId: updatedRoom.host?.id
//             });

//         } catch (error) {
//             callback?.({
//                 success: false,
//                 error: error.message
//             });
//         }
//     });


//     // LEAVE ROOM
//     socket.on("room:leave", (data, callback) => {
//         try {
//             const roomCode = socket.data.roomCode;
//             const playerId = socket.data.playerId;

//             if (!roomCode || !playerId) {
//                 throw new Error("Player is not in a room");
//             }

//             roomService.removePlayer(roomCode, playerId);
//             const game = games.get(roomCode);

//             if (game) {
//                 const result = game.checkGameOver();

//                 if (result?.gameOver) {
//                     io.to(roomCode).emit("game:finished", {
//                         winner: result.winner
//                             ? {
//                                 id: result.winner.getId(),
//                                 name: result.winner.getName(),
//                                 score: result.winner.getScore()
//                             }
//                             : null,
//                         reason: result.reason
//                     });

//                     games.delete(roomCode);
//                 }
//             }

//             socket.leave(roomCode);

//             socket.data.roomCode = null;
//             socket.data.playerId = null;

//             let room = null;

//             try {
//                 room = roomService.getRoom(roomCode);
//             } catch (error) {
//                 // Room was deleted because it became empty
//             }

//             if (room) {
//                 io.to(roomCode).emit(
//                     "room:playersUpdated",
//                     room.players
//                 );

//                 io.to(roomCode).emit(
//                     "room:hostUpdated",
//                     { hostId: room.host?.id || null }
//                 );
//             }

//             callback?.({
//                 success: true
//             });

//         } catch (error) {
//             callback?.({
//                 success: false,
//                 error: error.message
//             });
//         }
//     });

//     socket.on("disconnect", () => {
//     const roomCode = socket.data.roomCode;
//     const playerId = socket.data.playerId;

//     if (!roomCode || !playerId) return;

//     try {
//         roomService.removePlayer(roomCode, playerId);

//         const game = games.get(roomCode);

//         if (game) {
//             const result = game.checkGameOver();

//             if (result?.gameOver) {
//                 io.to(roomCode).emit("game:finished", {
//                     winner: result.winner
//                         ? {
//                             id: result.winner.getId(),
//                             name: result.winner.getName(),
//                             score: result.winner.getScore()
//                         }
//                         : null,
//                     reason: result.reason
//                 });

//                 games.delete(roomCode);
//             }
//         }

//         let room;
//         try {
//             room = roomService.getRoom(roomCode);
//         } catch (_) {
//             return;
//         }

//         io.to(roomCode).emit("room:playersUpdated", room.players);
//         io.to(roomCode).emit("room:hostUpdated", {
//             hostId: room.host?.id || null
//         });

//     } catch (error) {
//         console.error("Disconnect cleanup error:", error.message);
//     }
// });
// }

// module.exports = registerRoomHandlers;







const Player = require("../models/Player");
const { generateServerRandomName } = require("../utils/nameGenerator");

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

            const player = new Player(socket.id, name);

            const room = roomService.createRoom(
                "PRIVATE",
                player,
                settings
            );

            const roomCode = room.getRoomCode();

            socket.join(roomCode);

            socket.data.roomCode = roomCode;
            socket.data.playerId = player.id;

            callback?.({
                success: true,
                roomCode,
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

    socket.on("room:quickPlay", (data, callback) => {
        try {
            if (socket.data.roomCode) {
                throw new Error("Player is already in a room");
            }

            const playerName = data?.playerName;

            const name =
                typeof playerName === "string" && playerName.trim()
                    ? playerName.trim()
                    : generateServerRandomName();

            const player = new Player(socket.id, name);

            const room = matchmakingService.findOrCreateRoom(player);
            const roomCode = room.getRoomCode();

            socket.join(roomCode);

            socket.data.roomCode = roomCode;
            socket.data.playerId = player.id;

            io.to(roomCode).emit(
                "room:playersUpdated",
                room.players
            );

            callback?.({
                success: true,
                roomCode,
                players: room.players,
                settings: room.settings,
                status: room.status
            });

            // Public games start when the second player joins.
            if (
                room.status === "WAITING" &&
                room.players.length >= 2
            ) {
                gameController.startGame(roomCode);
            }

        } catch (error) {
            callback?.({
                success: false,
                error: error.message
            });
        }
    });


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

            const player = new Player(socket.id, name);

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
            leaveCurrentRoom();

        } catch (error) {
            console.error(
                "Disconnect cleanup error:",
                error.message
            );
        }
    });
}

module.exports = registerRoomHandlers;
