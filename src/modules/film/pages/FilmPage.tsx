"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { Captions } from "@/modules/film/components/Captions";
import { EndCredits } from "@/modules/film/components/EndCredits";
import { FilmRail } from "@/modules/film/components/FilmRail";
import { Finale } from "@/modules/film/components/Finale";
import { SceneAnchors } from "@/modules/film/components/SceneAnchors";
import { SoundToggle } from "@/modules/film/components/SoundToggle";
import { credits, finale, ui } from "@/modules/film/constants/copy";
import { useFilmTimeline } from "@/modules/film/hooks/useFilmTimeline";
import { useGateways } from "@/modules/film/hooks/useGateways";
import { useMagnet } from "@/modules/film/hooks/useMagnet";
import { INTRO_END, LENGTH } from "@/modules/film/timeline/storyboard";

const FilmCanvas = dynamic(() => import("@/modules/film/scene/FilmCanvas"), { ssr: false });

/**
 * The page: one scroll-driven film. The 3D scene renders behind; the DOM layer above it
 * (credits, captions, labels, the finale, the rail) is timed by the same clock. Everything
 * waits for `ready` (the scene's shaders are compiled) before the intro starts.
 */
export function FilmPage() {
  const root = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const jump = useFilmTimeline(root, ready);
  useGateways(root, ready);
  useMagnet(root, ready);

  return (
    <main ref={root} className="film">
      <h1 className="sr-only">{ui.pageTitle}</h1>

      <div className="stage" aria-hidden>
        <FilmCanvas onReady={() => setReady(true)} />
      </div>

      <div className="bar bar-top" aria-hidden />
      <div className="bar bar-bottom" aria-hidden />
      {!ready && <div className="loading" role="status" aria-label={ui.loading} />}

      <div className="credits" aria-hidden>
        <div data-credit="issuers">
          {credits.issuers.map((name) => (
            <p key={name}>{name}</p>
          ))}
        </div>
        <p data-credit="present">{credits.present}</p>
      </div>

      <p className="cue">
        {ui.scrollCue}
        <span className="cue-line" aria-hidden />
      </p>

      <Captions />
      <SceneAnchors />

      {/* The film's chrome, faded as one by the end credits. */}
      <div className="chrome">
        <Finale />
        <a className="request" href={finale.ctaHref}>
          {ui.request}
        </a>
        <FilmRail onJump={jump} />
        <SoundToggle ready={ready} />
      </div>

      <div data-track style={{ height: `${(LENGTH - INTRO_END) * 34 + 100}vh` }} />

      <EndCredits />
    </main>
  );
}
