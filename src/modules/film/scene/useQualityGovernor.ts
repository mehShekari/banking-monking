import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { live } from "./live";
import { quality } from "./tsl";

/**
 * Adaptive quality: hold ~60 fps on weak GPUs. Steps down (first the particle budget, cheapest
 * to lose, then the render scale ~15% at a time) below 45 fps, and back up after 4 good seconds.
 * DPR is capped at 1.5: above that nobody sees the difference, and 2 would be 1.8x the pixels.
 * Starts 3 s after the shaders are warm: compile frames are slow, and a DPR change mid-compile
 * destroys the depth target under a pending pipeline, so the warm-up would never resolve.
 */
export function useQualityGovernor() {
  const setDpr = useThree((s) => s.setDpr);
  const gov = useRef({ t: 0, n: 0, warm: 0, cool: 0, good: 0, step: 0 });
  const ladder = useMemo(() => {
    const top = Math.min(window.devicePixelRatio, 1.5);
    return [1, 0.85, 0.72, 0.6].map((k) => Math.max(0.6, top * k)).filter((v, i, a) => i === 0 || v < a[i - 1] - 0.01);
  }, []);

  useFrame((_, dt) => {
    const g = gov.current;
    if (live.ready) g.warm += dt;
    if (g.warm <= 3 || document.hidden) return;
    g.t += dt;
    g.n++;
    g.cool -= dt;
    if (g.t < 1) return;
    const fps = g.n / g.t;
    g.t = 0;
    g.n = 0;
    g.good = fps > 58 ? g.good + 1 : 0;
    const steps = ladder.length + 1;
    const apply = () => {
      quality.particles = g.step >= 1 ? 0.5 : 1;
      setDpr(ladder[Math.max(0, g.step - 1)]);
    };
    if (fps < 45 && g.step < steps - 1 && g.cool <= 0) {
      g.step++;
      g.cool = 2.5;
      apply();
    } else if (g.good >= 4 && g.step > 0 && g.cool <= 0) {
      g.step--;
      g.cool = 4;
      g.good = 0;
      apply();
    }
  }, -1);

  return gov;
}
