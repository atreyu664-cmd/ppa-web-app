import { NextResponse } from "next/server";
import { checkAccessCode } from "@/lib/auth";
import { createPdf, safeFileName, type ExportBody } from "@/lib/pdfExport";
import { markEmailSent, serverPersistenceEnabled, SESSION_COOKIE } from "@/lib/sessionStore";

export const runtime = "nodejs";
export const maxDuration = 60;

function cookieSessionId(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as ExportBody;
    if (!checkAccessCode(body.accessCode)) {
      return NextResponse.json({ error: "Invalid assessment access code." }, { status: 401 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const resultsEmail = process.env.PPA_RESULTS_EMAIL;
    const fromEmail = process.env.PPA_FROM_EMAIL;
    if (!apiKey || !resultsEmail || !fromEmail) {
      return NextResponse.json({ sent: false, error: "Automatic email delivery is not configured." }, { status: 503 });
    }
    if (!body.blueprint) {
      return NextResponse.json({ sent: false, error: "Blueprint data is missing." }, { status: 400 });
    }

    const fullBody: ExportBody = { ...body, includeTranscript: true };
    const pdf = await createPdf(fullBody);
    const company = body.state?.facts?.companyName || body.blueprint.title || "PPA Assessment";
    const base = safeFileName(company);
    const attachmentName = `${base}-Full-Assessment-and-Blueprint.pdf`;
    const recipients = resultsEmail.split(",").map((x) => x.trim()).filter(Boolean);

    const resend = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recipients,
        subject: `PPA Completed — ${company}`,
        html: `<div style="font-family:Arial,sans-serif;color:#172232;line-height:1.6"><h2 style="margin:0 0 12px">Premium Positioning Architect completed</h2><p><strong>${company}</strong> has completed the PPA assessment.</p><p>The full assessment conversation and Strategic Positioning Blueprint are attached for Strategic Visibility review.</p></div>`,
        attachments: [{
          filename: attachmentName,
          content: Buffer.from(pdf).toString("base64"),
        }],
      }),
    });

    if (!resend.ok) {
      const detail = await resend.text().catch(() => "");
      console.error("PPA Resend error", resend.status, detail);
      return NextResponse.json({ sent: false, error: "The assessment was completed, but the automatic email could not be sent." }, { status: 502 });
    }

    const sessionId = cookieSessionId(request);
    if (sessionId && serverPersistenceEnabled()) {
      await markEmailSent(sessionId).catch((error) => console.error("PPA email status save error", error));
    }

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error("PPA email error", error);
    return NextResponse.json({ sent: false, error: "The assessment was completed, but the automatic email could not be sent." }, { status: 500 });
  }
}
