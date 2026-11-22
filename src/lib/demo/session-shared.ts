import { z } from "zod";

/** Cookie names for the demo session. Cookies (not localStorage) so server components can read them. */
export const DEMO_USER_COOKIE = "leadgen_demo_user";
export const DEMO_WORKSPACE_COOKIE = "leadgen_demo_workspace";
export const DEMO_WORKSPACE_ID = "demo-workspace";

export const demoUserSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().max(200),
});

export const demoWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  location: z.string().trim().max(150),
  username: z.string().trim().min(1).max(30),
  joinCode: z.string().trim().max(20),
});

export type DemoUser = z.infer<typeof demoUserSchema>;
export type DemoWorkspace = z.infer<typeof demoWorkspaceSchema>;

/** Parses a cookie value safely; anything malformed is treated as "not signed in". */
export function parseDemoCookie<T>(raw: string | undefined, schema: z.ZodType<T>): T | null {
  if (!raw) return null;
  try {
    const result = schema.safeParse(JSON.parse(decodeURIComponent(raw)));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
