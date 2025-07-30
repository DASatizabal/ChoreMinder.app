"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  let errorMessage = "An error occurred during authentication.";
  let errorDescription =
    "Please try again or contact support if the problem persists.";

  // Handle different error types
  switch (error) {
    case "AccessDenied":
      errorMessage = "Access Denied";
      errorDescription =
        "This email address is not authorized to create an account. Please contact support if you believe this is an error.";
      break;
    case "Configuration":
      errorMessage = "Configuration Error";
      errorDescription =
        "There is a problem with the server configuration. Please contact support.";
      break;
    case "Verification":
      errorMessage = "Verification Error";
      errorDescription =
        "The verification link is invalid or has expired. Please try signing in again.";
      break;
    default:
      errorMessage = "Authentication Error";
      errorDescription =
        "Something went wrong during the sign-in process. Please try again.";
  }

  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center p-8">
        <div className="text-6xl mb-6">🚫</div>

        <h1 className="text-3xl font-bold text-error mb-4">{errorMessage}</h1>

        <p className="text-base-content/70 mb-8 leading-relaxed">
          {errorDescription}
        </p>

        <div className="space-y-4">
          <Link href="/" className="btn btn-primary btn-wide">
            Return to Homepage
          </Link>

          <div className="text-sm text-base-content/50">
            Error Code: {error || "Unknown"}
          </div>
        </div>

        {error === "AccessDenied" && (
          <div className="mt-8 p-4 bg-warning/10 rounded-lg border border-warning/20">
            <p className="text-sm text-warning-content">
              <strong>Note:</strong> If you believe you should have access,
              please contact the administrator.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="mt-4 text-lg">Loading...</p>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}
