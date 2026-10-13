class Room{
    constructor(roomCode, type, host, settings){
        this.roomCode = roomCode;
        this.settings = settings;
        this.players = host ? [host] : [];
        this.host = type === "PRIVATE" ? host : null;
        this.status = "WAITING";
        this.type = type;
        
    }
    getRoomCode(){
        return this.roomCode;
    }
    changeHost(){

        this.host = this.players[0] || null;
        
    }
    getHost(){
        return this.host;
    }

   addPlayer(player) {
        const maxPlayers = Number(process.env.PLAYER_LIMIT || 8);

        if (this.players.length >= maxPlayers) {
            return false;
        }

        if (this.players.some(p => p.id === player.id)) {
            return false;
        }

        this.players.push(player);
        return true;
    }

    changeStatus(status){
        this.status = status;
    }
    removePlayer(playerId){
        this.players = this.players.filter(
        player => player.id !== playerId);
        return this.players.length === 0 ? false : true;
    }
    
}


module.exports = Room;