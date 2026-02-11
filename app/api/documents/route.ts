import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Document from "@/models/Document";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

const isServerless =
  process.env.VERCEL === "1" ||
  process.env.NODE_ENV === "production";


export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      return NextResponse.json(
        { error: "Only PDF allowed" },
        { status: 400 }
      );
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Max 10MB allowed" },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const ext = file.name.split(".").pop();
    const fileName = `${timestamp}_${random}.${ext}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let filePath = "";
    let fileUrl: string | undefined;
    let publicId: string | undefined;

    /* ===== Cloudinary Upload ===== */
    if (
      process.env.NODE_ENV === "production" &&
      process.env.CLOUDINARY_CLOUD_NAME
    ) {
      const uploadResult = await uploadToCloudinary(
        buffer,
        fileName,
        file
      );

      publicId = uploadResult.public_id;
      fileUrl = uploadResult.secure_url;
      filePath = publicId;
    } else {
      /* ===== Local Upload (Dev) ===== */
      const uploadDir = join(
        process.cwd(),
        "public/uploads/documents"
      );

      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      const fullPath = join(uploadDir, fileName);

      if (!isServerless) {
        await writeFile(fullPath, buffer);
      }

      filePath = `/uploads/documents/${fileName}`;
    }

    const document = new Document({
      name: file.name.replace(/\.[^/.]+$/, ""),
      originalName: file.name,
      fileName,
      filePath,
      fileUrl,
      publicId,
      fileSize: file.size,
      mimeType: file.type,
      userId: session.user.id,
      status: "processing",
    });

    await document.save();

    /* ===== PDF Parse ===== */
    try {
      const { default: pdfParse } = await import("pdf-parse");
      const parsed = await pdfParse(buffer as any);

      document.extractedText = parsed.text.trim();
      document.status = "completed";
      document.processedDate = new Date();

      await document.save();
    } catch (err: any) {
      document.status = "error";
      document.errorMessage = err.message;
      await document.save();

      return NextResponse.json(
        { error: "PDF parse failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error("Upload error:", error);

    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const { id, extractedText, status } =
      await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Missing ID" },
        { status: 400 }
      );
    }

    const updatedDoc = await Document.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { extractedText, status },
      { new: true }
    );

    if (!updatedDoc) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      document: updatedDoc,
    });
  } catch (error) {
    console.error("Update error:", error);

    return NextResponse.json(
      { error: "Update failed" },
      { status: 500 }
    );
  }
}

/* =========================
   GET → Fetch Documents
========================= */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const documents = await Document.find({
      userId: session.user.id,
    })
      .sort({ uploadDate: -1 })
      .lean();

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Fetch error:", error);

    return NextResponse.json(
      { error: "Fetch failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("id");

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID required" },
        { status: 400 }
      );
    }

    const document = await Document.findOneAndDelete({
      _id: documentId,
      userId: session.user.id,
    });

    if (!document) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    /* ✅ Delete from Cloudinary */
    if (document.publicId) {
      await deleteFromCloudinary(document.publicId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);

    return NextResponse.json(
      { error: "Delete failed" },
      { status: 500 }
    );
  }
}
