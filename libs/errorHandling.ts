import React from "react";
import toast from "react-hot-toast";

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  choreId?: string;
  familyId?: string;
  timestamp?: string;
  additionalData?: Record<string, any>;
}

export interface APIError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

export class ChoreWorkflowError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: ErrorContext,
    public recoverable: boolean = true,
  ) {
    super(message);
    this.name = "ChoreWorkflowError";
  }
}

// Error codes for specific scenarios
export const ERROR_CODES = {
  // Network & API
  NETWORK_ERROR: "NETWORK_ERROR",
  API_TIMEOUT: "API_TIMEOUT",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  SERVER_ERROR: "SERVER_ERROR",

  // Validation
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  INVALID_FILE_TYPE: "INVALID_FILE_TYPE",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",

  // Chore Workflow
  CHORE_NOT_FOUND: "CHORE_NOT_FOUND",
  CHORE_ALREADY_COMPLETED: "CHORE_ALREADY_COMPLETED",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
  FAMILY_NOT_FOUND: "FAMILY_NOT_FOUND",
  MEMBER_NOT_FOUND: "MEMBER_NOT_FOUND",

  // Photo & AI
  PHOTO_UPLOAD_FAILED: "PHOTO_UPLOAD_FAILED",
  AI_ANALYSIS_FAILED: "AI_ANALYSIS_FAILED",
  PHOTO_QUALITY_TOO_LOW: "PHOTO_QUALITY_TOO_LOW",

  // Onboarding
  SETUP_INCOMPLETE: "SETUP_INCOMPLETE",
  INVITATION_FAILED: "INVITATION_FAILED",

  // Unknown
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// User-friendly error messages
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ERROR_CODES.NETWORK_ERROR]:
    "Network connection issue. Please check your internet and try again.",
  [ERROR_CODES.API_TIMEOUT]: "Request timed out. Please try again.",
  [ERROR_CODES.UNAUTHORIZED]: "Your session has expired. Please log in again.",
  [ERROR_CODES.FORBIDDEN]: "You don't have permission to perform this action.",
  [ERROR_CODES.NOT_FOUND]: "The requested item was not found.",
  [ERROR_CODES.SERVER_ERROR]:
    "Server error. Please try again in a few moments.",

  [ERROR_CODES.INVALID_INPUT]: "Please check your input and try again.",
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: "Please fill in all required fields.",
  [ERROR_CODES.INVALID_FILE_TYPE]:
    "Please select a valid image file (JPG, PNG, etc.).",
  [ERROR_CODES.FILE_TOO_LARGE]:
    "File is too large. Please choose a smaller image.",

  [ERROR_CODES.CHORE_NOT_FOUND]:
    "Chore not found. It may have been deleted or moved.",
  [ERROR_CODES.CHORE_ALREADY_COMPLETED]:
    "This chore has already been completed.",
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]:
    "You don't have permission to perform this action.",
  [ERROR_CODES.FAMILY_NOT_FOUND]:
    "Family not found. Please check your family membership.",
  [ERROR_CODES.MEMBER_NOT_FOUND]: "Family member not found.",

  [ERROR_CODES.PHOTO_UPLOAD_FAILED]:
    "Failed to upload photo. Please try again.",
  [ERROR_CODES.AI_ANALYSIS_FAILED]:
    "AI analysis is temporarily unavailable, but you can still submit.",
  [ERROR_CODES.PHOTO_QUALITY_TOO_LOW]:
    "Photo quality is too low. Please take a clearer photo.",

  [ERROR_CODES.SETUP_INCOMPLETE]:
    "Setup is incomplete. Please finish the onboarding process.",
  [ERROR_CODES.INVITATION_FAILED]:
    "Failed to send invitation. Please try again.",

  [ERROR_CODES.UNKNOWN_ERROR]:
    "Something went wrong. Please try again or contact support.",
};

// Recovery suggestions
const RECOVERY_SUGGESTIONS: Partial<Record<ErrorCode, string[]>> = {
  [ERROR_CODES.NETWORK_ERROR]: [
    "Check your internet connection",
    "Try refreshing the page",
    "Switch to a different network if available",
  ],
  [ERROR_CODES.API_TIMEOUT]: [
    "Try again in a few moments",
    "Check your internet connection",
    "Contact support if this keeps happening",
  ],
  [ERROR_CODES.UNAUTHORIZED]: [
    "Log out and log back in",
    "Clear your browser cache",
    "Contact support if you continue having issues",
  ],
  [ERROR_CODES.PHOTO_QUALITY_TOO_LOW]: [
    "Use better lighting when taking the photo",
    "Hold your device steady",
    "Get closer to the subject",
    "Clean your camera lens",
  ],
  [ERROR_CODES.FILE_TOO_LARGE]: [
    "Use your device's built-in photo compression",
    "Take a new photo at a lower resolution",
    "Use an image compression app",
  ],
  [ERROR_CODES.AI_ANALYSIS_FAILED]: [
    "You can still submit your photo",
    "The AI analysis will be retried later",
    "Contact support if this affects your workflow",
  ],
};

