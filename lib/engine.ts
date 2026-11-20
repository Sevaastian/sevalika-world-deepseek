import { getLayout, gridToScreen, screenToGrid, inGrid, type Layout, ROOMS } from "./iso";

const COLS = 15;
const ROWS = 12;
const WALK_SPEED = 4;

export interface RemotePlayer {
  id: string;
  name: string;
  gx: number;
  gy: number;
  currGx: number;
  currGy: number;
  shirtColor: string;
  role: string;
}

export interface ChatBubble {
  id: string;
  sender: string;
  text: string;
  createdAt: number;
}

export interface Npc {
  id: string;
  name: string;
  gx: number;
  gy: number;
  color: string;
  room: string;
  role: string;
}

const PORTALS: Record<string, { gx: number; gy: number; to: string; label: string }[]> = {
  "cadde-1": [
    { gx: 0, gy: 6, to: "iskele", label: "Sahil İskelesi" },
    { gx: 14, gy: 6, to: "restoran", label: "Sahil Restoranı" },
  ],
  "iskele": [{ gx: 14, gy: 6, to: "cadde-1", label: "Cadde 1" }],
  "restoran": [{ gx: 0, gy: 6, to: "cadde-1", label: "Cadde 1" }],
};

const NPCS: Npc[] = [
  { id: "npc_1", name: "Mert", gx: 5, gy: 5, color: "#ec4899", room: "cadde-1", role: "Rehber" },
  { id: "npc_2", name: "Balıkçı Hasan", gx: 10, gy: 5, color: "#0e7490", room: "iskele", role: "Balıkçı" },
  { id: "npc_3", name: "Şef Kemal", gx: 7, gy: 4, color: "#f8fafc", room: "restoran", role: "Aşçı" },
];

export class Engine {
  me = { gx: 7, gy: 6 };
  myUsername = "SEN";
  currentRoom = "cadde-1";
  path: { gx: number, gy: number }[] = [];
  otherPlayers: RemotePlayer[] = [];
  bubbles: ChatBubble[] = [];
  
  hoverTile: { gx: number, gy: number } | null = null;

