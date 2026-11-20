"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

export default function AuthScreen({ onAuthed }: { onAuthed: (p: Profile) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    const nick = username.trim();
    if (nick.length < 3) {
      setError("Kullanıcı adı en az 3 karakter olmalı.");
      setLoading(false);
      return;
    }
    const email = `${nick.toLowerCase()}@sevalika.game`;

    try {
      if (mode === "register") {
        // 1. Kayıt Ol
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: nick } } // SQL tetikleyicisi buradan nick'i alıyor
        });
        if (signUpError) throw signUpError;
      } else {
        // 1. Giriş Yap
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }

      // 2. Profili Çek
      const { data: profileData, error: profileError } = await supabase.rpc("get_my_profile");
      if (profileError) throw profileError;

            // 3. Başarılıysa Oyuna Geç
      onAuthed({
        id: profileData.id,
        username: profileData.username,
        role: profileData.role,
        coins: profileData.coins,
        shirtColor: profileData.shirt_color,
        hairColor: profileData.hair_color,
        skinColor: profileData.skin_color,
        room: profileData.room,
        inventory: profileData.inventory || [], // <-- Eklendi
        tool: profileData.tool || null          // <-- Eklendi
      });

    } catch (err: any) {
      setError(err.message || "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-yellow-400 text-slate-950 font-black text-3xl flex items-center justify-center rounded-2xl shadow-[0_0_20px_rgba(250,204,21,0.5)]">
            S
          </div>
          <h1 className="text-2xl font-black text-white mt-4 tracking-wider">SEVALIKA</h1>
          <p className="text-xs text-slate-400 mt-1">Çok Oyunculu Sosyal Dünya</p>
        </div>

        <div className="flex bg-slate-800 p-1 rounded-xl mb-6">
          <button onClick={() => setMode("login")} className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${mode === "login" ? "bg-yellow-400 text-slate-950" : "text-slate-400"}`}>Giriş Yap</button>
          <button onClick={() => setMode("register")} className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${mode === "register" ? "bg-yellow-400 text-slate-950" : "text-slate-400"}`}>Kayıt Ol</button>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <input
            type="text" placeholder="Kullanıcı Adı" value={username} onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-yellow-400 outline-none"
          />
          <input
            type="password" placeholder="Şifre" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-yellow-400 outline-none"
          />
          {error && <div className="text-xs text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</div>}
          <button disabled={loading} className="w-full bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black py-3 rounded-xl transition disabled:opacity-50">
            {loading ? "Bekleniyor..." : mode === "login" ? "Giriş Yap" : "Hesap Oluştur"}
          </button>
        </form>
      </div>
    </div>
  );
}
