"use client";

import { useEffect, useRef, useState } from "react";
import {
  clearDisplayPreferences,
  getDisplayPreferences,
  saveDisplayPreferences,
} from "@/app/settings/display-actions";
import {
  applyDisplay,
  DENSITY_OPTIONS,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  FONT_SCALE_STEP,
  FOOTER_PY_MAX,
  FOOTER_PY_MIN,
  HEADER_H_MAX,
  HEADER_H_MIN,
  isSyncEnabled,
  readDensity,
  readFooterPy,
  readFontScale,
  readHeaderH,
  readInkEnabled,
  readSpacingScale,
  readWaveIntensity,
  setSyncEnabled,
  SPACING_SCALE_MAX,
  SPACING_SCALE_MIN,
  SPACING_SCALE_STEP,
  WAVE_INTENSITY_MAX,
  WAVE_INTENSITY_MIN,
  WAVE_INTENSITY_STEP,
  writeDensity,
  writeFontScale,
  writeFooterPy,
  writeHeaderH,
  writeInkEnabled,
  writeSpacingScale,
  writeWaveIntensity,
  type Density,
} from "@/lib/display";
import { setReducedMotion, usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { successCls } from "@/components/ui/form-styles";

const rangeCls =
  "mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-foreground/10 accent-[var(--accent)]";

// 显示设置：字体缩放 + 页面间距 + 界面密度（含自定义导航栏/页脚）+ 跨设备同步
export function DisplayForm() {
  const [fontScale, setFontScale] = useState(readFontScale);
  const [spacingScale, setSpacingScale] = useState(readSpacingScale);
  const [density, setDensity] = useState<Density>(readDensity);
  const [headerH, setHeaderH] = useState(readHeaderH);
  const [footerPy, setFooterPy] = useState(readFooterPy);
  const [sync, setSync] = useState(isSyncEnabled());
  const [syncPending, setSyncPending] = useState(false);
  const [msg, setMsg] = useState("");
  const [waveIntensity, setWaveIntensity] = useState(readWaveIntensity);
  const [inkEnabled, setInkEnabled] = useState(readInkEnabled);
  const reduceMotion = usePrefersReducedMotion();
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 组件卸载时清掉未触发的防抖保存，避免在已卸载组件上更新状态
  useEffect(() => {
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, []);

  // 防抖后同步到账号：拖动滑块不触发请求风暴，失败时提示而非静默丢弃
  function persist(
    scale: number,
    sp: number,
    d: Density,
    hh: number,
    fp: number,
    wv: number,
    ink: boolean,
    motion: boolean
  ) {
    if (!sync) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      void saveDisplayPreferences(
        scale,
        sp,
        d,
        d === "custom" ? hh : null,
        d === "custom" ? fp : null,
        wv,
        ink,
        motion
      ).then((res) => {
        if (!res.ok) setMsg(res.error ?? "同步失败");
      });
    }, 500);
  }

  function changeFontScale(v: number) {
    setFontScale(v);
    writeFontScale(v);
    applyDisplay(v, density, headerH, footerPy, spacingScale);
    persist(v, spacingScale, density, headerH, footerPy, waveIntensity, inkEnabled, reduceMotion);
  }

  function changeSpacingScale(v: number) {
    setSpacingScale(v);
    writeSpacingScale(v);
    applyDisplay(fontScale, density, headerH, footerPy, v);
    persist(fontScale, v, density, headerH, footerPy, waveIntensity, inkEnabled, reduceMotion);
  }

  function changeDensity(d: Density) {
    setDensity(d);
    writeDensity(d);
    applyDisplay(fontScale, d, headerH, footerPy, spacingScale);
    persist(fontScale, spacingScale, d, headerH, footerPy, waveIntensity, inkEnabled, reduceMotion);
  }

  function changeHeaderH(px: number) {
    setHeaderH(px);
    writeHeaderH(px);
    applyDisplay(fontScale, density, px, footerPy, spacingScale);
    persist(fontScale, spacingScale, density, px, footerPy, waveIntensity, inkEnabled, reduceMotion);
  }

  function changeFooterPy(px: number) {
    setFooterPy(px);
    writeFooterPy(px);
    applyDisplay(fontScale, density, headerH, px, spacingScale);
    persist(fontScale, spacingScale, density, headerH, px, waveIntensity, inkEnabled, reduceMotion);
  }

  function changeWaveIntensity(v: number) {
    setWaveIntensity(v);
    writeWaveIntensity(v);
    persist(fontScale, spacingScale, density, headerH, footerPy, v, inkEnabled, reduceMotion);
  }

  function changeInkEnabled(enabled: boolean) {
    setInkEnabled(enabled);
    writeInkEnabled(enabled);
    persist(fontScale, spacingScale, density, headerH, footerPy, waveIntensity, enabled, reduceMotion);
  }

  function changeReduceMotion(enabled: boolean) {
    setReducedMotion(enabled);
    persist(fontScale, spacingScale, density, headerH, footerPy, waveIntensity, inkEnabled, enabled);
  }

  async function toggleSync(enabled: boolean) {
    setSync(enabled);
    setSyncEnabled(enabled);
    setMsg("");
    setSyncPending(true);
    try {
      if (!enabled) {
        await clearDisplayPreferences();
        setMsg("已关闭跨设备同步，偏好仅保存在本机");
        return;
      }
      const prefs = await getDisplayPreferences();
      const finalScale = prefs?.fontScale ?? fontScale;
      const finalSpacing = prefs?.spacingScale ?? spacingScale;
      const finalDensity = prefs?.density ?? density;
      const finalH = prefs?.headerH ?? headerH;
      const finalFp = prefs?.footerPy ?? footerPy;
      const finalWave = prefs?.waveIntensity ?? waveIntensity;
      const finalInk = prefs?.inkEnabled ?? inkEnabled;
      const finalMotion = prefs?.reduceMotion ?? reduceMotion;
      setFontScale(finalScale);
      setSpacingScale(finalSpacing);
      setDensity(finalDensity);
      setHeaderH(finalH);
      setFooterPy(finalFp);
      setWaveIntensity(finalWave);
      setInkEnabled(finalInk);
      setReducedMotion(finalMotion);
      writeFontScale(finalScale);
      writeSpacingScale(finalSpacing);
      writeDensity(finalDensity);
      writeHeaderH(finalH);
      writeFooterPy(finalFp);
      writeWaveIntensity(finalWave);
      writeInkEnabled(finalInk);
      applyDisplay(finalScale, finalDensity, finalH, finalFp, finalSpacing);
      await saveDisplayPreferences(
        finalScale,
        finalSpacing,
        finalDensity,
        finalDensity === "custom" ? finalH : null,
        finalDensity === "custom" ? finalFp : null,
        finalWave,
        finalInk,
        finalMotion
      );
      setMsg("已开启跨设备同步，登录其他设备会自动同步");
    } finally {
      setSyncPending(false);
    }
  }

  const percent = Math.round(fontScale * 100);
  const spPercent = Math.round(spacingScale * 100);

  return (
    <div className="space-y-6">
      {/* 字体大小 */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">字体大小</span>
          <span className="text-sm tabular-nums text-muted">{percent}%</span>
        </div>
        <input
          id="font-scale"
          type="range"
          min={FONT_SCALE_MIN}
          max={FONT_SCALE_MAX}
          step={FONT_SCALE_STEP}
          value={fontScale}
          onChange={(e) => changeFontScale(Number(e.target.value))}
          className={rangeCls}
        />
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>80%</span>
          <span>100%</span>
          <span>120%</span>
        </div>
      </div>

      {/* 页面间距 */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">页面间距</span>
          <span className="text-sm tabular-nums text-muted">{spPercent}%</span>
        </div>
        <input
          id="spacing-scale"
          type="range"
          min={SPACING_SCALE_MIN}
          max={SPACING_SCALE_MAX}
          step={SPACING_SCALE_STEP}
          value={spacingScale}
          onChange={(e) => changeSpacingScale(Number(e.target.value))}
          className={rangeCls}
        />
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>80%</span>
          <span>100%</span>
          <span>120%</span>
        </div>
      </div>

      {/* 界面密度 */}
      <div>
        <span className="text-sm font-medium">界面密度</span>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DENSITY_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => changeDensity(o.value)}
              aria-pressed={density === o.value}
              className={`cursor-pointer rounded-xl border px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                density === o.value
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted hover:border-accent hover:text-accent"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">
          {DENSITY_OPTIONS.find((o) => o.value === density)?.desc}
        </p>
      </div>

      {/* 自定义：导航栏高度 + 页脚间距 */}
      {density === "custom" && (
        <div className="space-y-4 rounded-xl border border-border p-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">导航栏高度</span>
              <span className="text-sm tabular-nums text-muted">{headerH}px</span>
            </div>
            <input
              type="range"
              min={HEADER_H_MIN}
              max={HEADER_H_MAX}
              step={2}
              value={headerH}
              onChange={(e) => changeHeaderH(Number(e.target.value))}
              className={rangeCls}
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">页脚间距</span>
              <span className="text-sm tabular-nums text-muted">{footerPy}px</span>
            </div>
            <input
              type="range"
              min={FOOTER_PY_MIN}
              max={FOOTER_PY_MAX}
              step={2}
              value={footerPy}
              onChange={(e) => changeFooterPy(Number(e.target.value))}
              className={rangeCls}
            />
          </div>
        </div>
      )}

      {/* 远山水墨强度 */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">远山水墨强度</span>
          <span className="text-sm tabular-nums text-muted">{Math.round(waveIntensity * 100)}%</span>
        </div>
        <input
          id="wave-intensity"
          type="range"
          min={WAVE_INTENSITY_MIN}
          max={WAVE_INTENSITY_MAX}
          step={WAVE_INTENSITY_STEP}
          value={waveIntensity}
          onChange={(e) => changeWaveIntensity(Number(e.target.value))}
          className={rangeCls}
        />
        <p className="mt-1 text-xs text-muted">调节页面底部远山水墨装饰的浓淡</p>
      </div>

      {/* 水墨墨迹开关 */}
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border p-4">
        <span className="min-w-0">
          <span className="block text-sm font-medium">水墨墨迹</span>
          <span className="mt-0.5 block text-xs text-muted">
            鼠标划过时拖出水墨晕染特效（关闭可提升性能）
          </span>
        </span>
        <input
          type="checkbox"
          checked={inkEnabled}
          onChange={(e) => changeInkEnabled(e.target.checked)}
          className="size-5 shrink-0 cursor-pointer accent-[var(--accent)]"
          role="switch"
        />
      </label>

      {/* 减少动效开关 */}
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border p-4">
        <span className="min-w-0">
          <span className="block text-sm font-medium">减少动效</span>
          <span className="mt-0.5 block text-xs text-muted">
            关闭全站入场与滚动动画，减少视觉刺激
          </span>
        </span>
        <input
          type="checkbox"
          checked={reduceMotion}
          onChange={(e) => changeReduceMotion(e.target.checked)}
          className="size-5 shrink-0 cursor-pointer accent-[var(--accent)]"
          role="switch"
        />
      </label>

      {/* 跨设备同步 */}
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border p-4">
        <span className="min-w-0">
          <span className="block text-sm font-medium">跨设备同步</span>
          <span className="mt-0.5 block text-xs text-muted">
            开启后偏好保存到账号，登录其他设备自动同步（默认仅保存在本机）
          </span>
        </span>
        <input
          type="checkbox"
          checked={sync}
          disabled={syncPending}
          onChange={(e) => toggleSync(e.target.checked)}
          className="size-5 shrink-0 cursor-pointer accent-[var(--accent)]"
          role="switch"
        />
      </label>

      {msg && <p className={successCls}>{msg}</p>}
    </div>
  );
}
