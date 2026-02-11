import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Flashcard from "@/models/Flashcard";
import Document from "@/models/Document";
import { extractTextFromPDF, generateFlashcardsFromText } from "@/lib/gemini";
import { readFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";

// Generate flashcards from a document
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to database
    await connectToDatabase();

    const { documentId, count = 10 } = await request.json();
    const n = Number(count);
    const safeCount = Number.isFinite(n) ? Math.min(Math.max(Math.floor(n), 3), 30) : 10;

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

    // Check if flashcards already exist for this document
    const existingFlashcards = await Flashcard.find({
      documentId: documentId,
      userId: session.user.id,
      isActive: true
    });

    if (existingFlashcards.length > 0) {
      return NextResponse.json({
        success: true,
        flashcards: existingFlashcards,
        message: "Flashcards already exist for this document"
      });
    }

    // Get content: prefer stored extracted text; fallback to reading the PDF and extracting
    let content: string | undefined = (document as any).extractedText;
    if (!content || content.trim().length === 0) {
      if (!document.filePath) {
        return NextResponse.json({ error: "Document file path not found" }, { status: 400 });
      }
      
      const pdfPath = join(process.cwd(), "public", document.filePath);
      try {
        const pdfBuffer = await readFile(pdfPath);
        content = await extractTextFromPDF(pdfBuffer as unknown as Buffer);
        
        // Update document with extracted text for future use
        await Document.findByIdAndUpdate(documentId, {
          extractedText: content
        });
      } catch (err) {
        console.error("Failed to read/extract PDF for flashcards:", err);
        return NextResponse.json({ error: `Failed to extract text from PDF: ${(err as Error)?.message || 'unknown error'}` }, { status: 500 });
      }
    }

    // Truncate content to control token usage
    const MAX_LEN = 40000;
    const contentForAI = content.length > MAX_LEN
      ? content.substring(0, MAX_LEN) + "... [Content truncated]"
      : content;

    // Generate flashcards with Gemini
    let aiFlashcards;
    try {
      aiFlashcards = await generateFlashcardsFromText(contentForAI, document.name, safeCount);
      
      if (!aiFlashcards || aiFlashcards.length === 0) {
        return NextResponse.json({ error: "AI generated no flashcards. Please try again or check your document content." }, { status: 500 });
      }
    } catch (aiErr) {
      console.error("Gemini flashcard generation error:", aiErr);
      const errorMessage = (aiErr as Error)?.message || 'unknown error';
      
      if (errorMessage.includes("GEMINI_API_KEY")) {
        return NextResponse.json({ error: "AI service not configured. Please contact administrator." }, { status: 503 });
      }
      
      return NextResponse.json({ error: `Failed to generate flashcards with AI: ${errorMessage}` }, { status: 500 });
    }

    // Map to DB schema with validation
    const toInsert = aiFlashcards
      .filter((fc: any) => fc.question && fc.answer && fc.question.trim() && fc.answer.trim())
      .map((fc: any) => ({
        question: fc.question.trim(),
        answer: fc.answer.trim(),
        difficulty: ["easy", "medium", "hard"].includes(fc.difficulty) ? fc.difficulty : "medium",
        documentId: String(document._id),
        userId: session.user.id,
        source: document.name,
        reviewCount: 0,
        isActive: true,
      }));
    
    if (toInsert.length === 0) {
      return NextResponse.json({ error: "No valid flashcards could be generated from the document content." }, { status: 400 });
    }

    // Save flashcards to database
    let savedFlashcards;
    try {
      savedFlashcards = await Flashcard.insertMany(toInsert);
    } catch (dbErr) {
      console.error("Database error saving flashcards:", dbErr);
      return NextResponse.json({ error: "Failed to save flashcards to database" }, { status: 500 });
    }

    // Update document's flashcard count
    try {
      await Document.findByIdAndUpdate(documentId, {
        flashcardsCount: savedFlashcards.length
      });
    } catch (updateErr) {
      console.error("Error updating document flashcard count:", updateErr);
      // Don't fail the request for this, just log the error
    }

    return NextResponse.json({
      success: true,
      flashcards: savedFlashcards,
      count: savedFlashcards.length
    });

  } catch (error) {
    console.error("Generate flashcards error:", error);
    return NextResponse.json(
      { error: "Failed to generate flashcards" },
      { status: 500 }
    );
  }
}

