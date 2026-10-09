import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { checkAccessCode } from "@/lib/auth";
import type { PpaState, TurnMessage } from "@/lib/ppaTypes";

export const runtime = "nodejs";

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

type PdfCtx = {
  pdf: PDFDocument;
  page: PDFPage;
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  y: number;
  bodyPage: boolean;
};

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN_X = 54;
const TOP = 70;
const BOTTOM = 58;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

const C = {
  navy: rgb(0.090, 0.133, 0.196),          // #172232
  navy2: rgb(0.141, 0.196, 0.275),         // #243246
  ink: rgb(0.114, 0.153, 0.208),           // #1d2735
  body: rgb(0.239, 0.282, 0.341),          // #3d4857
  muted: rgb(0.400, 0.439, 0.522),         // #667085
  line: rgb(0.863, 0.886, 0.918),          // #dce2ea
  soft: rgb(0.961, 0.969, 0.980),          // #f5f7fa
  softer: rgb(0.984, 0.988, 0.992),
  accent: rgb(0.776, 0.643, 0.404),        // #c6a467
  accentDark: rgb(0.545, 0.420, 0.196),    // #8b6b32
  accentSoft: rgb(0.973, 0.957, 0.918),
  white: rgb(1, 1, 1),
  green: rgb(0.310, 0.463, 0.373),
};

function cleanText(input: string) {
  return (input || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u2022/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u02C6\u02DC\u201A\u201E\u2020\u2021\u2030\u2039\u203A\u20AC\u2122]/g, "");
}

