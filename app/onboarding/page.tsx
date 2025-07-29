"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";

import SubscriptionGate from "@/components/SubscriptionGate";

export default function OnboardingPage() {
  return (
    <SubscriptionGate>
      <OnboardingContent />
    </SubscriptionGate>
  );
}

function OnboardingContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [familyName, setFamilyName] = useState("");

  const handleCreateFamily = async () => {
    if (!familyName.trim()) return;

    try {
      // Create family logic would go here
      // For now, redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Error creating family:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-4xl font-bold text-primary mb-4">
              Welcome to ChoreMinder!
            </h1>
            <p className="text-lg text-base-content/70">
              Thank you for your subscription! Let's set up your family in just
              a few steps.
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex justify-center mb-12">
            <ul className="steps steps-horizontal">
              <li className={`step ${step >= 1 ? "step-primary" : ""}`}>
                Welcome
              </li>
              <li className={`step ${step >= 2 ? "step-primary" : ""}`}>
                Family Setup
              </li>
              <li className={`step ${step >= 3 ? "step-primary" : ""}`}>
                Complete
              </li>
            </ul>
          </div>

          {/* Step Content */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              {step === 1 && (
                <div className="text-center">
                  <h2 className="card-title text-2xl mb-6 justify-center">
                    🎯 Ready to Transform Your Household?
                  </h2>
                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-4 p-4 bg-primary/10 rounded-lg">
                      <span className="text-2xl">✅</span>
                      <span>Subscription activated</span>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-secondary/10 rounded-lg">
                      <span className="text-2xl">👨‍👩‍👧‍👦</span>
                      <span>Create and invite your family</span>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-accent/10 rounded-lg">
                      <span className="text-2xl">📋</span>
                      <span>Set up chores and rewards</span>
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={() => setStep(2)}
                  >
                    Let's Get Started!
                  </button>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h2 className="card-title text-2xl mb-6">
                    🏠 Create Your Family
                  </h2>
                  <div className="form-control mb-6">
                    <label className="label">
                      <span className="label-text text-lg">
                        What should we call your family?
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., The Smith Family"
                      className="input input-bordered input-lg"
                      value={familyName}
                      onChange={(e) => setFamilyName(e.target.value)}
                    />
                    <label className="label">
                      <span className="label-text-alt">
                        This helps personalize the experience for everyone
                      </span>
                    </label>
                  </div>
                  <div className="flex gap-4">
                    <button
                      className="btn btn-outline"
                      onClick={() => setStep(1)}
                    >
                      Back
                    </button>
                    <button
                      className="btn btn-primary flex-1"
                      onClick={handleCreateFamily}
                      disabled={!familyName.trim()}
                    >
                      Create Family & Continue
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Skip Option */}
          <div className="text-center mt-8">
            <button
              className="btn btn-ghost"
              onClick={() => router.push("/dashboard")}
            >
              Skip for now, go to dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
