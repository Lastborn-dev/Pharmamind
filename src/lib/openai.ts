import OpenAI from "openai";

export function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is missing. Add it to .env.local and restart the app.");
  return new OpenAI({ apiKey: key });
}

export function chunkText(text: string, maxChars = 5000) {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += maxChars) chunks.push(text.slice(i, i + maxChars));
  return chunks;
}
