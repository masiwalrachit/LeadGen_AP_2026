import type { Metadata } from "next";
import Link from "next/link";
import { Database, ExternalLink } from "lucide-react";
import { supabaseSqlEditorUrl } from "@/lib/supabase/dashboard-url";
import { buttonClass } from "@/components/ui/button";
import { Brand } from "@/components/ui/misc";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import styles from "./setup.module.css";

export const metadata: Metadata = { title: "Connect the database" };

export default function DatabaseSetupPage() {
  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Brand href="/app" />
        <ThemeToggle />
      </header>
      <main className={styles.main} id="main">
        <section className={`${styles.card} enter`} aria-labelledby="db-title">
          <span className={styles.icon} aria-hidden="true"><Database size={26} /></span>
          <h1 id="db-title">Connect the workspace database</h1>
          <p>
            Sign-in works, but the database is missing its latest tables. In the Supabase SQL Editor, run every file in{" "}
            <strong>supabase/migrations</strong> in filename order, then continue.
          </p>
          <div className={styles.actions}>
            <a className={buttonClass("primary", "lg")} href={supabaseSqlEditorUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)} target="_blank" rel="noreferrer">
              Open Supabase SQL Editor <ExternalLink size={16} aria-hidden="true" />
              <span className="visually-hidden">(opens in a new tab)</span>
            </a>
            <Link className={buttonClass("secondary", "lg")} href="/app">I applied it, continue</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
