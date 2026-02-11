import mongoose, { Schema, models, model } from "mongoose";

export interface IChunk {
  _id?: string;
  documentId: string;
  userId: string;
  chunkIndex: number;
  content: string;
  tokens?: number;
  embedding: number[]; // Gemini text-embedding-004 (length 768)
  createdAt?: Date;
  updatedAt?: Date;
}

const ChunkSchema = new Schema<IChunk>(
  {
    documentId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    chunkIndex: { type: Number, required: true },
    content: { type: String, required: true },
    tokens: { type: Number },
    embedding: { type: [Number], required: true },
  },
  { timestamps: true }
);

ChunkSchema.index({ userId: 1, documentId: 1, chunkIndex: 1 }, { unique: true });

const Chunk = models.Chunk || model<IChunk>("Chunk", ChunkSchema);
export default Chunk;
