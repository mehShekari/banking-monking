import { allCaptions } from "@/modules/film/constants/copy";
import { Words } from "./Words";

/** The film's captions, in timeline order (useFilmTimeline matches them by index). */
export function Captions() {
  return allCaptions.map((c) => (
    <section key={c.at} data-caption className="caption">
      <h2>
        <Words text={c.title} />
      </h2>
      {c.body && <p>{c.body}</p>}
    </section>
  ));
}