function safeFileName(value: string) {
  const cleaned = (value || "PPA")
    .replace(/[^a-z0-9\-_ ]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return cleaned || "PPA";
}

function addBodyPage(ctx: PdfCtx) {
  ctx.page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
  ctx.bodyPage = true;
  ctx.y = PAGE_H - TOP;
  ctx.page.drawRectangle({ x: 0, y: PAGE_H - 7, width: PAGE_W, height: 7, color: C.navy });
  ctx.page.drawRectangle({ x: MARGIN_X, y: PAGE_H - 43, width: 24, height: 2.4, color: C.accent });
  ctx.page.drawText("PREMIUM POSITIONING ARCHITECT", {
    x: MARGIN_X + 34,
    y: PAGE_H - 47,
    size: 8.5,
    font: ctx.bold,
    color: C.navy,
  });
}

function ensureSpace(ctx: PdfCtx, needed: number) {
  if (ctx.y - needed < BOTTOM) addBodyPage(ctx);
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const clean = cleanText(text).trim();
  if (!clean) return [""];
  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(trial, size) <= maxWidth) {
      line = trial;
      continue;
    }
    if (line) lines.push(line);
    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      line = word;
    } else {
      let chunk = "";
      for (const ch of word) {
        const next = chunk + ch;
        if (font.widthOfTextAtSize(next, size) > maxWidth && chunk) {
          lines.push(chunk);
          chunk = ch;
        } else chunk = next;
      }
      line = chunk;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function textHeight(text: string, font: PDFFont, size: number, width: number, lineGap = 4) {
  const paragraphs = cleanText(text).split(/\n{2,}/).map((x) => x.trim()).filter(Boolean);
  let h = 0;
  for (const p of paragraphs) h += wrapText(p, font, size, width).length * (size + lineGap) + 7;
  return h;
}

function drawLines(ctx: PdfCtx, lines: string[], opts?: { font?: PDFFont; size?: number; x?: number; color?: RGB; lineGap?: number }) {
  const font = opts?.font || ctx.regular;
  const size = opts?.size || 10.5;
  const x = opts?.x ?? MARGIN_X;
  const color = opts?.color || C.body;
  const lineGap = opts?.lineGap ?? 4;
  const lineHeight = size + lineGap;
  for (const line of lines) {
    ensureSpace(ctx, lineHeight + 2);
    ctx.page.drawText(line || " ", { x, y: ctx.y - size, size, font, color });
    ctx.y -= lineHeight;
  }
}

function drawParagraph(ctx: PdfCtx, text: string, opts?: { font?: PDFFont; size?: number; x?: number; width?: number; after?: number; color?: RGB; lineGap?: number }) {
  const font = opts?.font || ctx.regular;
  const size = opts?.size || 10.5;
  const x = opts?.x ?? MARGIN_X;
  const width = opts?.width ?? CONTENT_W;
  const paragraphs = cleanText(text).split(/\n{2,}/).map((x) => x.trim()).filter(Boolean);
  for (const p of paragraphs) {
    const lines = wrapText(p, font, size, width);
    drawLines(ctx, lines, { font, size, x, color: opts?.color, lineGap: opts?.lineGap });
    ctx.y -= opts?.after ?? 7;
  }
}

function drawSectionHeader(ctx: PdfCtx, number: string, title: string) {
  ensureSpace(ctx, 62);
  ctx.y -= 13;
  ctx.page.drawText(number, { x: MARGIN_X, y: ctx.y - 10, size: 9.5, font: ctx.bold, color: C.accentDark });
  const titleLines = wrapText(title, ctx.bold, 17.5, CONTENT_W - 44);
  let ty = ctx.y;
  for (const line of titleLines) {
    ctx.page.drawText(line, { x: MARGIN_X + 44, y: ty - 17.5, size: 17.5, font: ctx.bold, color: C.navy });
    ty -= 21;
  }
  ctx.y = ty - 9;
  ctx.page.drawLine({ start: { x: MARGIN_X, y: ctx.y }, end: { x: PAGE_W - MARGIN_X, y: ctx.y }, thickness: 0.8, color: C.line });
  ctx.y -= 17;
}

function drawSubheading(ctx: PdfCtx, text: string) {
  ensureSpace(ctx, 36);
  ctx.y -= 4;
  const lines = wrapText(text, ctx.bold, 11.5, CONTENT_W);
  drawLines(ctx, lines, { font: ctx.bold, size: 11.5, color: C.navy, lineGap: 3 });
  ctx.y -= 5;
}

function drawBullet(ctx: PdfCtx, text: string, color: RGB = C.body) {
  const fontSize = 10.1;
  const indent = 17;
  const lines = wrapText(cleanText(text), ctx.regular, fontSize, CONTENT_W - indent);
  ensureSpace(ctx, Math.max(22, lines.length * 13.1 + 5));
  ctx.page.drawCircle({ x: MARGIN_X + 4.5, y: ctx.y - 7.2, size: 2.2, color: C.accent });
  drawLines(ctx, lines, { font: ctx.regular, size: fontSize, x: MARGIN_X + indent, color, lineGap: 3 });
  ctx.y -= 3;
}

function drawInfoCard(ctx: PdfCtx, title: string, rows: Array<{ label: string; value: string }>) {
  const innerW = CONTENT_W - 32;
  let height = 42;
  for (const row of rows) {
    height += textHeight(row.value || "-", ctx.regular, 9.6, innerW - 118, 3) + 2;
  }
  height = Math.max(height, 96);
  ensureSpace(ctx, height + 14);
  const topY = ctx.y;
  ctx.page.drawRectangle({ x: MARGIN_X, y: topY - height, width: CONTENT_W, height, color: C.softer, borderColor: C.line, borderWidth: 0.8 });
  ctx.page.drawRectangle({ x: MARGIN_X, y: topY - height, width: 4, height, color: C.accent });
  ctx.page.drawText(cleanText(title), { x: MARGIN_X + 18, y: topY - 24, size: 12.2, font: ctx.bold, color: C.navy });
  let y = topY - 43;
  for (const row of rows) {
    ctx.page.drawText(cleanText(row.label).toUpperCase(), { x: MARGIN_X + 18, y, size: 7.8, font: ctx.bold, color: C.muted });
    const lines = wrapText(row.value || "-", ctx.regular, 9.6, innerW - 118);
    let ly = y + 1;
    for (const line of lines) {
      ctx.page.drawText(line, { x: MARGIN_X + 122, y: ly, size: 9.6, font: ctx.regular, color: C.body });
      ly -= 12.6;
    }
    y = Math.min(y - 24, ly - 8);
  }
  ctx.y = topY - height - 13;
}

function drawStatementBox(ctx: PdfCtx, text: string) {
  const width = CONTENT_W;
  const lines = wrapText(text, ctx.bold, 13.2, width - 46);
  const height = 54 + lines.length * 17;
  ensureSpace(ctx, height + 10);
  const topY = ctx.y;
  ctx.page.drawRectangle({ x: MARGIN_X, y: topY - height, width, height, color: C.accentSoft });
  ctx.page.drawRectangle({ x: MARGIN_X, y: topY - height, width: 5, height, color: C.accent });
  ctx.page.drawText("POSITIONING STATEMENT", { x: MARGIN_X + 20, y: topY - 22, size: 8, font: ctx.bold, color: C.accentDark });
  let y = topY - 44;
  for (const line of lines) {
    ctx.page.drawText(line, { x: MARGIN_X + 20, y, size: 13.2, font: ctx.bold, color: C.navy });
    y -= 17;
  }
  ctx.y = topY - height - 14;
}

function drawQuote(ctx: PdfCtx, label: string, content: string, kind: string) {
  const lines = wrapText(content, ctx.italic, 10.7, CONTENT_W - 40);
  const height = 48 + lines.length * 14;
  ensureSpace(ctx, height + 10);
  const topY = ctx.y;
  ctx.page.drawRectangle({ x: MARGIN_X, y: topY - height, width: CONTENT_W, height, color: C.soft });
  ctx.page.drawText(`"`, { x: MARGIN_X + 16, y: topY - 35, size: 30, font: ctx.bold, color: C.accent });
  ctx.page.drawText(`${cleanText(label).toUpperCase()}  |  ${cleanText(kind).toUpperCase()}`, { x: MARGIN_X + 42, y: topY - 20, size: 7.5, font: ctx.bold, color: C.muted });
  let y = topY - 40;
  for (const line of lines) {
    ctx.page.drawText(line, { x: MARGIN_X + 42, y, size: 10.7, font: ctx.italic, color: C.body });
    y -= 14;
  }
  ctx.y = topY - height - 10;
}

function drawPriority(ctx: PdfCtx, index: number, p: Priority) {
  const width = CONTENT_W;
  const focusLines = wrapText(p.focus, ctx.regular, 10.2, width - 70);
  const whyLines = wrapText(p.whyItMatters, ctx.italic, 9.7, width - 70);
  const height = 62 + focusLines.length * 13.2 + whyLines.length * 12.8;
  ensureSpace(ctx, height + 10);
  const topY = ctx.y;
  ctx.page.drawRectangle({ x: MARGIN_X, y: topY - height, width, height, color: C.softer, borderColor: C.line, borderWidth: 0.8 });
  ctx.page.drawCircle({ x: MARGIN_X + 28, y: topY - 31, size: 15, color: C.white, borderColor: C.accent, borderWidth: 1.2 });
  ctx.page.drawText(String(index), { x: MARGIN_X + 24.8, y: topY - 35.5, size: 10.5, font: ctx.bold, color: C.accentDark });
  ctx.page.drawText(cleanText(p.title), { x: MARGIN_X + 55, y: topY - 27, size: 12, font: ctx.bold, color: C.navy });
  let y = topY - 49;
  for (const line of focusLines) {
    ctx.page.drawText(line, { x: MARGIN_X + 55, y, size: 10.2, font: ctx.regular, color: C.body });
    y -= 13.2;
  }
  y -= 4;
  ctx.page.drawText("WHY IT MATTERS", { x: MARGIN_X + 55, y, size: 7.4, font: ctx.bold, color: C.muted });
  y -= 14;
  for (const line of whyLines) {
    ctx.page.drawText(line, { x: MARGIN_X + 55, y, size: 9.7, font: ctx.italic, color: C.body });
    y -= 12.8;
  }
  ctx.y = topY - height - 12;
}

function drawTranscriptMessage(ctx: PdfCtx, message: TurnMessage) {
  const isUser = message.role === "user";
  const width = CONTENT_W;
  const innerW = width - 34;
  const lines = wrapText(message.content, ctx.regular, 9.7, innerW);
  const height = 42 + lines.length * 12.8;
  ensureSpace(ctx, height + 10);
  const topY = ctx.y;
  const fill = isUser ? C.accentSoft : C.softer;
  const border = isUser ? rgb(0.894, 0.847, 0.745) : C.line;
  ctx.page.drawRectangle({ x: MARGIN_X, y: topY - height, width, height, color: fill, borderColor: border, borderWidth: 0.8 });
  ctx.page.drawText(isUser ? "CLIENT" : "PPA", { x: MARGIN_X + 16, y: topY - 19, size: 7.6, font: ctx.bold, color: isUser ? C.accentDark : C.navy2 });
  let y = topY - 38;
  for (const line of lines) {
    ctx.page.drawText(line, { x: MARGIN_X + 16, y, size: 9.7, font: ctx.regular, color: C.body });
    y -= 12.8;
  }
  ctx.y = topY - height - 9;
}

function drawCover(ctx: PdfCtx, title: string, subtitle: string, transcript = false) {
  ctx.bodyPage = false;
  ctx.page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: C.navy });
  ctx.page.drawRectangle({ x: 0, y: 0, width: 14, height: PAGE_H, color: C.accent });

  // Simple brand tile matching the web app icon language.
  ctx.page.drawRectangle({ x: MARGIN_X, y: PAGE_H - 116, width: 42, height: 42, color: C.navy2, borderColor: rgb(0.28, 0.34, 0.43), borderWidth: 0.8 });
  ctx.page.drawText("P", { x: MARGIN_X + 12.5, y: PAGE_H - 103, size: 24, font: ctx.bold, color: C.white });
  ctx.page.drawCircle({ x: MARGIN_X + 37, y: PAGE_H - 80, size: 3.2, color: rgb(0.85, 0.87, 0.91) });

  ctx.page.drawText("PREMIUM POSITIONING ARCHITECT", { x: MARGIN_X + 56, y: PAGE_H - 90, size: 10.2, font: ctx.bold, color: C.accent });
  ctx.page.drawText("Strategic Visibility LLC", { x: MARGIN_X + 56, y: PAGE_H - 107, size: 9.3, font: ctx.regular, color: rgb(0.78, 0.82, 0.87) });

  const eyebrow = transcript ? "FULL ASSESSMENT + BLUEPRINT" : "STRATEGIC POSITIONING BLUEPRINT";
  ctx.page.drawText(eyebrow, { x: MARGIN_X, y: PAGE_H - 205, size: 9.2, font: ctx.bold, color: C.accent });

  const titleLines = wrapText(title || "Strategic Positioning Blueprint", ctx.bold, 27, CONTENT_W);
  let y = PAGE_H - 245;
  for (const line of titleLines) {
    ctx.page.drawText(line, { x: MARGIN_X, y, size: 27, font: ctx.bold, color: C.white });
    y -= 34;
  }
  const subLines = wrapText(subtitle, ctx.regular, 11, CONTENT_W - 40);
  y -= 5;
  for (const line of subLines) {
    ctx.page.drawText(line, { x: MARGIN_X, y, size: 11, font: ctx.regular, color: rgb(0.79, 0.83, 0.88) });
    y -= 16;
  }

  ctx.page.drawRectangle({ x: MARGIN_X, y: 98, width: 94, height: 2.5, color: C.accent });
  ctx.page.drawText("POSITIONING CLARITY", { x: MARGIN_X, y: 78, size: 8, font: ctx.bold, color: C.accent });
  ctx.page.drawText("Built from client discovery, proof, buyer psychology, and market context.", { x: MARGIN_X, y: 58, size: 8.8, font: ctx.regular, color: rgb(0.73, 0.78, 0.84) });

  addBodyPage(ctx);
}

