import Link from "next/link";
import { Database, ExternalLink } from "lucide-react";
import { supabaseSqlEditorUrl } from "@/lib/supabase/dashboard-url";
import styles from "../../workspace.module.css";

export default function DatabaseSetupPage() {
  return <div className={styles.page}><main className={styles.main}><section className={styles.emptyState}>
    <Database size={36} />
    <h1>Connect the workspace database</h1>
    <p>Authentication is working, but the workspace database is not current yet. Open the Supabase SQL Editor and apply every file in <strong>supabase/migrations</strong> in filename order. Then return here and continue.</p>
    <div className={styles.leadActions} style={{justifyContent: "center"}}>
      <a className={styles.primaryButton} href={supabaseSqlEditorUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)} target="_blank" rel="noreferrer">Open Supabase SQL Editor <ExternalLink size={15} /></a>
      <Link className={styles.statusButton} href="/app">I applied it — continue</Link>
    </div>
  </section></main></div>;
}
