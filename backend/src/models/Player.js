
class Player{
    constructor(id, name){
        this.id = id
        this.name = name;
        this.score = 0;
    }

    getScore(){
        return this.score;
    }
    addScore(score){
        this.score += score;
    }
    getName(){
        return this.name;
    }
    getId(){
        return this.id;
    }
    
}

module.exports = Player;