"use client";
import { useEffect, useRef, useState } from "react";
import { Engine, type Npc } from "@/lib/engine";
import { RoomNetwork, type ChatMessage } from "@/lib/network";
import { supabase } from "@/lib/supabase";
import { ROOMS } from "@/lib/iso";
import type { Profile } from "@/lib/types";

export default function Game({ profile, onLogout, onRefreshProfile }: { profile: Profile, onLogout: () => void, onRefreshProfile: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const netRef = useRef<RoomNetwork | null>(null);
  
  const [currentRoom, setCurrentRoom] = useState("cadde-1");
  const [onlineCount, setOnlineCount] = useState(1);
  const [chatInput, setChatInput] = useState("");
  const [activeNpc, setActiveNpc] = useState<Npc | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const engine = new Engine(canvasRef.current);
    engine.myUsername = profile.username;
    engine.currentRoom = currentRoom;
    
    engine.onNpcClick = (npc) => setActiveNpc(npc);

    engine.onPortalEnter = async (targetRoom: string) => {
      netRef.current?.leave();
      engine.setRoom(targetRoom);
      setCurrentRoom(targetRoom);
      setActiveNpc(null);
      connectToNetwork(engine, targetRoom);
    };

    engineRef.current = engine;
    engine.start();
    connectToNetwork(engine, currentRoom);

    return () => {
      engine.stop();
      netRef.current?.leave();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const connectToNetwork = (engine: Engine, roomSlug: string) => {
    const net = new RoomNetwork(
      roomSlug, profile.id, 
      (players) => {
        const others = players.filter(p => p.id !== profile.id);
        if (engineRef.current) {
          const currentOthers = engineRef.current.otherPlayers || [];
          engineRef.current.otherPlayers = others.map(p => {
            const existing = currentOthers.find(o => o.id === p.id);
            return {
              id: p.id, name: p.name, gx: p.gx, gy: p.gy,
              currGx: existing ? existing.currGx : p.gx, currGy: existing ? existing.currGy : p.gy,
              shirtColor: p.shirtColor, role: p.role
            };
          });
        }
        setOnlineCount(players.length);
      },
      (msg: ChatMessage) => {
        if (engineRef.current) {
          engineRef.current.bubbles.push({ id: msg.id, sender: msg.sender, text: msg.text, createdAt: Date.now() });
        }
      }
    );
    netRef.current = net;
    net.track({
      id: profile.id, name: profile.username, gx: 7, gy: 6,
      shirtColor: profile.shirtColor, hairColor: profile.hairColor, skinColor: profile.skinColor, role: profile.role
    });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput("");

    if (engineRef.current) {
      engineRef.current.bubbles.push({ id: Math.random().toString(), sender: profile.username, text, createdAt: Date.now() });
    }
    await supabase.rpc("send_chat", { p_room: currentRoom, p_text: text });
  };

  // --- NPC İŞLEMLERİ ---
  const buyRod = async () => {
    setLoadingAction(true);
    const { error } = await supabase.rpc("buy_fishing_rod");
    if (error) alert("Hata: " + error.message);
    else {
      alert("🎣 Olta alındı ve kuşandın! İskeleye gidip denize tıklayabilirsin.");
      onRefreshProfile(); // Parayı ve envanteri güncelle
      setActiveNpc(null);
    }
    setLoadingAction(false);
  };

  const sellFish = async () => {
    setLoadingAction(true);
    // p_item null göndererek çantadaki tüm balıkları satmasını istiyoruz
    const { data, error } = await supabase.rpc("sell_fish", { p_item: null }); 
    if (error) alert("Hata: " + error.message);
    else {
      alert(`💰 Satış başarılı! \nKazanç: ${data.earned} Sanil \nSatılan: ${data.sold} balık`);
      onRefreshProfile();
    }
    setLoadingAction(false);
  };

  return (
    <div className="relative w-full h-[100dvh] bg-slate-950 overflow-hidden flex flex-col">
      <div className="relative flex-1">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-pointer"
          onMouseMove={(e) => engineRef.current?.setHover(e.clientX, e.clientY)}
          onMouseLeave={() => { if(engineRef.current) engineRef.current.hoverTile = null; }}
          onClick={(e) => {
            if (!engineRef.current || !netRef.current) return;
            const target = engineRef.current.click(e.clientX, e.clientY);
            if (target && !target.isNpc) {
              netRef.current.track({
                id: profile.id, name: profile.username, gx: target.gx, gy: target.gy,
                shirtColor: profile.shirtColor, hairColor: profile.hairColor, skinColor: profile.skinColor, role: profile.role
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
          <button onClick={onLogout} className="bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 text-red-200 px-4 py-2 rounded-xl text-sm font-bold backdrop-blur-md transition pointer-events-auto">
            Çıkış Yap
          </button>
        </div>

        {activeNpc && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl z-50 w-80 pointer-events-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-black text-white">{activeNpc.name}</h2>
                <p className="text-sm text-yellow-400 font-bold">{activeNpc.role}</p>
              </div>
              <button onClick={() => setActiveNpc(null)} className="text-slate-400 hover:text-white bg-slate-800 px-2 py-1 rounded-md text-xs font-bold">✕ Kapat</button>
            </div>
            
            <div className="space-y-2">
              <p className="text-xs text-slate-400 mb-3">Merhaba gezgin! Sana nasıl yardımcı olabilirim?</p>
              
              {activeNpc.name === "Balıkçı Hasan" && (
                 <button onClick={buyRod} disabled={loadingAction || profile.inventory.includes('fishing_rod')} className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-bold py-2 rounded-xl transition">
                   {profile.inventory.includes('fishing_rod') ? 'Oltan Zaten Var' : 'Olta Al (200 Sanil)'}
                 </button>
              )}
              
              {activeNpc.name === "Şef Kemal" && (
                 <button onClick={sellFish} disabled={loadingAction} className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-bold py-2 rounded-xl transition">
                   Çantadaki Balıkları Sat
                 </button>
              )}

              {activeNpc.name === "Mert" && (
                 <div className="text-xs text-slate-300 bg-slate-800 p-3 rounded-xl border border-slate-700">
                   Merhaba dostum! Cadde 1'in rehberiyim. Sağ tarafa gidip <b>Restorana</b> gidip balıklarını satabilir, sol tarafa gidip <b>İskeleye</b> geçerek balık tutabilirsin. İyi şanslar!
                 </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-900 border-t border-slate-800 p-3 relative z-10">
        <form onSubmit={sendMessage} className="max-w-3xl mx-auto flex gap-2">
          <input
            type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} maxLength={140}
            placeholder="Bir şeyler yaz..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400"
          />
          <button type="submit" className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-6 py-2.5 rounded-xl transition">
            Gönder
          </button>
        </form>
      </div>
    </div>
  );
}
