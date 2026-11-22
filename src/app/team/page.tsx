import Link from "next/link";
import { ArrowLeft, CalendarDays, Crown, LockKeyhole, ShieldCheck, UserRound, Users, Waypoints } from "lucide-react";
import { getWorkspaceContext, getWorkspaceTeam } from "@/lib/auth/workspace";
import { SignOutButton } from "@/components/sign-out-button";
import workspaceStyles from "../workspace.module.css";
import InviteCode from "./invite-code";
import styles from "./team.module.css";

function memberInitials(fullName: string, username: string) {
  const initials = fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (initials || username.slice(0, 2)).toUpperCase();
}

function joinedDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default async function TeamPage() {
  const workspace = await getWorkspaceContext();
  const team = await getWorkspaceTeam(workspace.workspaceId);
  const memberLabel = new Intl.PluralRules("en").select(team.members.length) === "one" ? "member" : "members";

  return (
    <div className={workspaceStyles.page}>
      <header className={workspaceStyles.topbar}>
        <Link className={workspaceStyles.brand} href="/dashboard">
          <span className={workspaceStyles.brandMark}><Waypoints size={19} aria-hidden="true" /></span>
          LeadGen
        </Link>
        <nav className={workspaceStyles.topnav} aria-label="Workspace navigation">
          <Link href="/dashboard">Overview</Link>
          <Link href="/find-leads">Find leads</Link>
          <Link href="/analyze-leads">Analyze leads</Link>
          <Link href="/team" aria-current="page">Team</Link>
          <SignOutButton />
        </nav>
      </header>

      <main className={workspaceStyles.main}>
        <Link className={workspaceStyles.backLink} href="/dashboard"><ArrowLeft size={16} aria-hidden="true" />Back to overview</Link>

        <header className={workspaceStyles.pageHeader}>
          <div>
            <h1>Work together in {workspace.workspaceName}.</h1>
            <p>Share one workspace, find and analyze leads together, and keep every candidate and evidence record inside the same team boundary.</p>
          </div>
          <div className={workspaceStyles.trustNote}>
            <ShieldCheck size={18} aria-hidden="true" />
            <span>{team.members.length} {memberLabel} with workspace-isolated access.</span>
          </div>
        </header>

        <div className={styles.teamGrid}>
          <section className={styles.directory} aria-labelledby="members-title">
            <header className={styles.sectionHeader}>
              <div>
                <h2 id="members-title">Workspace members</h2>
                <p>People who can access this workspace&apos;s lead searches, analyses, and evidence.</p>
              </div>
              <span className={styles.memberCount}>{team.members.length}</span>
            </header>

            <div className={styles.memberList}>
              {team.members.map((member) => (
                <article className={styles.memberRow} key={member.userId}>
                  <span className={styles.memberAvatar} aria-hidden="true">{memberInitials(member.fullName, member.username)}</span>
                  <div className={styles.memberIdentity}>
                    <strong>{member.fullName}</strong>
                    <span>@{member.username}</span>
                  </div>
                  <span className={styles.joinedAt}><CalendarDays size={14} aria-hidden="true" />Joined {joinedDate(member.joinedAt)}</span>
                  <span className={styles.roleBadge} data-role={member.role}>
                    {member.role === "owner" ? <Crown size={13} aria-hidden="true" /> : <UserRound size={13} aria-hidden="true" />}
                    {member.role === "owner" ? "Owner" : "Member"}
                  </span>
                </article>
              ))}
            </div>
          </section>

          <aside className={styles.invitePanel} aria-labelledby="invite-title">
            <span className={styles.inviteIcon} aria-hidden="true"><Users size={20} /></span>
            <h2 id="invite-title">Invite your team</h2>
            {team.currentRole === "owner" && team.joinCode ? (
              <>
                <p>Send this code privately to a teammate. After signing in, they can choose <strong>Join with code</strong> during workspace setup.</p>
                <InviteCode code={team.joinCode} />
                <p className={styles.securityNote}><LockKeyhole size={15} aria-hidden="true" />Anyone with this code can join. Share it only with people you trust.</p>
              </>
            ) : (
              <div className={styles.memberNotice}>
                <LockKeyhole size={18} aria-hidden="true" />
                <p>Only the workspace owner can view and share the join code.</p>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
