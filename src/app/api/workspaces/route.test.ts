import { beforeEach, describe, expect, it, vi } from "vitest";

const state = { sub: "user-1" as string | null, membership: null as { workspace_id: string } | null, rpc: vi.fn() };

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: { claims: state.sub ? { sub: state.sub } : null } }) },
    from: () => ({ select: () => ({ eq: () => ({ limit: () => ({ maybeSingle: async () => ({ data: state.membership, error: null }) }) }) }) }),
    rpc: state.rpc,
  }),
}));

import { POST } from "./route";

const create = { action: "create", username: "akshay", name: "Agency", website: "", location: "Delhi", services: ["redesign"] };
const post = (body: unknown) => POST(new Request("http://localhost/api/workspaces", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));

beforeEach(() => {
  state.sub = "user-1";
  state.membership = null;
  state.rpc.mockReset().mockResolvedValue({ data: { workspaceId: "w1", workspaceName: "Agency", joinCode: "LG-AB12CD34" }, error: null });
});

describe("POST /api/workspaces", () => {
  it("rejects signed-out users", async () => {
    state.sub = null;
    expect((await post(create)).status).toBe(401);
  });

  it("rejects a user who already has a workspace", async () => {
    state.membership = { workspace_id: "w0" };
    const response = await post(create);
    expect(response.status).toBe(409);
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it("answers 400, not 500, for a body that is not JSON", async () => {
    expect((await post("not json")).status).toBe(400);
  });

  it("creates a workspace and returns the join code for the owner", async () => {
    const response = await post(create);
    expect(response.status).toBe(200);
    expect((await response.json()).workspace.joinCode).toBe("LG-AB12CD34");
  });
});
