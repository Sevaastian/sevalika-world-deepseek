"use client";
import { useEffect, useRef } from "react";
import { Engine } from "@/lib/engine";
import type { Profile } from "@/lib/types";

export default function Game({ profile, onLogout }: { profile: Profile, onLogout: () => void }) {
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
        onClick={(e) => engineRef.current?.click(e.clientX, e.clientY)}
      />
      
      {/* Üst Bilgi Barı */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-700 text-white pointer-events-auto">
          <h1 className="font-black text-yellow-400 text-lg uppercase tracking-wide">{profile.username}</h1>
          <p className="text-xs text-slate-300 font-bold mt-1">💰 {profile.coins} Sanil</p>
        </div>

        <button 
          onClick={onLogout}
          className="bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 text-red-200 px-4 py-2 rounded-xl text-sm font-bold backdrop-blur-md transition pointer-events-auto"
        >
          Çıkış Yap
        </button>
      </div>
    </div>
  );
}
