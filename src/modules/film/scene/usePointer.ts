import { useEffect } from "react";
import { live } from "./live";

const toNdc = (e: PointerEvent) => [(e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1];

/**
 * The pointer, written into `live.pointer`: parallax everywhere; in the finale, drag spins the
 * card and press-and-hold charges it (only off links and buttons, and not over the end credits).
 */
export function usePointer() {
  useEffect(() => {
    const p = live.pointer;
    const move = (e: PointerEvent) => {
      p.active = e.pointerType !== "touch" || p.down;
      [p.x, p.y] = toNdc(e);
      if (!p.down) return;
      if (Math.abs(e.clientX - p.downX) > 6) p.moved = true;
      if (p.moved) {
        const d = (e.clientX - p.lastX) * 0.009;
        live.hands.spin += d;
        live.hands.vel = d * 60;
      }
      p.lastX = e.clientX;
    };
    const down = (e: PointerEvent) => {
      if (live.interact < 0.5 || (e.target as Element).closest("a, button, .end-credits")) return;
      p.active = true;
      [p.x, p.y] = toNdc(e);
      Object.assign(p, { down: true, moved: false, downX: e.clientX, lastX: e.clientX, downAt: performance.now() });
      live.hands.idle = 0;
    };
    const up = (e: PointerEvent) => {
      p.down = false;
      if (e.pointerType === "touch") p.active = false;
    };
    const leave = () => (p.active = false);
    const over = (e: PointerEvent) => (live.ctaHover = !!(e.target as Element).closest?.(".cta"));
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerover", over);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      document.documentElement.removeEventListener("pointerleave", leave);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerover", over);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);
}