  onPortalEnter: ((targetRoom: string) => void) | null = null;
  onNpcClick: ((npc: Npc) => void) | null = null;

  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private lastTs = 0;
  private layout: Layout = getLayout(900, 600, COLS, ROWS);
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  start() {
    const loop = (ts: number) => {
      const dt = this.lastTs ? Math.min(0.1, (ts - this.lastTs) / 1000) : 0;
      this.lastTs = ts;
      this.update(dt);
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() { cancelAnimationFrame(this.raf); }

  private update(dt: number) {
    let step = WALK_SPEED * dt;
    while (step > 0 && this.path.length > 0) {
      const next = this.path[0];
      const dx = next.gx - this.me.gx;
      const dy = next.gy - this.me.gy;
      const dist = Math.hypot(dx, dy);
      if (dist <= step) {
        this.me = { ...next };
        this.path.shift();
        step -= dist;
        if (this.path.length === 0) this.checkPortals();
      } else {
        this.me.gx += (dx / dist) * step;
        this.me.gy += (dy / dist) * step;
        step = 0;
      }
    }

    for (const p of this.otherPlayers) {
      const dx = p.gx - p.currGx;
      const dy = p.gy - p.currGy;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.05) {
        const step2 = Math.min(dist, WALK_SPEED * dt);
        p.currGx += (dx / dist) * step2;
        p.currGy += (dy / dist) * step2;
      }
    }

    const now = Date.now();
    this.bubbles = this.bubbles.filter(b => now - b.createdAt < 5000);
  }

  private checkPortals() {
    const portals = PORTALS[this.currentRoom] || [];
    const tileX = Math.round(this.me.gx);
    const tileY = Math.round(this.me.gy);
    const portal = portals.find(p => p.gx === tileX && p.gy === tileY);
    if (portal && this.onPortalEnter) {
      this.onPortalEnter(portal.to);
    }
  }

  setRoom(roomSlug: string) {
    this.currentRoom = roomSlug;
    this.me = { gx: 7, gy: 6 };
    this.path = [];
    this.otherPlayers = [];
  }

  setHover(x: number, y: number) {
    const rect = this.canvas.getBoundingClientRect();
    const { gx, gy } = screenToGrid(x - rect.left, y - rect.top, this.layout);
    if (inGrid(gx, gy, COLS, ROWS)) {
      this.hoverTile = { gx, gy };
    } else {
      this.hoverTile = null;
    }
  }

  click(x: number, y: number): { gx: number, gy: number, isNpc?: boolean } | null {
    const rect = this.canvas.getBoundingClientRect();
    const { gx, gy } = screenToGrid(x - rect.left, y - rect.top, this.layout);
    if (!inGrid(gx, gy, COLS, ROWS)) return null;

    const npc = NPCS.find(n => n.room === this.currentRoom && n.gx === gx && n.gy === gy);
    if (npc) {
      if (this.onNpcClick) this.onNpcClick(npc);
      return { gx, gy, isNpc: true };
    }

    let cx = Math.round(this.me.gx);
    let cy = Math.round(this.me.gy);
    const steps = [];
    while (cx !== gx || cy !== gy) {
      if (cx !== gx) cx += Math.sign(gx - cx);
      else if (cy !== gy) cy += Math.sign(gy - cy);
      steps.push({ gx: cx, gy: cy });
    }
    this.path = steps;
    return { gx, gy };
  }

  private resize() {
    const parent = this.canvas.parentElement;
    const w = parent?.clientWidth || 900;
    const h = parent?.clientHeight || 600;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (this.canvas.width !== w * dpr) {
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
      this.canvas.style.width = `${w}px`;
      this.canvas.style.height = `${h}px`;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.layout = getLayout(w, h, COLS, ROWS);
    }
  }

  private drawTile(gx: number, gy: number, fill: string, stroke: string) {
    const { sx, sy } = gridToScreen(gx, gy, this.layout);
    const { tileW, tileH } = this.layout;
    this.ctx.beginPath();
    this.ctx.moveTo(sx, sy);
    this.ctx.lineTo(sx + tileW / 2, sy + tileH / 2);
    this.ctx.lineTo(sx, sy + tileH);
    this.ctx.lineTo(sx - tileW / 2, sy + tileH / 2);
    this.ctx.closePath();
    this.ctx.fillStyle = fill;
    this.ctx.fill();
    this.ctx.strokeStyle = stroke;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }

  private drawPortal(gx: number, gy: number, label: string) {
    const { sx, sy } = gridToScreen(gx, gy, this.layout);
    const { tileW, tileH } = this.layout;
    const pulse = (Math.sin(Date.now() / 300) + 1) / 2;
    
    // Yerdeki parlama ve ok
    this.ctx.beginPath();
    this.ctx.moveTo(sx, sy);
    this.ctx.lineTo(sx + tileW / 2, sy + tileH / 2);
    this.ctx.lineTo(sx, sy + tileH);
    this.ctx.lineTo(sx - tileW / 2, sy + tileH / 2);
    this.ctx.closePath();
    this.ctx.fillStyle = `rgba(56, 189, 248, ${0.2 + pulse * 0.2})`;
    this.ctx.fill();

    this.ctx.save();
    this.ctx.translate(sx, sy + tileH / 2);
    this.ctx.beginPath();
    this.ctx.moveTo(0, 8);
    this.ctx.lineTo(-12, -6);
    this.ctx.lineTo(-4, -6);
    this.ctx.lineTo(-4, -16);
    this.ctx.lineTo(4, -16);
    this.ctx.lineTo(4, -6);
    this.ctx.lineTo(12, -6);
    this.ctx.closePath();
    this.ctx.fillStyle = `rgba(56, 189, 248, ${0.5 + pulse * 0.5})`;
    this.ctx.fill();
    this.ctx.restore();

    // HER ZAMAN GÖRÜNEN AHŞAP TABELA
    this.ctx.save();
    this.ctx.font = "bold 12px sans-serif";
    const tw = this.ctx.measureText(label).width;
    const bw = tw + 20;
    const bh = 24;
    const bx = sx - bw / 2;
    const by = sy - 15;

    // Ahşap Direk
    this.ctx.fillStyle = "#78350f"; 
    this.ctx.fillRect(sx - 3, by + bh, 6, 20);

    // Ahşap Pano
    this.ctx.fillStyle = "#b45309"; 
    this.ctx.beginPath();
    this.ctx.roundRect(bx, by, bw, bh, 4);
    this.ctx.fill();
    
    // Çerçeve
    this.ctx.strokeStyle = "#451a03";
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Yazı
    this.ctx.fillStyle = "#fef3c7";
    this.ctx.textAlign = "center";
    this.ctx.fillText(label, sx, by + 16);
    this.ctx.restore();
  }

  private drawCharacter(gx: number, gy: number, color: string, displayName: string, username: string, isMe: boolean, subText?: string) {
    const { sx, sy } = gridToScreen(gx, gy, this.layout);
    const cy = sy + this.layout.tileH / 2;

    this.ctx.fillStyle = "rgba(0,0,0,0.5)";
    this.ctx.beginPath();
    this.ctx.ellipse(sx, cy + 2, 14, 6, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = color;
    this.ctx.fillRect(sx - 10, cy - 30, 20, 28);
    
    this.ctx.fillStyle = "#fed7aa";
    this.ctx.beginPath();
    this.ctx.arc(sx, cy - 38, 10, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.font = "bold 12px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.fillStyle = isMe ? "#facc15" : "#ffffff";
    this.ctx.strokeStyle = "#000000";
    this.ctx.lineWidth = 3;
    this.ctx.strokeText(displayName, sx, cy - 55);
    this.ctx.fillText(displayName, sx, cy - 55);

    if (subText) {
      this.ctx.font = "10px sans-serif";
      this.ctx.fillStyle = "#38bdf8";
      this.ctx.strokeText(subText, sx, cy - 42);
      this.ctx.fillText(subText, sx, cy - 42);
    }

    const bubble = this.bubbles.find(b => b.sender === username);
    if (bubble) {
      this.ctx.font = "14px sans-serif";
      const textWidth = this.ctx.measureText(bubble.text).width;
      const bw = textWidth + 20;
      const bh = 30;
      const bx = sx - bw / 2;
      const by = cy - 100;

      this.ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      this.ctx.beginPath();
      this.ctx.roundRect(bx, by, bw, bh, 8);
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.moveTo(sx - 6, by + bh);
      this.ctx.lineTo(sx + 6, by + bh);
      this.ctx.lineTo(sx, by + bh + 8);
      this.ctx.fill();

      this.ctx.fillStyle = "#000000";
      this.ctx.textAlign = "center";
      this.ctx.fillText(bubble.text, sx, by + 20);
    }
  }

  private render() {
    this.resize();
    const theme = ROOMS[this.currentRoom] || ROOMS["cadde-1"];
    
    this.ctx.fillStyle = "#020617";
    this.ctx.fillRect(0, 0, this.layout.width, this.layout.height);

    for (let gy = 0; gy < ROWS; gy++) {
      for (let gx = 0; gx < COLS; gx++) {
        this.drawTile(gx, gy, (gx + gy) % 2 === 0 ? theme.floorA : theme.floorB, "#1e293b");
      }
    }

    const portals = PORTALS[this.currentRoom] || [];
    for (const p of portals) this.drawPortal(p.gx, p.gy, p.label);

    type Drawable = { depth: number, draw: () => void };
    const chars: Drawable[] = [];

    const npcs = NPCS.filter(n => n.room === this.currentRoom);
    for (const n of npcs) {
      chars.push({
        depth: n.gx + n.gy,
        draw: () => this.drawCharacter(n.gx, n.gy, n.color, n.name, n.name, false, n.role)
      });
    }

    for (const p of this.otherPlayers) {
      chars.push({
        depth: p.currGx + p.currGy,
        draw: () => this.drawCharacter(p.currGx, p.currGy, p.shirtColor, p.name, p.name, false)
      });
    }

    chars.push({
      depth: this.me.gx + this.me.gy + 0.1,
      draw: () => this.drawCharacter(this.me.gx, this.me.gy, "#3b82f6", "SEN", this.myUsername, true)
    });

    chars.sort((a, b) => a.depth - b.depth);
    for (const c of chars) c.draw();
  }
}
