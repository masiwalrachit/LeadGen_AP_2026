"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { QualifiedCandidate } from "@/lib/qualification/types";

export type ReviewStatus = QualifiedCandidate["reviewStatus"];

const PREFIX = "leadgen.demo.review.";
const EVENT = "leadgen:review-change";
const STATUSES: ReviewStatus[] = ["new", "saved", "contacted", "rejected"];

function read(id: string): ReviewStatus | null {
  try {
    const value = localStorage.getItem(PREFIX + id);
    return STATUSES.includes(value as ReviewStatus) ? (value as ReviewStatus) : null;
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Review state for a demo lead, kept in this browser only (illustrative; the real `leads.review_status`
 * column exists in the database but no API writes it yet). Server render uses the seeded status.
 */
export function useReviewStatus(id: string, seeded: ReviewStatus): [ReviewStatus, (next: ReviewStatus) => void] {
  const status = useSyncExternalStore(
    subscribe,
    () => read(id) ?? seeded,
    () => seeded,
  );
  const update = useCallback(
    (next: ReviewStatus) => {
      try {
        localStorage.setItem(PREFIX + id, next);
      } catch {
        // Storage unavailable: nothing to persist.
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [id],
  );
  return [status, update];
}

/** Snapshot of every stored review status, for list views. */
export function useAllReviewStatuses(): Record<string, ReviewStatus> {
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return Object.keys(localStorage)
          .filter((key) => key.startsWith(PREFIX))
          .sort()
          .map((key) => `${key.slice(PREFIX.length)}=${localStorage.getItem(key)}`)
          .join("&");
      } catch {
        return "";
      }
    },
    () => "",
  );
  return Object.fromEntries(
    raw
      .split("&")
      .filter(Boolean)
      .map((pair) => pair.split("=") as [string, ReviewStatus])
      .filter(([, value]) => STATUSES.includes(value)),
  );
}
