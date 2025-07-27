import mongoose, { Document, Schema } from "mongoose";

export interface IChallenge extends Document {
  name: string;
  description: string;
  type: "daily" | "weekly" | "monthly" | "special";
  targetValue: number;
  pointsReward: number;
  badgeReward?: string;
  category: "personal" | "family" | "global";
  difficulty: "easy" | "medium" | "hard";
  icon: string;
  startDate: Date;
  expiresAt: Date;
  createdFor?: Schema.Types.ObjectId; // Specific user for personal challenges
  familyId?: Schema.Types.ObjectId; // Family-specific challenges
  active: boolean;
  participants: {
    userId: Schema.Types.ObjectId;
    joinedAt: Date;
    currentProgress: number;
    isCompleted: boolean;
    completedAt?: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const challengeSchema = new Schema<IChallenge>(
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
    type: {
      type: String,
      enum: ["daily", "weekly", "monthly", "special"],
      required: true,
    },
    targetValue: {
      type: Number,
      required: true,
      min: 1,
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
    category: {
      type: String,
      enum: ["personal", "family", "global"],
      default: "personal",
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    icon: {
      type: String,
      required: true,
      default: "🎯",
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    createdFor: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    familyId: {
      type: Schema.Types.ObjectId,
      ref: "Family",
    },
    active: {
      type: Boolean,
      default: true,
    },
    participants: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        currentProgress: {
          type: Number,
          default: 0,
          min: 0,
        },
        isCompleted: {
          type: Boolean,
          default: false,
        },
        completedAt: {
          type: Date,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
challengeSchema.index({ active: 1, expiresAt: 1 });
challengeSchema.index({ type: 1, category: 1 });
challengeSchema.index({ createdFor: 1, active: 1 });
challengeSchema.index({ familyId: 1, active: 1 });
challengeSchema.index({ "participants.userId": 1 });

const Challenge = mongoose.models.Challenge || mongoose.model<IChallenge>("Challenge", challengeSchema);

export default Challenge;