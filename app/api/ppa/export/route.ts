import { NextResponse } from "next/server";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
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

function textParagraphs(text: string) {
  return (text || "")
    .split(/\n{2,}/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => new Paragraph({ children: [new TextRun(x)], spacing: { after: 160 } }));
}

function heading(text: string, level: typeof HeadingLevel.HEADING_1 | typeof HeadingLevel.HEADING_2 | typeof HeadingLevel.HEADING_3 = HeadingLevel.HEADING_2) {
  return new Paragraph({ text, heading: level, spacing: { before: 260, after: 120 } });
}

function bullet(text: string) {
  return new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 80 } });
}

function labelValue(label: string, value: string) {
  return new Paragraph({
    children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun(value || "—")],
    spacing: { after: 100 },
  });
}

function blueprintChildren(blueprint: Blueprint) {
  const out: Paragraph[] = [];
  out.push(new Paragraph({
    children: [new TextRun({ text: "Strategic Positioning Blueprint™", bold: true, size: 34 })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 160 },
  }));
  out.push(new Paragraph({
    children: [new TextRun({ text: blueprint.title, bold: true, size: 28 })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
  }));
  out.push(new Paragraph({
    children: [new TextRun({ text: "Prepared through the Premium Positioning Architect™", italics: true })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 320 },
  }));

  const proseSection = (n: string, title: string, body: string) => {
    out.push(heading(`${n}. ${title}`));
    out.push(...textParagraphs(body));
  };

  proseSection("01", "Executive Positioning Summary", blueprint.executivePositioningSummary);
  proseSection("02", "Business Identity", blueprint.businessIdentity);
  proseSection("03", "Ideal Customer", blueprint.idealCustomer);
  proseSection("04", "Why Customers Choose You", blueprint.whyCustomersChooseYou);

  out.push(heading("05. Core Differentiators"));
  for (const d of blueprint.coreDifferentiators || []) {
    out.push(heading(d.title, HeadingLevel.HEADING_3));
    out.push(labelValue("Difference", d.difference));
    out.push(labelValue("Why it matters", d.buyerRelevance));
    out.push(labelValue("Reason to believe", d.reasonToBelieve));
  }

  out.push(heading("06. Market Position & Positioning Statement"));
  out.push(...textParagraphs(blueprint.marketPosition));
  out.push(heading("Positioning Statement", HeadingLevel.HEADING_3));
  out.push(...textParagraphs(blueprint.positioningStatement));

  if (blueprint.competitiveContextSnapshot?.length) {
    out.push(heading("Competitive Context Snapshot", HeadingLevel.HEADING_3));
    for (const c of blueprint.competitiveContextSnapshot) {
      out.push(new Paragraph({ children: [new TextRun({ text: c.competitor, bold: true })], spacing: { before: 140, after: 80 } }));
      out.push(labelValue("Positioning", c.theirPositioning));
      out.push(labelValue("Visible strengths", c.apparentStrengths));
      out.push(labelValue("Visible weaknesses", c.apparentWeaknesses));
      out.push(labelValue("Client opportunity", c.clientOpportunity));
    }
  }

  if (blueprint.marketResearchSignals?.length) {
    out.push(heading("Market Research Signals", HeadingLevel.HEADING_3));
    for (const x of blueprint.marketResearchSignals) out.push(bullet(x));
  }

  out.push(heading("07. Voice of Customer Highlights"));
  for (const v of blueprint.voiceOfCustomerHighlights || []) {
    out.push(new Paragraph({
      children: [new TextRun({ text: `${v.label} (${v.kind})`, bold: true }), new TextRun({ text: ` — ${v.content}` })],
      spacing: { after: 100 },
    }));
  }

  out.push(heading("08. Trust & Proof Snapshot"));
  for (const x of blueprint.trustAndProofSnapshot || []) out.push(bullet(x));

  out.push(heading("09. Three Strategic Priorities"));
  for (let i = 0; i < (blueprint.strategicPriorities || []).length; i++) {
    const p = blueprint.strategicPriorities[i];
    out.push(heading(`${i + 1}. ${p.title}`, HeadingLevel.HEADING_3));
    out.push(...textParagraphs(p.focus));
    out.push(new Paragraph({ children: [new TextRun({ text: `Why it matters: ${p.whyItMatters}`, italics: true })], spacing: { after: 120 } }));
  }

  if (blueprint.openQuestions?.length) {
    out.push(heading("Open Questions / Information Gaps"));
    for (const x of blueprint.openQuestions) out.push(bullet(x));
  }

  out.push(heading("What this Blueprint is for"));
  out.push(...textParagraphs(blueprint.nextStep));
  return out;
}

function safeFileName(value: string) {
  const cleaned = (value || "PPA")
    .replace(/[^a-z0-9\-_ ]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return cleaned || "PPA";
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as ExportBody;
    if (!checkAccessCode(body.accessCode)) {
      return NextResponse.json({ error: "Invalid assessment access code." }, { status: 401 });
    }
    if (!body.blueprint) return NextResponse.json({ error: "Blueprint data is missing." }, { status: 400 });

    const children: Paragraph[] = [];

    if (body.includeTranscript) {
      children.push(new Paragraph({
        children: [new TextRun({ text: "Premium Positioning Architect™", bold: true, size: 34 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }));
      children.push(new Paragraph({
        children: [new TextRun({ text: "Full Assessment Conversation + Strategic Positioning Blueprint", bold: true, size: 26 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      }));
      children.push(new Paragraph({ children: [new TextRun({ text: `Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, italics: true })], alignment: AlignmentType.CENTER, spacing: { after: 260 } }));
      children.push(heading("Full Assessment Conversation", HeadingLevel.HEADING_1));
      for (const message of body.messages || []) {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: message.role === "assistant" ? "PPA" : "Client", bold: true }),
            new TextRun({ text: `\n${message.content}` }),
          ],
          spacing: { after: 180 },
        }));
      }

      const researchNotes = body.state?.facts?.sourceNotes || [];
      const researchFindings = body.state?.facts?.researchFindings || [];
      if (researchFindings.length || researchNotes.length) {
        children.push(heading("Research & Source Notes", HeadingLevel.HEADING_1));
        for (const x of researchFindings) children.push(bullet(x));
        for (const x of researchNotes) children.push(bullet(x));
      }

      children.push(new Paragraph({ children: [new TextRun({ text: "Strategic Positioning Blueprint™", bold: true })], pageBreakBefore: true }));
    }

    children.push(...blueprintChildren(body.blueprint));

    const doc = new Document({
      creator: "Strategic Visibility LLC",
      title: body.includeTranscript ? `${body.blueprint.title} — Full PPA Assessment` : body.blueprint.title,
      description: "Generated through the Premium Positioning Architect™",
      sections: [{ properties: {}, children }],
    });

    const buffer = await Packer.toBuffer(doc);
    const base = safeFileName(body.blueprint.title || body.state?.facts?.companyName || "PPA");
    const filename = body.includeTranscript ? `${base}-Full-Assessment-and-Blueprint.docx` : `${base}-Strategic-Positioning-Blueprint.docx`;

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("PPA export error", error);
    return NextResponse.json({ error: "We couldn't create the download. Please try again." }, { status: 500 });
  }
}
