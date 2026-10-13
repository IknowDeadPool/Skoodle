
import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { socket } from "../../../services/socket";
import { useGameState } from "../../../hooks/useGameState";

interface Stroke {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: string;
  width: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;

export default function DrawingCanvas() {
  const { drawerId, isDrawing, round } = useGameState();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(4);

  const canDraw = socket.id === drawerId && isDrawing;

  function drawStroke(stroke: Stroke) {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;

    context.beginPath();
    context.moveTo(stroke.x0, stroke.y0);
    context.lineTo(stroke.x1, stroke.y1);
    context.strokeStyle = stroke.color;
    context.lineWidth = stroke.width;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.stroke();
  }

  function clearCanvas() {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  useEffect(() => {
    function onStroke(stroke: Stroke) {
      drawStroke(stroke);
    }

    function onClear() {
      clearCanvas();
    }

    socket.on("draw:stroke", onStroke);
    socket.on("draw:clear", onClear);

    return () => {
      socket.off("draw:stroke", onStroke);
      socket.off("draw:clear", onClear);
    };
  }, []);

  useEffect(() => {
    drawingRef.current = false;
    lastPointRef.current = null;
    clearCanvas();
  }, [drawerId, round]);

  function getPoint(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();

    return {
      x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!canDraw) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    lastPointRef.current = getPoint(event);
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!canDraw || !drawingRef.current || !lastPointRef.current) return;

    const point = getPoint(event);

    const stroke: Stroke = {
      x0: lastPointRef.current.x,
      y0: lastPointRef.current.y,
      x1: point.x,
      y1: point.y,
      color,
      width: brushSize,
    };

    drawStroke(stroke);
    socket.emit("draw:stroke", stroke);

    lastPointRef.current = point;
  }

  function handlePointerUp() {
    drawingRef.current = false;
    lastPointRef.current = null;
  }

  function handleClear() {
    if (!canDraw) return;

    clearCanvas();
    socket.emit("draw:clear", {});
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          width: "100%",
          maxWidth: "800px",
          border: "1px solid black",
          backgroundColor: "white",
          touchAction: "none",
          cursor: canDraw ? "crosshair" : "default",
        }}
      />

      {canDraw && (
        <div>
          <label>
            Color:
            <input
              type="color"
              value={color}
              onChange={event => setColor(event.target.value)}
            />
          </label>

          <label>
            Brush size:
            <input
              type="range"
              min="2"
              max="20"
              value={brushSize}
              onChange={event => setBrushSize(Number(event.target.value))}
            />
          </label>

          <button onClick={handleClear}>Clear</button>
        </div>
      )}
    </div>
  );
}
