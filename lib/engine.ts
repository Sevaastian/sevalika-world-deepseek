import { getLayout, gridToScreen, screenToGrid, inGrid, type Layout } from "./iso";

const COLS = 15;
const ROWS = 12;
const WALK_SPEED = 4;

export class Engine {
  me = { gx: 7, gy: 6 };
  path: { gx: number, gy: number }[] = [];
  hover: { gx: number, gy: number } | null = null;

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
  }

  click(x: number, y: number) {
    const rect = this.canvas.getBoundingClientRect();
    const { gx, gy } = screenToGrid(x - rect.left, y - rect.top, this.layout);
    if (!inGrid(gx, gy, COLS, ROWS)) return;

    // Basit yürüme yolu
    let cx = Math.round(this.me.gx);
    let cy = Math.round(this.me.gy);
    const steps = [];
    while (cx !== gx || cy !== gy) {
      if (cx !== gx) cx += Math.sign(gx - cx);
      else if (cy !== gy) cy += Math.sign(gy - cy);
      steps.push({ gx: cx, gy: cy });
    }
    this.path = steps;
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

  private render() {
    this.resize();
    this.ctx.fillStyle = "#020617";
    this.ctx.fillRect(0, 0, this.layout.width, this.layout.height);

    for (let gy = 0; gy < ROWS; gy++) {
      for (let gx = 0; gx < COLS; gx++) {
        this.drawTile(gx, gy, (gx + gy) % 2 === 0 ? "#334155" : "#293548", "#1e293b");
      }
    }

    // Karakter
    const { sx, sy } = gridToScreen(this.me.gx, this.me.gy, this.layout);
    const cy = sy + this.layout.tileH / 2;
    
    this.ctx.fillStyle = "rgba(0,0,0,0.5)";
    this.ctx.beginPath();
    this.ctx.ellipse(sx, cy + 2, 14, 6, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = "#3b82f6";
    this.ctx.fillRect(sx - 10, cy - 30, 20, 28); // Gövde
    
    this.ctx.fillStyle = "#fed7aa";
    this.ctx.beginPath();
    this.ctx.arc(sx, cy - 38, 10, 0, Math.PI * 2);
    this.ctx.fill();
  }
}