"use client";

import { useEffect, useRef } from "react";
import { readNumVar, readVar, type Rgb } from "@/lib/color";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

// 首页收尾：四层水墨远山。
// 山脊由分形噪声生成后转 Catmull-Rom 贝塞尔，远淡近浓、远慢近快；
// 颜色取 --accent 跟随亮暗，离屏停帧。

/** 采样点间距 px，越小越细腻、开销越大 */
const SAMPLE_STEP = 24;
/** 山脊两端外扩 px，盖住视差位移避免露切口 */
const BLEED = 80;
/** 设备像素比上限，柔和色块无需全量高分渲染 */
const MAX_DPR = 1.5;
/** 鼠标跟随速率 1/s，越小越拖尾 */
const FOLLOW = 2.2;
/** 单帧最大步进秒数，切回标签页时防山体瞬移 */
const MAX_DT = 0.05;

interface Layer {
  seed: number;
  /** 山脚基线，容器高度比例 */
  baseY: number;
  /** 起伏幅度，容器高度比例 */
  amp: number;
  /** 主色不透明度，远淡近浓 */
  alpha: number;
  /** 噪点频率，越大峰越密 */
  freq: number;
  /** 水平 / 垂直视差 px */
  px: number;
  py: number;
  /** 呼吸角速度 rad/s 与相位，各层错开避免同频 */
  speed: number;
  phase: number;
  /** 山脚保留的不透明度比例，远层散尽、近层压底 */
  bottom: number;
}

// 四层远山，由远及近
const LAYERS: Layer[] = [
  { seed: 11, baseY: 0.6, amp: 0.24, alpha: 0.06, freq: 1.1, px: 8, py: 3, speed: 0.16, phase: 0, bottom: 0 },
  { seed: 47, baseY: 0.72, amp: 0.27, alpha: 0.09, freq: 1.7, px: 16, py: 6, speed: 0.21, phase: 1.9, bottom: 0.12 },
  { seed: 83, baseY: 0.84, amp: 0.28, alpha: 0.14, freq: 2.4, px: 26, py: 10, speed: 0.26, phase: 3.4, bottom: 0.3 },
  { seed: 131, baseY: 0.96, amp: 0.3, alpha: 0.2, freq: 3.2, px: 38, py: 14, speed: 0.31, phase: 5.1, bottom: 0.55 },
];

function hash(i: number, seed: number) {
  const s = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** 一维值噪声，smoothstep 插值保证山脊连续可导 */
function valueNoise(x: number, seed: number) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i, seed) * (1 - u) + hash(i + 1, seed) * u;
}

/** 分形叠加：多频率噪声加权求和 */
function fbm(x: number, seed: number) {
  return (
    valueNoise(x, seed) * 0.55 +
    valueNoise(x * 2.07, seed + 19) * 0.28 +
    valueNoise(x * 4.13, seed + 47) * 0.17
  );
}

/** 山脊剖面 0~1：噪声取绝对值翻转出尖峰，再与基础噪声混合 */
function profile(x: number, seed: number, freq: number) {
  const n = fbm(x * freq, seed);
  const ridged = 1 - Math.abs(n * 2 - 1);
  return n * 0.38 + ridged * 0.62;
}

