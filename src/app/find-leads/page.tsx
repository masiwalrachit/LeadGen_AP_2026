import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  MapPin,
  ScanSearch,
  ShieldCheck,
  SlidersHorizontal,
  Waypoints,
} from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import styles from "../workspace.module.css";

export default function FindLeadsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/dashboard">
          <span className={styles.brandMark}><Waypoints size={19} aria-hidden="true" /></span>
          LeadGen
        </Link>
        <nav className={styles.topnav} aria-label="Workspace navigation">
          <Link href="/dashboard">Overview</Link>
          <Link href="/find-leads" aria-current="page">Find leads</Link>
          <Link href="/analyze-leads">Analyze leads</Link>
          <Link href="/team">Team</Link>
          <SignOutButton />
        </nav>
      </header>

      <main className={styles.main}>
        <Link className={styles.backLink} href="/dashboard"><ArrowLeft size={16} aria-hidden="true" />Back to overview</Link>
        <header className={styles.pageHeader}>
          <div>
            <h1>Find businesses that fit your service.</h1>
            <p>Define one focused search. LeadGen will discover public business candidates, validate their websites, and keep the source behind every signal.</p>
          </div>
          <div className={styles.trustNote}>
            <ShieldCheck size={18} aria-hidden="true" />
            <span>Live discovery connectors are planned. This screen defines the separate Find Leads workflow without pretending searches are running yet.</span>
          </div>
        </header>

        <div className={styles.campaignGrid}>
          <section className={styles.surface} aria-labelledby="find-leads-title">
            <h2 id="find-leads-title">Set your search</h2>
            <p>Keep each search focused on one service, one business type, and one location.</p>
            <form className={styles.form}>
              <fieldset className={styles.plannedFieldset} disabled>
                <div className={styles.fieldGrid}>
                  <div className={styles.field}>
                    <label htmlFor="find-service">Service you want to sell</label>
                    <div className={styles.inputWithIcon}>
                      <BriefcaseBusiness size={18} aria-hidden="true" />
                      <select id="find-service" defaultValue="redesign">
                        <option value="new-website">New website development</option>
                        <option value="redesign">Website redesign</option>
                        <option value="ecommerce">E-commerce development</option>
                        <option value="maintenance">Maintenance and performance</option>
                      </select>
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="find-industry">Business type</label>
                    <div className={styles.inputWithIcon}>
                      <ScanSearch size={18} aria-hidden="true" />
                      <input id="find-industry" defaultValue="Dentists" />
                    </div>
                  </div>
                  <div className={`${styles.field} ${styles.fieldFull}`}>
                    <label htmlFor="find-location">Location</label>
                    <div className={styles.inputWithIcon}>
                      <MapPin size={18} aria-hidden="true" />
                      <input id="find-location" defaultValue="Delhi, India" />
                    </div>
                  </div>
                </div>
                <div className={styles.formFooter}>
                  <span className={styles.flowNote}>Google Places and Brave Search connections are required before this can run.</span>
                  <button className={`${styles.primaryButton} ${styles.plannedButton}`} type="button" disabled>
                    <ScanSearch size={18} aria-hidden="true" />Start lead search · planned
                  </button>
                </div>
              </fieldset>
            </form>
          </section>

          <aside className={styles.sideSurface}>
            <h2>What this feature will do</h2>
            <p>Discovery creates candidates first—not unexplained leads.</p>
            <ol className={styles.processList}>
              <li><span className={styles.processIcon}><ScanSearch size={15} /></span><div><strong>Discover public businesses</strong><span>Search permitted sources using your service, industry, and location.</span></div></li>
              <li><span className={styles.processIcon}><SlidersHorizontal size={15} /></span><div><strong>Filter before AI</strong><span>Normalize and deduplicate records before website checks or Grok assessment.</span></div></li>
              <li><span className={styles.processIcon}><ShieldCheck size={15} /></span><div><strong>Preserve evidence</strong><span>Every useful signal keeps its public source URL and observation time.</span></div></li>
            </ol>
          </aside>
        </div>
      </main>
    </div>
  );
}
