
// import { useEffect, useRef, useState } from "react";
// import type { PointerEvent } from "react";
// import { socket } from "../../../services/socket";
// import { useGameState } from "../../../hooks/useGameState";

// interface Stroke {
//   x0: number;
//   y0: number;
//   x1: number;
//   y1: number;
//   color: string;
//   width: number;
// }

// const CANVAS_WIDTH = 800;
// const CANVAS_HEIGHT = 500;

// export default function DrawingCanvas() {
//   const { drawerId, isDrawing, round } = useGameState();

//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const drawingRef = useRef(false);
//   const lastPointRef = useRef<{ x: number; y: number } | null>(null);

//   const [color, setColor] = useState("#000000");
//   const [brushSize, setBrushSize] = useState(4);

//   const canDraw = socket.id === drawerId && isDrawing;

//   function drawStroke(stroke: Stroke) {
//     const context = canvasRef.current?.getContext("2d");
//     if (!context) return;

//     context.beginPath();
//     context.moveTo(stroke.x0, stroke.y0);
//     context.lineTo(stroke.x1, stroke.y1);
//     context.strokeStyle = stroke.color;
//     context.lineWidth = stroke.width;
//     context.lineCap = "round";
//     context.lineJoin = "round";
//     context.stroke();
//   }

//   function clearCanvas() {
//     const context = canvasRef.current?.getContext("2d");
//     if (!context) return;

//     context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
//   }

//   useEffect(() => {
//     function onStroke(stroke: Stroke) {
//       drawStroke(stroke);
//     }

//     function onClear() {
//       clearCanvas();
//     }

//     socket.on("draw:stroke", onStroke);
//     socket.on("draw:clear", onClear);

//     return () => {
//       socket.off("draw:stroke", onStroke);
//       socket.off("draw:clear", onClear);
//     };
//   }, []);

//   useEffect(() => {
//     drawingRef.current = false;
//     lastPointRef.current = null;
//     clearCanvas();
//   }, [drawerId, round]);

//   function getPoint(event: PointerEvent<HTMLCanvasElement>) {
//     const rect = event.currentTarget.getBoundingClientRect();

//     return {
//       x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
//       y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
//     };
//   }

//   function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
//     if (!canDraw) return;

//     event.currentTarget.setPointerCapture(event.pointerId);
//     drawingRef.current = true;
//     lastPointRef.current = getPoint(event);
//   }

//   function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
//     if (!canDraw || !drawingRef.current || !lastPointRef.current) return;

//     const point = getPoint(event);

//     const stroke: Stroke = {
//       x0: lastPointRef.current.x,
//       y0: lastPointRef.current.y,
//       x1: point.x,
//       y1: point.y,
//       color,
//       width: brushSize,
//     };

//     drawStroke(stroke);
//     socket.emit("draw:stroke", stroke);

//     lastPointRef.current = point;
//   }

//   function handlePointerUp() {
//     drawingRef.current = false;
//     lastPointRef.current = null;
//   }

//   function handleClear() {
//     if (!canDraw) return;

//     clearCanvas();
//     socket.emit("draw:clear", {});
//   }

//   return (
//     <div>
//       <canvas
//         ref={canvasRef}
//         width={CANVAS_WIDTH}
//         height={CANVAS_HEIGHT}
//         onPointerDown={handlePointerDown}
//         onPointerMove={handlePointerMove}
//         onPointerUp={handlePointerUp}
//         onPointerCancel={handlePointerUp}
//         style={{
//           width: "100%",
//           maxWidth: "800px",
//           border: "1px solid black",
//           backgroundColor: "white",
//           touchAction: "none",
//           cursor: canDraw ? "crosshair" : "default",
//         }}
//       />

//       {canDraw && (
//         <div>
//           <label>
//             Color:
//             <input
//               type="color"
//               value={color}
//               onChange={event => setColor(event.target.value)}
//             />
//           </label>

//           <label>
//             Brush size:
//             <input
//               type="range"
//               min="2"
//               max="20"
//               value={brushSize}
//               onChange={event => setBrushSize(Number(event.target.value))}
//             />
//           </label>

//           <button onClick={handleClear}>Clear</button>
//         </div>
//       )}
//     </div>
//   );
// }





import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { socket } from "../../../services/socket";
import { useGameState } from "../../../hooks/useGameState";

type Point = { x: number; y: number };
type Tool = "pen" | "eraser" | "fill";

type Stroke = {
  type: "stroke";
  tool: "pen" | "eraser";
  color: string;
  size: number;
  points: Point[];
};

type FillAction = {
  type: "fill";
  point: Point;
  color: string;
};

type Action = Stroke | FillAction;

type DrawingState = {
  turnId: number;
  history: Action[];
  activeStroke: Stroke | null;
  redoCount: number;
};

