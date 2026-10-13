
const Room = require('../models/Room');
const crypto = require('crypto');


class RoomService {

    constructor() {
        this.Rooms = new Map();
        this.sessions = new Map();
    }

    createRoom(type, host, settings) {

        let roomCode;

        do {
            roomCode = crypto.randomBytes(3).toString('hex').toUpperCase();
        } while (this.Rooms.has(roomCode));


        if (!["PRIVATE", "PUBLIC"].includes(type)) {
            throw new Error("Invalid room type");
        }

        if (type === "PRIVATE" && !host?.id) {
            throw new Error("Private room requires a host");
        }

        const room = new Room(roomCode, type, host, settings);

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