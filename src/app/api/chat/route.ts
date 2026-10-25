import { NextRequest, NextResponse } from "next/server";
import { getDocument } from "@/lib/documents";
import { chunkText, getOpenAI } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

function rankChunk(chunk: string, query: string) {
  const terms = query.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 3);
  const lower = chunk.toLowerCase();
  return terms.reduce((score, term) => score + (lower.includes(term) ? 1 : 0), 0);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const documentId = String(body.documentId || "");
    const question = String(body.question || "").trim().slice(0, 1500);
    if (!question) return NextResponse.json({ error: "Enter a question." }, { status: 400 });
    const document = getDocument(documentId);
    if (!document) return NextResponse.json({ error: "This document session expired. Upload the PDF again." }, { status: 404 });

    const chunks = chunkText(document.text, 2400);
    const context = chunks.map((text, index) => ({ text, index, score: rankChunk(text, question) }))
      .sort((a, b) => b.score - a.score).slice(0, 5)
      .map(c => `[Source section ${c.index + 1}]\n${c.text}`).join("\n\n---\n\n").slice(0, 12000);

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: "You are PharmaMind, an AI tutor for undergraduate pharmacology and pharmacy students. Answer using the provided PDF excerpts as your primary and only factual source. If the excerpts do not contain the answer, say so clearly and ask the student to consult the relevant section or a trusted reference. Explain mechanisms and terminology clearly. Do not provide patient-specific diagnosis or treatment recommendations. Never fabricate a page number or citation. When possible, refer to the source section labels included in the context." },
        { role: "user", content: `PDF filename: ${document.filename}\n\nRELEVANT EXCERPTS:\n${context}\n\nSTUDENT QUESTION: ${question}` }
      ]
    });
    return NextResponse.json({ answer: completion.choices[0]?.message?.content || "I couldn't generate an answer from this document." });
  } catch (error) {
    console.error("Tutor error", error);
    const message = error instanceof Error && error.message.includes("OPENAI_API_KEY") ? error.message : "The tutor could not respond. Check your API key and usage limits.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
