"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, Check, Globe, Inbox, LoaderCircle, MapPin, RotateCcw, ScanSearch, X } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { ScoreRing } from "@/components/ui/score-ring";
import type { LatLng } from "@/features/discovery/area";
import type { MapPoint, PinBand } from "@/features/discovery/records";
import styles from "./find-leads.module.css";

/** Leaflet touches `window` on import, so the map only ever loads in the browser. */
const LeadMap = dynamic(() => import("./lead-map"), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>Loading map…</div>,
});

export type MapArea = {
  name: string;
  centre: LatLng;
  zoom: number;
  bounds: [LatLng, LatLng];
  localities: string[];
};

type Phase = "idle" | "searching" | "done";

export const BAND_LABEL: Record<PinBand, string> = {
  strong: "Strong lead",
  good: "Good lead",
  fair: "Fair lead",
  candidate: "Not a lead yet",
};

const STEPS = ["Finding businesses on the map", "Checking their websites", "Scoring the evidence"];
const STORAGE_KEY = "leadgen-map-searched";
const ALL = "all";

/** Remembers a finished search for this tab, so "Open lead" then Back keeps the results. */
function readRemembered(): boolean {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false; // Storage can be unavailable (private mode, embedded views). Starting fresh is fine.
  }
}

function remember(value: boolean) {
  try {
    if (value) window.sessionStorage.setItem(STORAGE_KEY, "1");
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // See readRemembered.
  }
}

