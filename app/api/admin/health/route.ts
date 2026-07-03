import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const ready = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
  return NextResponse.json({ ready }, { status: ready ? 200 : 503 });
}
