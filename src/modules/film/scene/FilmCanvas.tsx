"use client";

// The film's canvas: a WebGPU renderer (WebGL2 fallback) hosting the scene. Default export for
// next/dynamic (client only).

import { Canvas, extend } from "@react-three/fiber";
import { Suspense } from "react";
import * as THREE from "three/webgpu";
import { RectAreaLightTexturesLib } from "three/examples/jsm/lights/RectAreaLightTexturesLib.js";
import { Film } from "./Film";

// Node materials (and the rest of three/webgpu) as JSX elements.
extend(THREE as unknown as Parameters<typeof extend>[0]);
// Rect area lights on the node renderer need the LTC tables handed over once.
THREE.RectAreaLightNode.setLTC(RectAreaLightTexturesLib.init() as unknown as Parameters<typeof THREE.RectAreaLightNode.setLTC>[0]);

export default function FilmCanvas({ onReady }: { onReady: () => void }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={async (props) => {
        // WebGPU where the browser has it, WebGL2 otherwise (automatic); ?webgl forces the fallback.
        // No MSAA (see post.ts): SMAA in the post chain smooths the edges.
        const r = new THREE.WebGPURenderer({
          ...(props as object),
          antialias: false,
          powerPreference: "high-performance",
          forceWebGL: window.location.search.includes("webgl"),
        });
        await r.init();
        return r;
      }}
      camera={{ fov: 30, near: 0.05, far: 80, position: [0, 0, 6] }}
      onCreated={({ gl }) => {
        // Neutral keeps the artwork's colours and the navy ground true; ACES shifted both.
        gl.toneMapping = THREE.NeutralToneMapping;
      }}
      aria-hidden
    >
      <Suspense fallback={null}>
        <Film onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
