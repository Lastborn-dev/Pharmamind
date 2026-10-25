import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import pdf from "pdf-parse";
import { saveDocument } from "@/lib/documents";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a PDF file first." }, { status: 400 });
    if (file.size > 12 * 1024 * 1024) return NextResponse.json({ error: "PDFs must be 12 MB or smaller for this MVP." }, { status: 413 });
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported." }, { status: 415 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await pdf(buffer);
    const text = String(parsed.text || "").trim();
    if (text.length < 80) return NextResponse.json({ error: "Very little text was extracted. This may be a scanned PDF; try a text-based PDF. OCR support is not included yet." }, { status: 422 });
    const id = randomUUID();
    saveDocument({ id, filename: file.name, text, pages: parsed.numpages || 1, createdAt: Date.now() });
    return NextResponse.json({ documentId: id, filename: file.name, pages: parsed.numpages || 1, characters: text.length });
  } catch (error) {
    console.error("PDF upload error", error);
    return NextResponse.json({ error: "Could not process this PDF. Try another file." }, { status: 500 });
  }
}
