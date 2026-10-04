import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three/webgpu";

/** A dark product studio: softboxes and a dim floor bounce for the brushed metal to reflect. */
export function useStudioEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const env = new THREE.Scene();
    env.background = new THREE.Color("#010205");
    const box = (w: number, h: number, color: string, pos: [number, number, number]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
      m.position.set(...pos);
      m.lookAt(0, 0, 0);
      env.add(m);
    };
    box(1.2, 9, "#dfe9ff", [-5, 1, 2]);
    box(8, 0.8, "#ffffff", [0, 5, -1]);
    box(1, 7, "#6a90da", [5, 0, -3]);
    box(5, 3, "#2a3c66", [0, 0.5, 7]);
    box(12, 12, "#0c1430", [0, -6, 0]);
    const pmrem = new THREE.PMREMGenerator(gl as unknown as THREE.WebGPURenderer);
    const tex = pmrem.fromScene(env, 0.02).texture;
    scene.environment = tex;
    return () => {
      env.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
      tex.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
}
