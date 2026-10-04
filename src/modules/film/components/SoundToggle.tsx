"use client";

import { useEffect, useRef } from "react";
import { sound } from "@/modules/film/audio/sound";
import { ui } from "@/modules/film/constants/copy";

const KEY = "pzy-sound";

const stored = () => {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
};
const store = (on: boolean) => {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {}
};

/**
 * Sound is opt-in. A stored "on" never starts audio by itself: it waits for the first gesture
 * (pointerup, not pointerdown: a touch only unlocks audio on release). aria-pressed is owned
 * by the effect (the stored preference is only known on the client).
 */
export function SoundToggle({ ready }: { ready: boolean }) {
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const button = toggle.current;
    if (!ready || !button) return;
    const on = stored();
    button.setAttribute("aria-pressed", String(on));
    const wake = (e: Event) => {
      if (button.contains(e.target as Node)) return; // the toggle's own click decides
      sound.setEnabled(true);
      disarm();
    };
    const disarm = () => {
      window.removeEventListener("pointerup", wake);
      window.removeEventListener("keydown", wake);
    };
    const flip = () => {
      const next = button.getAttribute("aria-pressed") !== "true";
      button.setAttribute("aria-pressed", String(next));
      sound.setEnabled(next);
      store(next);
      disarm();
    };
    button.addEventListener("click", flip);
    if (on) {
      window.addEventListener("pointerup", wake);
      window.addEventListener("keydown", wake);
    }
    return () => {
      button.removeEventListener("click", flip);
      disarm();
      sound.setEnabled(false);
    };
  }, [ready]);

  return (
    <button ref={toggle} type="button" className="sound" aria-pressed="false">
      <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3.5 7.5H6L10 4v12l-4-3.5H3.5z" />
        <path className="wave" pathLength={1} d="M13 7.6a3.4 3.4 0 0 1 0 4.8" />
        <path className="wave" pathLength={1} d="M15.4 5.2a6.8 6.8 0 0 1 0 9.6" />
      </svg>
      {ui.sound}
    </button>
  );
}
