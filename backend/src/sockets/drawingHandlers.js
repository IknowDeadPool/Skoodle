
function registerDrawingHandlers(io, socket, controller) {

    function currentDrawing() {
        const roomCode = socket.data.roomCode;

        if (!roomCode) {
            throw new Error("Not in a room");
        }

        const game = controller.getGame(roomCode);

        if (game.state !== "DRAWING") {
            return null;
        }

        const drawer = game.getCurrentDrawer();

        if (!drawer || drawer.getId() !== socket.id) {
            return null;
        }

        return { roomCode, game };
    }

    // DRAW STROKES
    socket.on("draw:stroke", data => {
        try {
            const session = currentDrawing();
            if (!session) return;

            if (
                !data ||
                typeof data !== "object" ||
                Array.isArray(data)
            ) return;

            socket.to(session.roomCode).emit("draw:stroke", data);

        } catch (error) {
            console.error("Draw stroke error:", error.message);
        }
    });

    // CLEAR CANVAS
    socket.on("draw:clear", () => {
        try {
            const session = currentDrawing();
            if (!session) return;

            io.to(session.roomCode).emit("draw:clear");

        } catch (error) {
            console.error("Clear canvas error:", error.message);
        }
    });
}

module.exports = registerDrawingHandlers;
