import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { checkAccessCode } from "@/lib/auth";
import type { PpaState, TurnMessage } from "@/lib/ppaTypes";

export const runtime = "nodejs";
export const maxDuration = 60;

type Differentiator = { title: string; difference: string; buyerRelevance: string; reasonToBelieve: string };
type Voc = { label: string; content: string; kind: "exact" | "paraphrase" | "theme" };
type Priority = { title: string; focus: string; whyItMatters: string };
type CompetitorSnapshot = { competitor: string; theirPositioning: string; apparentStrengths: string; apparentWeaknesses: string; clientOpportunity: string };
type Blueprint = {
  title: string;
  executivePositioningSummary: string;
  businessIdentity: string;
  idealCustomer: string;
  whyCustomersChooseYou: string;
  coreDifferentiators: Differentiator[];
  marketPosition: string;
  positioningStatement: string;
  competitiveContextSnapshot: CompetitorSnapshot[];
  marketResearchSignals: string[];
  voiceOfCustomerHighlights: Voc[];
  trustAndProofSnapshot: string[];
  strategicPriorities: Priority[];
  openQuestions: string[];
  nextStep: string;
};

type ExportBody = {
  blueprint: Blueprint;
  messages: TurnMessage[];
  state: PpaState;
  includeTranscript: boolean;
  accessCode?: string;
};

