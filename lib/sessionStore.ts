export type StoredSession = {
  state: unknown;
  messages: unknown[];
  started: boolean;
  blueprint: unknown | null;
  emailSent?: boolean;
  updatedAt: string;
  completedAt?: string | null;
};

const TTL_SECONDS = 60 * 24 * 60 * 60;

function config() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function command(args: Array<string | number>) {
  const cfg = config();
  if (!cfg) return null;
  const response = await fetch(cfg.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Session store error: ${response.status}`);
  return await response.json() as { result?: unknown };
}

export function serverPersistenceEnabled() {
  return Boolean(config());
}

export async function loadSession(sessionId: string): Promise<StoredSession | null> {
  const result = await command(["GET", `ppa:session:${sessionId}`]);
  if (!result || typeof result.result !== "string") return null;
  try {
    return JSON.parse(result.result) as StoredSession;
  } catch {
    return null;
  }
}

export async function saveSession(sessionId: string, data: StoredSession) {
  await command([
    "SET",
    `ppa:session:${sessionId}`,
    JSON.stringify(data),
    "EX",
    TTL_SECONDS,
  ]);
}

export async function markEmailSent(sessionId: string) {
  const existing = await loadSession(sessionId);
  if (!existing) return;
  await saveSession(sessionId, { ...existing, emailSent: true, updatedAt: new Date().toISOString() });
}

export const SESSION_COOKIE = "ppa_session";
export const SESSION_MAX_AGE = TTL_SECONDS;
