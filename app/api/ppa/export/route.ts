import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
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
};

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN_X = 54;
const TOP = 54;
const BOTTOM = 54;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

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

function newPage(ctx: PdfCtx) {
  ctx.page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
  ctx.y = PAGE_H - TOP;
}

function ensureSpace(ctx: PdfCtx, needed: number) {
  if (ctx.y - needed < BOTTOM) newPage(ctx);
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

function drawLines(ctx: PdfCtx, lines: string[], opts?: { font?: PDFFont; size?: number; indent?: number; color?: ReturnType<typeof rgb>; lineGap?: number }) {
  const font = opts?.font || ctx.regular;
  const size = opts?.size || 10.5;
  const indent = opts?.indent || 0;
  const color = opts?.color || rgb(0.12, 0.15, 0.2);
  const lineGap = opts?.lineGap ?? 4;
  const lineHeight = size + lineGap;
  for (const line of lines) {
    ensureSpace(ctx, lineHeight + 2);
    ctx.page.drawText(line || " ", { x: MARGIN_X + indent, y: ctx.y - size, size, font, color });
    ctx.y -= lineHeight;
  }
}

function drawParagraph(ctx: PdfCtx, text: string, opts?: { font?: PDFFont; size?: number; indent?: number; after?: number; color?: ReturnType<typeof rgb> }) {
  const font = opts?.font || ctx.regular;
  const size = opts?.size || 10.5;
  const indent = opts?.indent || 0;
  const paragraphs = cleanText(text).split(/\n{2,}/).map((x) => x.trim()).filter(Boolean);
  for (const p of paragraphs) {
    const lines = wrapText(p, font, size, CONTENT_W - indent);
    drawLines(ctx, lines, { font, size, indent, color: opts?.color });
    ctx.y -= opts?.after ?? 7;
  }
}

function drawHeading(ctx: PdfCtx, text: string, level = 2) {
  const size = level === 1 ? 18 : level === 2 ? 14 : 11.5;
  const before = level === 1 ? 12 : 10;
  const after = level === 1 ? 10 : 6;
  ensureSpace(ctx, size + before + after + 8);
  ctx.y -= before;
  const lines = wrapText(text, ctx.bold, size, CONTENT_W);
  drawLines(ctx, lines, { font: ctx.bold, size, color: rgb(0.05, 0.15, 0.26), lineGap: 3 });
  ctx.y -= after;
}

function drawBullet(ctx: PdfCtx, text: string) {
  const fontSize = 10.2;
  const indent = 14;
  const lines = wrapText(cleanText(text), ctx.regular, fontSize, CONTENT_W - indent);
  ensureSpace(ctx, fontSize + 6);
  ctx.page.drawText("-", { x: MARGIN_X + 2, y: ctx.y - fontSize, size: fontSize, font: ctx.bold, color: rgb(0.12, 0.15, 0.2) });
  drawLines(ctx, lines, { font: ctx.regular, size: fontSize, indent, lineGap: 3 });
  ctx.y -= 3;
}

function drawLabelValue(ctx: PdfCtx, label: string, value: string) {
  drawParagraph(ctx, `${label}: ${value || "-"}`, { size: 10.2, after: 4 });
}

function drawCover(ctx: PdfCtx, title: string, subtitle: string) {
  const accent = rgb(0.62, 0.43, 0.16);
  ctx.page.drawRectangle({ x: 0, y: PAGE_H - 12, width: PAGE_W, height: 12, color: accent });
  const top = PAGE_H - 145;
  ctx.page.drawText("PREMIUM POSITIONING ARCHITECT", { x: MARGIN_X, y: top, size: 10, font: ctx.bold, color: accent });
  const titleLines = wrapText(cleanText(title), ctx.bold, 24, CONTENT_W);
  let y = top - 36;
  for (const line of titleLines) {
    ctx.page.drawText(line, { x: MARGIN_X, y, size: 24, font: ctx.bold, color: rgb(0.05, 0.15, 0.26) });
    y -= 31;
  }
  ctx.page.drawText(cleanText(subtitle), { x: MARGIN_X, y: y - 10, size: 11, font: ctx.italic, color: rgb(0.35, 0.39, 0.45) });
  ctx.page.drawText("Strategic Visibility LLC", { x: MARGIN_X, y: 88, size: 10, font: ctx.bold, color: rgb(0.12, 0.15, 0.2) });
  ctx.y = BOTTOM;
  newPage(ctx);
}

function drawBlueprint(ctx: PdfCtx, blueprint: Blueprint) {
  drawHeading(ctx, "01. Executive Positioning Summary", 1);
  drawParagraph(ctx, blueprint.executivePositioningSummary);
  drawHeading(ctx, "02. Business Identity", 1);
  drawParagraph(ctx, blueprint.businessIdentity);
  drawHeading(ctx, "03. Ideal Customer", 1);
  drawParagraph(ctx, blueprint.idealCustomer);
  drawHeading(ctx, "04. Why Customers Choose You", 1);
  drawParagraph(ctx, blueprint.whyCustomersChooseYou);

  drawHeading(ctx, "05. Core Differentiators", 1);
  for (const d of blueprint.coreDifferentiators || []) {
    drawHeading(ctx, d.title, 2);
    drawLabelValue(ctx, "Difference", d.difference);
    drawLabelValue(ctx, "Why it matters", d.buyerRelevance);
    drawLabelValue(ctx, "Reason to believe", d.reasonToBelieve);
    ctx.y -= 4;
  }

  drawHeading(ctx, "06. Market Position & Positioning Statement", 1);
  drawParagraph(ctx, blueprint.marketPosition);
  drawHeading(ctx, "Positioning Statement", 2);
  drawParagraph(ctx, blueprint.positioningStatement, { font: ctx.bold, size: 11, after: 10 });

  if (blueprint.competitiveContextSnapshot?.length) {
    drawHeading(ctx, "Competitive Context Snapshot", 2);
    for (const c of blueprint.competitiveContextSnapshot) {
      drawHeading(ctx, c.competitor, 3);
      drawLabelValue(ctx, "Positioning", c.theirPositioning);
      drawLabelValue(ctx, "Visible strengths", c.apparentStrengths);
      drawLabelValue(ctx, "Visible weaknesses", c.apparentWeaknesses);
      drawLabelValue(ctx, "Client opportunity", c.clientOpportunity);
    }
  }

  if (blueprint.marketResearchSignals?.length) {
    drawHeading(ctx, "Market Research Signals", 2);
    for (const x of blueprint.marketResearchSignals) drawBullet(ctx, x);
  }

  drawHeading(ctx, "07. Voice of Customer Highlights", 1);
  for (const v of blueprint.voiceOfCustomerHighlights || []) {
    drawHeading(ctx, `${v.label} (${v.kind})`, 3);
    drawParagraph(ctx, v.content, { size: 10.2, after: 5 });
  }

  drawHeading(ctx, "08. Trust & Proof Snapshot", 1);
  for (const x of blueprint.trustAndProofSnapshot || []) drawBullet(ctx, x);

  drawHeading(ctx, "09. Three Strategic Priorities", 1);
  for (let i = 0; i < (blueprint.strategicPriorities || []).length; i++) {
    const p = blueprint.strategicPriorities[i];
    drawHeading(ctx, `${i + 1}. ${p.title}`, 2);
    drawParagraph(ctx, p.focus, { after: 5 });
    drawParagraph(ctx, `Why it matters: ${p.whyItMatters}`, { font: ctx.italic, size: 10, after: 8 });
  }

  if (blueprint.openQuestions?.length) {
    drawHeading(ctx, "Open Questions / Information Gaps", 1);
    for (const x of blueprint.openQuestions) drawBullet(ctx, x);
  }

  drawHeading(ctx, "What this Blueprint is for", 1);
  drawParagraph(ctx, blueprint.nextStep);
}

async function createPdf(body: ExportBody) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const firstPage = pdf.addPage([PAGE_W, PAGE_H]);
  const ctx: PdfCtx = { pdf, page: firstPage, regular, bold, italic, y: PAGE_H - TOP };

  pdf.setCreator("Strategic Visibility LLC");
  pdf.setProducer("Premium Positioning Architect");
  pdf.setTitle(cleanText(body.blueprint.title || "Strategic Positioning Blueprint"));
  pdf.setSubject("Strategic Positioning Blueprint generated through the Premium Positioning Architect");

  if (body.includeTranscript) {
    drawCover(ctx, body.blueprint.title || "Full PPA Assessment", "Full Assessment Conversation + Strategic Positioning Blueprint");
    drawHeading(ctx, "Full Assessment Conversation", 1);
    for (const message of body.messages || []) {
      drawHeading(ctx, message.role === "assistant" ? "PPA" : "Client", 3);
      drawParagraph(ctx, message.content, { size: 10.1, after: 8 });
    }

    const researchNotes = body.state?.facts?.sourceNotes || [];
    const researchFindings = body.state?.facts?.researchFindings || [];
    if (researchFindings.length || researchNotes.length) {
      drawHeading(ctx, "Research & Source Notes", 1);
      for (const x of researchFindings) drawBullet(ctx, x);
      for (const x of researchNotes) drawBullet(ctx, x);
    }

    newPage(ctx);
    drawHeading(ctx, "Strategic Positioning Blueprint", 1);
    ctx.y -= 4;
    drawBlueprint(ctx, body.blueprint);
  } else {
    drawCover(ctx, body.blueprint.title || "Strategic Positioning Blueprint", "Strategic Positioning Blueprint");
    drawBlueprint(ctx, body.blueprint);
  }

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
