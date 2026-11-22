"use client";

import { useMemo, useRef, useState } from "react";
import { Bookmark, ExternalLink, Send, Undo2, X } from "lucide-react";
import type { DemoRecord } from "@/features/demo/data";
import { buildBrief, citesFor } from "@/features/leads/brief";
import { DEMO_SCORING, DIMENSIONS, scoreBand } from "@/features/leads/scoring";
import { useReviewStatus, type ReviewStatus } from "@/features/leads/review-store";
import { formatDateTime, sourceHost } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/ui/score-ring";
import { REVIEW_LABELS, ReviewStatusChip } from "@/components/ui/status";
import { Claim } from "./claim";
import styles from "./evidence.module.css";

function contactHref(contact: string) {
  return contact.includes("@") && !contact.startsWith("http") ? `mailto:${contact}` : contact;
}

/**
 * The lead's evidence view. One piece of state, the pinned footnote, links three places:
 * the highlighted claim in the brief, the score bars it feeds, and the numbered source row.
 * Click, tap or keyboard pin it; hover only previews, so nothing depends on a mouse.
 */
export function LeadEvidence({ record }: { record: DemoRecord }) {
  const brief = useMemo(() => buildBrief(record), [record]);
  const firstNeed = brief.sources.find((source) => source.kind === "need")?.n ?? 1;
  const [pinned, setPinned] = useState(firstNeed);
  const [preview, setPreview] = useState<number | null>(null);
  const [status, setStatus] = useReviewStatus(record.id, record.reviewStatus);
  const [announcement, setAnnouncement] = useState("");
  const [flash, setFlash] = useState<number | null>(null);
  const sourceRefs = useRef(new Map<number, HTMLLIElement>());
  const active = preview ?? pinned;

  function pin(n: number) {
    setPinned(n);
    setPreview(null);
    setFlash(n);
    const row = sourceRefs.current.get(n);
    if (!row) return;
    const rect = row.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      row.scrollIntoView({ block: "nearest", behavior: calm ? "auto" : "smooth" });
    }
  }

  function review(next: ReviewStatus) {
    setStatus(next);
    setAnnouncement(next === "new" ? "Review undone." : `Marked ${REVIEW_LABELS[next].toLowerCase()}.`);
  }

  return (
    <div className={styles.layout}>
      <div className={styles.quickBar} role="group" aria-label="Quick decision">
        <Button variant="primary" icon={<Bookmark size={17} aria-hidden="true" />} aria-pressed={status === "saved"} onClick={() => review("saved")}>
          {status === "saved" ? "Saved" : "Save lead"}
        </Button>
        <Button variant="danger" icon={<X size={16} aria-hidden="true" />} aria-pressed={status === "rejected"} onClick={() => review("rejected")}>
          Reject
        </Button>
      </div>
      <div className={styles.colMain}>
        <section className={`${styles.card} enter`} aria-labelledby="brief-title">
          <h2 className={styles.heading} id="brief-title">Why this lead</h2>
          <p className={styles.briefText}>
            {brief.parts.map((part, index) =>
              part.type === "text" ? (
                <span key={index}>{part.text}</span>
              ) : (
                <Claim
                  key={index}
                  n={part.n}
                  pressed={pinned === part.n}
                  onActivate={pin}
                  onPreview={setPreview}
                  className={`${styles.claim} ${brief.sources[part.n - 1]?.kind === "context" ? styles.claimContext : ""}`}
                  noteClassName={styles.note}
                  style={{ ["--i" as string]: part.n }}
                >
                  {part.text}
                </Claim>
              ),
            )}
          </p>
        </section>

        <section className={`${styles.card} enter enter-delay-2`} aria-labelledby="sources-title">
          <h2 className={styles.heading} id="sources-title">Sources</h2>
          <ol className={styles.sourceList}>
            {brief.sources.map((source) => {
              const open = active === source.n;
              return (
                <li
                  key={source.n}
                  className={styles.source}
                  data-pinned={open}
                  data-flash={flash === source.n}
                  onAnimationEnd={() => setFlash(null)}
                  ref={(node) => {
                    if (node) sourceRefs.current.set(source.n, node);
                    else sourceRefs.current.delete(source.n);
                  }}
                >
                  <button type="button" className={styles.sourceNumber} aria-label={`Show source ${source.n}`} aria-pressed={pinned === source.n} onClick={() => pin(source.n)}>
                    {source.n}
                  </button>
                  <div>
                    <p className={styles.sourceTitle}>{source.label}</p>
                    <p className={styles.sourceMeta}>
                      {sourceHost(source.evidence.sourceUrl)} · {formatDateTime(source.evidence.observedAt)}
                    </p>
                    {open ? (
                      <div className={styles.sourceMore}>
                        <p className={styles.code}>
                          {source.evidence.signalCode} · {source.evidence.validator}
                        </p>
                        {source.kind === "context" ? <p className={styles.quote}>“{source.evidence.observation}”</p> : null}
                        <a className={styles.sourceLink} href={source.evidence.sourceUrl} target="_blank" rel="noreferrer">
                          Open source <ExternalLink size={14} aria-hidden="true" />
                          <span className="visually-hidden">(opens in a new tab)</span>
                        </a>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <div className={styles.colSide}>
        <section className={`${styles.card} enter enter-delay-1`} aria-labelledby="score-title">
          <div className={styles.scoreHead}>
            <h2 className={styles.heading} id="score-title">Score</h2>
            <ReviewStatusChip status={status} />
          </div>
          <div className={styles.total}>
            <ScoreRing value={record.finalScore} size={104} animate />
            <p>
              <strong>{scoreBand(record.finalScore)}</strong>
              out of 100
            </p>
          </div>
          <ul className={styles.dims}>
            {DIMENSIONS.map(({ key, label, meaning }, index) => {
              const value = record.scores[key];
              const cited = citesFor(key, brief.sources, Boolean(record.contactPath)).includes(active);
              return (
                <li className={styles.dim} key={key} data-cited={cited} style={{ ["--i" as string]: index }} title={`${meaning}. ${record.explanations[key]}`}>
                  <span className={styles.dimName}>{label}</span>
                  <span className={styles.bar} role="img" aria-label={`${label} ${value} out of 100`}>
                    <span style={{ width: `${value}%` }} />
                  </span>
                  <span className={`${styles.dimValue} tabular`}>{value}</span>
                </li>
              );
            })}
          </ul>
          <p className={styles.scoreNote} title={`Illustrative weights (${DEMO_SCORING.version}). Real weights are a product decision.`}>
            Calculated from these five bars. No AI sets the score.
          </p>
        </section>

        <section className={`${styles.card} ${styles.actions} enter enter-delay-3`} aria-labelledby="review-title">
          <div className={styles.scoreHead}>
            <h2 className={styles.heading} id="review-title">Your decision</h2>
            {status !== "new" ? (
              <Button size="sm" variant="ghost" icon={<Undo2 size={15} aria-hidden="true" />} onClick={() => review("new")}>
                Undo
              </Button>
            ) : null}
          </div>
          <Button variant="primary" block icon={<Bookmark size={17} aria-hidden="true" />} aria-pressed={status === "saved"} onClick={() => review("saved")}>
            {status === "saved" ? "Saved" : "Save lead"}
          </Button>
          <div className={styles.actionRow}>
            <Button variant="secondary" icon={<Send size={16} aria-hidden="true" />} aria-pressed={status === "contacted"} onClick={() => review("contacted")}>
              Contacted
            </Button>
            <Button variant="danger" icon={<X size={16} aria-hidden="true" />} aria-pressed={status === "rejected"} onClick={() => review("rejected")}>
              Reject
            </Button>
          </div>
          <div className={styles.contact}>
            <span>Public contact</span>
            {record.contactPath ? (
              <a href={contactHref(record.contactPath)} target="_blank" rel="noreferrer" title={record.contactPath}>
                {sourceHost(record.contactPath)}
              </a>
            ) : (
              <span className={styles.none}>None found yet</span>
            )}
          </div>
          <p className={styles.live} role="status" aria-live="polite">{announcement}</p>
        </section>
      </div>
    </div>
  );
}
