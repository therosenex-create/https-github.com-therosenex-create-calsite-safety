"use client";

import { useRef, useState } from "react";

type Point = { x: number; y: number };

export function SignaturePad({
  label,
  clearLabel,
}: {
  label: string;
  clearLabel: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const current = useRef<Point[]>([]);
  const [png, setPng] = useState("");
  const [strokes, setStrokes] = useState("[]");
  const all = useRef<Point[][]>([]);

  function point(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
  }

  function commit() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setStrokes(JSON.stringify(all.current));
    setPng(all.current.length ? canvas.toDataURL("image/png") : "");
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(event.pointerId);
    drawing.current = true;
    current.current = [point(event)];
    const context = canvas.getContext("2d");
    if (!context) return;
    context.strokeStyle = "#142033";
    context.lineWidth = 3;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(current.current[0].x, current.current[0].y);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context) return;
    const next = point(event);
    current.current.push(next);
    context.lineTo(next.x, next.y);
    context.stroke();
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    if (current.current.length > 0) all.current.push(current.current);
    current.current = [];
    commit();
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    all.current = [];
    current.current = [];
    commit();
  }

  return (
    <div>
      <p className="label">{label}</p>
      <canvas
        ref={canvasRef}
        width={600}
        height={180}
        className="mt-1 w-full touch-none rounded-md border border-line bg-white"
        style={{ height: 160 }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      />
      <button className="btn-secondary mt-2 min-h-14 w-full" type="button" onClick={clear}>
        {clearLabel}
      </button>
      <input type="hidden" name="signaturePng" value={png} />
      <input type="hidden" name="strokes" value={strokes} />
    </div>
  );
}
