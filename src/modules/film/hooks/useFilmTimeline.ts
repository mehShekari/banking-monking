"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCallback, useRef, type RefObject } from "react";
import { allCaptions, finale, shots } from "@/modules/film/constants/copy";
import { clock } from "@/modules/film/timeline/clock";
import { stageTime } from "@/modules/film/timeline/path";
import { INTRO_END, LENGTH } from "@/modules/film/timeline/storyboard";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * The film's master timeline: the DOM layer's every beat, keyed on the same clock as the 3D
 * scene (its time is `clock.t`). The intro autoplays to INTRO_END; after that the scroll
 * scrubs it. Returns `jump(at)`, which scrolls to a film time (the rail's buttons).
 */
export function useFilmTimeline(root: RefObject<HTMLElement | null>, ready: boolean) {
  const trigger = useRef<ScrollTrigger | null>(null);

  useGSAP(
    () => {
      if (!ready) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const q = gsap.utils.selector(root);
      const rail = q("[data-shot]") as HTMLElement[];
      const fill = q(".rail-fill")[0] as HTMLElement;
      const cleanup: (() => void)[] = [];
      let active = -1;

      const film = gsap.timeline({
        paused: true,
        defaults: { ease: "expo.out", duration: 0.8 },
        onUpdate() {
          const t = film.time();
          clock.t = t;
          fill.style.transform = `scaleY(${gsap.utils.clamp(0, 1, (t - INTRO_END) / (LENGTH - INTRO_END))})`;
          let i = -1;
          shots.forEach((s, k) => (t >= s.at - 0.05 ? (i = k) : null));
          if (i !== active) {
            active = i;
            rail.forEach((el, k) => (k === i ? el.setAttribute("aria-current", "step") : el.removeAttribute("aria-current")));
          }
        },
      });
      film.set({}, {}, LENGTH);

      // Opening credits: one name per partner, each as its braid descends; then the
      // letterbox opens as the viewer takes control.
      const hidden = { autoAlpha: 0, scale: 1.04, filter: "blur(6px)" };
      const shown = { autoAlpha: 1, scale: 1, filter: "blur(0px)" };
      const names = q("[data-credit='issuers'] p");
      const present = q("[data-credit='present']");
      film
        .fromTo(names, hidden, { ...shown, stagger: 0.4 }, 0.6)
        .to(names, { autoAlpha: 0, filter: "blur(4px)", duration: 0.5, ease: "power2.in" }, 2.2)
        .fromTo(present, hidden, { ...shown, duration: 0.6 }, 2.3)
        .to(present, { autoAlpha: 0, filter: "blur(4px)", duration: 0.45, ease: "power2.in" }, 3.0)
        .fromTo(q(".cue"), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 3.6)
        .to(q(".cue"), { autoAlpha: 0, y: -8, duration: 0.6, ease: "power1.in" }, INTRO_END + 0.2)
        .to(q(".bar"), { scaleY: 0, duration: 1.6, ease: "power2.inOut" }, INTRO_END + 0.1)
        .fromTo(q(".rail, .request, .sound"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, 3.6);

      // Captions rise word by word out of the blur, then drift up and out.
      q("[data-caption]").forEach((el, i) => {
        const c = allCaptions[i];
        const body = el.querySelector("p");
        if (body) film.fromTo(body, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0 }, c.at + 0.35);
        film
          .fromTo(el.querySelectorAll(".w"), { autoAlpha: 0, yPercent: 45, filter: "blur(5px)" }, { autoAlpha: 1, yPercent: 0, filter: "blur(0px)", stagger: 0.07 }, c.at)
          .to(el.children, { autoAlpha: 0, y: -18, filter: "blur(4px)", duration: 0.5, ease: "power2.in", stagger: 0.05 }, c.out - 0.5);
      });

      // The path: each stage title is written by the pulse's light as it arrives,
      // then steps back (title only) when the next stage lights, and leaves after that.
      // The last two leave before the achievement caption.
      const labels = q("[data-anchor^='stage'] .stage-label") as HTMLElement[];
      labels.forEach((el, k) => {
        const at = stageTime(k) - 0.15;
        film
          .fromTo(el, { autoAlpha: 0, scale: 1, "--reveal": 0 }, { autoAlpha: 1, "--reveal": 1, duration: 0.7, ease: "power2.out" }, at)
          .fromTo(el.querySelector("p"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, at + 0.2);
        if (k + 1 < labels.length) {
          film
            .to(el, { autoAlpha: 0.12, scale: 0.9, duration: 0.5, ease: "power2.out" }, stageTime(k + 1) - 0.15)
            .to(el.querySelector("p"), { autoAlpha: 0, duration: 0.3 }, stageTime(k + 1) - 0.15);
        }
        if (k + 2 < labels.length) film.to(el, { autoAlpha: 0, duration: 0.4, ease: "power2.in" }, stageTime(k + 2) - 0.15);
        else film.to(el, { autoAlpha: 0, duration: 0.4, ease: "power2.in" }, stageTime(6) + 1.2);
      });

      film
        .to(q(".request"), { autoAlpha: 0, duration: 0.4 }, finale.at - 0.4)
        .fromTo(q(".finale .w"), { autoAlpha: 0, yPercent: 50, filter: "blur(6px)" }, { autoAlpha: 1, yPercent: 0, filter: "blur(0px)", duration: 1, stagger: 0.1 }, finale.at)
        .fromTo(q(".finale .sub, .finale .cta, .finale small"), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, stagger: 0.15 }, finale.at + 0.6)
        .fromTo(q(".finale .hint"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, finale.at + 1);

      // The end credits roll up over the film: its chrome steps aside as they enter,
      // and the scene may stop rendering once they reach the top of the screen.
      const roll = q(".end-credits")[0];
      ScrollTrigger.create({
        trigger: roll,
        start: "top bottom",
        end: "top 45%",
        scrub: true,
        animation: gsap.to(q(".chrome"), { autoAlpha: 0, ease: "none" }),
      });
      ScrollTrigger.create({
        trigger: roll,
        start: "top top",
        onToggle: (self) => (clock.covered = self.isActive),
      });
      cleanup.push(() => {
        clock.v = 0;
        clock.covered = false;
      });

      // Scroll speed for the shaders: written while scrolling, eased back to rest once it stops.
      const settle = gsap.to(clock, { v: 0, duration: 0.6, delay: 0.1, ease: "power2.out", paused: true });

      const takeOver = () => {
        document.documentElement.style.overflow = "";
        trigger.current = ScrollTrigger.create({
          trigger: q("[data-track]")[0],
          start: "top top",
          end: "bottom bottom",
          scrub: reduce ? true : 1.4,
          animation: film.tweenFromTo(INTRO_END, LENGTH, { paused: true, ease: "none" }),
          onUpdate(self) {
            clock.v = Math.min(1, Math.abs(self.getVelocity()) / 2500);
            settle.invalidate().restart(true);
          },
        });
      };

      // ?debug: seek the film to any time from DevTools (`__seek(3.3)`), for checking beats
      // the autoplayed intro passes too quickly to inspect.
      let intro: gsap.core.Tween | null = null;
      if (window.location.search.includes("debug")) {
        (window as unknown as { __seek?: (t: number) => void }).__seek = (t: number) => {
          intro?.kill();
          film.time(t);
        };
      }

      // The intro plays once on its own; any input fast-forwards it.
      // Reduced motion, or a restored scroll position, starts at the first frame the viewer controls.
      if (reduce || window.scrollY > 10) {
        film.time(INTRO_END);
        takeOver();
      } else {
        document.documentElement.style.overflow = "hidden";
        intro = film.tweenTo(INTRO_END, { ease: "none", onComplete: takeOver });
        const hurry = () => intro?.timeScale(5);
        const opts = { passive: true, once: true } as const;
        window.addEventListener("wheel", hurry, opts);
        window.addEventListener("touchstart", hurry, opts);
        window.addEventListener("keydown", hurry, { once: true });
        cleanup.push(() => {
          document.documentElement.style.overflow = "";
          window.removeEventListener("wheel", hurry);
          window.removeEventListener("touchstart", hurry);
          window.removeEventListener("keydown", hurry);
        });
      }
      return () => cleanup.forEach((fn) => fn());
    },
    { scope: root, dependencies: [ready] },
  );

  return useCallback((at: number) => {
    const st = trigger.current;
    if (!st) return;
    const k = (at - INTRO_END) / (LENGTH - INTRO_END);
    window.scrollTo({ top: st.start + k * (st.end - st.start) + 2, behavior: "smooth" });
  }, []);
}
