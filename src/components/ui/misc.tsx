import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./ui.module.css";

export function Brand({ href = "/dashboard", className }: { href?: string; className?: string }) {
  return (
    <Link className={`${styles.brand} ${className ?? ""}`} href={href} aria-label="LeadGen home">
      <span className={styles.brandMark} aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="1.5" y="4.5" width="15" height="4" rx="1" fill="currentColor" opacity="0.38" />
          <rect x="1.5" y="4.5" width="9" height="4" rx="1" fill="currentColor" />
          <path d="M3.2 12.2h11.6M3.2 15h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
      <span>LeadGen</span>
    </Link>
  );
}

export function PageHeader({ eyebrow, title, description, actions, badge }: { eyebrow?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode; badge?: ReactNode }) {
  return (
    <header className={styles.pageHeader}>
      <div>
        {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
        <div className={styles.titleLine}>
          <h1>{title}</h1>
          {badge}
        </div>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className={styles.headerActions}>{actions}</div> : null}
    </header>
  );
}

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className={styles.empty}>
      <span className={styles.emptyMark} aria-hidden="true">{icon}</span>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </section>
  );
}
