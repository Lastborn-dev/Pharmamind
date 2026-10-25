
import { NextRequest, NextResponse } from "next/server";
import { chunkText, getOpenAI } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const documentId = String(body.documentId || "");
    const documentText = String(body.documentText || "").trim();
    const filename = String(body.filename || "uploaded PDF");
    const count = Math.max(5, Math.min(20, Number(body.count) || 10));
    const difficulty = ["Mixed", "Foundational", "Intermediate", "Advanced"].includes(body.difficulty)
      ? body.difficulty
      : "Mixed";

    if (!documentId || documentText.length < 80) {
      return NextResponse.json(
        { error: "PDF text is missing. Upload your PDF again, then generate the quiz." },
        { status: 400 }
      );
    }

    const chunks = chunkText(documentText, 5000);
    const selected = chunks.length <= 4
      ? chunks
      : [chunks[0], chunks[Math.floor(chunks.length / 2)], chunks[chunks.length - 1]];

    const source = selected
      .join("\n\n--- EXTRACTED PDF SECTION ---\n\n")
      .slice(0, 18000);

    const openai = getOpenAI();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are PharmaMind, a careful pharmacology educator. Generate questions only from the provided document. Return JSON with key questions, an array of objects containing question, options (exactly 4 strings), answerIndex (integer 0-3), explanation, and sourceQuote. Ensure one best answer and plausible distractors. Do not invent facts or give patient-specific advice."
        },
        {
          role: "user",
          content: `Create up to ${count} multiple-choice questions at ${difficulty} difficulty from this pharmacology document. Use undergraduate-level language. Source filename: ${filename}\n\nDOCUMENT TEXT:\n${source}`
        }
      ]
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    const questions = Array.isArray(parsed.questions)
      ? parsed.questions.filter((q: any) =>
          typeof q.question === "string" &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          Number.isInteger(q.answerIndex) &&
          q.answerIndex >= 0 &&
          q.answerIndex < 4 &&
          typeof q.explanation === "string"
        ).slice(0, count)
      : [];

    if (!questions.length) {
      return NextResponse.json(
        { error: "The AI could not create reliable questions from this PDF. Try a clearer or longer document." },
        { status: 422 }
      );
    }

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Quiz generation error", error);
    const message = error instanceof Error && error.message.includes("OPENAI_API_KEY")
      ? error.message
      : "Quiz generation failed. Check your OpenAI API key, usage limits, and try again.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