function h(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeFileName(value: string) {
  const cleaned = (value || "PPA")
    .replace(/[^a-z0-9\-_ ]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return cleaned || "PPA";
}

function paragraphs(text: string) {
  return String(text || "")
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((p) => `<p>${h(p)}</p>`)
    .join("");
}

function section(n: string, title: string, content: string) {
  return `<section class="blueprint-section">
    <div class="section-heading"><span>${h(n)}</span><h2>${h(title)}</h2></div>
    ${content}
  </section>`;
}

function dlRows(rows: Array<[string, string]>) {
  return `<dl>${rows.map(([label, value]) => `<dt>${h(label)}</dt><dd>${h(value)}</dd>`).join("")}</dl>`;
}

function renderBlueprint(blueprint: Blueprint) {
  const differentiators = (blueprint.coreDifferentiators || []).map((d) => `
    <div class="diff-card">
      <h3>${h(d.title)}</h3>
      ${dlRows([
        ["Difference", d.difference],
        ["Why it matters", d.buyerRelevance],
        ["Reason to believe", d.reasonToBelieve],
      ])}
    </div>`).join("");

  const competitors = (blueprint.competitiveContextSnapshot || []).map((c) => `
    <div class="competitor-card">
      <h4>${h(c.competitor)}</h4>
      ${dlRows([
        ["Positioning", c.theirPositioning],
        ["Visible strengths", c.apparentStrengths],
        ["Visible weaknesses", c.apparentWeaknesses],
        ["Client opportunity", c.clientOpportunity],
      ])}
    </div>`).join("");

  const signals = (blueprint.marketResearchSignals || []).map((x) => `<li>${h(x)}</li>`).join("");
  const voc = (blueprint.voiceOfCustomerHighlights || []).map((v) => `
    <div class="voc-item">
      <span>${h(v.label)}</span>
      <p>${h(v.content)}</p>
      <small>${v.kind === "exact" ? "Exact remembered language" : v.kind === "paraphrase" ? "Close paraphrase" : "Recurring theme"}</small>
    </div>`).join("");
  const proof = (blueprint.trustAndProofSnapshot || []).map((x) => `<li>${h(x)}</li>`).join("");
  const priorities = (blueprint.strategicPriorities || []).map((p, i) => `
    <div class="priority-item">
      <span>${i + 1}</span>
      <div><h3>${h(p.title)}</h3><p>${h(p.focus)}</p><small>${h(p.whyItMatters)}</small></div>
    </div>`).join("");
  const gaps = (blueprint.openQuestions || []).map((x) => `<li>${h(x)}</li>`).join("");

  return `
    ${section("01", "Executive Positioning Summary", `<div class="prose">${paragraphs(blueprint.executivePositioningSummary)}</div>`)}
    ${section("02", "Business Identity", `<div class="prose">${paragraphs(blueprint.businessIdentity)}</div>`)}
    ${section("03", "Ideal Customer", `<div class="prose">${paragraphs(blueprint.idealCustomer)}</div>`)}
    ${section("04", "Why Customers Choose You", `<div class="prose">${paragraphs(blueprint.whyCustomersChooseYou)}</div>`)}
    ${section("05", "Core Differentiators", `<div class="diff-grid">${differentiators}</div>`)}
    ${section("06", "Market Position & Positioning Statement", `
      <div class="prose">${paragraphs(blueprint.marketPosition)}</div>
      <div class="positioning-statement"><span>Positioning statement</span><p>${h(blueprint.positioningStatement)}</p></div>
      ${competitors ? `<div class="competitive-snapshot"><h3>Competitive Context Snapshot</h3>${competitors}</div>` : ""}
      ${signals ? `<div class="market-signals"><h3>Market Research Signals</h3><ul class="proof-list">${signals}</ul></div>` : ""}
    `)}
    ${section("07", "Voice of Customer Highlights", `<div class="voc-list">${voc}</div>`)}
    ${section("08", "Trust & Proof Snapshot", `<ul class="proof-list">${proof}</ul>`)}
    ${section("09", "Three Strategic Priorities", `<div class="priority-list">${priorities}</div>`)}
    ${gaps ? section("+", "Open Questions / Information Gaps", `<ul class="proof-list">${gaps}</ul>`) : ""}
    <footer class="blueprint-footer"><h2>What this Blueprint is for</h2><p>${h(blueprint.nextStep)}</p></footer>
  `;
}

function renderTranscript(messages: TurnMessage[], state: PpaState) {
  const transcript = (messages || []).map((message) => {
    const isUser = message.role === "user";
    return `<div class="transcript-message ${isUser ? "client" : "ppa"}">
      <div class="transcript-label">${isUser ? "CLIENT" : "PPA"}</div>
      <div class="transcript-copy">${h(message.content).replace(/\n/g, "<br>")}</div>
    </div>`;
  }).join("");

  const findings = state?.facts?.researchFindings || [];
  const notes = state?.facts?.sourceNotes || [];
  const research = [...findings, ...notes].map((x) => `<li>${h(x)}</li>`).join("");

  return `<div class="appendix-break"></div>
    <section class="appendix">
      <div class="appendix-kicker">INTERNAL DISCOVERY RECORD</div>
      <h1>Full Assessment Conversation</h1>
      <p class="appendix-lede">The client’s original answers and the PPA’s reflections are preserved below so Strategic Visibility can trace positioning conclusions back to the discovery conversation.</p>
      <div class="transcript">${transcript}</div>
      ${research ? `<div class="research-notes"><h2>Research & Source Notes</h2><ul>${research}</ul></div>` : ""}
    </section>`;
}

async function logoDataUrl() {
  try {
    const svg = await readFile(path.join(process.cwd(), "public", "ppa-logo.svg"), "utf8");
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  } catch {
    return "";
  }
}

async function buildHtml(body: ExportBody) {
  const logo = await logoDataUrl();
  const blueprint = body.blueprint;
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${h(blueprint.title || "Strategic Positioning Blueprint")}</title>
<style>
  :root {
    --navy:#172232; --navy-2:#243246; --ink:#1d2735; --muted:#667085; --line:#dce2ea;
    --paper:#fff; --soft:#f5f7fa; --accent:#c6a467; --accent-dark:#8b6b32;
  }
  * { box-sizing:border-box; }
  html, body { margin:0; padding:0; color:var(--ink); background:#fff; font-family:Inter, Arial, Helvetica, sans-serif; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  @page { size: Letter; margin: 0; }
  .blueprint-document { width:100%; background:var(--paper); }
  .blueprint-cover { min-height: 10.25in; padding: .95in .78in .72in; background:var(--navy); color:#fff; border-bottom:.08in solid var(--accent); position:relative; page-break-after:always; }
  .cover-brand { display:flex; align-items:center; gap:14px; margin-bottom:1.15in; }
  .cover-brand img { width:44px; height:44px; border-radius:10px; }
  .cover-brand strong { display:block; font-size:15px; letter-spacing:-.01em; }
  .cover-brand span { display:block; margin-top:3px; font-size:11px; color:#b8c2cf; }
  .eyebrow { font-size:11px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; color:#e1cfae; }
  .blueprint-cover h1 { margin:20px 0 16px; max-width:6.7in; font-family:Georgia, "Times New Roman", serif; font-weight:500; font-size:42px; line-height:1.08; letter-spacing:-.025em; }
  .blueprint-cover > p { margin:0; color:#cbd3df; font-size:14px; }
  .cover-rule { position:absolute; left:.78in; bottom:.72in; width:1.05in; height:3px; background:var(--accent); }
  .cover-footer { position:absolute; left:.78in; bottom:.42in; font-size:9px; color:#aeb9c7; }

  .blueprint-section { padding:.56in .72in .52in; border-bottom:1px solid #e8ebef; break-inside:auto; }
  .section-heading { display:flex; align-items:baseline; gap:16px; margin-bottom:25px; }
  .section-heading > span { color:var(--accent-dark); font-size:11px; font-weight:850; letter-spacing:.12em; }
  .section-heading h2 { margin:0; font-family:Georgia, "Times New Roman", serif; font-weight:500; font-size:27px; line-height:1.2; color:var(--navy); }
  .prose { color:#3d4857; font-size:15px; line-height:1.72; }
  .prose p { margin:0 0 15px; }

  .diff-grid { display:grid; gap:14px; }
  .diff-card { padding:21px; border:1px solid var(--line); border-radius:13px; background:#fbfcfd; break-inside:avoid; }
  .diff-card h3 { margin:0 0 17px; color:var(--navy); font-size:16px; }
  dl { display:grid; grid-template-columns:1.35in 1fr; gap:9px 16px; margin:0; }
  dt { font-size:10px; font-weight:850; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); }
  dd { margin:0; line-height:1.55; color:#414c5b; font-size:13.5px; }

  .positioning-statement { margin-top:26px; padding:23px 25px; border-left:4px solid var(--accent); background:#f8f6f1; break-inside:avoid; }
  .positioning-statement span { display:block; text-transform:uppercase; letter-spacing:.1em; font-size:10px; font-weight:850; color:var(--accent-dark); }
  .positioning-statement p { margin:8px 0 0; font-family:Georgia, "Times New Roman", serif; font-size:19px; line-height:1.5; color:var(--navy); }

  .competitive-snapshot, .market-signals { margin-top:30px; }
  .competitive-snapshot > h3, .market-signals > h3 { margin:0 0 14px; color:var(--navy); font-size:15px; }
  .competitor-card { padding:18px 20px; border:1px solid var(--line); border-radius:12px; background:#fbfcfd; margin-top:10px; break-inside:avoid; }
  .competitor-card h4 { margin:0 0 14px; color:var(--navy); font-size:15px; }

  .voc-list { display:grid; gap:12px; }
  .voc-item { border-bottom:1px solid #e8ebef; padding:0 0 13px; break-inside:avoid; }
  .voc-item span { text-transform:uppercase; color:var(--muted); font-size:10px; font-weight:800; letter-spacing:.08em; }
  .voc-item p { margin:5px 0 3px; line-height:1.55; font-family:Georgia, "Times New Roman", serif; font-size:15.5px; color:#2f3a49; }
  .voc-item small { color:#8a94a4; font-size:10px; }
  .proof-list { margin:0; padding-left:20px; display:grid; gap:9px; color:#414c5b; font-size:13.5px; line-height:1.55; }
  .proof-list li::marker { color:var(--accent); }

  .priority-list { display:grid; gap:20px; }
  .priority-item { display:grid; grid-template-columns:44px 1fr; gap:17px; break-inside:avoid; }
  .priority-item > span { width:38px; height:38px; border:1px solid #d4bf96; border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--accent-dark); font-size:11px; font-weight:850; }
  .priority-item h3 { margin:0 0 5px; color:var(--navy); font-size:15.5px; }
  .priority-item p { margin:0 0 6px; line-height:1.6; color:#414c5b; font-size:13.5px; }
  .priority-item small { color:var(--muted); line-height:1.45; font-size:11px; }

  .blueprint-footer { padding:.62in .72in .68in; background:#f6f7f9; }
  .blueprint-footer h2 { margin:0 0 12px; font-family:Georgia, "Times New Roman", serif; font-size:25px; font-weight:500; color:var(--navy); }
  .blueprint-footer p { margin:0; color:#536071; line-height:1.65; font-size:13.5px; }

  .appendix-break { page-break-before:always; }
  .appendix { padding:.72in; }
  .appendix-kicker { font-size:10px; font-weight:850; letter-spacing:.12em; color:var(--accent-dark); }
  .appendix h1 { margin:9px 0 10px; font-family:Georgia, "Times New Roman", serif; font-weight:500; font-size:30px; color:var(--navy); }
  .appendix-lede { margin:0 0 26px; color:var(--muted); line-height:1.6; font-size:13px; max-width:6.5in; }
  .transcript { display:grid; gap:12px; }
  .transcript-message { max-width:88%; padding:16px 18px; border:1px solid var(--line); border-radius:14px; background:#fff; break-inside:avoid; }
  .transcript-message.ppa { border-top-left-radius:4px; }
  .transcript-message.client { justify-self:end; background:var(--navy-2); color:#fff; border-color:var(--navy-2); border-top-right-radius:4px; }
  .transcript-label { text-transform:uppercase; letter-spacing:.1em; font-size:9px; font-weight:850; color:var(--accent-dark); margin-bottom:7px; }
  .client .transcript-label { color:#cfd8e5; }
  .transcript-copy { font-size:12.5px; line-height:1.55; white-space:normal; }
  .research-notes { margin-top:34px; padding-top:22px; border-top:1px solid var(--line); }
  .research-notes h2 { margin:0 0 12px; font-family:Georgia, "Times New Roman", serif; color:var(--navy); font-weight:500; font-size:22px; }
  .research-notes ul { margin:0; padding-left:20px; color:#414c5b; font-size:12px; line-height:1.55; }

  /* Keep the PDF visually close to the web experience, not like a conventional report. */
  h1,h2,h3,h4,p,dl,ul { orphans:3; widows:3; }
  .diff-card,.competitor-card,.positioning-statement,.voc-item,.priority-item,.transcript-message { page-break-inside:avoid; }
</style>
</head>
<body>
  <article class="blueprint-document">
    <header class="blueprint-cover">
      <div class="cover-brand">
        ${logo ? `<img src="${logo}" alt="">` : ""}
        <div><strong>Premium Positioning Architect™</strong><span>Strategic Visibility</span></div>
      </div>
      <div class="eyebrow">Strategic Positioning Blueprint™</div>
      <h1>${h(blueprint.title)}</h1>
      <p>Prepared through the Premium Positioning Architect™</p>
      <div class="cover-rule"></div>
      <div class="cover-footer">Positioning clarity grounded in client discovery, proof, buyer psychology, and market context.</div>
    </header>
    ${renderBlueprint(blueprint)}
  </article>
  ${body.includeTranscript ? renderTranscript(body.messages || [], body.state) : ""}
</body>
</html>`;
}

async function createPdf(body: ExportBody) {
  const html = await buildHtml(body);
  const browser = await puppeteer.launch({
    args: await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
    executablePath: await chromium.executablePath(),
    headless: "shell",
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.emulateMediaType("print");
    return await page.pdf({
      format: "Letter",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
  } finally {
    await browser.close();
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as ExportBody;
    if (!checkAccessCode(body.accessCode)) {
      return NextResponse.json({ error: "Invalid assessment access code." }, { status: 401 });
    }
    if (!body.blueprint) return NextResponse.json({ error: "Blueprint data is missing." }, { status: 400 });

    const bytes = await createPdf(body);
    const base = safeFileName(body.blueprint.title || body.state?.facts?.companyName || "PPA");
    const filename = body.includeTranscript
      ? `${base}-Full-Assessment-and-Blueprint.pdf`
      : `${base}-Strategic-Positioning-Blueprint.pdf`;
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("PPA export error", error);
    return NextResponse.json({ error: "We couldn't create the PDF. Please try again." }, { status: 500 });
  }
}