export const handleError = (
  error: Error | APIError | ChoreWorkflowError,
  context?: ErrorContext,
  options?: {
    showToast?: boolean;
    logToConsole?: boolean;
    logToService?: boolean;
  },
) => {
  const {
    showToast = true,
    logToConsole = true,
    logToService = process.env.NODE_ENV === "production",
  } = options || {};

  // Determine error code and message
  let errorCode: ErrorCode = ERROR_CODES.UNKNOWN_ERROR;
  let userMessage = "";
  let recoverable = true;

  if (error instanceof ChoreWorkflowError) {
    errorCode = error.code as ErrorCode;
    userMessage = ERROR_MESSAGES[errorCode] || error.message;
    recoverable = error.recoverable;
  } else if ("status" in error && typeof error.status === "number") {
    // Handle API errors
    errorCode = getErrorCodeFromStatus(error.status);
    userMessage = ERROR_MESSAGES[errorCode];
  } else {
    // Handle generic errors
    errorCode = categorizeGenericError(error);
    userMessage = ERROR_MESSAGES[errorCode];
  }

  // Show user notification
  if (showToast) {
    const suggestions = RECOVERY_SUGGESTIONS[errorCode];
    const icon = recoverable ? "⚠️" : "🚨";

    toast.error(userMessage, {
      duration: recoverable ? 6000 : 10000,
      icon,
    });

    // Show recovery suggestions for certain errors
    if (suggestions && suggestions.length > 0) {
      setTimeout(() => {
        toast(`💡 Try this: ${suggestions.slice(0, 3).join(", ")}`, {
          duration: 8000,
          icon: "💡",
        });
      }, 1000);
    }
  }

  // Console logging
  if (logToConsole) {
    console.group(`🚨 Error [${errorCode}]`);
    console.error("Error:", error);
    console.error("Context:", context);
    console.error("Stack:", error.stack);
    console.groupEnd();
  }

  // External logging
  if (logToService) {
    logErrorToService(error, errorCode, context);
  }

  return {
    code: errorCode,
    message: userMessage,
    recoverable,
    suggestions: RECOVERY_SUGGESTIONS[errorCode] || [],
  };
};

const getErrorCodeFromStatus = (status: number): ErrorCode => {
  switch (status) {
    case 401:
      return ERROR_CODES.UNAUTHORIZED;
    case 403:
      return ERROR_CODES.FORBIDDEN;
    case 404:
      return ERROR_CODES.NOT_FOUND;
    case 408:
      return ERROR_CODES.API_TIMEOUT;
    case 413:
      return ERROR_CODES.FILE_TOO_LARGE;
    case 422:
      return ERROR_CODES.INVALID_INPUT;
    case 500:
    case 502:
    case 503:
    case 504:
      return ERROR_CODES.SERVER_ERROR;
    default:
      return ERROR_CODES.UNKNOWN_ERROR;
  }
};

const categorizeGenericError = (error: Error): ErrorCode => {
  const message = error.message.toLowerCase();

  if (message.includes("network") || message.includes("fetch")) {
    return ERROR_CODES.NETWORK_ERROR;
  }
  if (message.includes("timeout")) {
    return ERROR_CODES.API_TIMEOUT;
  }
  if (message.includes("file") && message.includes("large")) {
    return ERROR_CODES.FILE_TOO_LARGE;
  }
  if (message.includes("validation") || message.includes("invalid")) {
    return ERROR_CODES.INVALID_INPUT;
  }

  return ERROR_CODES.UNKNOWN_ERROR;
};

const logErrorToService = (
  error: Error,
  code: ErrorCode,
  context?: ErrorContext,
) => {
  try {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      code,
      context: {
        ...context,
        timestamp: new Date().toISOString(),
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        url: typeof window !== "undefined" ? window.location.href : "unknown",
      },
      level: "error",
    };

    // In production, send to your error tracking service
    // Examples: Sentry, LogRocket, Bugsnag, DataDog, etc.
    console.log("Error report for external service:", errorReport);

    // fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorReport)
    // }).catch(console.error);
  } catch (loggingError) {
    console.error("Failed to log error to external service:", loggingError);
  }
};

// Wrapper for API calls with automatic error handling
export const withErrorHandling = async <T>(
  apiCall: () => Promise<T>,
  context?: ErrorContext,
  customErrorHandler?: (error: any) => void,
): Promise<T | null> => {
  try {
    return await apiCall();
  } catch (error) {
    if (customErrorHandler) {
      customErrorHandler(error);
    } else {
      handleError(error as Error, context);
    }
    return null;
  }
};

// Retry utility for failed operations
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
  context?: ErrorContext,
): Promise<T | null> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        handleError(lastError, {
          ...context,
          additionalData: { retryAttempts: maxRetries },
        });
        return null;
      }

      // Exponential backoff
      const delay = delayMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));

      console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
    }
  }

  return null;
};

// Create specific error types for different scenarios
export const createChoreError = (
  code: ErrorCode,
  message?: string,
  context?: ErrorContext,
  recoverable: boolean = true,
) => {
  return new ChoreWorkflowError(
    message || ERROR_MESSAGES[code],
    code,
    context,
    recoverable,
  );
};

// Validation helpers
export const validateFileUpload = (file: File) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  if (file.size > maxSize) {
    throw createChoreError(ERROR_CODES.FILE_TOO_LARGE);
  }

  if (!allowedTypes.includes(file.type)) {
    throw createChoreError(ERROR_CODES.INVALID_FILE_TYPE);
  }

  return true;
};

export const validateChoreData = (choreData: any) => {
  if (!choreData.title || choreData.title.trim().length < 3) {
    throw createChoreError(
      ERROR_CODES.MISSING_REQUIRED_FIELD,
      "Chore title must be at least 3 characters long",
    );
  }

  if (
    typeof choreData.points !== "number" ||
    choreData.points < 1 ||
    choreData.points > 100
  ) {
    throw createChoreError(
      ERROR_CODES.INVALID_INPUT,
      "Points must be between 1 and 100",
    );
  }

  return true;
};
