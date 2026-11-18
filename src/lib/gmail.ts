const GMAIL_API = "https://www.googleapis.com/gmail/v1";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

interface GmailPayload {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPayload[];
}

interface GmailMessage {
  payload?: GmailPayload;
}

interface GmailThread {
  messages?: GmailMessage[];
}

export async function refreshGmailToken(
  refreshToken: string
): Promise<{ accessToken: string; expiry: Date }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("Failed to refresh Gmail token");
  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiry: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function searchGmailThreadIds(
  accessToken: string,
  query: string,
  maxResults = 30
): Promise<string[]> {
  const params = new URLSearchParams({
    q: query,
    maxResults: String(maxResults),
  });
  const res = await fetch(`${GMAIL_API}/users/me/threads?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to search Gmail threads");
  const data = await res.json();
  return (data.threads ?? []).map((t: { id: string }) => t.id);
}

export async function getGmailThreadContent(
  accessToken: string,
  threadId: string
): Promise<string> {
  const res = await fetch(
    `${GMAIL_API}/users/me/threads/${threadId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Failed to get Gmail thread ${threadId}`);
  const thread: GmailThread = await res.json();
  return extractThreadContent(thread);
}

export async function getGmailEmail(accessToken: string): Promise<string> {
  const res = await fetch(`${GMAIL_API}/users/me/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to get Gmail profile");
  const data = await res.json();
  return data.emailAddress;
}

function extractThreadContent(thread: GmailThread): string {
  return (thread.messages ?? [])
    .map((m) => extractPayloadContent(m.payload))
    .filter(Boolean)
    .join("\n\n---\n\n");
}

function extractPayloadContent(payload?: GmailPayload): string {
  if (!payload) return "";
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, "base64url").toString("utf-8");
  }
  if (payload.parts) {
    const html = payload.parts.find((p) => p.mimeType === "text/html");
    const text = payload.parts.find((p) => p.mimeType === "text/plain");
    const part = html || text;
    if (part?.body?.data) {
      return Buffer.from(part.body.data, "base64url").toString("utf-8");
    }
    for (const p of payload.parts) {
      const content = extractPayloadContent(p);
      if (content) return content;
    }
  }
  return "";
}
