// 显示偏好（字体缩放 + 界面密度 + 导航栏/页脚自定义）：默认存 localStorage，可开启跨设备同步
// 客户端可用；applyDisplay 与预水合脚本配合，避免 FOUC

export const FONT_SCALE_MIN = 0.8;
export const FONT_SCALE_MAX = 1.2;
export const FONT_SCALE_STEP = 0.02;
export const FONT_SCALE_DEFAULT = 1;

export type Density = "compact" | "normal" | "comfortable" | "custom";
export const DENSITY_DEFAULT: Density = "normal";

export const DENSITY_OPTIONS: { value: Density; label: string; desc: string }[] = [
  { value: "compact", label: "紧凑", desc: "更矮的导航栏与更紧凑的页脚" },
  { value: "normal", label: "标准", desc: "默认密度" },
  { value: "comfortable", label: "宽松", desc: "更舒适的间距" },
  { value: "custom", label: "自定义", desc: "单独调整导航栏高度与页脚间距" },
];

// 导航栏高度 / 页脚间距（自定义密度时使用，单位 px）
export const HEADER_H_MIN = 44;
export const HEADER_H_MAX = 88;
export const HEADER_H_DEFAULT = 64;
export const FOOTER_PY_MIN = 16;
export const FOOTER_PY_MAX = 64;
export const FOOTER_PY_DEFAULT = 40;

const LS_FONT_SCALE = "xr-font-scale";
const LS_DENSITY = "xr-density";
const LS_HEADER_H = "xr-header-h";
const LS_FOOTER_PY = "xr-footer-py";
const LS_SYNC = "xr-sync";

function clampNum(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function readFontScale(): number {
  if (typeof window === "undefined") return FONT_SCALE_DEFAULT;
  const v = Number(localStorage.getItem(LS_FONT_SCALE));
  return v >= FONT_SCALE_MIN && v <= FONT_SCALE_MAX ? v : FONT_SCALE_DEFAULT;
}

export function readDensity(): Density {
  if (typeof window === "undefined") return DENSITY_DEFAULT;
  const d = localStorage.getItem(LS_DENSITY);
  return d === "compact" || d === "comfortable" || d === "custom" ? d : DENSITY_DEFAULT;
}

export function readHeaderH(): number {
  if (typeof window === "undefined") return HEADER_H_DEFAULT;
  const v = Number(localStorage.getItem(LS_HEADER_H));
  return Number.isFinite(v) ? clampNum(v, HEADER_H_MIN, HEADER_H_MAX) : HEADER_H_DEFAULT;
}

export function readFooterPy(): number {
  if (typeof window === "undefined") return FOOTER_PY_DEFAULT;
  const v = Number(localStorage.getItem(LS_FOOTER_PY));
  return Number.isFinite(v) ? clampNum(v, FOOTER_PY_MIN, FOOTER_PY_MAX) : FOOTER_PY_DEFAULT;
}

export function isSyncEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LS_SYNC) === "1";
}

export function writeFontScale(scale: number): void {
  try {
    localStorage.setItem(LS_FONT_SCALE, String(scale));
  } catch {
    /* 忽略 */
  }
}

export function writeDensity(density: Density): void {
  try {
    localStorage.setItem(LS_DENSITY, density);
  } catch {
    /* 忽略 */
  }
}

export function writeHeaderH(px: number): void {
  try {
    localStorage.setItem(LS_HEADER_H, String(px));
  } catch {
    /* 忽略 */
  }
}

export function writeFooterPy(px: number): void {
  try {
    localStorage.setItem(LS_FOOTER_PY, String(px));
  } catch {
    /* 忽略 */
  }
}

export function setSyncEnabled(enabled: boolean): void {
  try {
    if (enabled) localStorage.setItem(LS_SYNC, "1");
    else localStorage.removeItem(LS_SYNC);
  } catch {
    /* 忽略 */
  }
}

// 立即应用到 <html>（无需刷新）
export function applyDisplay(
  fontScale: number,
  density: Density,
  headerH?: number,
  footerPy?: number
): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--font-scale", String(fontScale));
  if (density === "custom") {
    root.removeAttribute("data-density");
    root.style.setProperty("--header-h", `${headerH ?? readHeaderH()}px`);
    root.style.setProperty("--footer-py", `${footerPy ?? readFooterPy()}px`);
  } else {
    root.setAttribute("data-density", density);
    root.style.removeProperty("--header-h");
    root.style.removeProperty("--footer-py");
  }
}

// 预水合内联脚本（注入到 <head>，React 挂载前执行，避免 FOUC）
export const DISPLAY_PREHYDRATE_SCRIPT = `(function(){try{var s=localStorage.getItem("xr-font-scale"),d=localStorage.getItem("xr-density"),hh=localStorage.getItem("xr-header-h"),fp=localStorage.getItem("xr-footer-py"),h=document.documentElement;if(s)h.style.setProperty("--font-scale",s);if(d==="custom"){if(hh)h.style.setProperty("--header-h",hh+"px");if(fp)h.style.setProperty("--footer-py",fp+"px");}else if(d){h.setAttribute("data-density",d);}}catch(e){}})();`;
