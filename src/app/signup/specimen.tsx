"use client";

import { useState } from "react";
import type { BriefPart } from "@/features/leads/brief";
import { Claim } from "@/components/evidence/claim";
import { formatDateTime, sourceHost } from "@/lib/format";
import { DemoTag } from "@/components/ui/status";
import styles from "./signup.module.css";

type SpecimenSource = { n: number; label: string; code: string; validator: string; observedAt: string; url: string; kind: string };

/**
 * A small, real-looking lead brief on the sign-up page, so the product's idea (every claim has a
 * checkable source) is visible before anyone types an email. Clearly labelled as illustrative.
 */
export function Specimen({ name, meta, score, parts, sources }: { name: string; meta: string; score: number; parts: BriefPart[]; sources: SpecimenSource[] }) {
  const firstNeed = sources.find((source) => source.kind === "need")?.n ?? 1;
  const [pinned, setPinned] = useState(firstNeed);
  const source = sources.find((item) => item.n === pinned) ?? sources[0];

  return (
    <figure className={styles.specimen} aria-label="Illustrative example of a lead brief">
      <div className={styles.specimenTitle}>
        <strong>{name}</strong>
        <span className="tabular">{score}</span>
      </div>
      <figcaption className={styles.specimenMeta}>
        {meta} <DemoTag />
      </figcaption>
      <p className={styles.specimenBrief}>
        {parts.map((part, index) =>
          part.type === "text" ? (
            <span key={index}>{part.text}</span>
          ) : (
            <Claim
              key={index}
              n={part.n}
              pressed={pinned === part.n}
              onActivate={setPinned}
              onPreview={(n) => n !== null && setPinned(n)}
              className={sources[part.n - 1]?.kind === "context" ? `${styles.claim} ${styles.claimContext}` : styles.claim}
              noteClassName={styles.note}
              style={{ ["--i" as string]: part.n }}
            >
              {part.text}
            </Claim>
          ),
        )}
      </p>
      {source ? (
        <div className={styles.pinned} aria-live="polite">
          <span className={styles.pinnedNumber} aria-hidden="true">{source.n}</span>
          <div>
            <strong>{source.label}</strong>
            <span>
              {sourceHost(source.url)} · {formatDateTime(source.observedAt)}
            </span>
          </div>
        </div>
      ) : null}
    </figure>
  );
}
