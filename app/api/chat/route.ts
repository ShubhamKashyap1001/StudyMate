// import { NextRequest, NextResponse } from "next/server"
// import { getServerSession } from "next-auth"
// import { authOptions } from "@/lib/auth"
// import { connectToDatabase } from "@/lib/mongodb"
// import Document from "@/models/Document"
// import { GoogleGenerativeAI } from "@google/generative-ai"

// export const runtime = "nodejs"

// // Helper: robustly parse JSON possibly wrapped in fences
// function safeParseJSON(text: string) {
//   try {
//     const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
//     const candidate = fenced ? fenced[1] : text
//     const first = candidate.indexOf("{")
//     const last = candidate.lastIndexOf("}")
//     const toParse = first !== -1 && last !== -1 ? candidate.substring(first, last + 1) : candidate
//     return JSON.parse(toParse)
//   } catch {
//     return null
//   }
// }

// export async function POST(req: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions)
//     if (!session?.user?.id) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
//     }

//     const { message, documentIds } = await req.json()
//     if (!message || typeof message !== "string") {
//       return NextResponse.json({ error: "Message is required" }, { status: 400 })
//     }

//     const apiKey = process.env.GEMINI_API_KEY
//     if (!apiKey) {
//       return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 })
//     }

//     await connectToDatabase()

//     // Fetch user's documents (completed). If specific doc IDs provided, filter to those.
//     const query: any = { userId: session.user.id, status: "completed" }
//     if (Array.isArray(documentIds) && documentIds.length > 0) {
//       query._id = { $in: documentIds }
//     }

//     const docs = await Document.find(query).sort({ uploadDate: -1 }).lean()

//     if (!docs || docs.length === 0) {
//       // Still answer without context
//       const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: "gemini-1.5-flash" })
//       const prompt = `You are StudyMate's assistant. Answer briefly and clearly.\nQuestion: ${message}\nReturn JSON: {"answer": string, "citations": []}`
//       const res = await model.generateContent(prompt)
//       const text = res.response.text()
//       const parsed = safeParseJSON(text) || { answer: text, citations: [] }
//       return NextResponse.json({ answer: parsed.answer || text, citations: parsed.citations || [] })
//     }

//     // Build context from extractedText (truncate to stay within limits)
//     const MAX_PER_DOC = 18000 // chars
//     const contextItems = [] as { name: string; text: string }[]
//     for (const d of docs) {
//       const raw = (d as any).extractedText as string | undefined
//       if (!raw || raw.trim().length === 0) continue
//       const txt = raw.length > MAX_PER_DOC ? raw.substring(0, MAX_PER_DOC) + "... [truncated]" : raw
//       contextItems.push({ name: d.name, text: txt })
//       if (contextItems.length >= 5) break // cap number of docs to keep prompt small
//     }

//     const contextText = contextItems
//       .map((it, idx) => `Document ${idx + 1}: ${it.name}\n${it.text}`)
//       .join("\n\n---\n\n")

//     const system = `You are StudyMate, an academic assistant.\n- Answer the user's question using only the provided document context when relevant.\n- If unsure, say you are unsure rather than hallucinating.\n- Provide a helpful, structured answer with bullets and short paragraphs.\n- Also return up to 3 citations with document name and a short supporting snippet.`

//     const schema = `Return ONLY JSON, no extra text, with this shape:\n{\n  "answer": "string",
//   "citations": [
//     { "documentName": "string", "pageNumber": 0, "snippet": "string" }
//   ]
// }`

//     const prompt = `${system}\n\nContext:\n${contextText || "(no context)"}\n\nUser question: ${message}\n\n${schema}`

//     const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: "gemini-1.5-flash" })
//     const result = await model.generateContent(prompt)
//     const text = result.response.text()
//     const parsed = safeParseJSON(text)

//     let answer = text
//     let citations: any[] = []
//     if (parsed && typeof parsed === "object") {
//       answer = parsed.answer || text
//       if (Array.isArray(parsed.citations)) citations = parsed.citations.slice(0, 3)
//     }

