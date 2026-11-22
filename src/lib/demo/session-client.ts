import {
  DEMO_USER_COOKIE,
  DEMO_WORKSPACE_COOKIE,
  type DemoUser,
  type DemoWorkspace,
} from "./session-shared";

const WEEK_IN_SECONDS = 60 * 60 * 24 * 7;

function writeCookie(name: string, value: unknown) {
  document.cookie = `${name}=${encodeURIComponent(JSON.stringify(value))}; Path=/; Max-Age=${WEEK_IN_SECONDS}; SameSite=Lax`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function startDemoSession(user: DemoUser) {
  writeCookie(DEMO_USER_COOKIE, user);
}

export function saveDemoWorkspace(workspace: DemoWorkspace) {
  writeCookie(DEMO_WORKSPACE_COOKIE, workspace);
}

/** Ends the demo session and clears locally stored demo state (review statuses, campaign runs). */
export function endDemoSession() {
  deleteCookie(DEMO_USER_COOKIE);
  deleteCookie(DEMO_WORKSPACE_COOKIE);
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith("leadgen.demo."))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage can be unavailable (private mode); the cookies are what matter.
  }
}

/** Illustrative join code in the same shape as the real one (LG-XXXXXXXX). */
export function makeDemoJoinCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `LG-${Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("")}`;
}
