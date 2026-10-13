
class Player {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.score = 0;

        this.socketId = null;
        this.connected = false;
    }

    connect(socketId) {
        this.socketId = socketId;
        this.connected = true;
    }

    disconnect() {
        this.socketId = null;
        this.connected = false;
    }

    getSocketId() {
        return this.socketId;
    }

    isConnected() {
        return this.connected;
    }

    getScore() {
        return this.score;
    }

    addScore(score) {
        this.score += score;
    }

    getName() {
        return this.name;
    }

    getId() {
        return this.id;
    }
}

module.exports = Player;
