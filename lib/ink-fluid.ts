// 水墨流体求解器：简化 Stable Fluids，纯计算无 DOM

/** 压力泊松迭代次数，越大越接近不可压缩，开销也线性增长 */
const PRESSURE_ITERATIONS = 12;
export const INK_MAX_DENSITY = 0.8;
/** 速度衰减，单位每秒 */
const VELOCITY_DECAY = 0.95;
/** 墨量衰减，单位每秒 */
const INK_DECAY = 0.4;

export class InkFluid {
  /** 内部网格宽，不含边界圈 */
  readonly width: number;
  /** 内部网格高，不含边界圈 */
  readonly height: number;
  /** 行跨距，用于把二维网格坐标换算成一维下标 */
  readonly stride: number;

  private readonly u: Float32Array;
  private readonly v: Float32Array;
  private readonly uPrev: Float32Array;
  private readonly vPrev: Float32Array;
  private readonly dens: Float32Array;
  private readonly densPrev: Float32Array;
  private readonly pressure: Float32Array;
  private readonly divergence: Float32Array;
  private readonly size: number;

  constructor(cssWidth: number, cssHeight: number, cellSize: number) {
    const w = Math.max(8, Math.round(cssWidth / cellSize));
    const h = Math.max(8, Math.round(cssHeight / cellSize));
    this.width = w;
    this.height = h;
    this.stride = w + 2;
    this.size = (w + 2) * (h + 2);
    this.u = new Float32Array(this.size);
    this.v = new Float32Array(this.size);
    this.uPrev = new Float32Array(this.size);
    this.vPrev = new Float32Array(this.size);
    this.dens = new Float32Array(this.size);
    this.densPrev = new Float32Array(this.size);
    this.pressure = new Float32Array(this.size);
    this.divergence = new Float32Array(this.size);
  }

  /** 墨量场，含边界圈，渲染层只读它 */
  get density(): Float32Array {
    return this.dens;
  }

  // radius 单位是格而非像素
  splat(
    x: number,
    y: number,
    radius: number,
    fx: number,
    fy: number,
    ink: number
  ): void {
    const w = this.width;
    const h = this.height;
    const s = this.stride;
    const i0 = Math.max(1, Math.floor(x - radius));
    const i1 = Math.min(w, Math.ceil(x + radius));
    const j0 = Math.max(1, Math.floor(y - radius));
    const j1 = Math.min(h, Math.ceil(y + radius));
    const inv = 2.2 / (radius * radius);
    for (let j = j0; j <= j1; j++) {
      const dy = j - y;
      const row = j * s;
      for (let i = i0; i <= i1; i++) {
        const dx = i - x;
        const falloff = Math.exp(-(dx * dx + dy * dy) * inv);
        if (falloff < 0.01) continue;
        const id = i + row;
        this.u[id] += fx * falloff;
        this.v[id] += fy * falloff;
        const next = this.dens[id] + ink * falloff;
        this.dens[id] = next > INK_MAX_DENSITY ? INK_MAX_DENSITY : next;
      }
    }
  }

  /** 环境流场，让鼠标静止时墨迹也能继续飘散 */
  addAmbientFlow(time: number, dt: number, strength: number): void {
    const w = this.width;
    const h = this.height;
    const s = this.stride;
    const t = time * 0.2;
    for (let j = 1; j <= h; j++) {
      const py = j * 0.32;
      const row = j * s;
      for (let i = 1; i <= w; i++) {
        const px = i * 0.32;
        const id = i + row;
        this.u[id] +=
          Math.sin(py + t) * Math.cos(px * 0.7 - t * 0.68) * strength * dt;
        this.v[id] +=
          Math.cos(px - t * 0.85) * Math.sin(py * 0.8 + t * 0.55) * strength * dt;
      }
    }
  }

  /** 推进一步：速度输运、投影、墨量输运、耗散 */
  step(dt: number): void {
    const damp = Math.exp(-VELOCITY_DECAY * dt);
    const fade = Math.exp(-INK_DECAY * dt);
    const size = this.size;

    this.uPrev.set(this.u);
    this.vPrev.set(this.v);
    this.advect(this.u, this.uPrev, this.uPrev, this.vPrev, dt);
    this.advect(this.v, this.vPrev, this.uPrev, this.vPrev, dt);
    this.project();

    for (let i = 0; i < size; i++) {
      this.u[i] *= damp;
      this.v[i] *= damp;
    }

    this.densPrev.set(this.dens);
    this.advect(this.dens, this.densPrev, this.u, this.v, dt);
    for (let i = 0; i < size; i++) {
      this.dens[i] *= fade;
    }
  }

