import mongoose, { Schema, models, model } from "mongoose";

export interface IUserSettings {
  userId: mongoose.Types.ObjectId;
  summaryLength: "brief" | "detailed" | "comprehensive";
  flashcardDifficulty: "easy" | "medium" | "hard" | "mixed";
  emailNotifications: boolean;
  weeklySummary: boolean;
  documentComplete: boolean;
  theme: "light" | "dark" | "system";
  institution?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSettingsSchema = new Schema<IUserSettings>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    summaryLength: { type: String, enum: ["brief", "detailed", "comprehensive"], default: "detailed" },
    flashcardDifficulty: { type: String, enum: ["easy", "medium", "hard", "mixed"], default: "mixed" },
    emailNotifications: { type: Boolean, default: true },
    weeklySummary: { type: Boolean, default: true },
    documentComplete: { type: Boolean, default: true },
    theme: { type: String, enum: ["light", "dark", "system"], default: "system" },
    institution: { type: String },
  },
  { timestamps: true }
);

const UserSettings = models.UserSettings || model<IUserSettings>("UserSettings", UserSettingsSchema);
export default UserSettings;
