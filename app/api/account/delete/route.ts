import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import UserSettings from "@/models/UserSettings";
import Document from "@/models/Document";
import Summary from "@/models/Summary";
import Flashcard from "@/models/Flashcard";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Optional confirmation header to prevent accidental deletion
    const confirm = req.headers.get("x-confirm-delete");
    if (confirm !== "true") {
      return NextResponse.json({ error: "Confirmation required", hint: "Set x-confirm-delete: true header" }, { status: 400 });
    }

    await connectToDatabase();

    // Delete user-related data
    await Promise.all([
      Document.deleteMany({ userId: session.user.id }),
      Summary.deleteMany({ userId: session.user.id }),
      Flashcard.deleteMany({ userId: session.user.id }),
      UserSettings.deleteOne({ userId: session.user.id }),
    ]);

    await User.findByIdAndDelete(session.user.id);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Account DELETE error:", e);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
