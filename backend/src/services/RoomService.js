
const Room = require('../models/Room');
const crypto = require('crypto');


class RoomService {

    constructor() {
        this.Rooms = new Map();
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
        const maxPlayers = Number(process.env.PLAYER_LIMIT || 8);

        return Array.from(this.Rooms.values())
            .filter(room =>
                room.type === "PUBLIC" &&
                ["WAITING", "PLAYING"].includes(room.status) &&
                room.players.length < maxPlayers
            )
            .sort((a, b) => b.players.length - a.players.length);
    }
}







module.exports = RoomService;