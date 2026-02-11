import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    console.log("Test dashboard: Starting test");
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log("Test dashboard: No session");
      return NextResponse.json({ 
        success: false, 
        error: "Unauthorized",
        step: "authentication"
      }, { status: 401 });
    }

    console.log("Test dashboard: User authenticated:", session.user.id);

    // Test database connection
    try {
      await connectToDatabase();
      console.log("Test dashboard: Database connected");
    } catch (dbError) {
      console.error("Test dashboard: Database error:", dbError);
      return NextResponse.json({ 
        success: false, 
        error: "Database connection failed",
        step: "database",
        details: dbError instanceof Error ? dbError.message : "Unknown error"
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Dashboard test successful",
      user: session.user.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Test dashboard: Unexpected error:", error);
    return NextResponse.json({
      success: false,
      error: "Unexpected error",
      step: "general",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
