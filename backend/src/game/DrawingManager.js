
class DrawingManager {
    constructor() {
        this.turnId = 0;
        this.history = [];
        this.redoStack = [];
        this.activeStroke = null;
    }

    resetTurn() {
        this.turnId++;
        this.history = [];
        this.redoStack = [];
        this.activeStroke = null;
    }

    snapshot() {
        return {
            turnId: this.turnId,
            history: this.history,
            activeStroke: this.activeStroke,
            redoCount: this.redoStack.length
        };
    }

    static validPoint(point) {
        return (
            point &&
            Number.isFinite(point.x) &&
            Number.isFinite(point.y) &&
            point.x >= 0 &&
            point.x <= 1 &&
            point.y >= 0 &&
            point.y <= 1
        );
    }

    static validColor(color) {
        return (
            typeof color === "string" &&
            /^#[0-9a-fA-F]{6}$/.test(color)
        );
    }

    begin(data) {
        if (this.activeStroke) return false;

        if (
            !data ||
            !["pen", "eraser"].includes(data.tool) ||
            !DrawingManager.validPoint(data.point) ||
            !DrawingManager.validColor(data.color) ||
            !Number.isFinite(data.size) ||
            data.size < 1 ||
            data.size > 80
        ) return false;

        this.activeStroke = {
            type: "stroke",
            tool: data.tool,
            color: data.color,
            size: data.size,
            points: [data.point]
        };

        return true;
    }

    addPoints(points) {
        if (
            !this.activeStroke ||
            !Array.isArray(points) ||
            points.length < 1 ||
            points.length > 128 ||
            !points.every(DrawingManager.validPoint) ||
            this.activeStroke.points.length + points.length > 10000
        ) return false;

        this.activeStroke.points.push(...points);
        return true;
    }

    end() {
        if (!this.activeStroke) return false;

        this.history.push(this.activeStroke);
        this.activeStroke = null;
        this.redoStack = [];

        return true;
    }

    fill(action) {
        if (
            this.activeStroke ||
            !action ||
            action.type !== "fill" ||
            !DrawingManager.validPoint(action.point) ||
            !DrawingManager.validColor(action.color)
        ) return false;

        this.history.push({
            type: "fill",
            point: action.point,
            color: action.color
        });

        this.redoStack = [];
        return true;
    }

    undo() {
        if (this.activeStroke || !this.history.length) {
            return false;
        }

        this.redoStack.push(this.history.pop());
        return true;
    }

    redo() {
        if (this.activeStroke || !this.redoStack.length) {
            return false;
        }

        this.history.push(this.redoStack.pop());
        return true;
    }

    clear() {
        this.history = [];
        this.redoStack = [];
        this.activeStroke = null;
    }
}

module.exports = DrawingManager;