function drawBlueprint(ctx: PdfCtx, blueprint: Blueprint) {
  drawSectionHeader(ctx, "01", "Executive Positioning Summary");
  drawParagraph(ctx, blueprint.executivePositioningSummary, { size: 10.7, color: C.body, lineGap: 4.5 });

  drawSectionHeader(ctx, "02", "Business Identity");
  drawParagraph(ctx, blueprint.businessIdentity, { size: 10.7, lineGap: 4.5 });

  drawSectionHeader(ctx, "03", "Ideal Customer");
  drawParagraph(ctx, blueprint.idealCustomer, { size: 10.7, lineGap: 4.5 });

  drawSectionHeader(ctx, "04", "Why Customers Choose You");
  drawParagraph(ctx, blueprint.whyCustomersChooseYou, { size: 10.7, lineGap: 4.5 });

  drawSectionHeader(ctx, "05", "Core Differentiators");
  for (const d of blueprint.coreDifferentiators || []) {
    drawInfoCard(ctx, d.title, [
      { label: "Difference", value: d.difference },
      { label: "Buyer value", value: d.buyerRelevance },
      { label: "Proof", value: d.reasonToBelieve },
    ]);
  }

  drawSectionHeader(ctx, "06", "Market Position & Positioning Statement");
  drawParagraph(ctx, blueprint.marketPosition, { size: 10.7, lineGap: 4.5 });
  if (blueprint.positioningStatement) drawStatementBox(ctx, blueprint.positioningStatement);

  if (blueprint.competitiveContextSnapshot?.length) {
    drawSubheading(ctx, "Competitive Context Snapshot");
    for (const c of blueprint.competitiveContextSnapshot) {
      drawInfoCard(ctx, c.competitor, [
        { label: "Positioning", value: c.theirPositioning },
        { label: "Strengths", value: c.apparentStrengths },
        { label: "Weaknesses", value: c.apparentWeaknesses },
        { label: "Opportunity", value: c.clientOpportunity },
      ]);
    }
  }

  if (blueprint.marketResearchSignals?.length) {
    drawSubheading(ctx, "Market Research Signals");
    for (const x of blueprint.marketResearchSignals) drawBullet(ctx, x);
    ctx.y -= 5;
  }

  drawSectionHeader(ctx, "07", "Voice of Customer Highlights");
  for (const v of blueprint.voiceOfCustomerHighlights || []) drawQuote(ctx, v.label, v.content, v.kind);

  drawSectionHeader(ctx, "08", "Trust & Proof Snapshot");
  for (const x of blueprint.trustAndProofSnapshot || []) drawBullet(ctx, x);

  drawSectionHeader(ctx, "09", "Three Strategic Priorities");
  for (let i = 0; i < (blueprint.strategicPriorities || []).length; i++) drawPriority(ctx, i + 1, blueprint.strategicPriorities[i]);

  if (blueprint.openQuestions?.length) {
    drawSubheading(ctx, "Open Questions / Information Gaps");
    for (const x of blueprint.openQuestions) drawBullet(ctx, x, C.muted);
  }

  drawSubheading(ctx, "What this Blueprint is for");
  drawParagraph(ctx, blueprint.nextStep, { size: 10.2, color: C.muted, lineGap: 4 });
}

