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

export class RoomNetwork {
  private channel: RealtimeChannel;
  private onPresence: (players: PresenceState[]) => void;

  constructor(roomSlug: string, myId: string, onPresence: (players: PresenceState[]) => void) {
    this.onPresence = onPresence;
    
    // Odaya özel bir kanal açıyoruz
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
        this.onPresence(players);
      })
      .subscribe();
  }

  // Kendi konumumuzu ve görünümümüzü yayınla
  track(state: PresenceState) {
    this.channel.track(state);
  }

  // Odadan ayrıl
  leave() {
    this.channel.unsubscribe();
  }
}
