import { endCredits, issuersLine } from "@/modules/film/constants/copy";
import { Gateway } from "./Gateway";

/** The closing text, rolling up over the film (the brochure's own words). */
export function EndCredits() {
  return (
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
        <small>{issuersLine}</small>
      </div>
    </section>
  );
}
