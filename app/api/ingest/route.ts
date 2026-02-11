import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Document from "@/models/Document";
import Chunk from "@/models/Chunk";
import { chunkText, embedText } from "@/lib/embeddings";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId, reindex } = await req.json();
    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }

    await connectToDatabase();

    // Load document and ensure it belongs to user
    const doc = await Document.findOne({ _id: documentId, userId: session.user.id, status: "completed" });
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const text = (doc.extractedText || "").trim();
    if (!text) {
      return NextResponse.json({ error: "No extracted text to ingest" }, { status: 400 });
    }

    // Optionally clear previous chunks
    if (reindex) {
      await Chunk.deleteMany({ userId: session.user.id, documentId });
    }

    const chunks = chunkText(text, { maxChars: 1200, overlap: 150 });
    if (chunks.length === 0) {
      return NextResponse.json({ error: "No chunks produced from text" }, { status: 400 });
    }

    // Embed chunks sequentially to avoid rate-limit complexity
    const created: string[] = [];
    let idx = 0;
    for (const c of chunks) {
      const emb = (await embedText(c)) as number[];
      const row = await Chunk.findOneAndUpdate(
        { userId: session.user.id, documentId, chunkIndex: idx },
        { $set: { content: c, embedding: emb, tokens: c.length } },
        { upsert: true, new: true }
      );
      created.push(row._id.toString());
      idx++;
    }

    return NextResponse.json({ success: true, chunks: created.length });
  } catch (err) {
    console.error("Ingestion error:", err);
    return NextResponse.json({ error: "Failed to ingest document" }, { status: 500 });
  }
}