function addFooters(ctx: PdfCtx) {
  const pages = ctx.pdf.getPages();
  const total = pages.length;
  pages.forEach((page, i) => {
    if (i === 0) return;
    page.drawLine({ start: { x: MARGIN_X, y: 38 }, end: { x: PAGE_W - MARGIN_X, y: 38 }, thickness: 0.6, color: C.line });
    page.drawText("Strategic Visibility LLC  |  Premium Positioning Architect", { x: MARGIN_X, y: 23, size: 7.3, font: ctx.regular, color: C.muted });
    const num = `${i + 1} / ${total}`;
    const w = ctx.regular.widthOfTextAtSize(num, 7.3);
    page.drawText(num, { x: PAGE_W - MARGIN_X - w, y: 23, size: 7.3, font: ctx.regular, color: C.muted });
  });
}

async function createPdf(body: ExportBody) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const firstPage = pdf.addPage([PAGE_W, PAGE_H]);
  const ctx: PdfCtx = { pdf, page: firstPage, regular, bold, italic, y: PAGE_H - TOP, bodyPage: false };

  pdf.setCreator("Strategic Visibility LLC");
  pdf.setProducer("Premium Positioning Architect");
  pdf.setTitle(cleanText(body.blueprint.title || "Strategic Positioning Blueprint"));
  pdf.setSubject("Strategic Positioning Blueprint generated through the Premium Positioning Architect");

  if (body.includeTranscript) {
    drawCover(ctx, body.blueprint.title || "Full PPA Assessment", "Complete assessment conversation, research notes, and Strategic Positioning Blueprint.", true);
    drawSectionHeader(ctx, "A", "Full Assessment Conversation");
    drawParagraph(ctx, "The following appendix preserves the client's original answers and the PPA's reflections so Strategic Visibility can trace every positioning conclusion back to the discovery conversation.", { size: 9.8, color: C.muted, after: 12 });
    for (const message of body.messages || []) drawTranscriptMessage(ctx, message);

    const researchNotes = body.state?.facts?.sourceNotes || [];
    const researchFindings = body.state?.facts?.researchFindings || [];
    if (researchFindings.length || researchNotes.length) {
      drawSectionHeader(ctx, "B", "Research & Source Notes");
      for (const x of researchFindings) drawBullet(ctx, x);
      for (const x of researchNotes) drawBullet(ctx, x);
    }

    addBodyPage(ctx);
    drawSectionHeader(ctx, "", "Strategic Positioning Blueprint");
    drawBlueprint(ctx, body.blueprint);
  } else {
    drawCover(ctx, body.blueprint.title || "Strategic Positioning Blueprint", "A clear, evidence-grounded reference for how the business should be understood and positioned in its market.");
    drawBlueprint(ctx, body.blueprint);
  }

  addFooters(ctx);
  return pdf.save();
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
