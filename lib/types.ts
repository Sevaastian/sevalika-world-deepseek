export interface Profile {
  id: string;
  username: string;
  role: "user" | "vip" | "suvari" | "admin";
  coins: number;
  shirtColor: string;
  hairColor: string;
  skinColor: string;
  room: string | null;
  inventory: string[]; // Envanter eklendi
  tool: string | null; // Kuşanılan alet eklendi
}
