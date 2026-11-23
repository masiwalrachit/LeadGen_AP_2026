import type { ReactNode } from "react";
import { Brand } from "@/components/ui/misc";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import { MobileMenu, Nav } from "./nav";
import styles from "./shell.module.css";

type ShellProps = {
  workspaceName: string;
  username: string;
  userInitial: string;
  leadCount: number;
  children: ReactNode;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function SidebarBody({ workspaceName, username, userInitial, leadCount }: Omit<ShellProps, "children">) {
  return (
    <>
      <div className={styles.sidebarFoot}>
        <div className={styles.user}>
          <span className={styles.userAvatar} aria-hidden="true">{userInitial}</span>
          <div className={styles.grow}>
            <strong>@{username}</strong>
          </div>
        </div>
        <div className={styles.footActions}>
          <SignOutButton className={styles.signOut} />
          <ThemeToggle />
        </div>
      </div>
      <div className={styles.workspace}>
        <span className={styles.avatar} aria-hidden="true">{initials(workspaceName)}</span>
        <div className={styles.grow}>
          <strong title={workspaceName}>{workspaceName}</strong>
        </div>
      </div>
      <Nav leadCount={leadCount} />
    </>
  );
}

export function AppShell(props: ShellProps) {
  const { children, ...sidebar } = props;
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Workspace sidebar">
        <Brand className={styles.sidebarBrand} />
        <SidebarBody {...sidebar} />
      </aside>
      <header className={styles.topbar}>
        <Brand />
        <MobileMenu>
          <SidebarBody {...sidebar} />
        </MobileMenu>
      </header>
      <main className={styles.main} id="main">
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
