import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Summary from "@/models/Summary";
import Document from "@/models/Document";
import { generateSummaryFromPDF, generateCrossDocumentSummary, extractTextFromPDF } from "@/lib/gemini";
import { readFile } from "fs/promises";
import { join } from "path";

// Generate summary for a single document
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to database
    await connectToDatabase();

    const { documentId, length = "detailed", focus, type = "document" } = await request.json();

    if (!documentId) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 });
    }

    // Verify document belongs to user
    const document = await Document.findOne({
      _id: documentId,
      userId: session.user.id,
      status: "completed"
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Check if summary already exists for this document
    const existingSummary = await Summary.findOne({
      documentId: documentId,
      userId: session.user.id,
      type: type,
      isActive: true
    });

    if (existingSummary && type === "document") {
      return NextResponse.json({
        success: true,
        summary: existingSummary,
        message: "Summary already exists for this document"
      });
    }

    // Prefer pre-extracted text stored on the document; fallback to reading and extracting
    let pdfContent: string | undefined = document.extractedText;
    if (!pdfContent || pdfContent.trim().length === 0) {
      // Read PDF file from disk and extract text as a fallback
      const pdfPath = join(process.cwd(), "public", document.filePath);
      console.log("No stored extractedText; reading PDF from:", pdfPath);

      try {
        const pdfBuffer = await readFile(pdfPath);
        pdfContent = await extractTextFromPDF(pdfBuffer as unknown as Buffer);
        console.log("Fallback extraction succeeded; length:", pdfContent.length);
      } catch (fallbackErr) {
        console.error("Fallback extraction failed:", fallbackErr);
        return NextResponse.json({ error: `Failed to extract text from PDF: ${(fallbackErr as Error)?.message || 'unknown error'}` }, { status: 500 });
      }
    }

    // Generate summary using Gemini
    let summaryData;
    try {
      console.log("Calling Gemini API for summary generation...");
      // Truncate to reduce token pressure on the model
      const MAX_SINGLE_LEN = 50000;
      const contentForAI = pdfContent.length > MAX_SINGLE_LEN
        ? pdfContent.substring(0, MAX_SINGLE_LEN) + "... [Content truncated]"
        : pdfContent;
      summaryData = await generateSummaryFromPDF(
        contentForAI,
        document.name,
        { length, focus }
      );
      console.log("Gemini API call successful");
    } catch (geminiError) {
      console.error("Error calling Gemini API:", geminiError);
      return NextResponse.json({ error: `Failed to generate summary with AI: ${(geminiError as Error)?.message || 'unknown error'}` }, { status: 500 });
    }

    // Save summary to database
    const summary = new Summary({
      title: summaryData.title,
      content: summaryData.content,
      documentId: document._id,
      userId: session.user.id,
      type: type,
      length: length,
      wordCount: summaryData.wordCount,
      readTime: summaryData.readTime,
      generatedAt: new Date(),
      isActive: true,
    });

    await summary.save();

    return NextResponse.json({
      success: true,
      summary: {
        _id: summary._id,
        title: summary.title,
        content: summary.content,
        type: summary.type,
        length: summary.length,
        wordCount: summary.wordCount,
        readTime: summary.readTime,
        generatedAt: summary.generatedAt,
      },
    });

  } catch (error) {
    console.error("Generate summary error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}

// Generate cross-document summary
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to database
    await connectToDatabase();

    const { documentIds, length = "detailed", focus } = await request.json();

    if (!documentIds || documentIds.length < 2) {
      return NextResponse.json({ error: "At least 2 documents required for cross-document analysis" }, { status: 400 });
    }

    // Verify documents belong to user
    const documents = await Document.find({
      _id: { $in: documentIds },
      userId: session.user.id,
      status: "completed"
    });

    if (documents.length !== documentIds.length) {
      return NextResponse.json({ error: "Some documents not found" }, { status: 404 });
    }

    // Extract content from all documents, prefer stored extractedText
    const documentsWithContent = [] as Array<{ name: string; content: string }>;
    for (const doc of documents) {
      let content = doc.extractedText as string | undefined;
      if (!content || content.trim().length === 0) {
        const pdfPath = join(process.cwd(), "public", doc.filePath);
        try {
          const pdfBuffer = await readFile(pdfPath);
          content = await extractTextFromPDF(pdfBuffer as unknown as Buffer);
        } catch (err) {
          console.error("Failed to extract content for cross-document summary:", err);
          content = "";
        }
      }
      // Truncate per-document content for cross-doc summaries
      const MAX_CROSS_LEN = 20000;
      const contentForAI = (content || "");
      const trimmed = contentForAI.length > MAX_CROSS_LEN
        ? contentForAI.substring(0, MAX_CROSS_LEN) + "... [Content truncated]"
        : contentForAI;
      documentsWithContent.push({
        name: doc.name,
        content: trimmed,
      });
    }

    // Generate cross-document summary using Gemini
    let summaryData;
    try {
      summaryData = await generateCrossDocumentSummary(
        documentsWithContent,
        { length, focus }
      );
    } catch (geminiErr) {
      console.error("Error calling Gemini API (cross-doc):", geminiErr);
      return NextResponse.json({ error: `Failed to generate cross-document summary with AI: ${(geminiErr as Error)?.message || 'unknown error'}` }, { status: 500 });
    }

    // Save summary to database
    const summary = new Summary({
      title: summaryData.title,
      content: summaryData.content,
      documentId: documentIds[0], // Use first document as primary reference
      userId: session.user.id,
      type: "cross-document",
      length: length,
      wordCount: summaryData.wordCount,
      readTime: summaryData.readTime,
      generatedAt: new Date(),
      isActive: true,
      relatedDocumentIds: documentIds,
    });

    await summary.save();

    return NextResponse.json({
      success: true,
      summary: {
        _id: summary._id,
        title: summary.title,
        content: summary.content,
        type: summary.type,
        length: summary.length,
        wordCount: summary.wordCount,
        readTime: summary.readTime,
        generatedAt: summary.generatedAt,
      },
    });

  } catch (error) {
    console.error("Generate cross-document summary error:", error);
    return NextResponse.json(
      { error: "Failed to generate cross-document summary" },
      { status: 500 }
    );
  }
}

// Get summaries for a user
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to database
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");
    const type = searchParams.get("type");

    let query: any = {
      userId: session.user.id,
      isActive: true
    };

    if (documentId) {
      query.documentId = documentId;
    }

    if (type) {
      query.type = type;
    }

    const summaries = await Summary.find(query)
      .sort({ generatedAt: -1 })
      .lean();

    return NextResponse.json({ summaries });

  } catch (error) {
    console.error("Get summaries error:", error);
    return NextResponse.json(
      { error: "Failed to fetch summaries" },
      { status: 500 }
    );
  }
}

// Delete summary
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to database
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const summaryId = searchParams.get("id");

    if (!summaryId) {
      return NextResponse.json({ error: "Summary ID required" }, { status: 400 });
    }

    // Soft delete summary
    const summary = await Summary.findOneAndUpdate(
      {
        _id: summaryId,
        userId: session.user.id
      },
      { isActive: false },
      { new: true }
    );

    if (!summary) {
      return NextResponse.json({ error: "Summary not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Delete summary error:", error);
    return NextResponse.json(
      { error: "Failed to delete summary" },
      { status: 500 }
    );
  }
}
