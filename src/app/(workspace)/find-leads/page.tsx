import type { Metadata } from "next";
import { BriefcaseBusiness, MapPin, ScanSearch, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { isDemoMode } from "@/lib/demo/mode";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { DemoStrip } from "@/components/ui/status";
import { SERVICES, SERVICE_CODES } from "@/features/campaigns/services";
import styles from "./find-leads.module.css";

export const metadata: Metadata = { title: "Find leads" };

const STEPS = [
  { icon: ScanSearch, title: "Discover public businesses", body: "Search permitted sources using your service, industry and location." },
  { icon: SlidersHorizontal, title: "Filter before AI", body: "Normalise and deduplicate records before website checks or AI assessment." },
  { icon: ShieldCheck, title: "Keep the evidence", body: "Every useful signal keeps its public source URL and observation time." },
];

export default function FindLeadsPage() {
  const demo = isDemoMode();
  return (
    <>
      <PageHeader
        title="Find leads"
        description="Define one focused search. Discovery creates candidates first, never unexplained leads."
        badge={demo ? <DemoStrip>Searches are simulated</DemoStrip> : null}
      />

      <div className={styles.grid}>
        <form className={styles.card} aria-labelledby="search-title">
          <h2 id="search-title">Set your search</h2>
          <p className={styles.hint}>Keep each search to one service, one business type and one location.</p>
          <fieldset className={styles.fields} disabled>
            <legend className="visually-hidden">Search details (planned)</legend>
            <div className={styles.field}>
              <label htmlFor="find-service"><BriefcaseBusiness size={15} aria-hidden="true" /> Service you are selling</label>
              <select id="find-service" defaultValue="redesign">
                {SERVICE_CODES.map((code) => (
                  <option key={code} value={code}>{SERVICES[code]}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="find-industry"><ScanSearch size={15} aria-hidden="true" /> Business type</label>
              <input id="find-industry" defaultValue="Dentists" />
            </div>
            <div className={`${styles.field} ${styles.wide}`}>
              <label htmlFor="find-location"><MapPin size={15} aria-hidden="true" /> Location</label>
              <input id="find-location" defaultValue="Delhi, India" />
            </div>
          </fieldset>
          <div className={styles.actions}>
            <Button type="button" variant="primary" size="lg" disabled icon={<ScanSearch size={18} aria-hidden="true" />}>Start lead search</Button>
            <span className={styles.hint}>Planned. Needs Google Places and Brave Search connections.</span>
          </div>
        </form>

        <aside className={styles.side} aria-labelledby="how-title">
          <h2 id="how-title">What this will do</h2>
          <ol>
            {STEPS.map(({ icon: Icon, title, body }) => (
              <li key={title}>
                <span aria-hidden="true"><Icon size={16} /></span>
                <div>
                  <strong>{title}</strong>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </>
  );
}
