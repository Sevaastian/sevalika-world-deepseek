"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import AuthScreen from "./AuthScreen";
import Game from "./Game";

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    // Sayfa yenilendiğinde oturum açık mı diye kontrol et
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.rpc("get_my_profile").then(({ data }) => {
          if (data) {
            setProfile({
              id: data.id, username: data.username, role: data.role, coins: data.coins,
              shirtColor: data.shirt_color, hairColor: data.hair_color, skinColor: data.skin_color, room: data.room
            });
          }
          setBooting(false);
        });
      } else {
        setBooting(false);
      }
    });
  }, []);

  if (booting) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-yellow-400 font-bold animate-pulse">SEVALIKA YÜKLENİYOR...</div>;
  }

  if (!profile) return <AuthScreen onAuthed={setProfile} />;
  
  return <Game profile={profile} onLogout={() => { supabase.auth.signOut(); setProfile(null); }} />;
}
