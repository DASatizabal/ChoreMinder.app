import mongoose, { Document, Schema } from "mongoose";

export interface IAchievement extends Document {
  name: string;
  description: string;
  category: "completion" | "quality" | "consistency" | "milestone" | "special";
  type:
    | "chores_completed"
    | "points_earned"
    | "streak_days"
    | "perfect_week"
    | "early_completion";
  targetValue: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
  icon: string;
  pointsReward: number;
  badgeReward?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const achievementSchema = new Schema<IAchievement>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    category: {
      type: String,
      enum: ["completion", "quality", "consistency", "milestone", "special"],
      required: true,
    },
    type: {
      type: String,
      enum: [
        "chores_completed",
        "points_earned",
        "streak_days",
        "perfect_week",
        "early_completion",
      ],
      required: true,
    },
    targetValue: {
      type: Number,
      required: true,
      min: 1,
    },
    tier: {
      type: String,
      enum: ["bronze", "silver", "gold", "platinum"],
      required: true,
    },
    icon: {
      type: String,
      required: true,
      default: "🏆",
    },
    pointsReward: {
      type: Number,
      required: true,
      min: 0,
    },
    badgeReward: {
      type: String,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
achievementSchema.index({ active: 1, category: 1 });
achievementSchema.index({ type: 1, tier: 1 });

const Achievement =
  mongoose.models.Achievement ||
  mongoose.model<IAchievement>("Achievement", achievementSchema);

export default Achievement;
