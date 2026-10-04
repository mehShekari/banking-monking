"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import dynamic from "next/dynamic";
import { Fragment, useRef, useState } from "react";
import { clock } from "@/modules/film/timeline/clock";
import { captions, credits, doors, endCredits, finale, hook, shots, stages } from "@/modules/film/constants/copy";
import { STAGES, stageTime } from "@/modules/film/timeline/path";
import { sound } from "@/modules/film/audio/sound";
import { INTRO_END, LENGTH } from "@/modules/film/timeline/storyboard";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const Scene = dynamic(() => import("@/modules/film/scene/FilmCanvas"), { ssr: false });

// The hook rises at the end of the autoplayed intro, then the scrubbed captions.
const allCaptions: { at: number; out: number; title: string; body?: string }[] = [hook, ...captions];
const issuers = credits.issuers.join(" · ");

// Persian is cursive: split into words, never letters.
function Words({ text }: { text: string }) {
  return text.split(" ").map((w, i) => (
    <Fragment key={i}>
      <span className="w">{w}</span>{" "}
    </Fragment>
  ));
}

/** The CTA: a porcelain gateway, lit by the pointer, with the way in drawn on hover. */
function Gateway() {
  return (
    <a className="cta" href={finale.ctaHref}>
      <span className="cta-label">{finale.cta}</span>
      <svg className="cta-arrow" viewBox="0 0 24 12" aria-hidden>
        <path pathLength={1} d="M22 6H2.5M7 1.5 2.5 6 7 10.5" />
      </svg>
    </a>
  );
}

