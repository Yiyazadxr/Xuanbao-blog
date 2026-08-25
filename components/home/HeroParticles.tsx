"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useTheme } from "next-themes";
import { useMemo, useRef } from "react";
import * as THREE from "three";

// 种子化伪随机数（mulberry32）：渲染期纯函数，粒子分布每次一致
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 粒子场：缓慢自转 + 鼠标视差；颜色随主题切换（亮色用深紫，暗色用亮紫）
function Particles({ count = 2400, dark }: { count?: number; dark: boolean }) {
  const ref = useRef<THREE.Points>(null);

  // 随机分布在扁平的空间盒里，营造星野纵深感
  const positions = useMemo(() => {
    const random = mulberry32(20260717);
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (random() - 0.5) * 22;
      arr[i * 3 + 1] = (random() - 0.5) * 12;
      arr[i * 3 + 2] = (random() - 0.5) * 10;
    }
    return arr;
  }, [count]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    // 恒速自转
    ref.current.rotation.y += delta * 0.02;
    // 鼠标视差（惰性跟随）
    ref.current.rotation.x = THREE.MathUtils.lerp(
      ref.current.rotation.x,
      state.pointer.y * 0.08,
      0.04
    );
    ref.current.rotation.z = THREE.MathUtils.lerp(
      ref.current.rotation.z,
      state.pointer.x * 0.05,
      0.04
    );
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color={dark ? "#a78bfa" : "#6d28d9"}
        transparent
        opacity={dark ? 0.55 : 0.3}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// Hero 背景粒子层（Canvas 挂在绝对定位容器里，指针事件穿透）
export function HeroParticles() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 60 }}
      dpr={[1, 1.5]}
      gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
      style={{ pointerEvents: "none" }}
    >
      <Particles dark={dark} />
    </Canvas>
  );
}

