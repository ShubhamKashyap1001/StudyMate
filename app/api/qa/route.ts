import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Document from "@/models/Document";
import Chunk from "@/models/Chunk";
import { embedText, cosineSim } from "@/lib/embeddings";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, documentIds, topK = 6 } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
    }

    await connectToDatabase();

    const baseDocQuery: any = { userId: session.user.id, status: "completed" };
    if (Array.isArray(documentIds) && documentIds.length > 0) {
      baseDocQuery._id = { $in: documentIds };
    }

    const docs = await Document.find(baseDocQuery).lean();
    if (!docs || docs.length === 0) {
      return NextResponse.json({ error: "No completed documents available" }, { status: 400 });
    }

    // Load chunks for these documents
    const docIds = docs.map((d: any) => String(d._id));
    const chunkQuery: any = { userId: session.user.id, documentId: { $in: docIds } };
    const chunks = await Chunk.find(chunkQuery).lean();

    // If no chunks exist yet, fallback to raw extractedText approach
    if (!chunks || chunks.length === 0) {
      const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: "gemini-1.5-flash" });
      const context = docs
        .slice(0, 5)
        .map((d: any, i: number) => `Document ${i + 1}: ${d.name}\n${(d.extractedText || '').slice(0, 18000)}`)
        .join("\n\n---\n\n");
      const system = `You are StudyMate, an academic assistant. Answer using only the provided context. If unsure, say so.`;
      const schema = `Return ONLY JSON with shape {\n  \"answer\": string,\n  \"citations\": [{ \"documentName\": string, \"snippet\": string }]\n}`;
      const prompt = `${system}\n\nContext:\n${context}\n\nQuestion: ${message}\n\n${schema}`;
      const res = await model.generateContent(prompt);
      const text = res.response.text();
      return NextResponse.json({ answer: text, citations: [] });
    }

    // Embed the query
    const qEmb = (await embedText(message)) as number[];

    // Score chunks
    const withScores = chunks.map((c: any) => ({
      ...c,
      score: cosineSim(qEmb, (c.embedding || []) as number[]),
    }));

    withScores.sort((a, b) => b.score - a.score);
    const top = withScores.slice(0, Math.max(1, Math.min(topK, 12)));

    // Build context and citations
    const docById = new Map(docs.map((d: any) => [String(d._id), d]));
    const contextText = top
      .map((t, i) => {
        const d = docById.get(String(t.documentId));
        return `Chunk ${i + 1} (doc: ${d?.name || t.documentId}):\n${t.content}`;
      })
      .join("\n\n---\n\n");

    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: "gemini-1.5-flash" });
    const system = `You are StudyMate, an academic assistant.\n- Use only the provided chunks to answer.\n- Be concise and structured.\n- Include up to 3 citations with document name and a short snippet.`;
    const schema = `Return ONLY JSON in this shape:\n{\n  \"answer\": \"string\",\n  \"citations\": [\n    { \"documentName\": \"string\", \"snippet\": \"string\" }\n  ]\n}`;
    const prompt = `${system}\n\nChunks:\n${contextText}\n\nQuestion: ${message}\n\n${schema}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Try to parse JSON
    let answer = "";
    let citations: Array<{ documentName: string; snippet: string }> = [];
    try {
      const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      const candidate = fenced ? fenced[1] : text;
      const first = candidate.indexOf("{");
      const last = candidate.lastIndexOf("}");
      const toParse = first !== -1 && last !== -1 ? candidate.substring(first, last + 1) : candidate;
      const parsed = JSON.parse(toParse);
      answer = parsed.answer || text;
      if (Array.isArray(parsed.citations)) {
        citations = parsed.citations.slice(0, 3).map((c: any) => ({
          documentName: String(c.documentName || ""),
          snippet: String(c.snippet || "")
        })).filter((c: any) => c.documentName || c.snippet);
      }
    } catch {
      answer = text;
    }

    // Fallback citations built from top chunks if LLM didn't provide
    if (citations.length === 0) {
      citations = top.slice(0, 3).map((t) => {
        const d = docById.get(String(t.documentId));
        const name = d?.name || String(t.documentId);
        const snippet = String(t.content || '').slice(0, 220);
        return { documentName: name, snippet };
      });
    }

    return NextResponse.json({ answer, citations });
  } catch (err) {
    console.error("QA error:", err);
    return NextResponse.json({ error: "Failed to answer question" }, { status: 500 });
  }
}
