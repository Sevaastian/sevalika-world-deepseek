"use client";
import { useEffect, useRef, useState } from "react";
import { Engine } from "@/lib/engine";
import { RoomNetwork } from "@/lib/network";
import type { Profile } from "@/lib/types";

export default function Game({ profile, onLogout }: { profile: Profile, onLogout: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const netRef = useRef<RoomNetwork | null>(null);
  
  const [onlineCount, setOnlineCount] = useState(1);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const engine = new Engine(canvasRef.current);
    engineRef.current = engine;
    engine.start();

    const room = "cadde-1";
    const net = new RoomNetwork(room, profile.id, (players) => {
      const others = players.filter(p => p.id !== profile.id);
      
      if (engineRef.current) {
        const currentOthers = engineRef.current.otherPlayers || [];
        
        // Ağdan gelen oyuncuları mevcut yürüme mantığına uyarla
        engineRef.current.otherPlayers = others.map(p => {
          const existing = currentOthers.find(o => o.id === p.id);
          return {
            id: p.id,
            name: p.name,
            gx: p.gx, // Ağdan gelen hedef
            gy: p.gy,
            currGx: existing ? existing.currGx : p.gx, // Eğer zaten varsa eski konumundan devam et
            currGy: existing ? existing.currGy : p.gy,
            shirtColor: p.shirtColor,
            role: p.role
          };
        });
      }
      setOnlineCount(players.length);
    });
    netRef.current = net;

    net.track({
      id: profile.id,
      name: profile.username,
      gx: 7,
      gy: 6,
      shirtColor: profile.shirtColor,
      hairColor: profile.hairColor,
      skinColor: profile.skinColor,
      role: profile.role
    });

    return () => {
      engine.stop();
      net.leave();
      engineRef.current = null;
      netRef.current = null;
    };
  }, [profile]);

  return (
    <div className="relative w-full h-[100dvh] bg-slate-950 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-pointer"
        onClick={(e) => {
          if (!engineRef.current || !netRef.current) return;
          
          const target = engineRef.current.click(e.clientX, e.clientY);
          
          if (target) {
            // Hedefe tıklanınca ağa yeni hedefi bildir
            netRef.current.track({
              id: profile.id,
              name: profile.username,
              gx: target.gx,
              gy: target.gy,
              shirtColor: profile.shirtColor,
              hairColor: profile.hairColor,
              skinColor: profile.skinColor,
              role: profile.role
            });
          }
        }}
      />
      
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-700 text-white pointer-events-auto flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="font-black text-yellow-400 text-lg uppercase tracking-wide">{profile.username}</h1>
            <span className="bg-slate-800 text-[10px] px-2 py-0.5 rounded text-slate-300">{profile.role}</span>
          </div>
          <p className="text-xs text-slate-300 font-bold">💰 {profile.coins} Sanil</p>
          <p className="text-[10px] text-green-400 font-bold mt-1">🟢 {onlineCount} Çevrimiçi</p>
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
