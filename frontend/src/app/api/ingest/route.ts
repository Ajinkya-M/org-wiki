import { NextRequest, NextResponse } from "next/server";
import { fetchIngest } from "@/lib/api-client";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
    }

    const backend = await fetchIngest(formData);
    const data = await backend.json();
    return NextResponse.json(data, { status: backend.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Backend error: ${message}` },
      { status: 502 }
    );
  }
}