export function FilmPage() {
  const root = useRef<HTMLElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const [ready, setReady] = useState(false);

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

      // The CTA leans toward the pointer once the finale is up. Magnet on a wrapper,
      // so it never fights the timeline's tween on the link itself.
      if (!reduce) {
        const magnet = q(".magnet")[0] as HTMLElement;
        const toX = gsap.quickTo(magnet, "x", { duration: 0.6, ease: "power3.out" });
        const toY = gsap.quickTo(magnet, "y", { duration: 0.6, ease: "power3.out" });
        const pull = (e: PointerEvent) => {
          const r = magnet.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2);
          const dy = e.clientY - (r.top + r.height / 2);
          const near = film.time() >= finale.at && Math.hypot(dx, dy) < 140;
          toX(near ? dx * 0.3 : 0);
          toY(near ? dy * 0.3 : 0);
        };
        window.addEventListener("pointermove", pull, { passive: true });
        cleanup.push(() => window.removeEventListener("pointermove", pull));
      }

      // The gateway (both CTAs): one authored moment per button, played on enter and focus,
      // reversed on leave. The rim ignites, the face lights where the pointer is, then the label
      // steps forward as the arrow draws in. The pointer steers the light and a slight tilt.
      for (const el of q(".cta") as HTMLElement[]) {
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

      // Sound is opt-in. A stored "on" never starts audio by itself: it waits for the
      // first gesture (pointerup, not pointerdown: a touch only unlocks audio on release).
      const toggle = q(".sound")[0] as HTMLButtonElement;
      let stored = false;
      try {
        stored = localStorage.getItem("pzy-sound") === "on";
      } catch {}
      toggle.setAttribute("aria-pressed", String(stored));
      const wake = (e: Event) => {
        if (toggle.contains(e.target as Node)) return; // the toggle's own click decides
        sound.setEnabled(true);
        disarm();
      };
      const disarm = () => {
        window.removeEventListener("pointerup", wake);
        window.removeEventListener("keydown", wake);
      };
      const flip = () => {
        const on = toggle.getAttribute("aria-pressed") !== "true";
        toggle.setAttribute("aria-pressed", String(on));
        sound.setEnabled(on);
        try {
          localStorage.setItem("pzy-sound", on ? "on" : "off");
        } catch {}
        disarm();
      };
      toggle.addEventListener("click", flip);
      if (stored) {
        window.addEventListener("pointerup", wake);
        window.addEventListener("keydown", wake);
      }
      cleanup.push(() => {
        toggle.removeEventListener("click", flip);
        disarm();
        sound.setEnabled(false);
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

      // The intro plays once on its own; any input fast-forwards it.
      // Reduced motion, or a restored scroll position, starts at the first frame the viewer controls.
      if (reduce || window.scrollY > 10) {
        film.time(INTRO_END);
        takeOver();
      } else {
        document.documentElement.style.overflow = "hidden";
        const intro = film.tweenTo(INTRO_END, { ease: "none", onComplete: takeOver });
        const hurry = () => intro.timeScale(5);
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

  const jump = (at: number) => {
    const st = trigger.current;
    if (!st) return;
    const k = (at - INTRO_END) / (LENGTH - INTRO_END);
    window.scrollTo({ top: st.start + k * (st.end - st.start) + 2, behavior: "smooth" });
  };

  return (
    <main ref={root} className="film">
      <h1 className="sr-only">پژوهش‌یار؛ کارت مؤسسه تحقیق و توسعه دانشمند، بانک سینا و گرین‌بانک</h1>

      <div className="stage" aria-hidden>
        <Scene onReady={() => setReady(true)} />
      </div>

      <div className="bar bar-top" aria-hidden />
      <div className="bar bar-bottom" aria-hidden />
      {!ready && <div className="loading" role="status" aria-label="در حال آماده‌سازی" />}

      <div className="credits" aria-hidden>
        <div data-credit="issuers">
          {credits.issuers.map((name) => (
            <p key={name}>{name}</p>
          ))}
        </div>
        <p data-credit="present">{credits.present}</p>
      </div>

      <p className="cue">
        برای دیدن، اسکرول کنید
        <span className="cue-line" aria-hidden />
      </p>

      {allCaptions.map((c) => (
        <section key={c.at} data-caption className="caption">
          <h2>
            <Words text={c.title} />
          </h2>
          {c.body && <p>{c.body}</p>}
        </section>
      ))}

      {/* Positioned every frame by the scene: one anchor per path stage, one per door. */}
      <ol className="stages">
        {stages.map((s, k) => (
          <li key={s.title} data-anchor={`stage-${k}`} data-side={STAGES[k].pos[0] < 0 ? "left" : "right"} className="anchor">
            <div className="stage-label">
              <h3>{s.title}</h3>
              <p>{s.line}</p>
            </div>
          </li>
        ))}
      </ol>
      {doors.map((d, k) => (
        <div key={d} data-anchor={`door-${k}`} className="anchor" aria-hidden>
          <div className="door-label">{d}</div>
        </div>
      ))}
      {[0, 1].map((k) => (
        <div key={k} data-anchor={`form-${k}`} className="anchor" aria-hidden>
          <div className="form-label" />
        </div>
      ))}

      {/* The film's chrome, faded as one by the end credits. */}
      <div className="chrome">
        <section className="finale">
          <h2>
            <Words text={finale.title} />
          </h2>
          <p className="sub">{finale.sub}</p>
          <span className="magnet">
            <Gateway />
          </span>
          <small>{issuers}</small>
          <p className="hint" aria-hidden>
            {finale.hint}
          </p>
        </section>

        <a className="request" href={finale.ctaHref}>
          ورود به مسیر
        </a>

        <nav className="rail" aria-label="صحنه‌های فیلم">
          <span className="rail-track" aria-hidden>
            <span className="rail-fill" />
          </span>
          <ol>
            {shots.map((s) => (
              <li key={s.at} style={{ insetBlockStart: `${((s.at - INTRO_END) / (LENGTH - INTRO_END)) * 100}%` }}>
                <button type="button" data-shot onClick={() => jump(s.at)}>
                  <span className="dot" aria-hidden />
                  <span className="name">{s.name}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {/* aria-pressed is owned by the effect above (stored preference). */}
        <button type="button" className="sound" aria-pressed="false">
          <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3.5 7.5H6L10 4v12l-4-3.5H3.5z" />
            <path className="wave" pathLength={1} d="M13 7.6a3.4 3.4 0 0 1 0 4.8" />
            <path className="wave" pathLength={1} d="M15.4 5.2a6.8 6.8 0 0 1 0 9.6" />
          </svg>
          صدا
        </button>
      </div>

      <div data-track style={{ height: `${(LENGTH - INTRO_END) * 34 + 100}vh` }} />

      <section className="end-credits">
        <div className="end-credits-col">
          <h2>{endCredits.title}</h2>
          {endCredits.lead.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <ul className="privileges">
            {endCredits.privileges.map((p) => (
              <li key={p.title}>
                <h3>{p.title}</h3>
                <p>{p.line}</p>
              </li>
            ))}
          </ul>
          <div className="access">
            {endCredits.access.lead.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <h3>{endCredits.access.title}</h3>
            <ul className="opportunities">
              {endCredits.access.list.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
          <p className="closing">{endCredits.closing}</p>
          <p className="signoff">
            {endCredits.signoff.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </p>
          <Gateway />
          <small>{issuers}</small>
        </div>
      </section>
    </main>
  );
}
