export interface Profile {
  id: string;
  username: string;
  role: "user" | "vip" | "suvari" | "admin";
  coins: number;
  shirtColor: string;
  hairColor: string;
  skinColor: string;
  room: string | null;
}
