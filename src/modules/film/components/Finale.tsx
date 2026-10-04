import { finale, issuersLine } from "@/modules/film/constants/copy";
import { Gateway } from "./Gateway";
import { Words } from "./Words";

/** The last shot's words and the way in. `.magnet` is moved by useMagnet. */
export function Finale() {
  return (
    <section className="finale">
      <h2>
        <Words text={finale.title} />
      </h2>
      <p className="sub">{finale.sub}</p>
      <span className="magnet">
        <Gateway />
      </span>
      <small>{issuersLine}</small>
      <p className="hint" aria-hidden>
        {finale.hint}
      </p>
    </section>
  );
}
