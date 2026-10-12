import { NextResponse } from "next/server";
import { checkAccessCode } from "@/lib/auth";
import { createPdf, safeFileName, type ExportBody } from "@/lib/pdfExport";

export const runtime = "nodejs";
export const maxDuration = 60;

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
