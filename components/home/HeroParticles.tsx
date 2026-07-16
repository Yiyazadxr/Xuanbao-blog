"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

// 粒子场：缓慢自转 + 鼠标视差（只在 Hero 深色背景上使用）
function Particles({ count = 2400 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  // 随机分布在扁平的空间盒里，营造星野纵深感
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 22;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 12;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 10;
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
        color="#a78bfa"
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// Hero 背景粒子层（Canvas 挂在绝对定位容器里，指针事件穿透）
export function HeroParticles() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 60 }}
      dpr={[1, 1.5]}
      gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
      style={{ pointerEvents: "none" }}
    >
      <Particles />
    </Canvas>
  );
}