  /** 半拉格朗日对流，沿速度回溯采样，无条件稳定 */
  private advect(
    d: Float32Array,
    d0: Float32Array,
    u: Float32Array,
    v: Float32Array,
    dt: number
  ): void {
    const w = this.width;
    const h = this.height;
    const s = this.stride;
    const maxX = w + 0.5;
    const maxY = h + 0.5;
    for (let j = 1; j <= h; j++) {
      const row = j * s;
      for (let i = 1; i <= w; i++) {
        const id = i + row;
        let x = i - dt * u[id];
        let y = j - dt * v[id];
        if (x < 0.5) x = 0.5;
        else if (x > maxX) x = maxX;
        if (y < 0.5) y = 0.5;
        else if (y > maxY) y = maxY;
        const i0 = x | 0;
        const j0 = y | 0;
        const s1 = x - i0;
        const s0 = 1 - s1;
        const t1 = y - j0;
        const t0 = 1 - t1;
        const a = i0 + j0 * s;
        const b = a + s;
        d[id] =
          s0 * (t0 * d0[a] + t1 * d0[b]) + s1 * (t0 * d0[a + 1] + t1 * d0[b + 1]);
      }
    }
  }

  /** 投影：解压力泊松方程，把速度场压成无散即不可压缩 */
  private project(): void {
    const w = this.width;
    const h = this.height;
    const s = this.stride;
    const u = this.u;
    const v = this.v;
    const p = this.pressure;
    const div = this.divergence;

    for (let j = 1; j <= h; j++) {
      const row = j * s;
      for (let i = 1; i <= w; i++) {
        const id = i + row;
        div[id] = -0.5 * (u[id + 1] - u[id - 1] + v[id + s] - v[id - s]);
        p[id] = 0;
      }
    }
    this.setBoundary(0, div);
    this.setBoundary(0, p);
    this.linearSolve(0, p, div, 1, 4, PRESSURE_ITERATIONS);

    for (let j = 1; j <= h; j++) {
      const row = j * s;
      for (let i = 1; i <= w; i++) {
        const id = i + row;
        u[id] -= 0.5 * (p[id + 1] - p[id - 1]);
        v[id] -= 0.5 * (p[id + s] - p[id - s]);
      }
    }
    this.setBoundary(1, u);
    this.setBoundary(2, v);
  }

  /** 高斯-赛德尔迭代，b 决定边界处理：0 标量、1 x 分量、2 y 分量 */
  private linearSolve(
    b: number,
    x: Float32Array,
    x0: Float32Array,
    a: number,
    c: number,
    iterations: number
  ): void {
    const w = this.width;
    const h = this.height;
    const s = this.stride;
    const cRecip = 1 / c;
    for (let k = 0; k < iterations; k++) {
      for (let j = 1; j <= h; j++) {
        const row = j * s;
        for (let i = 1; i <= w; i++) {
          const id = i + row;
          x[id] =
            (x0[id] + a * (x[id - 1] + x[id + 1] + x[id - s] + x[id + s])) *
            cRecip;
        }
      }
      this.setBoundary(b, x);
    }
  }

  /** 边界条件：法向速度取反以保证不穿墙，标量场镜面复制 */
  private setBoundary(b: number, x: Float32Array): void {
    const w = this.width;
    const h = this.height;
    const s = this.stride;
    const lastRow = (h + 1) * s;
    const bottomRow = h * s;

    for (let i = 1; i <= w; i++) {
      x[i] = b === 2 ? -x[i + s] : x[i + s];
      x[i + lastRow] = b === 2 ? -x[i + bottomRow] : x[i + bottomRow];
    }
    for (let j = 1; j <= h; j++) {
      const row = j * s;
      x[row] = b === 1 ? -x[1 + row] : x[1 + row];
      x[w + 1 + row] = b === 1 ? -x[w + row] : x[w + row];
    }
    x[0] = 0.5 * (x[1] + x[s]);
    x[lastRow] = 0.5 * (x[1 + lastRow] + x[bottomRow]);
    x[w + 1] = 0.5 * (x[w] + x[w + 1 + s]);
    x[w + 1 + lastRow] = 0.5 * (x[w + lastRow] + x[w + 1 + bottomRow]);
  }
}
