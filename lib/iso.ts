export const TILE_W = 64;
export const TILE_H = 32;

export interface Layout {
  width: number; height: number; tileW: number; tileH: number;
  scale: number; offsetX: number; offsetY: number;
}

export function getLayout(width: number, height: number, cols: number, rows: number): Layout {
  const scale = Math.max(0.8, Math.min(width / (cols * 64), height / (rows * 40)));
  const tileW = TILE_W * scale;
  const tileH = TILE_H * scale;
  const worldW = (cols + rows) * (tileW / 2);
  const worldH = (cols + rows) * (tileH / 2);
  return {
    width, height, tileW, tileH, scale,
    offsetX: width / 2 - worldW / 2 + (rows * tileW) / 2,
    offsetY: height / 2 - worldH / 2 + 40 * scale,
  };
}

export function gridToScreen(gx: number, gy: number, l: Layout) {
  return {
    sx: (gx - gy) * (l.tileW / 2) + l.offsetX,
    sy: (gx + gy) * (l.tileH / 2) + l.offsetY,
  };
}

export function screenToGrid(sx: number, sy: number, l: Layout) {
  const x = sx - l.offsetX;
  const y = sy - l.offsetY;
  return {
    gx: Math.round((x / (l.tileW / 2) + y / (l.tileH / 2)) / 2),
    gy: Math.round((y / (l.tileH / 2) - x / (l.tileW / 2)) / 2),
  };
}

export const inGrid = (gx: number, gy: number, cols: number, rows: number) => gx >= 0 && gy >= 0 && gx < cols && gy < rows;

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
