import mongoose, { Document, Schema } from "mongoose";

export interface IReward extends Document {
  name: string;
  description: string;
  category: "privileges" | "treats" | "activities" | "items" | "experiences";
  pointsCost: number;
  requiredLevel?: number;
  requiredPoints?: number;
  icon: string;
  image?: string;
  value?: number; // Monetary value for tracking
  requiresParentApproval: boolean;
  isLimitedTime?: boolean;
  availableUntil?: Date;
  maxRedemptions?: number; // Per child
  currentRedemptions: number;
  familyId?: Schema.Types.ObjectId; // Family-specific rewards
  active: boolean;
  tags: string[];
  ageGroup?: "young" | "teen" | "all";
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const rewardSchema = new Schema<IReward>(
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
      enum: ["privileges", "treats", "activities", "items", "experiences"],
      required: true,
    },
    pointsCost: {
      type: Number,
      required: true,
      min: 1,
    },
    requiredLevel: {
      type: Number,
      min: 1,
    },
    requiredPoints: {
      type: Number,
      min: 0,
    },
    icon: {
      type: String,
      required: true,
      default: "🎁",
    },
    image: {
      type: String,
      trim: true,
    },
    value: {
      type: Number,
      min: 0,
    },
    requiresParentApproval: {
      type: Boolean,
      default: true,
    },
    isLimitedTime: {
      type: Boolean,
      default: false,
    },
    availableUntil: {
      type: Date,
    },
    maxRedemptions: {
      type: Number,
      min: 1,
    },
    currentRedemptions: {
      type: Number,
      default: 0,
      min: 0,
    },
    familyId: {
      type: Schema.Types.ObjectId,
      ref: "Family",
    },
    active: {
      type: Boolean,
      default: true,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    ageGroup: {
      type: String,
      enum: ["young", "teen", "all"],
      default: "all",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
rewardSchema.index({ active: 1, category: 1 });
rewardSchema.index({ familyId: 1, active: 1 });
rewardSchema.index({ pointsCost: 1, requiredLevel: 1 });
rewardSchema.index({ isLimitedTime: 1, availableUntil: 1 });

const Reward = mongoose.models.Reward || mongoose.model<IReward>("Reward", rewardSchema);

export default Reward;