const noSubscription = () => () => {};

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function DiscoveryExplorer({ points, area }: { points: MapPoint[]; area: MapArea }) {
  const remembered = useSyncExternalStore(noSubscription, readRemembered, () => false);
  /** null until the user acts on this page; until then a remembered search shows as finished. */
  const [chosen, setChosen] = useState<Phase | null>(null);
  const [step, setStep] = useState(0);
  const [revealedCount, setRevealedCount] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [category, setCategory] = useState(ALL);
  const timers = useRef<number[]>([]);

  const phase: Phase = chosen ?? (remembered ? "done" : "idle");
  const revealed = chosen === null && remembered ? points.length : revealedCount;

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  const categories = useMemo(() => [...new Set(points.map((point) => point.category))].sort(), [points]);
  const visible = useMemo(
    () => points.slice(0, revealed).filter((point) => category === ALL || point.category === category),
    [points, revealed, category],
  );
  const selected = points.find((point) => point.id === selectedId) ?? null;
  const leads = points.filter((point) => point.qualified).length;

  function finish() {
    setChosen("done");
    setRevealedCount(points.length);
    setStep(STEPS.length);
    remember(true);
  }

  function search() {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    setSelectedId(null);
    if (prefersReducedMotion()) {
      finish();
      return;
    }
    setChosen("searching");
    setStep(0);
    setRevealedCount(0);
    // Pins drop in one by one while "finding", then two short checking/scoring steps.
    const perPin = 1400 / points.length;
    points.forEach((_, index) => {
      timers.current.push(window.setTimeout(() => setRevealedCount(index + 1), 200 + index * perPin));
    });
    timers.current.push(window.setTimeout(() => setStep(1), 1700));
    timers.current.push(window.setTimeout(() => setStep(2), 2500));
    timers.current.push(window.setTimeout(finish, 3200));
  }

  function reset() {
    timers.current.forEach((id) => window.clearTimeout(id));
    setChosen("idle");
    setRevealedCount(0);
    setSelectedId(null);
    remember(false);
  }

  return (
    <div className={styles.explorer}>
      <div className={styles.toolbar}>
        <div className={styles.areaChip}>
          <MapPin size={16} aria-hidden="true" />
          <span>
            <strong>{area.name}</strong>
            <span className={styles.areaSub}>{area.localities.slice(0, 4).join(", ")} and more</span>
          </span>
        </div>
        <label className={styles.filter}>
          <span className="visually-hidden">Business type</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value={ALL}>All business types</option>
            {categories.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
        <div className={styles.toolbarActions}>
          {phase === "done" ? (
            <Button variant="ghost" onClick={reset} icon={<RotateCcw size={16} aria-hidden="true" />}>Clear</Button>
          ) : null}
          <Button
            variant="primary"
            onClick={search}
            disabled={phase === "searching"}
            icon={phase === "searching" ? <LoaderCircle size={18} className={styles.spin} aria-hidden="true" /> : <ScanSearch size={18} aria-hidden="true" />}
          >
            {phase === "done" ? "Search again" : phase === "searching" ? "Searching…" : "Search this area"}
          </Button>
        </div>
      </div>

      <div className={styles.layout}>
        <section className={styles.mapCard} aria-label={`Map of ${area.name}`}>
          <LeadMap area={area} points={visible} selectedId={selectedId} onSelect={setSelectedId} />
          <div className={styles.mapBadge} aria-hidden="true">Demo data</div>
          {phase === "idle" ? (
            <div className={styles.mapPrompt}>
              <ScanSearch size={22} aria-hidden="true" />
              <p>
                <strong>Search inside the dashed box</strong>
                <span>We&apos;ll find local businesses, check their websites and score each one.</span>
              </p>
              <Button variant="primary" onClick={search}>Search this area</Button>
            </div>
          ) : null}
          <ul className={styles.legend} aria-label="Pin colours">
            {(Object.keys(BAND_LABEL) as PinBand[]).map((band) => (
              <li key={band}>
                <span className={`${styles.dot} ${styles[band]}`} aria-hidden="true" />
                {BAND_LABEL[band]}
              </li>
            ))}
          </ul>
        </section>

        <aside className={styles.panel} aria-live="polite">
          {phase === "searching" ? (
            <div className={styles.progress}>
              <h2>Searching {area.name}</h2>
              <ol>
                {STEPS.map((label, index) => (
                  <li key={label} data-state={index < step ? "done" : index === step ? "active" : "waiting"}>
                    <span aria-hidden="true">
                      {index < step ? <Check size={14} /> : index === step ? <LoaderCircle size={14} className={styles.spin} /> : null}
                    </span>
                    {label}
                    {index === 0 ? <em>{revealed} found</em> : null}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {phase === "idle" ? (
            <div className={styles.emptyPanel}>
              <h2>Nothing found yet</h2>
              <p>Results appear here, best leads first. Click a pin or a row to see why it scored that way.</p>
            </div>
          ) : null}

          {phase === "done" && selected ? (
            <article className={styles.detail}>
              <button type="button" className={styles.close} onClick={() => setSelectedId(null)} aria-label="Close details">
                <X size={16} aria-hidden="true" />
              </button>
              <div className={styles.detailHead}>
                <ScoreRing value={selected.score} size={56} animate />
                <div>
                  <h2>{selected.name}</h2>
                  <p>{selected.category} · {selected.locality}</p>
                </div>
              </div>
              <p className={`${styles.bandTag} ${styles[selected.band]}`}>{BAND_LABEL[selected.band]}</p>
              <p className={styles.reason}>
                {selected.hasWebsite ? <Globe size={15} aria-hidden="true" /> : <X size={15} aria-hidden="true" />}
                {selected.reason}
              </p>
              <LinkButton href={`/leads/${selected.id}`} variant="primary" block icon={<ArrowRight size={16} aria-hidden="true" />}>
                {selected.qualified ? "Open lead" : "See the checks"}
              </LinkButton>
            </article>
          ) : null}

          {phase === "done" ? (
            <>
              <div className={styles.summary}>
                <p>
                  <strong>{points.length}</strong> businesses found · <strong>{leads}</strong> leads
                </p>
                <LinkButton href="/leads" variant="ghost" size="sm" icon={<Inbox size={15} aria-hidden="true" />}>Inbox</LinkButton>
              </div>
              <ul className={styles.results}>
                {visible.map((point) => (
                  <li key={point.id}>
                    <button
                      type="button"
                      className={styles.row}
                      aria-pressed={point.id === selectedId}
                      onClick={() => setSelectedId(point.id)}
                    >
                      <span className={`${styles.dot} ${styles[point.band]}`} aria-hidden="true" />
                      <span className={styles.rowText}>
                        <strong>{point.name}</strong>
                        <span>{point.category} · {point.locality}</span>
                      </span>
                      <span className={styles.rowScore} aria-label={`Score ${point.score}, ${BAND_LABEL[point.band]}`}>{point.score}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {visible.length === 0 ? <p className={styles.noMatch}>No {category.toLowerCase()} in this area.</p> : null}
            </>
          ) : null}
        </aside>
      </div>
      <p className={styles.footnote}>
        This demo uses invented businesses and fixed rules. It makes no Google Places, Gemini or other LLM requests; the map uses OpenStreetMap tiles.
      </p>
    </div>
  );
}
