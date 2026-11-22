"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FileSearch, Inbox, LayoutDashboard, Menu, ScanSearch, Settings, Users, X } from "lucide-react";
import styles from "./shell.module.css";

type NavItem = { label: string; href?: string; icon: typeof Inbox; match?: string; count?: number };

function navItems(leadCount: number): NavItem[] {
  return [
    { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { label: "Find leads", href: "/find-leads", icon: ScanSearch },
    { label: "Analyze leads", href: "/analyze-leads", icon: FileSearch },
    { label: "Leads", href: "/leads", icon: Inbox, count: leadCount },
    { label: "Team", href: "/team", icon: Users },
    { label: "Settings", icon: Settings },
  ];
}

export function Nav({ leadCount }: { leadCount: number }) {
  const pathname = usePathname();
  return (
    <nav className={styles.nav} aria-label="Workspace">
      {navItems(leadCount).map(({ label, href, icon: Icon, match, count }) => {
        if (!href) {
          return (
            <span className={styles.navItem} aria-disabled="true" key={label} title={`${label} is planned`}>
              <Icon size={17} aria-hidden="true" />
              {label}
              <span className="visually-hidden"> (planned)</span>
            </span>
          );
        }
        const prefix = match ?? href;
        const active = pathname === href || pathname.startsWith(`${prefix}/`) || pathname === prefix;
        return (
          <Link className={styles.navItem} href={href} key={label} aria-current={active ? "page" : undefined}>
            <Icon size={17} aria-hidden="true" />
            {label}
            {count !== undefined ? <span className={`${styles.count} tabular`} aria-label={`${count} leads`}>{count}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** Mobile navigation drawer: Escape or the scrim closes it, focus moves in and back out. */
export function MobileMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [openedAt, setOpenedAt] = useState(pathname);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Close when the route changes (adjusting state during render instead of in an effect).
  if (open && pathname !== openedAt) {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const trigger = triggerRef.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        className={styles.menuButton}
        type="button"
        aria-label="Open navigation"
        aria-expanded={open}
        aria-controls="mobile-drawer"
        onClick={() => {
          setOpenedAt(pathname);
          setOpen(true);
        }}
      >
        <Menu size={20} aria-hidden="true" />
      </button>
      {open ? (
        <div className={styles.drawer} id="mobile-drawer" role="dialog" aria-modal="true" aria-label="Navigation">
          <button className={styles.scrim} type="button" aria-label="Close navigation" tabIndex={-1} onClick={() => setOpen(false)} />
          <div className={styles.drawerPanel}>
            <div className={styles.drawerHead}>
              <span className={styles.navLabel}>Menu</span>
              <button ref={closeRef} className={styles.menuButton} type="button" aria-label="Close navigation" onClick={() => setOpen(false)}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            {children}
          </div>
        </div>
      ) : null}
    </>
  );
}
