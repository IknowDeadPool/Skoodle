const WordManager = require("./WordManager");
const words = require("../data/words");
const DrawingManager = require("./DrawingManager");
const ScoringStrategy = require("../game/strategies/ScoringStrategy");

class GameEngine {
    constructor(room) {
        this.room = room;
        this.state = "WAITING";

        this.turnOrder = [];
        this.currentDrawerIndex = 0;

        this.currentWord = null;
        this.wordChoices = [];
        this.guessedPlayers = new Set();

        this.currentRound = 0;
        this.wordManager = new WordManager(words);

        this.drawing = new DrawingManager();


        this.turnEndsAt = null;
        this.wordSelectionEndsAt = null;
    }

    startGame() {

        if (this.state !== "WAITING") {
            throw new Error("Game has already started");
        }

        if (this.room.players.length < 2) {
            throw new Error("At least 2 players are required");
        }

        this.currentRound = 1;
        this.turnOrder = this.room.players.map(player => player.getId());


        this.currentDrawerIndex = 0;
        this.state = "WORD_SELECTION";
        this.room.status = "PLAYING";

        this.drawing.resetTurn();

        return this.getCurrentDrawer();
    }

    getCurrentDrawer() {
        const playerId = this.turnOrder[this.currentDrawerIndex];

        return this.room.players.find(
            player => player.getId() === playerId
        ) || null;
    }

    nextTurn() {
        if (this.state === "FINISHED") {
            return null;
        }
        const result = this.checkGameOver();

        if (result?.gameOver) {
            return null;
        }
        this.currentDrawerIndex++;
        while (this.currentDrawerIndex < this.turnOrder.length) {
            const drawer = this.getCurrentDrawer();

            if (drawer != null) {
                this.resetTurn();
                return drawer;
            }
            this.currentDrawerIndex++;
        }

        // Current round is complete
        if (this.currentRound >= this.room.settings.rounds) {
            this.state = "FINISHED";
            this.room.status = "FINISHED";
            return null;
        }

        // Start the next round
        this.currentRound++;

        this.turnOrder = this.room.players.map(
            player => player.getId()
        );

        this.currentDrawerIndex = 0;

        this.resetTurn();

        return this.getCurrentDrawer();
    }

    resetTurn() {
        this.currentWord = null;
        this.wordChoices = [];
        this.guessedPlayers.clear();
        this.state = "WORD_SELECTION";
        this.drawing.resetTurn();

        this.turnEndsAt = null;
        this.wordSelectionEndsAt = null;
    }


    getRemainingTime() {
    if (this.state !== "DRAWING" || !this.turnEndsAt) {
        return 0;
    }

    return Math.max(
        0,
        Math.ceil((this.turnEndsAt - Date.now()) / 1000)
    );
}

    checkGameOver() {
        if (this.state === "WAITING" || this.state === "FINISHED") {
            return null;
        }

        if (this.room.players.length <= 1) {
            this.state = "FINISHED";
            this.room.status = "FINISHED";

            return {
                gameOver: true,
                winner: this.room.players[0] || null,
                reason: "NOT_ENOUGH_PLAYERS"
            };
        }

        return null;
    }




    getPublicSnapshot() {
        const drawer = this.getCurrentDrawer();

        const endsAt =
            this.state === "DRAWING"
                ? this.turnEndsAt
                : this.state === "WORD_SELECTION"
                    ? this.wordSelectionEndsAt
                    : null;

        const remainingTime = endsAt
            ? Math.max(
                0,
                Math.ceil((endsAt - Date.now()) / 1000)
            )
            : null;

        return {
            state: this.state,
            round: this.currentRound,
            drawerId: drawer?.getId() ?? null,

            maskedWord:
                this.state === "DRAWING" && this.currentWord
                    ? this.wordManager.maskWord(this.currentWord)
                    : null,

            endsAt,
            remainingTime,

            players: this.room.players.map(player => ({
                id: player.getId(),
                name: player.getName(),
                score: player.getScore()
            })),

            drawing: this.drawing.snapshot()
        };
    }




    generateWordChoices() {
        if (this.state !== "WORD_SELECTION") {
            throw new Error("Not in word selection phase");
        }

        this.wordChoices = this.wordManager.generateChoices(3);

        return this.wordChoices;
    }

    selectWord(playerId, selectedWord) {

        if (this.state !== "WORD_SELECTION") return null;

        const drawer = this.getCurrentDrawer();

        if (!drawer || drawer.getId() !== playerId) return null;

        if (!this.wordChoices.includes(selectedWord)) {
            return null;
        }

        this.currentWord = selectedWord;

        this.state = "DRAWING";

    //     this.turnEndsAt =
    // Date.now() + this.room.settings.drawTime * 1000;
        return this.wordManager.maskWord(selectedWord);
    }

    submitGuess(playerId, message) {
        if (this.state !== "DRAWING") {
            return { status: "INVALID" };
        }

        const player = this.room.players.find(
            p => p.getId() === playerId
        );

        if (!player || this.getCurrentDrawer()?.getId() === playerId) {
            return { status: "INVALID" };
        }

        if (this.guessedPlayers.has(playerId)) {
            return { status: "ALREADY_GUESSED" };
        }

        if (typeof message !== "string" || !message.trim()) {
            return { status: "INVALID" };
        }

        const guess = message.trim().toLowerCase();
        const answer = this.currentWord?.trim().toLowerCase();

        if (!answer) {
            return { status: "INVALID" };
        }

        if (guess === answer) {
    const timeLeft = this.getRemainingTime();

    if (timeLeft <= 0) {
        return { status: "INVALID" };
    }

    const points = ScoringStrategy.calculateGuessPoints(
        timeLeft,
        this.room.settings.drawTime
    );

    player.addScore(points);
    this.guessedPlayers.add(playerId);

    return {
        status: "CORRECT",
        playerId,
        points
    };
}

        const distance = this.levenshtein(guess, answer);

        if (guess.length >= 4 && distance <= 2) {
            return { status: "CLOSE" };
        }

        return { status: "INCORRECT" };
    }

    levenshtein(a, b) {
        const dp = Array.from(
            { length: a.length + 1 },
            () => Array(b.length + 1).fill(0)
        );

        for (let i = 0; i <= a.length; i++) dp[i][0] = i;
        for (let j = 0; j <= b.length; j++) dp[0][j] = j;

        for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,
                    dp[i][j - 1] + 1,
                    dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
                );
            }
        }

        return dp[a.length][b.length];
    }
}

module.exports = GameEngine;