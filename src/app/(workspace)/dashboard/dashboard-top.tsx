"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, CheckCheck, CircleDashed, FilePlus2, Inbox, X } from "lucide-react";
import { scoreBand } from "@/features/leads/scoring";
import { useAllReviewStatuses, type ReviewStatus } from "@/features/leads/review-store";
import { LinkButton } from "@/components/ui/button";
import { Monogram } from "@/components/ui/monogram";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { DemoStrip } from "@/components/ui/status";
import { ScoreRing } from "@/components/ui/score-ring";
import styles from "./dashboard.module.css";

export type DashboardLead = {
  id: string;
  name: string;
  campaign: string;
  score: number;
  seeded: ReviewStatus;
  reasons: string[];
};

type Props = {
  /** Sourced leads only (records that cleared the bar). */
  leads: DashboardLead[];
  /** Every record checked, including candidates that did not qualify. */
  recordsChecked: number;
  campaignsRunning: number;
  campaignsTotal: number;
};

/**
 * Header, summary tiles and "ready to review". It is a client component so the counts follow the
 * review decisions made on the lead pages (saved in this browser), instead of freezing at the seed.
 * Every number is derived from the same list, so the tiles, the title and the cards always agree.
 */
export function DashboardTop({ leads, recordsChecked, campaignsRunning, campaignsTotal }: Props) {
  const stored = useAllReviewStatuses();

  const toReview = useMemo(
    () =>
      leads
        .filter((lead) => (stored[lead.id] ?? lead.seeded) === "new")
        .sort((a, b) => b.score - a.score),
    [leads, stored],
  );
  const [featured, ...rest] = toReview;
  const others = rest.slice(0, 2);
  const shown = (featured ? 1 : 0) + others.length;

  const tiles = [
    {
      value: toReview.length,
      label: "To review",
      sub: `of ${leads.length} sourced leads`,
      icon: <Inbox size={18} aria-hidden="true" />,
      href: "/leads",
    },
    {
      value: leads.length,
      label: "Sourced leads",
      sub: `from ${recordsChecked} candidates checked`,
      icon: <CheckCheck size={18} aria-hidden="true" />,
      href: "/leads",
      hint: "Candidates are businesses from your files. One becomes a sourced lead only when its evidence clears the bar.",
    },
    {
      value: campaignsRunning,
      label: "Campaigns running",
      sub: `of ${campaignsTotal} campaigns`,
      icon: <CircleDashed size={18} aria-hidden="true" />,
      href: "#campaigns-title",
    },
  ];

  return (
    <>
      <PageHeader
        title={toReview.length > 0 ? `${toReview.length} ${toReview.length === 1 ? "lead is" : "leads are"} waiting for your review` : "You're all caught up"}
        badge={<DemoStrip />}
        actions={<LinkButton href="/campaigns/new" variant="primary" icon={<FilePlus2 size={18} aria-hidden="true" />}>New campaign</LinkButton>}
      />

      <ul className={styles.kpis} aria-label="Summary">
        {tiles.map((tile, index) => (
          <li key={tile.label} className={`enter enter-delay-${index + 1}`}>
            <Link className={styles.kpi} href={tile.href} title={tile.hint}>
              <span className={styles.kpiIcon}>{tile.icon}</span>
              <strong className="tabular">{tile.value}</strong>
              <span className={styles.kpiLabel}>{tile.label}</span>
              <span className={styles.kpiSub}>{tile.sub}</span>
            </Link>
          </li>
        ))}
      </ul>

      {featured ? (
        <section className={styles.section} aria-labelledby="ready-title">
          <div className={styles.sectionHead}>
            <h2 id="ready-title">{toReview.length > shown ? `Top ${shown} of ${toReview.length} to review` : "Ready to review"}</h2>
            <Link className={styles.textLink} href="/leads">
              See all {leads.length} leads <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.hero}>
            <article className={`${styles.featured} enter`}>
              <div className={styles.featuredTop}>
                <Monogram name={featured.name} size={48} />
                <div className={styles.grow}>
                  <h3 className={styles.featuredName}>
                    <Link href={`/leads/${featured.id}`}>{featured.name}</Link>
                  </h3>
                  <p className={styles.campaign}>{featured.campaign}</p>
                </div>
                <div className={styles.ringBlock}>
                  <ScoreRing value={featured.score} size={72} animate />
                  <span className={styles.band}>{scoreBand(featured.score)}</span>
                </div>
              </div>
              <ul className={styles.reasons}>
                {featured.reasons.slice(0, 2).map((reason) => (
                  <li key={reason}>
                    <X size={16} strokeWidth={2.5} aria-hidden="true" />
                    <mark>{reason}</mark>
                  </li>
                ))}
              </ul>
              <span className={styles.review} aria-hidden="true">
                Review evidence <ArrowRight size={16} />
              </span>
            </article>

            <ul className={styles.others}>
              {others.map((lead, index) => (
                <li key={lead.id} className={`enter enter-delay-${index + 1}`}>
                  <article className={styles.card}>
                    <Monogram name={lead.name} size={40} />
                    <div className={styles.grow}>
                      <h3 className={styles.cardName}>
                        <Link href={`/leads/${lead.id}`}>{lead.name}</Link>
                      </h3>
                      {lead.reasons[0] ? (
                        <p className={styles.cardReason}>
                          <mark>{lead.reasons[0]}</mark>
                        </p>
                      ) : null}
                    </div>
                    <ScoreRing value={lead.score} size={44} animate />
                  </article>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : (
        <EmptyState
          icon={<CheckCheck size={22} />}
          title="Nothing left to review"
          action={<LinkButton href="/leads" variant="secondary">See all leads</LinkButton>}
        >
          Every sourced lead has a decision. Run a new campaign to find more.
        </EmptyState>
      )}
    </>
  );
}
