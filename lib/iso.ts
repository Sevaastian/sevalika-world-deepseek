export interface RoomTheme {
  floorA: string;
  floorB: string;
  name: string;
}

export const ROOMS: Record<string, RoomTheme> = {
  "cadde-1": { name: "Cadde 1", floorA: "#334155", floorB: "#293548" },
  "iskele": { name: "İskele", floorA: "#6b4a2b", floorB: "#5c3f25" },
  "restoran": { name: "Restoran", floorA: "#4a2a17", floorB: "#3f2312" },
  "maden": { name: "Maden", floorA: "#3b3b46", floorB: "#33333d" },
};