export function WaveBackground() {
  const reduceMotion = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // 当前主色 rgb，随主题切换更新
  const paletteRef = useRef<Rgb>([15, 118, 110]);
  // 远山强度倍率，随 --wave-intensity 更新
  const intensityRef = useRef(1);
  // 静态模式下主题切换 / 尺寸变化后手动补一帧
  const redrawRef = useRef<(() => void) | null>(null);

  // 监听 html class（主题）与 style（远山强度）变化，同步后重绘
  useEffect(() => {
    const html = document.documentElement;
    const sync = () => {
      paletteRef.current = readVar("--accent", [15, 118, 110]);
      intensityRef.current = readNumVar("--wave-intensity", 1);
      redrawRef.current?.();
    };
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(html, { attributes: true, attributeFilter: ["class", "style"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const host = canvas.parentElement;
    if (!host) return;

    let width = 1;
    let height = 1;
    // 一个噪声单位对应的像素长度，决定山峰疏密
    let unit = 360;
    let count = 0;
    // 采样点坐标，复用数组避免每帧分配
    let sx = new Float64Array(0);
    let sy = new Float64Array(0);
    let rafId = 0;
    let last = 0;
    // 累计时间秒，按真实时间推进，120Hz 屏不会跑成两倍速
    let elapsed = 0;

    const mouse = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };

    // 用箭头常量而非 function 声明：后者会被提升，闭包内丢失 canvas/ctx/host 的 null 收窄
    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // 峰距随宽度缩放但设上下限，宽屏不成土丘、窄屏不成锯齿
      unit = Math.min(Math.max(width / 3.4, 260), 480);
      const n = Math.min(140, Math.max(24, Math.ceil((width + BLEED * 2) / SAMPLE_STEP)));
      if (n !== count) {
        count = n;
        sx = new Float64Array(count + 1);
        sy = new Float64Array(count + 1);
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const [r, g, b] = paletteRef.current;
      const intensity = intensityRef.current;
      const rgba = (a: number) => `rgba(${r},${g},${b},${a * intensity})`;
      const span = width + BLEED * 2;
      const halfW = width * 0.5;

      for (let li = 0; li < LAYERS.length; li++) {
        const L = LAYERS[li];
        const baseYpx = height * L.baseY;
        const ampPx = height * L.amp;
        // 极慢横向漂移 + 鼠标视差，只挪山体不变形状
        const offX = mouse.x * L.px + Math.sin(elapsed * 0.075 + L.phase) * 7;
        const offY = mouse.y * L.py + Math.sin(elapsed * L.speed + L.phase) * height * 0.012;

        let minY = height;
        for (let i = 0; i <= count; i++) {
          const x = -BLEED + (span * i) / count;
          const h = profile((x - halfW) / unit, L.seed, L.freq);
          // 叠加沿山脊的低频垂直扰动，幅度极小
          const mist = Math.sin(elapsed * 0.13 + (x / width) * 1.7 + L.phase) * height * 0.006;
          const y = baseYpx - h * ampPx + offY + mist;
          sx[i] = x + offX;
          sy[i] = y;
          if (y < minY) minY = y;
        }

        ctx.beginPath();
        ctx.moveTo(sx[0], sy[0]);
        // Catmull-Rom 转贝塞尔，接缝斜率连续
        for (let i = 0; i < count; i++) {
          const p0 = i > 0 ? i - 1 : 0;
          const p3 = i + 2 <= count ? i + 2 : count;
          ctx.bezierCurveTo(
            sx[i] + (sx[i + 1] - sx[p0]) / 6,
            sy[i] + (sy[i + 1] - sy[p0]) / 6,
            sx[i + 1] - (sx[p3] - sx[i]) / 6,
            sy[i + 1] - (sy[p3] - sy[i]) / 6,
            sx[i + 1],
            sy[i + 1]
          );
        }
        // 山脊描边
        ctx.strokeStyle = rgba(Math.min(1, L.alpha * 1.5));
        ctx.lineWidth = 1;
        ctx.stroke();

        // 补成闭合山体后填充
        ctx.lineTo(sx[count] + BLEED, height + 2);
        ctx.lineTo(sx[0] - BLEED, height + 2);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, Math.max(minY, 0), 0, height);
        grad.addColorStop(0, rgba(L.alpha));
        grad.addColorStop(0.5, rgba(L.alpha * 0.8));
        grad.addColorStop(1, rgba(L.alpha * L.bottom));
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }

    const frame = (now: number) => {
      rafId = requestAnimationFrame(frame);
      const dt = last ? Math.min((now - last) / 1000, MAX_DT) : 1 / 60;
      last = now;
      elapsed += dt;
      // 指数平滑，与帧率解耦
      const k = 1 - Math.exp(-dt * FOLLOW);
      mouse.x += (target.x - mouse.x) * k;
      mouse.y += (target.y - mouse.y) * k;
      draw();
    }

    const start = () => {
      if (rafId) return;
      last = 0;
      rafId = requestAnimationFrame(frame);
    }

    const stop = () => {
      if (!rafId) return;
      cancelAnimationFrame(rafId);
      rafId = 0;
    }

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX / window.innerWidth - 0.5;
      target.y = e.clientY / window.innerHeight - 0.5;
    }

    redrawRef.current = draw;
    resize();
    draw();

    // 用 ResizeObserver，容器宽度变化也能跟上
    const ro = new ResizeObserver(() => {
      resize();
      if (!rafId) draw();
    });
    ro.observe(host);

    if (reduceMotion) {
      return () => {
        ro.disconnect();
        redrawRef.current = null;
      };
    }

    // 离屏停帧，滚过去了就别烧 CPU
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) start();
        else stop();
      },
      { rootMargin: "120px" }
    );
    io.observe(host);
    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      redrawRef.current = null;
    };
  }, [reduceMotion]);

  return (
    <div
      aria-hidden
      className="pointer-events-none relative -mt-8 h-40 w-full overflow-hidden select-none sm:h-56"
    >
      <canvas ref={canvasRef} className="block size-full" />
    </div>
  );
}
