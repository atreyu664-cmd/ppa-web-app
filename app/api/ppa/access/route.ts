import { NextResponse } from "next/server";
import { checkAccessCode } from "@/lib/auth";

export async function GET() {
  return NextResponse.json({ required: Boolean(process.env.PPA_ACCESS_CODE) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { accessCode?: string };
    if (!checkAccessCode(body.accessCode)) {
      return NextResponse.json({ valid: false, error: "Invalid assessment access code." }, { status: 401 });
    }
    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json({ valid: false, error: "Unable to verify the access code." }, { status: 400 });
  }
}
