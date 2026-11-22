"use client";

import type { CSSProperties, KeyboardEvent, ReactNode } from "react";

type ClaimProps = {
  n: number;
  pressed: boolean;
  onActivate: (n: number) => void;
  onPreview?: (n: number | null) => void;
  className: string;
  noteClassName: string;
  describedBy?: string;
  style?: CSSProperties;
  children: ReactNode;
};

/**
 * A highlighted claim inside running prose. It is a real inline element (not a <button>, which is
 * always an unbreakable box) so long claims wrap like normal text and punctuation stays attached.
 * role="button", tabIndex and Enter/Space handling give it the same keyboard behaviour as a button.
 */
export function Claim({ n, pressed, onActivate, onPreview, className, noteClassName, describedBy, style, children }: ClaimProps) {
  function onKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivate(n);
    }
  }

  return (
    <span
      role="button"
      tabIndex={0}
      className={className}
      style={style}
      aria-pressed={pressed}
      aria-describedby={describedBy}
      onClick={() => onActivate(n)}
      onKeyDown={onKeyDown}
      onMouseEnter={onPreview ? () => onPreview(n) : undefined}
      onMouseLeave={onPreview ? () => onPreview(null) : undefined}
    >
      {children}
      <span className={noteClassName} aria-label={`source ${n}`}>{n}</span>
    </span>
  );
}
