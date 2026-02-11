import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import UserSettings from "@/models/UserSettings";
import Document from "@/models/Document";
import Summary from "@/models/Summary";
import Flashcard from "@/models/Flashcard";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();

    const [user, settings, documents, summaries, flashcards] = await Promise.all([
      User.findById(session.user.id).lean(),
      UserSettings.findOne({ userId: session.user.id }).lean(),
      Document.find({ userId: session.user.id }).lean(),
      Summary.find({ userId: session.user.id }).lean(),
      Flashcard.find({ userId: session.user.id }).lean(),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      user: user ? {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || null,
        image: user.image || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      } : null,
      settings: settings || null,
      documents: documents || [],
      summaries: summaries || [],
      flashcards: flashcards || [],
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename=studymate-export-${Date.now()}.json`,
      },
    });
  } catch (e) {
    console.error("Export GET error:", e);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
