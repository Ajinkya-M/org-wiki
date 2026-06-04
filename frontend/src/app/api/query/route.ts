import { NextRequest, NextResponse } from "next/server";
import { fetchQuery } from "@/lib/api-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question } = body;

    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json({ error: "Question cannot be empty." }, { status: 400 });
    }

    const backend = await fetchQuery(JSON.stringify(body));
    const data = await backend.json();

    if (!backend.ok) {
      return NextResponse.json(
        { error: data.detail || data.error || "Backend request failed" },
        { status: backend.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Backend error: ${message}` },
      { status: 502 }
    );
  }
}