// Get flashcards for a user
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
    const deckId = searchParams.get("deckId");
    const studyMode = searchParams.get("studyMode") === "true";

    let query: any = {
      userId: session.user.id,
      isActive: true
    };

    if (documentId) {
      query.documentId = documentId;
    }

    if (deckId) {
      query.deckId = deckId;
    }

    // For study mode, prioritize cards that need review
    if (studyMode) {
      query.$or = [
        { nextReview: { $lte: new Date() } },
        { reviewCount: 0 },
        { nextReview: { $exists: false } }
      ];
    }

    const flashcards = await Flashcard.find(query)
      .sort({ nextReview: 1, createdAt: 1 })
      .lean();

    return NextResponse.json({ flashcards });

  } catch (error) {
    console.error("Get flashcards error:", error);
    return NextResponse.json(
      { error: "Failed to fetch flashcards" },
      { status: 500 }
    );
  }
}

// Update flashcard (for ratings, edits)
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to database
    await connectToDatabase();

    const { flashcardId, question, answer, difficulty, rating } = await request.json();

    if (!flashcardId) {
      return NextResponse.json({ error: "Flashcard ID required" }, { status: 400 });
    }

    // Verify flashcard belongs to user
    const flashcard = await Flashcard.findOne({
      _id: flashcardId,
      userId: session.user.id
    });

    if (!flashcard) {
      return NextResponse.json({ error: "Flashcard not found" }, { status: 404 });
    }

    // Update flashcard
    const updateData: any = {};
    
    if (question !== undefined) updateData.question = question;
    if (answer !== undefined) updateData.answer = answer;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    
    if (rating) {
      updateData.rating = rating;
      updateData.lastReviewed = new Date();
      updateData.reviewCount = flashcard.reviewCount + 1;
      
      // Calculate next review date based on rating
      updateData.nextReview = calculateNextReview(rating, flashcard.reviewCount);
    }

    const updatedFlashcard = await Flashcard.findByIdAndUpdate(
      flashcardId,
      updateData,
      { new: true }
    );

    return NextResponse.json({
      success: true,
      flashcard: updatedFlashcard
    });

  } catch (error) {
    console.error("Update flashcard error:", error);
    return NextResponse.json(
      { error: "Failed to update flashcard" },
      { status: 500 }
    );
  }
}

// Delete flashcard
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
    const flashcardId = searchParams.get("id");

    if (!flashcardId) {
      return NextResponse.json({ error: "Flashcard ID required" }, { status: 400 });
    }

    // Soft delete flashcard
    const flashcard = await Flashcard.findOneAndUpdate(
      {
        _id: flashcardId,
        userId: session.user.id
      },
      { isActive: false },
      { new: true }
    );

    if (!flashcard) {
      return NextResponse.json({ error: "Flashcard not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Delete flashcard error:", error);
    return NextResponse.json(
      { error: "Failed to delete flashcard" },
      { status: 500 }
    );
  }
}

// Removed simulated generator in favor of Gemini-backed generation

// Helper function to calculate next review date
function calculateNextReview(rating: string, reviewCount: number): Date {
  const now = new Date();
  let daysToAdd = 1;

  switch (rating) {
    case "again":
      daysToAdd = 1; // Review again tomorrow
      break;
    case "hard":
      daysToAdd = 2; // Review in 2 days
      break;
    case "medium":
      daysToAdd = 4; // Review in 4 days
      break;
    case "easy":
      daysToAdd = 7; // Review in a week
      break;
  }

  // Increase interval for cards that have been reviewed multiple times
  if (reviewCount > 5) {
    daysToAdd *= 2;
  }

  return new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
}

