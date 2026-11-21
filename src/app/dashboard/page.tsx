import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Check,
  CircleDot,
  Clock3,
  Database,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Radar,
  Search,
  Settings,
  Sparkles,
  Target,
  Users,
  Waypoints,
} from "lucide-react";
import { getWorkspaceContext } from "@/lib/auth/workspace";
import { SignOutButton } from "@/components/sign-out-button";
import styles from "./dashboard.module.css";

const navigation = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard, active: true },
  { label: "Campaigns", href: "/campaigns/new", icon: Radar },
  { label: "Leads", href: "/leads", icon: Target },
  { label: "Team", href: "/team", icon: Users },
  { label: "Settings", href: "#settings", icon: Settings },
];

const stages = [
  { label: "Queued", detail: "Ready", value: "1", state: "done" },
  { label: "Discovering", detail: "Candidates", value: "284", state: "done" },
  { label: "Validating", detail: "Checked", value: "146", state: "active" },
  { label: "Scoring", detail: "Ready", value: "31", state: "next" },
  { label: "Completed", detail: "Qualified leads", value: "12", state: "next" },
];

const campaigns = [
  {
    name: "Delhi dental practices",
    service: "Website redesign",
    stage: "Validating",
    progress: 48,
    candidates: 284,
    leads: 12,
    tone: "active",
  },
  {
    name: "Jaipur independent boutiques",
    service: "E-commerce development",
    stage: "Scoring",
    progress: 72,
    candidates: 163,
    leads: 8,
    tone: "scoring",
  },
  {
    name: "Gurugram consultancies",
    service: "New website",
    stage: "Completed",
    progress: 100,
    candidates: 208,
    leads: 19,
    tone: "complete",
  },
];

function Brand() {
  return (
    <Link className={styles.brand} href="/dashboard" aria-label="LeadGen dashboard">
      <span className={styles.brandMark} aria-hidden="true">
        <Waypoints size={21} strokeWidth={2.2} />
      </span>
      <span>LeadGen</span>
    </Link>
  );
}

