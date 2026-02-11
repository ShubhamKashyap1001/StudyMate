import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Document from "@/models/Document";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { uploadToCloudinary } from "@/lib/cloudinary";

// Ensure Node.js runtime (required for fs, Buffer, and pdf-parse)
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Connect to database
    await connectToDatabase();

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type (some environments may not provide file.type reliably)
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json({ error: "Only PDF files are allowed (.pdf)" }, { status: 400 });
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}_${randomString}.${fileExtension}`;
    
    let filePath: string;
    let fileUrl: string | undefined;
    // Read bytes once for later parsing and potential local write
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Choose storage method based on environment
    if (process.env.NODE_ENV === "production" && process.env.CLOUDINARY_CLOUD_NAME) {
      // Use Cloudinary for production
      try {
        const uploadResult = await uploadToCloudinary(file);
        filePath = uploadResult.public_id;
        fileUrl = uploadResult.secure_url;
      } catch (cloudError) {
        console.error("Cloudinary upload failed, falling back to local storage:", cloudError);
        // Fallback to local storage
        const uploadsDir = join(process.cwd(), "public", "uploads", "documents");
        if (!existsSync(uploadsDir)) {
          await mkdir(uploadsDir, { recursive: true });
        }
        filePath = join(uploadsDir, fileName);
        await writeFile(filePath, buffer);
        filePath = `/uploads/documents/${fileName}`;
      }
    } else {
      // Use local storage for development
      const uploadsDir = join(process.cwd(), "public", "uploads", "documents");
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }
      filePath = join(uploadsDir, fileName);
      await writeFile(filePath, buffer);
      filePath = `/uploads/documents/${fileName}`;
    }

    // Save document info to database (initially processing)
    const document = new Document({
      name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension for display name
      originalName: file.name,
      fileName: fileName,
      filePath: filePath,
      fileUrl: fileUrl,
      fileSize: file.size,
      mimeType: file.type,
      userId: session.user.id,
      status: "processing",
    });

    await document.save();

    try {
      // Use pdf-parse via dynamic import and Next.js server externals to avoid bundling pitfalls
      const { default: pdfParse } = await import("pdf-parse");
      const parsed = await pdfParse(buffer as any);
      const extractedText = (parsed?.text || "").trim();

      document.extractedText = extractedText;
      document.status = "completed";
      document.processedDate = new Date();
      await document.save();

      // Kick off background ingestion (embeddings)
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/ingest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: String(document._id) })
        }).catch(() => undefined);
      } catch {
        // ignore background trigger errors
      }
    } catch (parseErr: any) {
      console.error("PDF parse error:", parseErr);
      document.status = "error";
      document.errorMessage = `Failed to extract text from PDF: ${parseErr?.message || "unknown error"}`;
      await document.save();
      return NextResponse.json({ success: false, error: document.errorMessage }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document._id,
        name: document.name,
        originalName: document.originalName,
        fileName: document.fileName,
        fileSize: document.fileSize,
        status: document.status,
        uploadDate: document.uploadDate,
        filePath: document.filePath,
        extractedText: document.extractedText ?? null,
        errorMessage: document.errorMessage ?? null,
      },
    });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to database
    await connectToDatabase();

    const { id, extractedText, status, ingest } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 });
    }

    const update: any = {};
    if (typeof extractedText === 'string') update.extractedText = extractedText;
    if (typeof status === 'string') update.status = status;
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const doc = await Document.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: update },
      { new: true }
    );

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Optionally trigger ingestion of embeddings
    if (ingest && typeof doc.extractedText === 'string' && doc.extractedText.trim().length > 0) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/ingest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: doc._id })
        }).catch(() => undefined);
      } catch {
        // ignore background trigger errors
      }
    }

    return NextResponse.json({ success: true, document: {
      id: doc._id,
      name: doc.name,
      originalName: doc.originalName,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      status: doc.status,
      uploadDate: doc.uploadDate,
      filePath: doc.filePath,
      extractedText: doc.extractedText ?? null,
      errorMessage: doc.errorMessage ?? null,
    } });

  } catch (error) {
    console.error("Update document error:", error);
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to database
    await connectToDatabase();

    // Get user's documents
    const documents = await Document.find({ userId: session.user.id })
      .sort({ uploadDate: -1 })
      .lean();

    return NextResponse.json({ documents });

  } catch (error) {
    console.error("Get documents error:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

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
    const documentId = searchParams.get("id");

    if (!documentId) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 });
    }

    // Find and delete document
    const document = await Document.findOneAndDelete({
      _id: documentId,
      userId: session.user.id, // Ensure user can only delete their own documents
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // TODO: Delete the actual file from disk
    // const filePath = join(process.cwd(), "public", document.filePath);
    // if (existsSync(filePath)) {
    //   await unlink(filePath);
    // }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Delete document error:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}

