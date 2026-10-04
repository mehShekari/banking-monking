import { doors, stages } from "@/modules/film/constants/copy";
import { STAGES } from "@/modules/film/timeline/path";

/**
 * Labels that ride the 3D scene, positioned every frame by useDomAnchors: one per path stage,
 * one per door, and the two finale formation captions (their text is written by the scene).
 */
export function SceneAnchors() {
  return (
    <>
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
    </>
  );
}
