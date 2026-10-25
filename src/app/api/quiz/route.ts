import { NextRequest, NextResponse } from "next/server";
import { getDocument } from "@/lib/documents";
import { chunkText, getOpenAI } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const documentId = String(body.documentId || "");
    const count = Math.max(5, Math.min(20, Number(body.count) || 10));
    const difficulty = ["Mixed", "Foundational", "Intermediate", "Advanced"].includes(body.difficulty) ? body.difficulty : "Mixed";
    const document = getDocument(documentId);
    if (!document) return NextResponse.json({ error: "This document session expired. Upload the PDF again." }, { status: 404 });

    const chunks = chunkText(document.text, 5000);
    const selected = chunks.length <= 4 ? chunks : [chunks[0], chunks[Math.floor(chunks.length / 2)], chunks[chunks.length - 1]];
    const source = selected.join("\n\n--- EXTRACTED PDF SECTION ---\n\n").slice(0, 18000);
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are PharmaMind, a careful pharmacology educator. Generate assessment questions only from the provided document. Do not invent facts or use outside medical knowledge to fill gaps. If the document does not support enough questions, make fewer high-quality questions. Return JSON with key questions, an array of objects with question (string), options (exactly 4 strings), answerIndex (integer 0-3), explanation (string grounded in the text), and sourceQuote (short exact quote from the provided source). Ensure exactly one best answer, plausible distractors, and no unsafe patient-specific advice." },
        { role: "user", content: `Create up to ${count} multiple-choice questions at ${difficulty} difficulty from this pharmacology document. Use clear undergraduate-level language. Source filename: ${document.filename}\n\nDOCUMENT TEXT:\n${source}` }
      ]
    });
    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    const questions = Array.isArray(parsed.questions) ? parsed.questions.filter((q: any) =>
      typeof q.question === "string" && Array.isArray(q.options) && q.options.length === 4 &&
      Number.isInteger(q.answerIndex) && q.answerIndex >= 0 && q.answerIndex < 4 &&
      typeof q.explanation === "string"
    ).slice(0, count) : [];
    if (!questions.length) return NextResponse.json({ error: "The AI could not create reliable questions from this document. Try a longer or clearer PDF." }, { status: 422 });
    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Quiz generation error", error);
    const message = error instanceof Error && error.message.includes("OPENAI_API_KEY") ? error.message : "Quiz generation failed. Check your API key, usage limits, and try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
