import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export function ensureEmbeddingsReady() {
  if (!apiKey || !genAI) {
    throw new Error("Missing GEMINI_API_KEY. Please add it to .env.local and restart the server.");
  }
}

// Basic sentence-aware chunking with overlap
export function chunkText(
  text: string,
  opts: { maxChars?: number; overlap?: number } = {}
): string[] {
  const maxChars = opts.maxChars ?? 1200; // conservative length per chunk
  const overlap = opts.overlap ?? 150;
  const cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    let end = Math.min(start + maxChars, cleaned.length);
    if (end < cleaned.length) {
      // try to cut at sentence boundary
      const period = cleaned.lastIndexOf(".", end - 1);
      if (period > start + maxChars * 0.6) end = period + 1;
    }
    const piece = cleaned.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end === cleaned.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
}

export async function embedText(input: string | string[]): Promise<number[] | number[][]> {
  ensureEmbeddingsReady();
  const model = genAI!.getGenerativeModel({ model: "text-embedding-004" });
  if (Array.isArray(input)) {
    const res = await model.embedContent({ content: input.map((t) => ({ role: "user", parts: [{ text: t }] })) as any });
    // The SDK returns a single embedding for embedContent; for batching, call individually
    // So we instead call sequentially for simplicity and stability
  }
  // Fallback simple: call per item
  if (Array.isArray(input)) {
    const out: number[][] = [];
    for (const t of input) {
      const r = await model.embedContent(t);
      out.push(r.embedding.values as unknown as number[]);
    }
    return out;
  } else {
    const r = await model.embedContent(input);
    return r.embedding.values as unknown as number[];
  }
}

export function cosineSim(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
  return dot / denom;
}
