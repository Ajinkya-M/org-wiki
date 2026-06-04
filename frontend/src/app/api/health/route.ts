import { NextResponse } from "next/server";
import { fetchHealth } from "@/lib/api-client";

export async function GET() {
  try {
    const backend = await fetchHealth();
    const data = await backend.json();
    return NextResponse.json(data, { status: backend.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Backend not reachable: ${message}` },
      { status: 503 }
    );
  }
}