const WIDTH = 800;
const HEIGHT = 500;

const COLORS = [
  "#000000", "#FFFFFF", "#FF0000", "#FF8800",
  "#FFFF00", "#00AA00", "#00AAFF", "#0000FF",
  "#8000FF", "#FF00FF", "#8B4513", "#808080"
];

function paintBackground(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const points = stroke.points;
  if (!points.length) return;

  ctx.save();
  ctx.strokeStyle = stroke.tool === "eraser" ? "#FFFFFF" : stroke.color;
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = stroke.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const first = points[0];
  const x = first.x * WIDTH;
  const y = first.y * HEIGHT;

  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(x, y, stroke.size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(x, y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x * WIDTH, points[i].y * HEIGHT);
    }

    ctx.stroke();
  }

  ctx.restore();
}

function floodFill(
  ctx: CanvasRenderingContext2D,
  point: Point,
  hex: string
) {
  const image = ctx.getImageData(0, 0, WIDTH, HEIGHT);
  const data = image.data;

  const x = Math.min(WIDTH - 1, Math.max(0, Math.floor(point.x * WIDTH)));
  const y = Math.min(HEIGHT - 1, Math.max(0, Math.floor(point.y * HEIGHT)));

  const start = (y * WIDTH + x) * 4;
  const target = Array.from(data.slice(start, start + 4));

  const replacement = [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
    255
  ];

  if (target.every((v, i) => v === replacement[i])) return;

  const matches = (offset: number) =>
    data[offset] === target[0] &&
    data[offset + 1] === target[1] &&
    data[offset + 2] === target[2] &&
    data[offset + 3] === target[3];

  const visited = new Uint8Array(WIDTH * HEIGHT);
  const stack = [y * WIDTH + x];

  while (stack.length) {
    const index = stack.pop()!;

    if (visited[index]) continue;
    visited[index] = 1;

    const offset = index * 4;
    if (!matches(offset)) continue;

    for (let i = 0; i < 4; i++) {
      data[offset + i] = replacement[i];
    }

    const px = index % WIDTH;
    const py = Math.floor(index / WIDTH);

    if (px > 0) stack.push(index - 1);
    if (px < WIDTH - 1) stack.push(index + 1);
    if (py > 0) stack.push(index - WIDTH);
    if (py < HEIGHT - 1) stack.push(index + WIDTH);
  }

  ctx.putImageData(image, 0, 0);
}

function replay(ctx: CanvasRenderingContext2D, state: DrawingState) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  paintBackground(ctx);

  for (const action of state.history) {
    if (action.type === "stroke") {
      drawStroke(ctx, action);
    } else {
      floodFill(ctx, action.point, action.color);
    }
  }

  if (state.activeStroke) {
    drawStroke(ctx, state.activeStroke);
  }
}

