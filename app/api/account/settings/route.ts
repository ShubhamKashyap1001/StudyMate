import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import UserSettings from "@/models/UserSettings";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();

    let settings = await UserSettings.findOne({ userId: session.user.id }).lean();
    if (!settings) {
      // Create defaults if not present
      settings = (await UserSettings.create({ userId: session.user.id })).toObject();
    }

    return NextResponse.json({ settings });
  } catch (e) {
    console.error("Settings GET error:", e);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      summaryLength,
      flashcardDifficulty,
      emailNotifications,
      weeklySummary,
      documentComplete,
      theme,
      institution,
    } = body || {};

    await connectToDatabase();

    const update: any = {};
    if (["brief", "detailed", "comprehensive"].includes(summaryLength)) update.summaryLength = summaryLength;
    if (["easy", "medium", "hard", "mixed"].includes(flashcardDifficulty)) update.flashcardDifficulty = flashcardDifficulty;
    if (typeof emailNotifications === "boolean") update.emailNotifications = emailNotifications;
    if (typeof weeklySummary === "boolean") update.weeklySummary = weeklySummary;
    if (typeof documentComplete === "boolean") update.documentComplete = documentComplete;
    if (["light", "dark", "system"].includes(theme)) update.theme = theme;
    if (typeof institution === "string") update.institution = institution.trim();

    const settings = await UserSettings.findOneAndUpdate(
      { userId: session.user.id },
      { $set: update },
      { new: true, upsert: true }
    ).lean();

    return NextResponse.json({ success: true, settings });
  } catch (e) {
    console.error("Settings PUT error:", e);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
