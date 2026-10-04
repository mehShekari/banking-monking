"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { RefObject } from "react";
import { finale } from "@/modules/film/constants/copy";
import { clock } from "@/modules/film/timeline/clock";

/**
 * The finale CTA leans toward the pointer once the finale is up. The magnet moves a wrapper
 * (`.magnet`), so it never fights the timeline's tween on the link itself.
 */
export function useMagnet(root: RefObject<HTMLElement | null>, ready: boolean) {
  useGSAP(
    () => {
      if (!ready || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const magnet = gsap.utils.selector(root)(".magnet")[0] as HTMLElement;
      const toX = gsap.quickTo(magnet, "x", { duration: 0.6, ease: "power3.out" });
      const toY = gsap.quickTo(magnet, "y", { duration: 0.6, ease: "power3.out" });
      const pull = (e: PointerEvent) => {
        const r = magnet.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const near = clock.t >= finale.at && Math.hypot(dx, dy) < 140;
        toX(near ? dx * 0.3 : 0);
        toY(near ? dy * 0.3 : 0);
      };
      window.addEventListener("pointermove", pull, { passive: true });
      return () => window.removeEventListener("pointermove", pull);
    },
    { scope: root, dependencies: [ready] },
  );
}
