"use client";

import React, { Component, ReactNode } from "react";
import toast from "react-hot-toast";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Show user-friendly error toast
    toast.error("Something went wrong. Please try again or contact support if the problem persists.", {
      duration: 8000,
      icon: "🚨"
    });

    // Log error to external service in production
    if (process.env.NODE_ENV === "production") {
      this.logErrorToService(error, errorInfo);
    }
  }

  private logErrorToService = (error: Error, errorInfo: React.ErrorInfo) => {
    // In a real app, you'd send this to your error tracking service
    // Example: Sentry, LogRocket, Bugsnag, etc.
    try {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: null, // Would get from session
      };

      // console.log("Error report:", errorReport);
      // fetch('/api/errors', { method: 'POST', body: JSON.stringify(errorReport) });
    } catch (loggingError) {
      console.error("Failed to log error:", loggingError);
    }
  };

  private retry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full">
            <div className="card bg-white shadow-2xl border-2 border-red-200">
              <div className="card-body p-8 text-center">
                <div className="text-6xl mb-6">🚨</div>
                
                <h1 className="text-3xl font-bold text-red-600 mb-4">
                  Oops! Something went wrong
                </h1>
                
                <p className="text-gray-700 mb-6">
                  We're sorry, but something unexpected happened. Our team has been notified 
                  and we're working to fix this issue.
                </p>

                <div className="space-y-4">
                  <button
                    onClick={this.retry}
                    className="btn btn-primary btn-lg"
                  >
                    🔄 Try Again
                  </button>
                  
                  <button
                    onClick={() => window.location.href = "/dashboard"}
                    className="btn btn-ghost"
                  >
                    🏠 Go to Dashboard
                  </button>
                </div>

                {/* Development error details */}
                {process.env.NODE_ENV === "development" && this.state.error && (
                  <details className="mt-8 text-left">
                    <summary className="cursor-pointer text-sm font-medium text-gray-600 mb-2">
                      🔍 Error Details (Development Only)
                    </summary>
                    <div className="bg-gray-100 p-4 rounded-lg text-xs">
                      <div className="mb-2">
                        <strong>Error:</strong> {this.state.error.message}
                      </div>
                      <div className="mb-2">
                        <strong>Stack:</strong>
                        <pre className="mt-1 whitespace-pre-wrap">{this.state.error.stack}</pre>
                      </div>
                      {this.state.errorInfo && (
                        <div>
                          <strong>Component Stack:</strong>
                          <pre className="mt-1 whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}

                <div className="alert alert-info mt-6">
                  <span className="text-lg">💡</span>
                  <div className="text-left">
                    <p className="font-semibold">What you can do:</p>
                    <ul className="text-sm mt-2 space-y-1">
                      <li>• Try refreshing the page</li>
                      <li>• Clear your browser cache</li>
                      <li>• Check your internet connection</li>
                      <li>• Contact support if the issue persists</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// Hook for handling async errors
export const useErrorHandler = () => {
  const handleError = (error: Error, context?: string) => {
    console.error(`Error${context ? ` in ${context}` : ""}:`, error);
    
    // Show user-friendly error message
    const userMessage = getUserFriendlyErrorMessage(error);
    toast.error(userMessage, {
      duration: 6000,
      icon: "⚠️"
    });

    // Log to external service in production
    if (process.env.NODE_ENV === "production") {
      logAsyncError(error, context);
    }
  };

  return { handleError };
};

// Get user-friendly error messages
const getUserFriendlyErrorMessage = (error: Error): string => {
  const message = error.message.toLowerCase();

  if (message.includes("network") || message.includes("fetch")) {
    return "Network error. Please check your internet connection and try again.";
  }
  
  if (message.includes("unauthorized") || message.includes("401")) {
    return "Your session has expired. Please log in again.";
  }
  
  if (message.includes("forbidden") || message.includes("403")) {
    return "You don't have permission to perform this action.";
  }
  
  if (message.includes("not found") || message.includes("404")) {
    return "The requested resource was not found.";
  }
  
  if (message.includes("server") || message.includes("500")) {
    return "Server error. Please try again in a few moments.";
  }
  
  if (message.includes("validation") || message.includes("invalid")) {
    return "Please check your input and try again.";
  }
  
  if (message.includes("timeout")) {
    return "Request timed out. Please try again.";
  }

  return "Something went wrong. Please try again or contact support if the issue persists.";
};

// Log async errors to external service
const logAsyncError = (error: Error, context?: string) => {
  try {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      type: "async_error"
    };

    // In production, send to error tracking service
    // fetch('/api/errors', { method: 'POST', body: JSON.stringify(errorReport) });
    console.log("Async error report:", errorReport);
  } catch (loggingError) {
    console.error("Failed to log async error:", loggingError);
  }
};

// Wrapper for API calls with automatic error handling
export const withErrorHandling = async <T>(
  apiCall: () => Promise<T>,
  context?: string,
  customErrorHandler?: (error: Error) => void
): Promise<T | null> => {
  try {
    return await apiCall();
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    if (customErrorHandler) {
      customErrorHandler(errorObj);
    } else {
      const userMessage = getUserFriendlyErrorMessage(errorObj);
      toast.error(userMessage, {
        duration: 6000,
        icon: "⚠️"
      });
    }

    // Log error
    console.error(`API Error${context ? ` in ${context}` : ""}:`, errorObj);
    
    if (process.env.NODE_ENV === "production") {
      logAsyncError(errorObj, context);
    }

    return null;
  }
};