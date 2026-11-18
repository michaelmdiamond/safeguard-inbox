import { beforeEach, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  user: "alice" as string | null,
  userFrom: vi.fn(),
  serviceFrom: vi.fn(),
  upsert: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user ? { id: state.user } : null } }) },
    from: state.userFrom,
  }),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: state.serviceFrom }),
}));
vi.mock("@/lib/gmail", () => ({ getGmailEmail: async () => "synthetic@example.test" }));
import { GET as start } from "@/app/api/auth/gmail/route";
import { GET as callback } from "@/app/api/auth/gmail/callback/route";

beforeEach(() => {
  vi.clearAllMocks();
  state.user = "alice";
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.test");
  vi.stubEnv("GOOGLE_CLIENT_ID", "synthetic-client");
  vi.stubEnv("GOOGLE_REDIRECT_URI", "https://example.test/api/auth/gmail/callback");
  vi.stubGlobal("fetch", state.fetch);
  state.fetch.mockResolvedValue({ ok: true, json: async () => ({
    access_token: "synthetic-access", refresh_token: "synthetic-refresh", expires_in: 3600,
  }) });
  state.upsert.mockResolvedValue({ error: null });
  state.serviceFrom.mockReturnValue({ upsert: state.upsert });
});
function request(value?: string, cookie?: string) {
  const url = new URL("https://example.test/api/auth/gmail/callback?code=synthetic-code");
  if (value) url.searchParams.set("state", value);
  return new NextRequest(url, { headers: cookie ? { cookie: `gmail_oauth_state=${cookie}` } : {} });
}

test("OAuth initiation sets unpredictable browser-bound, short-lived state", async () => {
  const first = await start();
  const second = await start();
  const a = new URL(first.headers.get("location")!).searchParams.get("state");
  const b = new URL(second.headers.get("location")!).searchParams.get("state");
  expect(a).toMatch(/^alice:[a-f0-9-]{36}$/);
  expect(a).not.toBe(b);
  const cookie = first.cookies.get("gmail_oauth_state")!;
  expect(cookie.value).toBe(a);
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.sameSite).toBe("lax");
  expect(cookie.maxAge).toBe(600);
});

test.each([
  [undefined, undefined],
  ["alice:nonce", undefined],
  ["alice:nonce", "alice:other"],
  ["bob:nonce", "bob:nonce"],
])("invalid or foreign state is rejected before token exchange (%s)", async (value, cookie) => {
  const response = await callback(request(value, cookie));
  expect(response.headers.get("location")).toContain("error=invalid_oauth_state");
  expect(response.cookies.get("gmail_oauth_state")!.maxAge).toBe(0);
  expect(state.fetch).not.toHaveBeenCalled();
  expect(state.serviceFrom).not.toHaveBeenCalled();
});

test("valid state stores credentials through server-only client and clears cookie", async () => {
  const response = await callback(request("alice:nonce", "alice:nonce"));
  expect(response.headers.get("location")).toBe("https://example.test/onboarding?connected=1");
  expect(state.fetch).toHaveBeenCalledOnce();
  expect(state.userFrom).not.toHaveBeenCalled();
  expect(state.serviceFrom).toHaveBeenCalledWith("gmail_connections");
  expect(state.upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "alice" }), { onConflict: "user_id" });
  expect(response.cookies.get("gmail_oauth_state")!.maxAge).toBe(0);
});

test("unauthenticated callback cannot exchange or store tokens", async () => {
  state.user = null;
  const response = await callback(request("alice:nonce", "alice:nonce"));
  expect(response.headers.get("location")).toBe("https://example.test/login");
  expect(state.fetch).not.toHaveBeenCalled();
  expect(state.serviceFrom).not.toHaveBeenCalled();
});

test("credential table grants exclude browser roles and retain RLS", () => {
  const sql = readFileSync("supabase/migrations/002_gmail_connections.sql", "utf8");
  expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
  expect(sql).toMatch(/REVOKE ALL ON TABLE gmail_connections FROM anon, authenticated/);
  expect(sql).toMatch(/GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE gmail_connections TO service_role/);
  expect(sql).not.toContain("CREATE POLICY");
});
