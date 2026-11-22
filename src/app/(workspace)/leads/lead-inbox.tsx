"use client";

import Link from "next/link";
import { useMemo, useState, ViewTransition } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, SearchX } from "lucide-react";
import { scoreBand } from "@/features/leads/scoring";
import { useAllReviewStatuses, type ReviewStatus } from "@/features/leads/review-store";
import { EmptyState } from "@/components/ui/misc";
import { Monogram } from "@/components/ui/monogram";
import { ScoreRing } from "@/components/ui/score-ring";
import { Button } from "@/components/ui/button";
import { CandidateStamp, REVIEW_LABELS, ReviewStatusChip } from "@/components/ui/status";
import styles from "./leads.module.css";

export type InboxRow = {
  id: string;
  businessName: string;
  campaignId: string;
  score: number;
  qualified: boolean;
  reviewStatus: ReviewStatus;
  newest: string;
  reason: string;
};

type View = "leads" | "candidates";
type SortKey = "score" | "name";
type SortState = { key: SortKey; dir: "asc" | "desc" };

function SortHeader({ sortKey, sort, onToggle, children }: { sortKey: SortKey; sort: SortState; onToggle: (key: SortKey) => void; children: string }) {
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th scope="col" aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" className={styles.sortButton} data-active={active} onClick={() => onToggle(sortKey)}>
        {children}
        <Icon size={14} aria-hidden="true" />
      </button>
    </th>
  );
}

export function LeadInbox({ rows, campaigns }: { rows: InboxRow[]; campaigns: Array<{ id: string; name: string }> }) {
  const stored = useAllReviewStatuses();
  const [view, setView] = useState<View>("leads");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ReviewStatus | "any">("any");
  const [sort, setSort] = useState<SortState>({ key: "score", dir: "desc" });

  const withStatus = useMemo(() => rows.map((row) => ({ ...row, reviewStatus: stored[row.id] ?? row.reviewStatus })), [rows, stored]);
  const counts = {
    leads: withStatus.filter((row) => row.qualified).length,
    candidates: withStatus.filter((row) => !row.qualified).length,
  };

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return withStatus
      .filter((row) => (view === "leads" ? row.qualified : !row.qualified))
      .filter((row) => view === "candidates" || status === "any" || row.reviewStatus === status)
      .filter((row) => !needle || row.businessName.toLowerCase().includes(needle))
      .sort((a, b) => {
        const order = sort.key === "score" ? a.score - b.score : a.businessName.localeCompare(b.businessName);
        return sort.dir === "asc" ? order : -order;
      });
  }, [withStatus, view, status, query, sort]);

  const filtered = query !== "" || (view === "leads" && status !== "any");
  const campaignName = (id: string) => campaigns.find((item) => item.id === id)?.name ?? "";

  function toggleSort(key: SortKey) {
    setSort((current) => (current.key === key ? { key, dir: current.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "score" ? "desc" : "asc" }));
  }

  return (
    <div className={styles.inbox}>
      <div className={styles.toolbar}>
        <div className={styles.tabs} role="group" aria-label="Show">
          <button type="button" className={styles.tab} aria-pressed={view === "leads"} onClick={() => setView("leads")}>
            Sourced leads <span className="tabular">{counts.leads}</span>
          </button>
          <button type="button" className={styles.tab} aria-pressed={view === "candidates"} onClick={() => setView("candidates")}>
            Candidates <span className="tabular">{counts.candidates}</span>
          </button>
        </div>
        <label className={styles.search}>
          <span className="visually-hidden">Search by business name</span>
          <input type="search" placeholder="Search" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label className={`${styles.select} ${styles.mobileSort}`}>
          <span className="visually-hidden">Sort</span>
          <select value={`${sort.key}-${sort.dir}`} onChange={(event) => { const [key, dir] = event.target.value.split("-"); setSort({ key: key as SortKey, dir: dir as "asc" | "desc" }); }}>
            <option value="score-desc">Score, high to low</option>
            <option value="score-asc">Score, low to high</option>
            <option value="name-asc">Name, A to Z</option>
          </select>
        </label>
        {view === "leads" ? (
          <label className={styles.select}>
            <span className="visually-hidden">Filter by status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as ReviewStatus | "any")}>
              <option value="any">All statuses</option>
              {(Object.keys(REVIEW_LABELS) as ReviewStatus[]).map((key) => (
                <option key={key} value={key}>{REVIEW_LABELS[key]}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {view === "candidates" ? (
        <p className={styles.hint}>Candidates did not qualify yet: not enough evidence, or no website problem found.</p>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          icon={<SearchX size={22} />}
          title="Nothing matches"
          action={filtered ? <Button variant="secondary" onClick={() => { setQuery(""); setStatus("any"); }}>Clear filters</Button> : undefined}
        >
          {filtered ? "Try a different search or status." : "Run a campaign to add candidates."}
        </EmptyState>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <SortHeader sortKey="name" sort={sort} onToggle={toggleSort}>Business</SortHeader>
                <SortHeader sortKey="score" sort={sort} onToggle={toggleSort}>Score</SortHeader>
                <th scope="col">Main reason</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="visually-hidden">Open</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id} className={styles.row}>
                  <td className={styles.business}>
                    <span className={styles.identity}>
                      <Monogram name={row.businessName} size={40} />
                      <span>
                        <ViewTransition name={`lead-${row.id}`}>
                          <Link className={styles.name} href={`/leads/${row.id}`}>{row.businessName}</Link>
                        </ViewTransition>
                        <span className={styles.sub}>{campaignName(row.campaignId)}</span>
                      </span>
                    </span>
                  </td>
                  <td className={styles.scoreCell} data-label="Score">
                    <span className={styles.scoreWrap}>
                      <ScoreRing value={row.score} size={40} />
                      <span className={styles.band}>{scoreBand(row.score)}</span>
                    </span>
                  </td>
                  <td data-label="Main reason">{row.reason}</td>
                  <td data-label="Status">
                    {row.qualified ? <ReviewStatusChip status={row.reviewStatus} /> : <CandidateStamp />}
                  </td>
                  <td className={styles.chevron} aria-hidden="true"><ChevronRight size={20} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