function Navigation() {
  return (
    <nav className={styles.navigation} aria-label="Workspace navigation">
      {navigation.map(({ label, href, icon: Icon, active }) => (
        <Link
          className={active ? styles.navItemActive : styles.navItem}
          href={href}
          key={label}
          aria-current={active ? "page" : undefined}
          title={label}
        >
          <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function workspaceInitials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function WorkspaceSelector({ workspaceName }: { workspaceName: string }) {
  return (
    <div className={styles.workspaceSelector}>
      <span>Workspace</span>
      <span className={styles.workspaceControl}>
        <span className={styles.workspaceAvatar}>{workspaceInitials(workspaceName)}</span>
        <strong>{workspaceName}</strong>
      </span>
    </div>
  );
}

function UserSummary({ username, userInitial }: { username: string; userInitial: string }) {
  return (
    <div className={styles.sidebarFoot}>
      <span className={styles.userAvatar} aria-hidden="true">{userInitial}</span>
      <div>
        <strong>@{username}</strong>
        <span>Workspace member</span>
      </div>
      <SignOutButton className={styles.signOutButton} />
    </div>
  );
}

function Sidebar({ username, userInitial, workspaceName }: { username: string; userInitial: string; workspaceName: string }) {
  return (
    <aside className={styles.sidebar}>
      <input
        className={styles.sidebarToggleInput}
        id="sidebar-collapse"
        type="checkbox"
        aria-label="Collapse workspace sidebar"
      />
      <label
        className={styles.sidebarToggle}
        htmlFor="sidebar-collapse"
        title="Collapse or expand sidebar"
      >
        <PanelLeftClose className={styles.collapseIcon} size={17} aria-hidden="true" />
        <PanelLeftOpen className={styles.expandIcon} size={17} aria-hidden="true" />
      </label>
      <Brand />
      <WorkspaceSelector workspaceName={workspaceName} />
      <Navigation />
      <UserSummary username={username} userInitial={userInitial} />
    </aside>
  );
}

function MobileNavigation({ username, userInitial, workspaceName }: { username: string; userInitial: string; workspaceName: string }) {
  return (
    <div className={styles.mobileBar}>
      <Brand />
      <details className={styles.mobileMenu}>
        <summary aria-label="Open navigation">
          <Menu size={22} aria-hidden="true" />
        </summary>
        <div className={styles.mobileMenuPanel}>
          <WorkspaceSelector workspaceName={workspaceName} />
          <Navigation />
          <UserSummary username={username} userInitial={userInitial} />
        </div>
      </details>
    </div>
  );
}

function CampaignStageMap() {
  return (
    <section className={styles.observatory} aria-labelledby="campaign-title">
      <header className={styles.observatoryHeader}>
        <div>
          <div className={styles.campaignTitleRow}>
            <h2 id="campaign-title">Delhi dental practices</h2>
            <span className={styles.liveStatus}>
              <span className={styles.liveDot} aria-hidden="true" />
              Running now
            </span>
          </div>
          <p>Website redesign · Delhi, India</p>
        </div>
        <span className={styles.plannedText}>Campaign details planned</span>
      </header>

      <div className={styles.stageMap} role="list" aria-label="Campaign processing stages">
        <div className={styles.stageTrack} aria-hidden="true">
          <span />
        </div>
        {stages.map((stage) => (
          <div
            className={styles.stage}
            data-state={stage.state}
            key={stage.label}
            role="listitem"
            aria-current={stage.state === "active" ? "step" : undefined}
          >
            <div className={styles.stageMarker}>
              {stage.state === "done" ? (
                <Check size={14} strokeWidth={2.5} aria-hidden="true" />
              ) : stage.state === "active" ? (
                <CircleDot size={15} strokeWidth={2.2} aria-hidden="true" />
              ) : null}
            </div>
            <span className={styles.stageLabel}>{stage.label}</span>
            <strong>{stage.value}</strong>
            <span className={styles.stageDetail}>{stage.detail}</span>
          </div>
        ))}
      </div>

      <footer className={styles.observatoryFoot}>
        <div>
          <Clock3 size={17} aria-hidden="true" />
          <span>Last checked 2 minutes ago</span>
        </div>
        <div className={styles.pulseCopy}>
          <Sparkles size={17} aria-hidden="true" />
          <span>Website checks are running</span>
        </div>
      </footer>
    </section>
  );
}

function MonitorRail() {
  return (
    <aside className={styles.monitorRail} aria-label="Campaign monitoring">
      <section className={styles.monitorSection}>
        <div className={styles.sectionHeading}>
          <div>
            <h2>Validation queue</h2>
            <p>What the pipeline is checking now</p>
          </div>
          <Database size={19} aria-hidden="true" />
        </div>

        <div className={styles.queueList}>
          <div>
            <span className={styles.queueIcon} data-tone="blue">
              <Search size={16} aria-hidden="true" />
            </span>
            <span><strong>138</strong> website checks</span>
            <span>Active</span>
          </div>
          <div>
            <span className={styles.queueIcon} data-tone="navy">
              <BarChart3 size={16} aria-hidden="true" />
            </span>
            <span><strong>31</strong> ready to score</span>
            <span>Next</span>
          </div>
          <div>
            <span className={styles.queueIcon} data-tone="red">
              <AlertTriangle size={16} aria-hidden="true" />
            </span>
            <span><strong>4</strong> checks need retry</span>
            <span>Review</span>
          </div>
        </div>
      </section>

      <section className={styles.monitorSection}>
        <div className={styles.sectionHeading}>
          <div>
            <h2>Evidence health</h2>
            <p>Coverage behind current signals</p>
          </div>
          <Target size={19} aria-hidden="true" />
        </div>

        <div className={styles.healthList}>
          <div>
            <span>Source coverage</span>
            <strong>84%</strong>
            <progress className={styles.healthBar} aria-label="Source coverage" value={84} max={100}>84%</progress>
          </div>
          <div>
            <span>Fresh evidence</span>
            <strong>76%</strong>
            <progress className={styles.healthBar} aria-label="Fresh evidence" value={76} max={100}>76%</progress>
          </div>
          <div>
            <span>Public contact path</span>
            <strong>61%</strong>
            <progress className={styles.healthBar} aria-label="Public contact path" value={61} max={100}>61%</progress>
          </div>
        </div>
      </section>
    </aside>
  );
}

function CampaignTable() {
  return (
    <section className={styles.campaigns} id="campaigns" aria-labelledby="campaigns-title">
      <header className={styles.campaignsHeader}>
        <div>
          <h2 id="campaigns-title">All campaigns</h2>
          <p>Monitor progress and open work that needs attention.</p>
        </div>
        <span className={styles.plannedText}>Archive planned</span>
      </header>

      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th scope="col">Campaign</th>
              <th scope="col">Stage</th>
              <th scope="col">Progress</th>
              <th scope="col">Candidates</th>
              <th scope="col">Qualified leads</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => (
              <tr key={campaign.name}>
                <td data-label="Campaign">
                  <strong>{campaign.name}</strong>
                  <span>{campaign.service}</span>
                </td>
                <td data-label="Stage"><span className={styles.status} data-tone={campaign.tone}>{campaign.stage}</span></td>
                <td data-label="Progress">
                  <div className={styles.progressCell}>
                    <progress aria-label={`${campaign.name} progress`} value={campaign.progress} max={100}>{campaign.progress}%</progress>
                    <strong>{campaign.progress}%</strong>
                  </div>
                </td>
                <td data-label="Candidates">{campaign.candidates}</td>
                <td data-label="Qualified leads">{campaign.leads}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function DashboardPage() {
  const { username, userInitial, workspaceName } = await getWorkspaceContext();

  return (
    <div className={styles.shell}>
      <Sidebar username={username} userInitial={userInitial} workspaceName={workspaceName} />
      <MobileNavigation username={username} userInitial={userInitial} workspaceName={workspaceName} />

      <main className={styles.main}>
        <div className={styles.previewBanner} role="note">
          <Sparkles size={16} aria-hidden="true" />
          <span><strong>Preview mode.</strong> This dashboard uses illustrative campaign data.</span>
        </div>
        <header className={styles.pageHeader}>
          <div>
            <h1>Campaign observatory</h1>
            <p>Track discovery and qualification across your workspace.</p>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.searchButton} type="button" aria-label="Search campaigns (planned)" title="Search is planned" disabled>
              <Search size={19} aria-hidden="true" />
            </button>
            <Link className={styles.primaryAction} href="/campaigns/new">
              <Plus size={18} strokeWidth={2.4} aria-hidden="true" />
              Create campaign
            </Link>
          </div>
        </header>

        <div className={styles.dashboardGrid}>
          <CampaignStageMap />
          <MonitorRail />
        </div>

        <CampaignTable />
      </main>
    </div>
  );
}
