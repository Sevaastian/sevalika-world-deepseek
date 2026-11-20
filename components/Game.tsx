"use client";
import { useEffect, useRef } from "react";
import { Engine } from "@/lib/engine";

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new Engine(canvasRef.current);
    engine.start();
    return () => engine.stop();
  }, []);

  return (
    <div className="relative w-full h-[100dvh] bg-slate-950 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-pointer"
        onClick={(e) => {
          // @ts-ignore
          window._engine?.click(e.clientX, e.clientY); 
        }}
      />
      <div className="absolute top-4 left-4 bg-slate-900/80 p-4 rounded-xl border border-slate-700 text-white">
        <h1 className="font-bold text-yellow-400">SEVALIKA WORLD</h1>
        <p className="text-xs text-slate-300">İskelet çalışıyor! Yere tıkla.</p>
      </div>
    </div>
  );
}