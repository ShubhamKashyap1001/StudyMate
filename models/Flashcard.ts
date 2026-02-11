import mongoose, { Schema, models, model } from "mongoose";

export interface IFlashcard {
  _id?: string;
  question: string;
  answer: string;
  difficulty: "easy" | "medium" | "hard";
  documentId: string; // reference to Document
  userId: string; // reference to User
  deckId?: string; // optional deck grouping
  source: string; // document name for display
  reviewCount: number;
  lastReviewed?: Date;
  nextReview?: Date;
  rating?: "again" | "hard" | "medium" | "easy"; // last user rating
  isActive: boolean; // for soft delete
  createdAt?: Date;
  updatedAt?: Date;
}

const FlashcardSchema = new Schema<IFlashcard>(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    difficulty: { 
      type: String, 
      enum: ["easy", "medium", "hard"], 
      default: "medium" 
    },
    documentId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    deckId: { type: String, index: true },
    source: { type: String, required: true },
    reviewCount: { type: Number, default: 0 },
    lastReviewed: { type: Date },
    nextReview: { type: Date },
    rating: { 
      type: String, 
      enum: ["again", "hard", "medium", "easy"] 
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes for efficient queries
FlashcardSchema.index({ userId: 1, isActive: 1 });
FlashcardSchema.index({ userId: 1, documentId: 1 });
FlashcardSchema.index({ userId: 1, deckId: 1 });
FlashcardSchema.index({ userId: 1, nextReview: 1 });

const Flashcard = models.Flashcard || model<IFlashcard>("Flashcard", FlashcardSchema);
export default Flashcard;

