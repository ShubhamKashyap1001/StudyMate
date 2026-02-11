import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Document from "@/models/Document";
import Summary from "@/models/Summary";
import Flashcard from "@/models/Flashcard";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log("Dashboard stats: No session or user ID");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Dashboard stats: User authenticated:", session.user.id);

    // Connect to database
    try {
      await connectToDatabase();
      console.log("Dashboard stats: Database connected successfully");
    } catch (dbError) {
      console.error("Dashboard stats: Database connection failed:", dbError);
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }

    const userId = session.user.id;

    // Get all user data in parallel for better performance
    console.log("Dashboard stats: Fetching data for user:", userId);
    const [documents, summaries, flashcards] = await Promise.all([
      Document.find({ userId }).lean(),
      Summary.find({ userId, isActive: true }).lean(),
      Flashcard.find({ userId, isActive: true }).lean(),
    ]);

    console.log("Dashboard stats: Data fetched -", {
      documents: documents.length,
      summaries: summaries.length,
      flashcards: flashcards.length
    });

    // Calculate document statistics
    const totalDocuments = documents.length;
    const completedDocuments = documents.filter(doc => doc.status === "completed").length;
    const processingDocuments = documents.filter(doc => doc.status === "processing").length;
    const errorDocuments = documents.filter(doc => doc.status === "error").length;
    const totalFileSize = documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0);

    // Calculate summary statistics
    const totalSummaries = summaries.length;
    const documentSummaries = summaries.filter(sum => sum.type === "document").length;
    const crossDocumentSummaries = summaries.filter(sum => sum.type === "cross-document").length;
    const totalReadTime = summaries.reduce((sum, sumData) => sum + (sumData.readTime || 0), 0);
    const totalWordCount = summaries.reduce((sum, sumData) => sum + (sumData.wordCount || 0), 0);

    // Calculate flashcard statistics
    const totalFlashcards = flashcards.length;
    const easyFlashcards = flashcards.filter(card => card.difficulty === "easy").length;
    const mediumFlashcards = flashcards.filter(card => card.difficulty === "medium").length;
    const hardFlashcards = flashcards.filter(card => card.difficulty === "hard").length;
    const reviewedFlashcards = flashcards.filter(card => card.reviewCount > 0).length;
    const newFlashcards = flashcards.filter(card => card.reviewCount === 0).length;

    // Calculate study performance
    const totalReviews = flashcards.reduce((sum, card) => sum + card.reviewCount, 0);
    const averageRating = flashcards.length > 0 
      ? flashcards.reduce((sum, card) => {
          const ratingValue = card.rating === "easy" ? 4 : 
                            card.rating === "medium" ? 3 : 
                            card.rating === "hard" ? 2 : 
                            card.rating === "again" ? 1 : 0;
          return sum + ratingValue;
        }, 0) / flashcards.length
      : 0;

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentDocuments = documents.filter(doc => 
      new Date(doc.uploadDate) >= sevenDaysAgo
    ).length;

    const recentSummaries = summaries.filter(sum => 
      new Date(sum.generatedAt) >= sevenDaysAgo
    ).length;

    const recentFlashcards = flashcards.filter(card => 
      new Date(card.createdAt || 0) >= sevenDaysAgo
    ).length;

    // Calculate learning streak (consecutive days with activity)
    const activityDates = new Set();
    
    // Add document upload dates
    documents.forEach(doc => {
      const date = new Date(doc.uploadDate).toDateString();
      activityDates.add(date);
    });
    
    // Add summary generation dates
    summaries.forEach(sum => {
      const date = new Date(sum.generatedAt).toDateString();
      activityDates.add(date);
    });
    
    // Add flashcard review dates
    flashcards.forEach(card => {
      if (card.lastReviewed) {
        const date = new Date(card.lastReviewed).toDateString();
        activityDates.add(date);
      }
    });

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) { // Check last 30 days
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateString = checkDate.toDateString();
      
      if (activityDates.has(dateString)) {
        currentStreak++;
      } else if (i > 0) { // Don't break on first day if no activity today
        break;
      }
    }

    // Get top performing documents (by flashcard count and summary count)
    const documentStats = documents.map(doc => {
      const docSummaries = summaries.filter(sum => sum.documentId === doc._id.toString()).length;
      const docFlashcards = flashcards.filter(card => card.documentId === doc._id.toString()).length;
      return {
        id: doc._id,
        name: doc.name,
        status: doc.status,
        summariesCount: docSummaries,
        flashcardsCount: docFlashcards,
        uploadDate: doc.uploadDate,
        fileSize: doc.fileSize,
      };
    }).sort((a, b) => (b.summariesCount + b.flashcardsCount) - (a.summariesCount + a.flashcardsCount));

    // Calculate time saved (estimated based on summaries)
    const estimatedTimeSaved = totalReadTime; // This is already in minutes

    // Get recent activity items for timeline
    const recentActivity = [
      ...documents.slice(0, 5).map(doc => ({
        type: "document" as const,
        title: `Uploaded ${doc.name}`,
        timestamp: doc.uploadDate,
        status: doc.status,
        id: doc._id,
      })),
      ...summaries.slice(0, 5).map(sum => ({
        type: "summary" as const,
        title: `Generated ${sum.type === "cross-document" ? "cross-document" : "document"} summary`,
        timestamp: sum.generatedAt,
        readTime: sum.readTime,
        id: sum._id,
      })),
      ...flashcards.slice(0, 5).map(card => ({
        type: "flashcard" as const,
        title: `Created flashcards from ${card.source}`,
        timestamp: card.createdAt || new Date(),
        difficulty: card.difficulty,
        id: card._id,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    // Calculate completion rates
    const documentCompletionRate = totalDocuments > 0 ? (completedDocuments / totalDocuments) * 100 : 0;
    const summaryGenerationRate = completedDocuments > 0 ? (documentSummaries / completedDocuments) * 100 : 0;
    const flashcardGenerationRate = completedDocuments > 0 ? (documents.filter(doc => 
      flashcards.some(card => card.documentId === doc._id.toString())
    ).length / completedDocuments) * 100 : 0;

    console.log("Dashboard stats: Returning successful response");
    return NextResponse.json({
      success: true,
      stats: {
        // Document Statistics
        documents: {
          total: totalDocuments,
          completed: completedDocuments,
          processing: processingDocuments,
          errors: errorDocuments,
          totalFileSize,
          completionRate: Math.round(documentCompletionRate),
          recent: recentDocuments,
        },
        
        // Summary Statistics
        summaries: {
          total: totalSummaries,
          documentSummaries,
          crossDocumentSummaries,
          totalReadTime,
          totalWordCount,
          generationRate: Math.round(summaryGenerationRate),
          recent: recentSummaries,
        },
        
        // Flashcard Statistics
        flashcards: {
          total: totalFlashcards,
          easy: easyFlashcards,
          medium: mediumFlashcards,
          hard: hardFlashcards,
          reviewed: reviewedFlashcards,
          new: newFlashcards,
          totalReviews,
          averageRating: Math.round(averageRating * 10) / 10,
          generationRate: Math.round(flashcardGenerationRate),
          recent: recentFlashcards,
        },
        
        // Learning Analytics
        learning: {
          currentStreak,
          timeSaved: estimatedTimeSaved,
          totalActivity: activityDates.size,
          recentActivity,
        },
        
        // Top Documents
        topDocuments: documentStats.slice(0, 5),
        
        // Performance Metrics
        performance: {
          documentCompletionRate: Math.round(documentCompletionRate),
          summaryGenerationRate: Math.round(summaryGenerationRate),
          flashcardGenerationRate: Math.round(flashcardGenerationRate),
          overallEngagement: Math.round((currentStreak / 30) * 100),
        },
      },
    });

  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard statistics" },
      { status: 500 }
    );
  }
}
