import { ImageResponse } from "next/og";

// 全站默认 OG 分享图（1200×630）：satori 内置字体仅覆盖拉丁字符，故用英文文案
export const alt = "Xuanbao.dev";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a0b 0%, #1c1917 100%)",
          color: "#fafaf9",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: 40,
            fontWeight: 700,
            color: "#2dd4bf",
          }}
        >
          <span
            style={{
              display: "flex",
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#0f766e",
              color: "#fff",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 800,
            }}
          >
            X
          </span>
          <span>Xuanbao.dev</span>
        </div>
        <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 24 }}>
          Blog · Life · Code
        </div>
        <div style={{ fontSize: 26, marginTop: 16, color: "#a1a1aa" }}>
          Personal blog about tech, life &amp; everything in between
        </div>
      </div>
    ),
    { ...size }
  );
}
