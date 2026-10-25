 "use client";

import { useMemo, useState } from "react";

type Question = { question: string; options: string[]; answerIndex: number; explanation: string; sourceQuote?: string };
type UploadData = { documentId: string; filename: string; pages: number; characters: number };
type ChatMessage = { role: "user" | "assistant"; content: string };

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [document, setDocument] = useState<UploadData | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState("Mixed");
  const [quiz, setQuiz] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi! Upload a pharmacology PDF and ask me to explain a mechanism, compare drug classes, or clarify a difficult concept from your notes." }
  ]);

  const score = useMemo(() => quiz.reduce((sum, q, i) => sum + (answers[i] === q.answerIndex ? 1 : 0), 0), [quiz, answers]);

  async function uploadPdf() {
    if (!file) return;
    setBusy(true); setNotice(""); setQuiz([]); setAnswers({}); setSubmitted(false);
    try {
      const body = new FormData(); body.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");
      setDocument(data); setNotice("PDF processed. Your study space is ready.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Something went wrong."); }
    finally { setBusy(false); }
  }

  async function generateQuiz() {
    if (!document) { setNotice("Upload a PDF first so questions can be grounded in your notes."); return; }
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/quiz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: document.documentId, count, difficulty }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not generate quiz");
      setQuiz(data.questions); setAnswers({}); setSubmitted(false); setNotice("Quiz generated from your uploaded material.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Something went wrong."); }
    finally { setBusy(false); }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const question = chatInput.trim();
    if (!question) return;
    if (!document) { setNotice("Upload a PDF first to use the document-grounded tutor."); return; }
    setMessages(prev => [...prev, { role: "user", content: question }]); setChatInput(""); setBusy(true);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: document.documentId, question }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Tutor request failed");
      setMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", content: error instanceof Error ? error.message : "Something went wrong." }]);
    } finally { setBusy(false); }
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">P</div><div><strong>PharmaMind</strong><span>AI STUDY LAB</span></div></div>
      <div className="side-label">WORKSPACE</div>
      <a className="nav-item active" href="#library"><span>▤</span> Study library</a>
      <a className="nav-item" href="#quiz"><span>☷</span> Quiz generator</a>
      <a className="nav-item" href="#tutor"><span>✳</span> AI tutor</a>
      <div className="sidebar-bottom"><div className="mini-orb">✦</div><strong>Built for future clinicians</strong><p>Learn the why behind every drug.</p><span className="version">EARLY ACCESS · MVP</span></div>
    </aside>

    <section className="main-area">
      <header className="topbar"><div><div className="eyebrow">YOUR PERSONAL STUDY WORKSPACE</div><h1>Understand drugs. <span>Master pharmacology.</span></h1></div><div className="avatar">PM</div></header>
      <div className="welcome"><div><div className="pill"><span className="pulse"></span> AI LEARNING ENVIRONMENT</div><h2>Your next breakthrough<br/>starts with <em>one document.</em></h2><p>Upload your lecture notes. PharmaMind turns dense pharmacology content into active recall, clear explanations, and focused practice.</p></div><div className="hero-art"><div className="orbit orbit-one"></div><div className="orbit orbit-two"></div><div className="molecule">✳</div><div className="floating-card card-a">MOA <b>↗</b></div><div className="floating-card card-b">ADME <b>✦</b></div><div className="floating-card card-c">DRUG CLASS <b>+</b></div></div></div>
      {notice && <div className="notice" role="status">{notice}</div>}
      <div className="section-heading" id="library"><div><span className="eyebrow">STEP 01</span><h3>Build your study library</h3><p>Start with a PDF from your pharmacology course.</p></div><span className="section-icon">↥</span></div>
      <div className="upload-panel">
        <div className="upload-icon">⇧</div><h4>Drop your knowledge in here</h4><p>PDF lecture notes, slides, or textbook chapters</p>
        <label className="file-picker">{file ? file.name : "Choose PDF"}<input type="file" accept="application/pdf,.pdf" onChange={e => setFile(e.target.files?.[0] || null)} /></label>
        <button className="button-primary" onClick={uploadPdf} disabled={!file || busy}>{busy ? "Working…" : "Upload & analyse"} <span>↗</span></button>
        <small>PDF only · Max 12 MB · Text-based PDFs work best</small>
      </div>
      {document && <div className="document-chip"><div className="pdf-icon">PDF</div><div className="doc-meta"><strong>{document.filename}</strong><span>{document.pages} pages · {document.characters.toLocaleString()} characters extracted</span></div><span className="ready">● READY</span></div>}

      <div className="section-heading" id="quiz"><div><span className="eyebrow">STEP 02</span><h3>Turn notes into knowledge</h3><p>Generate practice questions with useful explanations.</p></div><span className="section-icon">✧</span></div>
      <div className="quiz-controls">
        <div className="control"><label>QUESTION COUNT</label><select value={count} onChange={e => setCount(Number(e.target.value))}><option value={5}>5 questions</option><option value={10}>10 questions</option><option value={15}>15 questions</option><option value={20}>20 questions</option></select></div>
        <div className="control"><label>DIFFICULTY</label><select value={difficulty} onChange={e => setDifficulty(e.target.value)}><option>Mixed</option><option>Foundational</option><option>Intermediate</option><option>Advanced</option></select></div>
        <button className="button-primary generate" onClick={generateQuiz} disabled={busy || !document}>{busy ? "Generating…" : "Generate quiz"} <span>✦</span></button>
      </div>
      {quiz.length > 0 && <div className="quiz-list"><div className="quiz-top"><div><span className="eyebrow">PRACTICE SESSION</span><h3>Knowledge check</h3></div>{submitted && <div className="score">{score}/{quiz.length} correct</div>}</div>
        {quiz.map((q, i) => <article className="question-card" key={i}><div className="question-label">QUESTION {String(i+1).padStart(2,"0")}</div><h4>{q.question}</h4><div className="options">{q.options.map((option, j) => <button key={j} className={`option ${answers[i] === j ? "selected" : ""} ${submitted && j === q.answerIndex ? "correct" : ""} ${submitted && answers[i] === j && j !== q.answerIndex ? "incorrect" : ""}`} onClick={() => !submitted && setAnswers(prev => ({...prev, [i]: j}))}><span className="option-letter">{String.fromCharCode(65+j)}</span>{option}</button>)}</div>
          {submitted && <div className="explanation"><strong>{answers[i] === q.answerIndex ? "Correct." : "Explanation"}</strong> {q.explanation}{q.sourceQuote && <blockquote>From your notes: “{q.sourceQuote}”</blockquote>}</div>}
        </article>)}
        {!submitted ? <button className="button-primary" onClick={() => setSubmitted(true)}>Check answers <span>✓</span></button> : <button className="button-secondary" onClick={() => {setAnswers({});setSubmitted(false)}}>Try again</button>}
      </div>}

      <div className="section-heading" id="tutor"><div><span className="eyebrow">STEP 03</span><h3>Ask your AI tutor</h3><p>Explore the material, one question at a time.</p></div><span className="section-icon">✳</span></div>
      <div className="tutor-panel"><div className="tutor-head"><div className="tutor-avatar">✳</div><div><strong>PharmaMind Tutor</strong><span><i></i> Grounded in your uploaded PDF</span></div><div className="tutor-tag">DOCUMENT AI</div></div>
        <div className="chat-messages">{messages.map((m, i) => <div key={i} className={`message ${m.role}`}><div className="message-icon">{m.role === "assistant" ? "✳" : "You"}</div><div>{m.content}</div></div>)}</div>
        <form className="chat-form" onSubmit={sendMessage}><input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder={document ? "Ask about a mechanism, drug class, adverse effect…" : "Upload a PDF to start asking questions…"} disabled={!document || busy}/><button type="submit" disabled={!document || busy || !chatInput.trim()}>↑</button></form>
        <div className="chat-foot">Educational use only · Verify critical information against trusted references.</div>
      </div>
      <footer>PHARMAMIND <span>·</span> BUILT FOR DEEPER UNDERSTANDING <span className="footer-right">LEARN WITH INTENTION ✦</span></footer>
    </section>
  </main>;
}