//     // Basic citation normalization (pageNumber optional)
//     citations = citations.map((c) => ({
//       documentName: String(c.documentName || ""),
//       pageNumber: typeof c.pageNumber === "number" ? c.pageNumber : 0,
//       snippet: String(c.snippet || "")
//     })).filter(c => c.documentName || c.snippet)

//     return NextResponse.json({ answer, citations })
//   } catch (err) {
//     console.error("Chat error:", err)
//     return NextResponse.json({ error: "Failed to generate answer" }, { status: 500 })
//   }
// }



import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Document from "@/models/Document";

export const runtime = "nodejs";

// Helper: parse JSON even if model sends Markdown / backticks
function safeParseJSON(text: string) {
  try {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const candidate = fenced ? fenced[1] : text;
    const first = candidate.indexOf("{");
    const last = candidate.lastIndexOf("}");
    const toParse =
      first !== -1 && last !== -1
        ? candidate.substring(first, last + 1)
        : candidate;
    return JSON.parse(toParse);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // --------------------------
    // 1. AUTH CHECK
    // --------------------------
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, documentIds } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY" },
        { status: 500 }
      );
    }

    // --------------------------
    // 2. DB FETCH DOCUMENTS
    // --------------------------
    await connectToDatabase();

    const query: any = { userId: session.user.id, status: "completed" };
    if (Array.isArray(documentIds) && documentIds.length > 0) {
      query._id = { $in: documentIds };
    }

    const docs = await Document.find(query)
      .sort({ uploadDate: -1 })
      .lean();

    // If no docs found → answer normally
    if (!docs || docs.length === 0) {
      const prompt = `
You are StudyMate. Answer briefly and clearly.

Question: ${message}

Return JSON only:
{
  "answer": "string",
  "citations": []
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          }),
        }
      );

      const json = await res.json();
      const text =
        json.candidates?.[0]?.content?.parts?.[0]?.text || "No answer.";

      const parsed = safeParseJSON(text) || {
        answer: text,
        citations: [],
      };

      return NextResponse.json(parsed);
    }

    // --------------------------
    // 3. BUILD CONTEXT
    // --------------------------
    const MAX_PER_DOC = 18000;
    const contextItems: { name: string; text: string }[] = [];

    for (const d of docs) {
      const raw = d.extractedText || "";
      if (!raw.trim()) continue;

      const txt =
        raw.length > MAX_PER_DOC
          ? raw.substring(0, MAX_PER_DOC) + "... [truncated]"
          : raw;

      contextItems.push({ name: d.name, text: txt });

      if (contextItems.length >= 5) break;
    }

    const contextText = contextItems
      .map(
        (it, idx) =>
          `Document ${idx + 1}: ${it.name}\n${it.text}`
      )
      .join("\n\n---\n\n");

    // --------------------------
    // 4. FINAL PROMPT
    // --------------------------
    const system = `
You are StudyMate, an academic PDF-assistant.
- Use ONLY the provided document text.
- If unsure, say you are unsure.
- Return up to 3 citations.
`;

    const schema = `
Return ONLY JSON:
{
  "answer": "string",
  "citations": [
    { "documentName": "string", "pageNumber": 0, "snippet": "string" }
  ]
}
`;

    const prompt = `${system}

Context:
${contextText || "(no context)"}

User question:
${message}

${schema}
`;

    // --------------------------
    // 5. CALL GEMINI USING FETCH
    // --------------------------
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();
    const rawText =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const parsed = safeParseJSON(rawText);

    let answer = parsed?.answer || rawText;
    let citations = parsed?.citations || [];

    // Normalize citations
    citations = citations
      .map((c: any) => ({
        documentName: String(c.documentName || ""),
        pageNumber:
          typeof c.pageNumber === "number" ? c.pageNumber : 0,
        snippet: String(c.snippet || ""),
      }))
      .filter((c: any) => c.documentName || c.snippet)
      .slice(0, 3);

    return NextResponse.json({ answer, citations });
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json(
      { error: "Failed to generate answer" },
      { status: 500 }
    );
  }
}
