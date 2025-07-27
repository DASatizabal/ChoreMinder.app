import mongoose, { Document, Model, Schema } from "mongoose";

import toJSON from "./plugins/toJSON";

// User role type
export type UserRole = "user" | "admin" | "parent" | "child";

// Communication preferences interface
export interface ICommunicationPreferences {
  primaryChannel: "whatsapp" | "sms" | "email";
  fallbackChannels: ("whatsapp" | "sms" | "email")[];
  quietHours?: {
    enabled: boolean;
    start: string; // "22:00"
    end: string; // "08:00"
    timezone: string;
  };
  maxMessagesPerHour?: number;
  enabledNotifications: {
    choreAssigned: boolean;
    choreReminder: boolean;
    choreCompleted: boolean;
    choreApproved: boolean;
    choreRejected: boolean;
    weeklyDigest: boolean;
    familyUpdates: boolean;
  };
}

// Gamification data interface
export interface IGamification {
  totalPoints: number;
  level: number;
  choresCompleted: number;
  streak: number;
  lastActivityAt: Date;
  achievements: {
    achievementId: Schema.Types.ObjectId;
    currentProgress: number;
    isCompleted: boolean;
    completedAt?: Date;
  }[];
  challenges: {
    challengeId: Schema.Types.ObjectId;
    currentProgress: number;
    isCompleted: boolean;
    completedAt?: Date;
  }[];
  redeemedRewards: {
    rewardId: Schema.Types.ObjectId;
    redeemedAt: Date;
    pointsCost: number;
  }[];
  pendingRewards: {
    rewardId: Schema.Types.ObjectId;
    requestedAt: Date;
    pointsCost: number;
  }[];
}

// Interface for User document
export interface IUser extends Document {
  name?: string;
  email: string;
  phone?: string;
  image?: string;
  emailVerified?: Date;
  hashedPassword?: string;
  role: UserRole;
  customerId?: string;
  priceId?: string;
  hasAccess: boolean;
  createdAt: Date;
  updatedAt: Date;
  profileUrl?: string;
  familyId?: Schema.Types.ObjectId;
  families?: Schema.Types.ObjectId[];
  resetToken?: string;
  resetTokenExpiry?: Date;
  communicationPreferences?: ICommunicationPreferences;
  gamification?: IGamification;
}

export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export type UserModel = Model<IUser, {}, IUserMethods>;

const userSchema = new mongoose.Schema<IUser, UserModel>(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      private: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
    },
    emailVerified: {
      type: Date,
    },
    hashedPassword: {
      type: String,
      private: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin", "parent", "child"],
      default: "user",
    },
    image: {
      type: String,
    },
    familyId: {
      type: Schema.Types.ObjectId,
      ref: "Family",
    },
    families: [
      {
        type: Schema.Types.ObjectId,
        ref: "Family",
      },
    ],
    resetToken: {
      type: String,
      select: false,
    },
    resetTokenExpiry: {
      type: Date,
      select: false,
    },
    customerId: {
      type: String,
      validate: {
        validator: (val: string) => !val || val.startsWith("cus_"),
        message: 'Customer ID must start with "cus_"',
      },
    },
    priceId: {
      type: String,
      validate: {
        validator: (val: string) => !val || val.startsWith("price_"),
        message: 'Price ID must start with "price_"',
      },
    },
    hasAccess: {
      type: Boolean,
      default: false,
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator(v: string) {
          if (!v) return true; // Phone is optional
          // Basic E.164 format validation
          return /^\+[1-9]\d{1,14}$/.test(v);
        },
        message: "Phone number must be in E.164 format (e.g., +1234567890)",
      },
    },
    communicationPreferences: {
      primaryChannel: {
        type: String,
        enum: ["whatsapp", "sms", "email"],
        default: "whatsapp",
      },
      fallbackChannels: {
        type: [String],
        enum: ["whatsapp", "sms", "email"],
        default: ["sms", "email"],
      },
      quietHours: {
        enabled: {
          type: Boolean,
          default: false,
        },
        start: {
          type: String,
          default: "22:00",
          validate: {
            validator: (v: string) => /^\d{2}:\d{2}$/.test(v),
            message: "Time must be in HH:MM format",
          },
        },
        end: {
          type: String,
          default: "08:00",
          validate: {
            validator: (v: string) => /^\d{2}:\d{2}$/.test(v),
            message: "Time must be in HH:MM format",
          },
        },
        timezone: {
          type: String,
          default: "UTC",
        },
      },
      maxMessagesPerHour: {
        type: Number,
        default: 10,
        min: 1,
        max: 100,
      },
      enabledNotifications: {
        choreAssigned: {
          type: Boolean,
          default: true,
        },
        choreReminder: {
          type: Boolean,
          default: true,
        },
        choreCompleted: {
          type: Boolean,
          default: true,
        },
        choreApproved: {
          type: Boolean,
          default: true,
        },
        choreRejected: {
          type: Boolean,
          default: true,
        },
        weeklyDigest: {
          type: Boolean,
          default: true,
        },
        familyUpdates: {
          type: Boolean,
          default: true,
        },
      },
    },
    gamification: {
      totalPoints: {
        type: Number,
        default: 0,
        min: 0,
      },
      level: {
        type: Number,
        default: 1,
        min: 1,
      },
      choresCompleted: {
        type: Number,
        default: 0,
        min: 0,
      },
      streak: {
        type: Number,
        default: 0,
        min: 0,
      },
      lastActivityAt: {
        type: Date,
        default: Date.now,
      },
      achievements: [
        {
          achievementId: {
            type: Schema.Types.ObjectId,
            ref: "Achievement",
            required: true,
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
      challenges: [
        {
          challengeId: {
            type: Schema.Types.ObjectId,
            ref: "Challenge",
            required: true,
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
      redeemedRewards: [
        {
          rewardId: {
            type: Schema.Types.ObjectId,
            ref: "Reward",
            required: true,
          },
          redeemedAt: {
            type: Date,
            required: true,
          },
          pointsCost: {
            type: Number,
            required: true,
            min: 0,
          },
        },
      ],
      pendingRewards: [
        {
          rewardId: {
            type: Schema.Types.ObjectId,
            ref: "Reward",
            required: true,
          },
          requestedAt: {
            type: Date,
            required: true,
          },
          pointsCost: {
            type: Number,
            required: true,
            min: 0,
          },
        },
      ],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        // Remove sensitive data from JSON output
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Add method to compare passwords
userSchema.methods.comparePassword = async function (
  candidatePassword: string,
) {
  if (!this.hashedPassword) return false;
  const bcrypt = await import("bcryptjs");
  return bcrypt.compare(candidatePassword, this.hashedPassword);
};

// Add virtual for profile URL
userSchema.virtual("profileUrl").get(function (this: IUser) {
  return this.image || "/images/default-avatar.png";
});

// Add indexes for better query performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ customerId: 1 }, { unique: true, sparse: true });

// Add the toJSON plugin
userSchema.plugin(toJSON);

// Create the model with proper typing
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default User;
