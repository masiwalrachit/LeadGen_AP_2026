import { ArrowRight, Bookmark, Check, CircleAlert, Info, RotateCw, X } from "lucide-react";
import type { QualifiedCandidate } from "@/lib/qualification/types";
import type { CampaignStatus } from "@/features/demo/data";
import styles from "./ui.module.css";

/** Campaign pipeline status. Blue while work is running, neutral when done, red when it failed. */
export function CampaignStatusChip({ status }: { status: CampaignStatus }) {
  switch (status) {
    case "validating":
      return <span className={`${styles.chip} ${styles.chipActive}`}><span className={styles.pulse} aria-hidden="true" />Validating</span>;
    case "scoring":
      return <span className={`${styles.chip} ${styles.chipActive}`}><span className={styles.pulse} aria-hidden="true" />Scoring</span>;
    case "completed":
      return <span className={`${styles.chip} ${styles.chipNeutral}`}><Check size={13} strokeWidth={2.5} aria-hidden="true" />Completed</span>;
    case "failed":
      return <span className={`${styles.chip} ${styles.chipDanger}`}><CircleAlert size={13} strokeWidth={2.5} aria-hidden="true" />Failed</span>;
  }
}

type ReviewStatus = QualifiedCandidate["reviewStatus"];

export const REVIEW_LABELS: Record<ReviewStatus, string> = {
  new: "New",
  saved: "Saved",
  contacted: "Contacted",
  rejected: "Rejected",
};

/** Human review state of a lead. Only "rejected" carries a colour (danger); saving is not a judgement. */
export function ReviewStatusChip({ status }: { status: ReviewStatus }) {
  switch (status) {
    case "new":
      return <span className={`${styles.chip} ${styles.chipActive}`}><span className={styles.dot} aria-hidden="true" />New</span>;
    case "saved":
      return <span className={`${styles.chip} ${styles.chipNeutral}`}><Bookmark size={12} strokeWidth={2.5} aria-hidden="true" />Saved</span>;
    case "contacted":
      return <span className={`${styles.chip} ${styles.chipNeutral}`}><ArrowRight size={13} strokeWidth={2.5} aria-hidden="true" />Contacted</span>;
    case "rejected":
      return <span className={`${styles.chip} ${styles.chipDanger}`}><X size={13} strokeWidth={2.5} aria-hidden="true" />Rejected</span>;
  }
}

export function RetryChip({ children = "Needs retry" }: { children?: string }) {
  return <span className={`${styles.chip} ${styles.chipWarn}`}><RotateCw size={12} strokeWidth={2.5} aria-hidden="true" />{children}</span>;
}

/** Green is reserved for this stamp: a record that met the evidence threshold. */
export function SourcedStamp() {
  return <span className={`${styles.stamp} ${styles.stampSourced}`}><Check size={12} strokeWidth={3} aria-hidden="true" />Sourced lead</span>;
}

export function CandidateStamp({ title }: { title?: string }) {
  return <span className={`${styles.stamp} ${styles.stampCandidate}`} title={title ?? "Not yet qualified as a lead"}>Candidate</span>;
}

export function QualificationStamp({ qualified }: { qualified: boolean }) {
  return qualified ? <SourcedStamp /> : <CandidateStamp />;
}

/** Page-level disclosure that the data on screen is illustrative (README: label demonstration data). */
export function DemoStrip({ children }: { children?: React.ReactNode }) {
  return (
    <div className={styles.demoStrip} role="note">
      <Info size={16} aria-hidden="true" />
      Local simulation
      {children ? <span>{children}</span> : null}
    </div>
  );
}

export function DemoTag() {
  return <span className={styles.demoTag}>Illustrative</span>;
}
