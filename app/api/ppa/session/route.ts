import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { loadSession, saveSession, serverPersistenceEnabled, SESSION_COOKIE, SESSION_MAX_AGE, type StoredSession } from "@/lib/sessionStore";

export const runtime = "nodejs";

function cookieSessionId(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function responseWithSession(body: unknown, sessionId: string, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`
  );
  return response;
}

export async function GET(request: Request) {
  if (!serverPersistenceEnabled()) {
    return NextResponse.json({ enabled: false, data: null });
  }
  const sessionId = cookieSessionId(request) || randomUUID();
  try {
    const data = await loadSession(sessionId);
    return responseWithSession({ enabled: true, data }, sessionId);
  } catch (error) {
    console.error("PPA session load error", error);
    return responseWithSession({ enabled: true, data: null, warning: "Unable to restore the server copy." }, sessionId);
  }
}

export async function POST(request: Request) {
  if (!serverPersistenceEnabled()) {
    return NextResponse.json({ enabled: false, saved: false });
  }
  const sessionId = cookieSessionId(request) || randomUUID();
  try {
    const body = await request.json() as Partial<StoredSession>;
    const data: StoredSession = {
      state: body.state ?? null,
      messages: Array.isArray(body.messages) ? body.messages : [],
      started: Boolean(body.started),
      blueprint: body.blueprint ?? null,
      emailSent: Boolean(body.emailSent),
      updatedAt: new Date().toISOString(),
      completedAt: body.completedAt || null,
    };
    await saveSession(sessionId, data);
    return responseWithSession({ enabled: true, saved: true }, sessionId);
  } catch (error) {
    console.error("PPA session save error", error);
    return responseWithSession({ enabled: true, saved: false, error: "Unable to save progress." }, sessionId, 500);
  }
}
