
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = require("./app");

const RoomService = require("./services/RoomService");
const MatchmakingService = require("./services/MatchmakingService");
const GameEngine = require("./game/GameEngine");

const registerRoomHandlers = require("./sockets/roomHandlers");

const {
    createGameController,
    registerGameHandlers
} = require("./sockets/gameHandlers");

const registerDrawingHandlers = require("./sockets/drawingHandlers");

// -------------------------
// SERVICES
// -------------------------

const roomService = new RoomService();
const matchmakingService = new MatchmakingService(roomService);

// -------------------------
// HTTP SERVER
// -------------------------

const server = http.createServer(app);

// -------------------------
// SOCKET.IO
// -------------------------

const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// -------------------------
// GAME STORAGE
// -------------------------

const games = new Map();

function getGame(roomCode) {
    let game = games.get(roomCode);

    if (!game) {
        const room = roomService.getRoom(roomCode);

        if (room.status === "FINISHED") {
            throw new Error("Game has already finished");
        }

        game = new GameEngine(room);
        games.set(roomCode, game);
    }

    return game;
}

// -------------------------
// SHARED GAME CONTROLLER
// -------------------------

const gameController = createGameController(
    io,
    getGame,
    games
);

// -------------------------
// SOCKET CONNECTIONS
// -------------------------

io.on("connection", socket => {
    console.log("Connected:", socket.id);

    registerRoomHandlers(
        io,
        socket,
        roomService,
        matchmakingService,
        gameController
    );

    registerGameHandlers(
        io,
        socket,
        gameController
    );
    registerDrawingHandlers(
        io,
        socket,
        gameController
    );


    socket.on("disconnect", reason => {
        console.log("Disconnected:", socket.id, reason);
    });
});

// -------------------------
// START SERVER
// -------------------------

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
