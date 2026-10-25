# PharmaMind

A dark, AI-powered pharmacology study workspace. MVP features:
- PDF upload and text extraction
- AI-generated multiple-choice quizzes with answer explanations
- PDF-grounded tutor chat with source snippets from the uploaded document

## Requirements
- Node.js 20+
- OpenAI API key

## Run locally
1. Install Node.js.
2. Copy `.env.example` to `.env.local` and add your key:
   `OPENAI_API_KEY=...`
3. Install dependencies: `npm install`
4. Start the app: `npm run dev`
5. Visit `http://localhost:3000`

## MVP notes
- PDF text is processed in memory and is not persisted.
- Upload limit is 12 MB; scanned/image-only PDFs need OCR, which is not included yet.
- The tutor receives relevant text chunks from the current upload. It is an educational tool, not a source of patient-specific medical advice.
- Before public deployment, add authentication, persistent storage, per-user quotas, abuse protection, malware scanning, privacy terms, and server-side rate limits.
- Keep API keys on the server. Never expose `OPENAI_API_KEY` in client code.
