import { shots, ui } from "@/modules/film/constants/copy";
import { INTRO_END, LENGTH } from "@/modules/film/timeline/storyboard";

/** Where each act begins, as a scrubber rail. The timeline fills it and marks the current act. */
export function FilmRail({ onJump }: { onJump: (at: number) => void }) {
  return (
    <nav className="rail" aria-label={ui.rail}>
      <span className="rail-track" aria-hidden>
        <span className="rail-fill" />
      </span>
      <ol>
        {shots.map((s) => (
          <li key={s.at} style={{ insetBlockStart: `${((s.at - INTRO_END) / (LENGTH - INTRO_END)) * 100}%` }}>
            <button type="button" data-shot onClick={() => onJump(s.at)}>
              <span className="dot" aria-hidden />
              <span className="name">{s.name}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
