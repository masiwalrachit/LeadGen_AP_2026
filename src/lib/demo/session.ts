import { cookies } from "next/headers";
import {
  DEMO_USER_COOKIE,
  DEMO_WORKSPACE_COOKIE,
  demoUserSchema,
  demoWorkspaceSchema,
  parseDemoCookie,
  type DemoUser,
  type DemoWorkspace,
} from "./session-shared";

/** Server-side read of the demo session cookies. */
export async function readDemoSession(): Promise<{ user: DemoUser | null; workspace: DemoWorkspace | null }> {
  const store = await cookies();
  return {
    user: parseDemoCookie(store.get(DEMO_USER_COOKIE)?.value, demoUserSchema),
    workspace: parseDemoCookie(store.get(DEMO_WORKSPACE_COOKIE)?.value, demoWorkspaceSchema),
  };
}
