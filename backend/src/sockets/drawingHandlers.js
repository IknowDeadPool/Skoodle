
// function registerDrawingHandlers(io, socket, controller) {

//     function currentDrawing() {
//         const roomCode = socket.data.roomCode;

//         if (!roomCode) {
//             throw new Error("Not in a room");
//         }

//         const game = controller.getGame(roomCode);

//         if (game.state !== "DRAWING") {
//             return null;
//         }

//         const drawer = game.getCurrentDrawer();

//         if (!drawer || drawer.getId() !== socket.id) {
//             return null;
//         }

//         return { roomCode, game };
//     }

//     // DRAW STROKES
//     socket.on("draw:stroke", data => {
//         try {
//             const session = currentDrawing();
//             if (!session) return;

//             if (
//                 !data ||
//                 typeof data !== "object" ||
//                 Array.isArray(data)
//             ) return;

//             socket.to(session.roomCode).emit("draw:stroke", data);

//         } catch (error) {
//             console.error("Draw stroke error:", error.message);
//         }
//     });

//     // CLEAR CANVAS
//     socket.on("draw:clear", () => {
//         try {
//             const session = currentDrawing();
//             if (!session) return;

//             io.to(session.roomCode).emit("draw:clear");

//         } catch (error) {
//             console.error("Clear canvas error:", error.message);
//         }
//     });
// }

// module.exports = registerDrawingHandlers;







function registerDrawingHandlers(io, socket, controller) {
    function getSession(requireDrawer = true) {
        const roomCode = socket.data.roomCode;
        if (!roomCode || !socket.rooms.has(roomCode)) return null;

        const game = controller.getExistingGame(roomCode);
        if (!game || game.state === "FINISHED") return null;

        if (!game.room.players.some(p => p.getId() === socket.id)) {
            return null;
        }

        if (requireDrawer) {
            if (game.state !== "DRAWING") return null;
            if (game.getCurrentDrawer()?.getId() !== socket.id) {
                return null;
            }
        }

        return { roomCode, game, drawing: game.drawing };
    }

    function publishState(session) {
        io.to(session.roomCode).emit(
            "draw:state",
            session.drawing.snapshot()
        );
    }

    socket.on("draw:sync", callback => {
        const session = getSession(false);

        callback?.(
            session
                ? { success: true, state: session.drawing.snapshot() }
                : { success: false }
        );
    });

    socket.on("draw:begin", data => {
        const session = getSession();
        if (!session || !session.drawing.begin(data)) return;

        socket.to(session.roomCode).emit("draw:begin", {
            turnId: session.drawing.turnId,
            stroke: session.drawing.activeStroke
        });
    });

    socket.on("draw:points", data => {
        const session = getSession();
        if (!session || !session.drawing.addPoints(data?.points)) {
            return;
        }

        socket.to(session.roomCode).emit("draw:points", {
            turnId: session.drawing.turnId,
            points: data.points
        });
    });

    socket.on("draw:end", () => {
        const session = getSession();
        if (!session || !session.drawing.end()) return;
        publishState(session);
    });

    socket.on("draw:action", action => {
        const session = getSession();
        if (!session || !session.drawing.fill(action)) return;
        publishState(session);
    });

    socket.on("draw:undo", () => {
        const session = getSession();
        if (!session || !session.drawing.undo()) return;
        publishState(session);
    });

    socket.on("draw:redo", () => {
        const session = getSession();
        if (!session || !session.drawing.redo()) return;
        publishState(session);
    });

    socket.on("draw:clear", () => {
        const session = getSession();
        if (!session) return;

        session.drawing.clear();
        publishState(session);
    });

    socket.on("disconnect", () => {
        const roomCode = socket.data.roomCode;
        if (!roomCode) return;

        const game = controller.getExistingGame(roomCode);
        if (!game?.drawing?.activeStroke) return;

        if (game.getCurrentDrawer()?.getId() === socket.id) {
            game.drawing.activeStroke = null;
            io.to(roomCode).emit(
                "draw:state",
                game.drawing.snapshot()
            );
        }
    });
}

module.exports = registerDrawingHandlers;
