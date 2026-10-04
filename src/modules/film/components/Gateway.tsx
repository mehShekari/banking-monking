import { finale } from "@/modules/film/constants/copy";

/** The CTA: a porcelain gateway, lit by the pointer, with the way in drawn on hover (useGateways). */
export function Gateway() {
  return (
    <a className="cta" href={finale.ctaHref}>
      <span className="cta-label">{finale.cta}</span>
      <svg className="cta-arrow" viewBox="0 0 24 12" aria-hidden>
        <path pathLength={1} d="M22 6H2.5M7 1.5 2.5 6 7 10.5" />
      </svg>
    </a>
  );
}
