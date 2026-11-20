import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export interface PresenceState {
  id: string;
  name: string;
  gx: number;
  gy: number;
  shirtColor: string;
  hairColor: string;
  skinColor: string;
  role: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
}

export class RoomNetwork {
  private channel: RealtimeChannel;

  constructor(
    roomSlug: string, 
    myId: string, 
    onPresence: (players: PresenceState[]) => void,
    onChat: (msg: ChatMessage) => void
  ) {
    this.channel = supabase.channel(`room:${roomSlug}`, {
      config: { presence: { key: myId } },
    });

    this.channel
      .on("presence", { event: "sync" }, () => {
        const state = this.channel.presenceState();
        const players: PresenceState[] = [];
        for (const id in state) {
          const p = state[id][0] as unknown as PresenceState;
          players.push(p);
        }
        onPresence(players);
      })
      // Veritabanına yeni mesaj eklendiğinde dinle
      .on("postgres_changes", { 
        event: "INSERT", 
        schema: "public", 
        table: "messages", 
        filter: `room=eq.${roomSlug}` 
      }, (payload) => {
        const newMsg = payload.new;
        if (newMsg.kind === 'chat') {
          onChat({
            id: newMsg.id.toString(),
            sender: newMsg.sender,
            text: newMsg.text
          });
        }
      })
      .subscribe();
  }

  track(state: PresenceState) {
    this.channel.track(state);
  }

  leave() {
    this.channel.unsubscribe();
  }
}
