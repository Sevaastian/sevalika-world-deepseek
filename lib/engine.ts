import { getLayout, gridToScreen, screenToGrid, inGrid, type Layout } from "./iso";

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

export class Engine {
  me = { gx: 7, gy: 6 };
  myUsername = "SEN"; // Kendi kullanıcı adımızı burada tutacağız
  path: { gx: number, gy: number }[] = [];
  otherPlayers: RemotePlayer[] = [];
  bubbles: ChatBubble[] = [];

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

  click(x: number, y: number): { gx: number, gy: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const { gx, gy } = screenToGrid(x - rect.left, y - rect.top, this.layout);
    if (!inGrid(gx, gy, COLS, ROWS)) return null;

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

  // displayName: Ekranda yazan isim (SEN veya arkadaşın adı)
  // username: Sistemdeki gerçek adı (Balon eşleşmesi için)
  private drawCharacter(gx: number, gy: number, color: string, displayName: string, username: string, isMe: boolean) {
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

    // BALON ÇİZİMİ (Gerçek username ile arıyoruz)
    const bubble = this.bubbles.find(b => b.sender === username);
    if (bubble) {
      this.ctx.font = "14px sans-serif";
      const textWidth = this.ctx.measureText(bubble.text).width;
      const padding = 10;
      const bw = textWidth + padding * 2;
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
    this.ctx.fillStyle = "#020617";
    this.ctx.fillRect(0, 0, this.layout.width, this.layout.height);

    for (let gy = 0; gy < ROWS; gy++) {
      for (let gx = 0; gx < COLS; gx++) {
        this.drawTile(gx, gy, (gx + gy) % 2 === 0 ? "#334155" : "#293548", "#1e293b");
      }
    }

    type Drawable = { depth: number, draw: () => void };
    const chars: Drawable[] = [];

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
