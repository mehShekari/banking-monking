"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { RefObject } from "react";

/**
 * The gateway (every `.cta`): one authored moment per button, played on enter and focus,
 * reversed on leave. The rim ignites, the face lights where the pointer is, then the arrow
 * draws in. The pointer steers the light and a slight tilt. Drives the CSS variables in
 * globals.css (--rim, --lit, --go, --x, --y, --a).
 */
export function useGateways(root: RefObject<HTMLElement | null>, ready: boolean) {
  useGSAP(
    () => {
      if (!ready) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const cleanup: (() => void)[] = [];
      for (const el of gsap.utils.selector(root)(".cta") as HTMLElement[]) {
        const tl = gsap
          .timeline({ paused: true, defaults: { ease: "expo.out" } })
          .to(el, { "--rim": 1, duration: 0.5 }, 0)
          .to(el, { "--lit": 1, duration: 0.6 }, 0.05)
          .to(el, { "--go": 1, duration: 0.65 }, 0.1);
        const toX = gsap.quickTo(el, "--x", { duration: 0.5, ease: "power3.out" });
        const toY = gsap.quickTo(el, "--y", { duration: 0.5, ease: "power3.out" });
        const toA = gsap.quickTo(el, "--a", { duration: 0.45, ease: "power3.out" });
        const tiltX = gsap.quickTo(el, "rotationX", { duration: 0.7, ease: "power3.out" });
        const tiltY = gsap.quickTo(el, "rotationY", { duration: 0.7, ease: "power3.out" });
        gsap.set(el, { transformPerspective: 600, "--x": 50, "--y": 30, "--a": 315 });
        let angle = 315; // unwrapped, so the rim light never spins the long way round
        const aim = (x: number, y: number, a: number) => {
          angle += ((a - angle + 540) % 360) - 180;
          toX(x);
          toY(y);
          toA(angle);
        };
        const move = (e: PointerEvent) => {
          if (e.pointerType === "touch") return;
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          aim(px * 100, py * 100, (Math.atan2(e.clientX - r.left - r.width / 2, r.top + r.height / 2 - e.clientY) * 180) / Math.PI);
          if (reduce) return;
          tiltY((px - 0.5) * 8);
          tiltX((0.5 - py) * 8);
        };
        const enter = () => (reduce ? tl.progress(1) : tl.timeScale(1).play());
        const leave = () => {
          if (reduce) tl.progress(0);
          else tl.timeScale(1.6).reverse();
          tiltX(0);
          tiltY(0);
        };
        // Keyboard focus gets the same moment, lit from the key light's side.
        const focus = () => {
          if (!el.matches(":focus-visible")) return;
          aim(50, 30, 315);
          enter();
        };
        el.addEventListener("pointerenter", enter);
        el.addEventListener("pointerleave", leave);
        el.addEventListener("pointermove", move, { passive: true });
        el.addEventListener("focus", focus);
        el.addEventListener("blur", leave);
        cleanup.push(() => {
          el.removeEventListener("pointerenter", enter);
          el.removeEventListener("pointerleave", leave);
          el.removeEventListener("pointermove", move);
          el.removeEventListener("focus", focus);
          el.removeEventListener("blur", leave);
          tl.kill();
        });
      }
      return () => cleanup.forEach((fn) => fn());
    },
    { scope: root, dependencies: [ready] },
  );
}
