import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PpaState, TurnMessage } from "@/lib/ppaTypes";

type Differentiator = { title: string; difference: string; buyerRelevance: string; reasonToBelieve: string };
type Voc = { label: string; content: string; kind: "exact" | "paraphrase" | "theme" };
type Priority = { title: string; focus: string; whyItMatters: string };
type CompetitorSnapshot = { competitor: string; theirPositioning: string; apparentStrengths: string; apparentWeaknesses: string; clientOpportunity: string };
export type Blueprint = {
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

export type ExportBody = {
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

export function safeFileName(value: string) {
  const cleaned = (value || "PPA")
    .replace(/[^a-z0-9\-_ ]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return cleaned || "PPA";
}

function formattedAssessmentDate() {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(new Date());
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
  const assessmentDate = formattedAssessmentDate();
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62.5..125,100..900&display=swap" rel="stylesheet">
<title>${h(blueprint.title || "Strategic Positioning Blueprint")}</title>
<style>
  :root {
    --navy:#172232; --navy-2:#243246; --ink:#1d2735; --muted:#667085; --line:#dce2ea;
    --paper:#fff; --soft:#f5f7fa; --accent:#c6a467; --accent-dark:#8b6b32;
  }
  * { box-sizing:border-box; }
  html, body { margin:0; padding:0; color:var(--ink); background:#fff; font-family:Archivo, Arial, Helvetica, sans-serif; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  @page { size: Letter; margin: 0; }
  .blueprint-document { width:100%; background:var(--paper); }
  .blueprint-cover { min-height: 10.25in; padding: .95in .78in .72in; background:var(--navy); color:#fff; border-bottom:.08in solid var(--accent); position:relative; page-break-after:always; }
  .cover-brand { display:flex; align-items:center; gap:14px; margin-bottom:1.15in; }
  .cover-brand img { width:44px; height:44px; border-radius:10px; }
  .cover-brand strong { display:block; font-size:15px; letter-spacing:-.01em; }
  .cover-brand span { display:block; margin-top:3px; font-size:11px; color:#A9B3C4; }
  .eyebrow { font-size:11px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; color:#DA9150; }
  .blueprint-cover h1 { margin:20px 0 16px; max-width:6.7in; font-family:Archivo, Arial, Helvetica, sans-serif; font-weight:800; font-size:42px; line-height:1.08; font-stretch:112%; letter-spacing:-.025em; }
  .blueprint-cover > p { margin:0; color:#A9B3C4; font-size:14px; }
  .cover-meta { margin-top:13px; display:flex; gap:18px; flex-wrap:wrap; color:#EEF1F5; font-size:11.5px; line-height:1.45; }
  .cover-meta strong { color:#fff; font-weight:700; }
  .cover-rule { position:absolute; left:.78in; bottom:.78in; width:1.05in; height:3px; background:var(--accent); }
  .cover-footer { position:absolute; left:.78in; right:.78in; bottom:.43in; font-size:11px; line-height:1.45; color:#A9B3C4; }

  .blueprint-section { padding:.56in .72in .52in; border-bottom:1px solid #D5DBE5; break-inside:auto; page-break-inside:auto; }
  .section-heading { display:flex; align-items:baseline; gap:16px; margin-bottom:25px; break-after:avoid-page; page-break-after:avoid; }
  .section-heading > span { color:var(--accent-dark); font-size:11px; font-weight:850; letter-spacing:.12em; }
  .section-heading h2 { margin:0; font-family:Archivo, Arial, Helvetica, sans-serif; font-weight:800; font-size:27px; line-height:1.2; font-stretch:100%; color:var(--navy); }
  .prose { color:#2A3A57; font-size:15px; line-height:1.72; }
  .prose p { margin:0 0 15px; }

  .diff-grid { display:grid; gap:14px; }
  .diff-card { padding:21px; border:1px solid var(--line); border-radius:13px; background:#EEF1F5; break-inside:avoid; }
  .diff-card h3 { margin:0 0 17px; color:var(--navy); font-size:16px; }
  dl { display:grid; grid-template-columns:1.35in 1fr; gap:9px 16px; margin:0; }
  dt { font-size:10px; font-weight:850; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); }
  dd { margin:0; line-height:1.55; color:#2A3A57; font-size:13.5px; }

  .positioning-statement { margin-top:26px; padding:23px 25px; border-left:4px solid var(--accent); background:#F7E6D5; break-inside:avoid; }
  .positioning-statement span { display:block; text-transform:uppercase; letter-spacing:.1em; font-size:10px; font-weight:850; color:var(--accent-dark); }
  .positioning-statement p { margin:8px 0 0; font-family:Archivo, Arial, Helvetica, sans-serif; font-size:19px; line-height:1.5; font-weight:700; color:var(--navy); }

  .competitive-snapshot, .market-signals { margin-top:30px; }
  .competitive-snapshot > h3, .market-signals > h3 { margin:0 0 14px; color:var(--navy); font-size:15px; }
  .competitor-card { padding:18px 20px; border:1px solid var(--line); border-radius:12px; background:#EEF1F5; margin-top:10px; break-inside:avoid; }
  .competitor-card h4 { margin:0 0 14px; color:var(--navy); font-size:15px; }

  .voc-list { display:grid; gap:12px; }
  .voc-item { border-bottom:1px solid #D5DBE5; padding:0 0 13px; break-inside:avoid; }
  .voc-item span { text-transform:uppercase; color:var(--muted); font-size:10px; font-weight:800; letter-spacing:.08em; }
  .voc-item p { margin:5px 0 3px; line-height:1.55; font-family:Archivo, Arial, Helvetica, sans-serif; font-size:15.5px; color:#0F1B2D; font-weight:600; }
  .voc-item small { color:#66738C; font-size:10px; }
  .proof-list { margin:0; padding-left:20px; display:grid; gap:9px; color:#2A3A57; font-size:13.5px; line-height:1.55; }
  .proof-list li::marker { color:var(--accent); }

  .priority-list { display:grid; gap:20px; }
  .priority-item { display:grid; grid-template-columns:44px 1fr; gap:17px; break-inside:avoid; }
  .priority-item > span { width:38px; height:38px; border:1px solid #C8752D; border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--accent-dark); font-size:11px; font-weight:850; }
  .priority-item h3 { margin:0 0 5px; color:var(--navy); font-size:15.5px; }
  .priority-item p { margin:0 0 6px; line-height:1.6; color:#2A3A57; font-size:13.5px; }
  .priority-item small { color:var(--muted); line-height:1.45; font-size:11px; }

  .blueprint-footer { padding:.62in .72in .68in; background:#EEF1F5; }
  .blueprint-footer h2 { margin:0 0 12px; font-family:Archivo, Arial, Helvetica, sans-serif; font-size:25px; font-weight:800; color:var(--navy); }
  .blueprint-footer p { margin:0; color:#2A3A57; line-height:1.65; font-size:13.5px; }

  .appendix-break { page-break-before:always; }
  .appendix { padding:.72in; }
  .appendix-kicker { font-size:10px; font-weight:850; letter-spacing:.12em; color:var(--accent-dark); }
  .appendix h1 { margin:9px 0 10px; font-family:Archivo, Arial, Helvetica, sans-serif; font-weight:800; font-size:30px; color:var(--navy); }
  .appendix-lede { margin:0 0 26px; color:var(--muted); line-height:1.6; font-size:13px; max-width:6.5in; }
  .transcript { display:grid; gap:12px; }
  .transcript-message { max-width:88%; padding:16px 18px; border:1px solid var(--line); border-radius:14px; background:#fff; break-inside:avoid; }
  .transcript-message.ppa { border-top-left-radius:4px; }
  .transcript-message.client { justify-self:end; background:var(--navy-2); color:#fff; border-color:var(--navy-2); border-top-right-radius:4px; }
  .transcript-label { text-transform:uppercase; letter-spacing:.1em; font-size:9px; font-weight:850; color:var(--accent-dark); margin-bottom:7px; }
  .client .transcript-label { color:#A9B3C4; }
  .transcript-copy { font-size:12.5px; line-height:1.55; white-space:normal; }
  .research-notes { margin-top:34px; padding-top:22px; border-top:1px solid var(--line); }
  .research-notes h2 { margin:0 0 12px; font-family:Archivo, Arial, Helvetica, sans-serif; color:var(--navy); font-weight:800; font-size:22px; }
  .research-notes ul { margin:0; padding-left:20px; color:#2A3A57; font-size:12px; line-height:1.55; }

  /* Print rhythm: keep headings with their content and prevent cards/callouts from splitting. */
  h1,h2,h3,h4 { break-after:avoid-page; page-break-after:avoid; }
  p,li,dd { orphans:3; widows:3; }
  .section-heading + .prose, .section-heading + .diff-grid, .section-heading + .voc-list,
  .section-heading + .proof-list, .section-heading + .priority-list { break-before:avoid-page; page-break-before:avoid; }
  .diff-card,.competitor-card,.positioning-statement,.voc-item,.priority-item,.transcript-message { break-inside:avoid-page; page-break-inside:avoid; }
  .competitive-snapshot,.market-signals,.research-notes,.blueprint-footer { break-inside:avoid-page; page-break-inside:avoid; }
  .diff-grid,.voc-list,.priority-list,.transcript { align-content:start; }
  .appendix h1,.appendix-lede { break-after:avoid-page; page-break-after:avoid; }
  @media print {
    .blueprint-section:nth-of-type(5),
    .blueprint-section:nth-of-type(6),
    .blueprint-section:nth-of-type(7),
    .blueprint-section:nth-of-type(9) { break-before:page; page-break-before:always; }
    .blueprint-section:nth-of-type(8) { break-before:auto; page-break-before:auto; }
  }
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
      <div class="cover-meta"><span><strong>Assessment date:</strong> ${h(assessmentDate)}</span></div>
      <div class="cover-rule"></div>
      <div class="cover-footer">Positioning clarity grounded in client discovery, proof, buyer psychology, and market context.</div>
    </header>
    ${renderBlueprint(blueprint)}
  </article>
  ${body.includeTranscript ? renderTranscript(body.messages || [], body.state) : ""}
</body>
</html>`;
}

export async function createPdf(body: ExportBody) {
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
