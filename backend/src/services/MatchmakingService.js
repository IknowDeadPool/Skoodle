class MatchmakingService {
    constructor(roomService) {
        this.roomService = roomService;
    }

    findAvailableRoom() {
       const availableRooms = this.roomService.getAvailableRooms();
        return availableRooms[0] || null;
    }

    findOrCreateRoom(player) {
    let room = this.findAvailableRoom();

    if (!room) {
        const defaultSettings = {
            rounds: 3,
            drawTime: 80,
            wordMode: "default",
            customWords: []
        };

        room = this.roomService.createRoom(
            "PUBLIC",
            null,
            defaultSettings
        );
    }

    return this.roomService.joinRoom(
        room.getRoomCode(),
        player
    );
}
}
module.exports = MatchmakingService;