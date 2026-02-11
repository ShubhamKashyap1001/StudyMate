import mongoose, { Schema, models, model } from "mongoose";

export interface ISummary {
  _id?: string;
  title: string;
  content: string;
  documentId: string; // reference to Document
  userId: string; // reference to User
  type: "document" | "cross-document";
  length: "brief" | "detailed" | "comprehensive";
  wordCount: number;
  readTime: number; // in minutes
  generatedAt: Date;
  isActive: boolean; // for soft delete
  tags?: string[];
  relatedDocumentIds?: string[]; // for cross-document summaries
  createdAt?: Date;
  updatedAt?: Date;
}

const SummarySchema = new Schema<ISummary>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    documentId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    type: { 
      type: String, 
      enum: ["document", "cross-document"], 
      default: "document" 
    },
    length: { 
      type: String, 
      enum: ["brief", "detailed", "comprehensive"], 
      default: "detailed" 
    },
    wordCount: { type: Number, required: true },
    readTime: { type: Number, required: true },
    generatedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    tags: [{ type: String }],
    relatedDocumentIds: [{ type: String }],
  },
  { timestamps: true }
);

// Indexes for efficient queries
SummarySchema.index({ userId: 1, isActive: 1 });
SummarySchema.index({ userId: 1, documentId: 1 });
SummarySchema.index({ userId: 1, type: 1 });
SummarySchema.index({ userId: 1, generatedAt: -1 });

const Summary = models.Summary || model<ISummary>("Summary", SummarySchema);
export default Summary;

