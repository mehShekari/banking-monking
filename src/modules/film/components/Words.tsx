import { Fragment } from "react";

/** A line split into word spans for word-by-word reveals. Persian is cursive: words, never letters. */
export function Words({ text }: { text: string }) {
  return text.split(" ").map((w, i) => (
    <Fragment key={i}>
      <span className="w">{w}</span>{" "}
    </Fragment>
  ));
}
