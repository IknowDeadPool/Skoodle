
const Room = require('../models/Room');
const crypto = require('crypto');


class RoomService {

    constructor() {
        this.Rooms = new Map();
        this.sessions = new Map();
    }

    // createRoom(type, host, settings) {

    //     let roomCode;

    //     do {
    //         roomCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    //     } while (this.Rooms.has(roomCode));


    //     if (!["PRIVATE", "PUBLIC"].includes(type)) {
    //         throw new Error("Invalid room type");
    //     }

    //     if (type === "PRIVATE" && !host?.id) {
    //         throw new Error("Private room requires a host");
    //     }

    //     const room = new Room(roomCode, type, host, settings);

    //     this.Rooms.set(room.getRoomCode(), room);
    //     return room;

    // }

    createRoom(type, host, settings) {
        if (!["PRIVATE", "PUBLIC"].includes(type)) {
            throw new Error("Invalid room type");
        }

        if (type === "PRIVATE" && !host?.id) {
            throw new Error("Private room requires a host");
        }

        const defaults = {
            rounds: 3,
            drawTime: 80,
            wordMode: "default",
            customWords: []
        };

        const input = settings ?? defaults;

        if (
            typeof input !== "object" ||
            Array.isArray(input)
        ) {
            throw new Error("Invalid room settings");
        }

        const rounds = input.rounds ?? defaults.rounds;
        const drawTime = input.drawTime ?? defaults.drawTime;
        const wordMode = input.wordMode ?? defaults.wordMode;

        if (
            !Number.isInteger(rounds) ||
            rounds < 2 ||
            rounds > 10
        ) {
            throw new Error("Rounds must be between 2 and 10");
        }

        if (![30, 60, 80, 120].includes(drawTime)) {
            throw new Error("Invalid drawing time");
        }

        if (!["default", "custom"].includes(wordMode)) {
            throw new Error("Invalid word mode");
        }

        let customWords = [];

        if (wordMode === "custom") {
            if (!Array.isArray(input.customWords)) {
                throw new Error("Custom words must be an array");
            }

            if (input.customWords.length > 200) {
                throw new Error("Too many custom words");
            }

            if (
                input.customWords.some(
                    word =>
                        typeof word !== "string" ||
                        word.trim().length < 2 ||
                        word.trim().length > 40
                )
            ) {
                throw new Error(
                    "Custom words must contain 2–40 characters"
                );
            }

            customWords = [
                ...new Set(
                    input.customWords.map(word => word.trim())
                )
            ];

            if (customWords.length < 3) {
                throw new Error(
                    "Enter at least 3 unique custom words"
                );
            }
        }

        const validatedSettings = {
            rounds,
            drawTime,
            wordMode,
            customWords
        };

        let roomCode;

        do {
            roomCode = crypto.randomBytes(3)
                .toString("hex")
                .toUpperCase();
        } while (this.Rooms.has(roomCode));

        const room = new Room(
            roomCode,
            type,
            host,
            validatedSettings
        );

        this.Rooms.set(room.getRoomCode(), room);

        return room;
    }

    joinRoom(roomCode, player) {
        const room = this.getRoom(roomCode);

        if (room.status === "FINISHED") {
            throw new Error("Game has finished");
        }

        if (room.players.length >= Number(process.env.PLAYER_LIMIT || 8)) {
            throw new Error("Room is full");
        }


        if (room.players.some(p => p.id === player.id)) {
            throw new Error("Player already joined");
        }

        if (!room.addPlayer(player)) {
            throw new Error("Unable to join room");
        }
        return room;
    }

    getRoom(roomCode) {
        const room = this.Rooms.get(roomCode);

        if (!room) {
            throw new Error("Room does not exist");
        }

        return room;
    }

    removePlayer(roomCode, playerId) {


        const room = this.getRoom(roomCode);

        const wasHost = room.getHost()?.id === playerId;

        this.deleteSession(playerId);

        const hasPlayers = room.removePlayer(playerId);

        if (!hasPlayers) {
            this.Rooms.delete(roomCode);
            return null;
        }

        if (wasHost && room.getHost()?.id === playerId) {
            room.changeHost();
        }

        return room;
    }

    transferHost(roomCode) {
        const room = this.getRoom(roomCode);

        if (room.type !== "PRIVATE") return room;

        room.changeHost();
        return room;
    }



    getAvailableRooms() {
        return [...this.Rooms.values()]
            .filter(room => {
                if (room.type !== "PUBLIC") return false;

                if (!["WAITING", "PLAYING"].includes(room.status)) {
                    return false;
                }

                const maxPlayers = room.settings?.maxPlayers ?? 8;

                return room.players.length < maxPlayers;
            })
            .sort((a, b) => b.players.length - a.players.length);
    }

    createSession(roomCode, player, socketId) {
        const token = crypto.randomBytes(32).toString("hex");

        player.connect(socketId);

        this.sessions.set(player.getId(), {
            roomCode,
            tokenHash: this.hashToken(token),
            disconnectTimer: null
        });

        return token;
    }

    hashToken(token) {
        return crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");
    }

    getSession(playerId) {
        return this.sessions.get(playerId) || null;
    }

    markDisconnected(playerId, socketId, onExpired) {
        const session = this.sessions.get(playerId);
        if (!session) return false;

        const room = this.getRoom(session.roomCode);
        const player = room.players.find(
            p => p.getId() === playerId
        );

        // An old socket must not disconnect a newer session.
        if (!player || player.getSocketId() !== socketId) {
            return false;
        }

        player.disconnect();

        if (session.disconnectTimer) {
            clearTimeout(session.disconnectTimer);
        }

        session.disconnectTimer = setTimeout(() => {
            session.disconnectTimer = null;

            const currentSession = this.sessions.get(playerId);

            if (currentSession !== session) return;
            if (player.isConnected()) return;

            onExpired(session.roomCode, playerId);
        }, 30000);

        return true;
    }

    reconnectPlayer(roomCode, playerId, token, socketId) {
        const session = this.sessions.get(playerId);

        if (!session || session.roomCode !== roomCode) {
            throw new Error("Reconnect session not found");
        }

        if (typeof token !== "string") {
            throw new Error("Invalid reconnect token");
        }

        const providedHash = Buffer.from(
            this.hashToken(token),
            "hex"
        );

        const expectedHash = Buffer.from(
            session.tokenHash,
            "hex"
        );

        if (!crypto.timingSafeEqual(providedHash, expectedHash)) {
            throw new Error("Invalid reconnect token");
        }

        const room = this.getRoom(roomCode);

        const player = room.players.find(
            p => p.getId() === playerId
        );

        if (!player) {
            throw new Error("Player no longer exists");
        }

        if (player.isConnected()) {
            throw new Error("Player is already connected");
        }

        if (session.disconnectTimer) {
            clearTimeout(session.disconnectTimer);
            session.disconnectTimer = null;
        }

        player.connect(socketId);

        // Rotate the token after successful reconnection.
        const newToken = crypto.randomBytes(32).toString("hex");
        session.tokenHash = this.hashToken(newToken);

        return { room, player, reconnectToken: newToken };
    }

    deleteSession(playerId) {
        const session = this.sessions.get(playerId);

        if (session?.disconnectTimer) {
            clearTimeout(session.disconnectTimer);
        }

        this.sessions.delete(playerId);
    }

}







module.exports = RoomService;