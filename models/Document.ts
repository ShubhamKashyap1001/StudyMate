import mongoose, { Schema, models, model } from "mongoose";

export interface IDocument {
  _id?: string;
  name: string;
  originalName: string;
  fileName: string; // stored filename
  filePath: string; // path to the file
  fileUrl?: string; // cloud URL for the file
  fileSize: number; // in bytes
  mimeType: string;
  userId: string; // reference to User
  status: "uploading" | "processing" | "completed" | "error";
  uploadDate: Date;
  processedDate?: Date;
  tags?: string[];
  questionsCount?: number;
  flashcardsCount?: number;
  errorMessage?: string;
  extractedText?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    name: { type: String, required: true, trim: true },
    originalName: { type: String, required: true },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileUrl: { type: String },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    status: { 
      type: String, 
      enum: ["uploading", "processing", "completed", "error"], 
      default: "uploading" 
    },
    uploadDate: { type: Date, default: Date.now },
    processedDate: { type: Date },
    tags: [{ type: String }],
    questionsCount: { type: Number, default: 0 },
    flashcardsCount: { type: Number, default: 0 },
    errorMessage: { type: String },
    extractedText: { type: String },
  },
  { timestamps: true }
);

// Index for efficient queries
DocumentSchema.index({ userId: 1, uploadDate: -1 });
DocumentSchema.index({ userId: 1, status: 1 });

const Document = models.Document || model<IDocument>("Document", DocumentSchema);
export default Document;

