export type StoredDocument = {
  id: string;
  filename: string;
  text: string;
  pages: number;
  createdAt: number;
};

// Demo MVP store: documents live in server memory and are cleared on restart.
// Replace with per-user object storage + database before production.
const globalForDocs = globalThis as unknown as { pharmaMindDocs?: Map<string, StoredDocument> };
const docs = globalForDocs.pharmaMindDocs ?? new Map<string, StoredDocument>();
globalForDocs.pharmaMindDocs = docs;

export function saveDocument(document: StoredDocument) { docs.set(document.id, document); }
export function getDocument(id: string) { return docs.get(id); }