export default function DrawingCanvas() {
  const { playerId,drawerId, isDrawing, round } = useGameState();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<DrawingState | null>(null);
  const localStrokeRef = useRef<Stroke | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#000000");
  const [penSize, setPenSize] = useState(4);
  const [eraserSize, setEraserSize] = useState(24);
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(false);

 

const isDrawer = playerId !== null && playerId === drawerId;

const canDraw = isDrawer && isDrawing;
  const size = tool === "eraser" ? eraserSize : penSize;

  const renderState = useCallback((state: DrawingState) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    replay(ctx, state);
  }, []);

  const applyState = useCallback((state: DrawingState) => {
    if (
      stateRef.current &&
      state.turnId < stateRef.current.turnId
    ) return;

    stateRef.current = state;
    setUndoCount(state.history.length);
    setRedoCount(state.redoCount ?? 0);
    renderState(state);
  }, [renderState]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) paintBackground(ctx);

    function sync() {
      socket.emit(
        "draw:sync",
        (response: { success: boolean; state?: DrawingState }) => {
          if (response.success && response.state) {
            applyState(response.state);
          }
        }
      );
    }

    function onBegin(data: { turnId: number; stroke: Stroke }) {
      const current = stateRef.current;
      if (!current || data.turnId !== current.turnId) {
        sync();
        return;
      }

      current.activeStroke = data.stroke;
      renderState(current);
    }

    function onPoints(data: { turnId: number; points: Point[] }) {
      const current = stateRef.current;
      if (!current || data.turnId !== current.turnId) {
        sync();
        return;
      }

      if (!current.activeStroke) {
        sync();
        return;
      }

      current.activeStroke.points.push(...data.points);
      renderState(current);
    }

    socket.on("draw:state", applyState);
    socket.on("draw:begin", onBegin);
    socket.on("draw:points", onPoints);
    socket.on("connect", sync);

    sync();

    return () => {
      socket.off("draw:state", applyState);
      socket.off("draw:begin", onBegin);
      socket.off("draw:points", onPoints);
      socket.off("connect", sync);
    };
  }, [applyState, renderState]);

  useEffect(() => {
    localStrokeRef.current = null;
    pointerIdRef.current = null;

    // Request the authoritative state for the new turn.
    socket.emit(
      "draw:sync",
      (response: { success: boolean; state?: DrawingState }) => {
        if (response.success && response.state) {
          applyState(response.state);
        }
      }
    );
  }, [drawerId, round, applyState]);

  function getPoint(event: PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();

    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    };
  }

  function updateCursor(event: PointerEvent<HTMLCanvasElement>) {
    const cursor = cursorRef.current;
    if (!cursor) return;

    const rect = event.currentTarget.getBoundingClientRect();

    cursor.style.left = `${event.clientX - rect.left}px`;
    cursor.style.top = `${event.clientY - rect.top}px`;
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!canDraw || pointerIdRef.current !== null) return;

    if (tool === "fill") {
      socket.emit("draw:action", {
        type: "fill",
        point: getPoint(event),
        color
      });
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) return;

    const point = getPoint(event);
    const stroke: Stroke = {
      type: "stroke",
      tool,
      color,
      size,
      points: [point]
    };

    pointerIdRef.current = event.pointerId;
    localStrokeRef.current = stroke;
    event.currentTarget.setPointerCapture(event.pointerId);

    socket.emit("draw:begin", {
      tool,
      color,
      size,
      point
    });

    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawStroke(ctx, stroke);
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    updateCursor(event);

    const stroke = localStrokeRef.current;
    if (
      !canDraw ||
      !stroke ||
      pointerIdRef.current !== event.pointerId
    ) return;

    const point = getPoint(event);
    const previous = stroke.points[stroke.points.length - 1];

    if (previous.x === point.x && previous.y === point.y) return;

    stroke.points.push(point);

    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      drawStroke(ctx, {
        ...stroke,
        points: [previous, point]
      });
    }

    socket.emit("draw:points", { points: [point] });
  }

  function handlePointerUp(event: PointerEvent<HTMLCanvasElement>) {
    if (pointerIdRef.current !== event.pointerId) return;

    pointerIdRef.current = null;
    localStrokeRef.current = null;
    socket.emit("draw:end");
  }

  function handleAction(action: "undo" | "redo" | "clear") {
    if (!canDraw || localStrokeRef.current) return;
    socket.emit(`draw:${action}`);
  }

  return (
    <div style={{ width: "100%", maxWidth: WIDTH }}>
      <div style={{ position: "relative" }}>
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerEnter={() => setCursorVisible(true)}
          onPointerLeave={() => setCursorVisible(false)}
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            border: "1px solid #aaa",
            backgroundColor: "#fff",
            touchAction: "none",
            cursor: canDraw && tool === "eraser" ? "none" :
              canDraw ? "crosshair" : "default"
          }}
        />

        {canDraw && tool === "eraser" && cursorVisible && (
          <div
            ref={cursorRef}
            style={{
              position: "absolute",
              width: eraserSize,
              height: eraserSize,
              borderRadius: "50%",
              border: "1px solid #333",
              backgroundColor: "rgba(255,255,255,0.25)",
              pointerEvents: "none",
              transform: "translate(-50%, -50%)"
            }}
          />
        )}
      </div>

      {canDraw && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setTool("pen")} disabled={tool === "pen"}>
              Pen
            </button>
            <button onClick={() => setTool("eraser")} disabled={tool === "eraser"}>
              Eraser
            </button>
            <button onClick={() => setTool("fill")} disabled={tool === "fill"}>
              Fill
            </button>
            <button onClick={() => handleAction("undo")} disabled={!undoCount}>
              Undo
            </button>
            <button onClick={() => handleAction("redo")} disabled={!redoCount}>
              Redo
            </button>
            <button onClick={() => handleAction("clear")}>
              Clear
            </button>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                title={c}
                style={{
                  width: 28,
                  height: 28,
                  backgroundColor: c,
                  border: color === c ? "3px solid #555" : "1px solid #aaa",
                  borderRadius: 4,
                  cursor: "pointer"
                }}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={event => setColor(event.target.value)}
            />
          </div>

          {tool !== "fill" && (
            <label>
              {tool === "pen" ? "Pen size" : "Eraser size"}: {size}px
              <input
                type="range"
                min={tool === "pen" ? 1 : 5}
                max={tool === "pen" ? 40 : 80}
                value={size}
                onChange={event =>
                  tool === "pen"
                    ? setPenSize(Number(event.target.value))
                    : setEraserSize(Number(event.target.value))
                }
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
