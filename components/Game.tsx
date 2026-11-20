"use client";
import { useEffect, useRef, useState } from "react";
import { Engine } from "@/lib/engine";
import { RoomNetwork, type ChatMessage } from "@/lib/network";
import { supabase } from "@/lib/supabase";
import { ROOMS } from "@/lib/iso";
import type { Profile } from "@/lib/types";

export default function Game({ profile, onLogout }: { profile: Profile, onLogout: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const netRef = useRef<RoomNetwork | null>(null);
  
  const [currentRoom, setCurrentRoom] = useState("cadde-1");
  const [onlineCount, setOnlineCount] = useState(1);
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const engine = new Engine(canvasRef.current);
    engine.myUsername = profile.username;
    engine.currentRoom = currentRoom;
    
    // PORTAL MANTIĞI: Karakter kapıya yürüdüğünde tetiklenir
    engine.onPortalEnter = async (targetRoom: string) => {
      // 1. Ağdan eski odadan ayrıl
      netRef.current?.leave();
      
      // 2. Ekranı temizle, yeni odaya geç
      engine.setRoom(targetRoom);
      setCurrentRoom(targetRoom);
      
      // 3. Yeni odaya ağdan bağlan
      connectToNetwork(engine, targetRoom);
    };

    engineRef.current = engine;
    engine.start();

    // İlk bağlantıyı kur
    connectToNetwork(engine, currentRoom);

    return () => {
      engine.stop();
      netRef.current?.leave();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  // Ağa bağlanma fonksiyonunu ayırdık (Oda değişince tekrar kullanacağız)
  const connectToNetwork = (engine: Engine, roomSlug: string) => {
    const net = new RoomNetwork(
      roomSlug, 
      profile.id, 
      (players) => {
        const others = players.filter(p => p.id !== profile.id);
        if (engineRef.current) {
          const currentOthers = engineRef.current.otherPlayers || [];
          engineRef.current.otherPlayers = others.map(p => {
            const existing = currentOthers.find(o => o.id === p.id);
            return {
              id: p.id,
              name: p.name,
              gx: p.gx,
              gy: p.gy,
              currGx: existing ? existing.currGx : p.gx,
              currGy: existing ? existing.currGy : p.gy,
              shirtColor: p.shirtColor,
              role: p.role
            };
          });
        }
        setOnlineCount(players.length);
      },
      (msg: ChatMessage) => {
        if (engineRef.current) {
          engineRef.current.bubbles.push({
            id: msg.id,
            sender: msg.sender,
            text: msg.text,
            createdAt: Date.now()
          });
        }
      }
    );
    netRef.current = net;

    net.track({
      id: profile.id,
      name: profile.username,
      gx: 7, gy: 6,
      shirtColor: profile.shirtColor,
      hairColor: profile.hairColor,
      skinColor: profile.skinColor,
      role: profile.role
    });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const text = chatInput.trim();
    setChatInput("");

    if (engineRef.current) {
      engineRef.current.bubbles.push({
        id: Math.random().toString(),
        sender: profile.username,
        text: text,
        createdAt: Date.now()
      });
    }

    const { error } = await supabase.rpc("send_chat", {
      p_room: currentRoom, // Bulunduğumuz odaya gönder
      p_text: text
    });

    if (error) {
      alert("Mesaj gönderilemedi: " + error.message);
    }
  };

  return (
    <div className="relative w-full h-[100dvh] bg-slate-950 overflow-hidden flex flex-col">
      <div className="relative flex-1">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-pointer"
          onClick={(e) => {
            if (!engineRef.current || !netRef.current) return;
            const target = engineRef.current.click(e.clientX, e.clientY);
            if (target) {
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
            <p className="text-xs text-slate-300 font-bold">📍 {ROOMS[currentRoom]?.name || currentRoom}</p>
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

      <div className="bg-slate-900 border-t border-slate-800 p-3 relative z-10">
        <form onSubmit={sendMessage} className="max-w-3xl mx-auto flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            maxLength={140}
            placeholder="Bir şeyler yaz..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400"
          />
          <button 
            type="submit"
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-6 py-2.5 rounded-xl transition"
          >
            Gönder
          </button>
        </form>
      </div>
    </div>
  );
}
