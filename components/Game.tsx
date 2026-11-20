"use client";
import { useEffect, useRef } from "react";
import { Engine } from "@/lib/engine";

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new Engine(canvasRef.current);
    engineRef.current = engine;
    engine.start();
    return () => {
      engine.stop();
      engineRef.current = null;
    };
  }, []);

  return (
    <div className="relative w-full h-[100dvh] bg-slate-950 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-pointer"
        onClick={(e) => {
          engineRef.current?.click(e.clientX, e.clientY);
        }}
      />
      <div className="absolute top-4 left-4 bg-slate-900/80 p-4 rounded-xl border border-slate-700 text-white pointer-events-none">
        <h1 className="font-bold text-yellow-400 text-lg">SEVALIKA WORLD</h1>
        <p className="text-xs text-slate-300">Zemine tıkla, yürüsün</p>
      </div>
    </div>
  );
}
