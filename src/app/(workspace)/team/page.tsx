import type { Metadata } from "next";
import { CalendarDays, Crown, LockKeyhole, UserRound, Users } from "lucide-react";
import { getWorkspaceContext, getWorkspaceTeam } from "@/lib/auth/workspace";
import { Monogram } from "@/components/ui/monogram";
import { PageHeader } from "@/components/ui/misc";
import InviteCode from "./invite-code";
import styles from "./team.module.css";

export const metadata: Metadata = { title: "Team" };

function joinedDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export default async function TeamPage() {
  const workspace = await getWorkspaceContext();
  const team = await getWorkspaceTeam(workspace.workspaceId);
  const count = team.members.length;

  return (
    <>
      <PageHeader
        title={`Work together in ${workspace.workspaceName}`}
        description={`${count} ${count === 1 ? "member" : "members"}. Everyone here shares the same searches, analyses and evidence.`}
      />

      <div className={styles.grid}>
        <section className={styles.card} aria-labelledby="members-title">
          <h2 id="members-title">Workspace members</h2>
          <ul className={styles.list}>
            {team.members.map((member) => (
              <li className={styles.row} key={member.userId}>
                <Monogram name={member.fullName || member.username} size={40} />
                <div className={styles.who}>
                  <strong>{member.fullName}</strong>
                  <span>@{member.username}</span>
                </div>
                <span className={styles.joined}><CalendarDays size={14} aria-hidden="true" />Joined {joinedDate(member.joinedAt)}</span>
                <span className={styles.role} data-role={member.role}>
                  {member.role === "owner" ? <Crown size={13} aria-hidden="true" /> : <UserRound size={13} aria-hidden="true" />}
                  {member.role === "owner" ? "Owner" : "Member"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <aside className={styles.card} aria-labelledby="invite-title">
          <span className={styles.inviteIcon} aria-hidden="true"><Users size={20} /></span>
          <h2 id="invite-title">Invite your team</h2>
          {team.currentRole === "owner" && team.joinCode ? (
            <>
              <p>Send this code privately. After signing in, a teammate chooses <strong>Join with code</strong> during setup.</p>
              <InviteCode code={team.joinCode} />
              <p className={styles.security}><LockKeyhole size={15} aria-hidden="true" />Anyone with this code can join. Share it only with people you trust.</p>
            </>
          ) : (
            <p className={styles.security}><LockKeyhole size={15} aria-hidden="true" />Only the workspace owner can view and share the join code.</p>
          )}
        </aside>
      </div>
    </>
  );
}
