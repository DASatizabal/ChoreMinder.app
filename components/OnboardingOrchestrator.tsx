"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

import FamilySetupWizard from "./FamilySetupWizard";
import InitialChoreSetup from "./InitialChoreSetup";
import MemberInvitation from "./MemberInvitation";
import TutorialSystem from "./TutorialSystem";

interface OnboardingOrchestratorProps {
  currentStep?:
    | "family-setup"
    | "member-invitation"
    | "chore-setup"
    | "tutorial"
    | "complete";
  onComplete: () => void;
  existingFamily?: FamilyData;
}

interface FamilyData {
  id?: string;
  name: string;
  description: string;
  rules: string[];
  settings: {
    allowChildDecline: boolean;
    requirePhotoVerification: boolean;
    pointsEnabled: boolean;
    reminderFrequency: "daily" | "weekly" | "custom";
    timezone: string;
  };
  members: FamilyMember[];
  kids: KidData[];
}

interface KidData {
  name: string;
  email: string;
  invited: boolean;
  tempId: string;
}

interface FamilyMember {
  name: string;
  email: string;
  role: "parent" | "child";
  age?: number;
  preferences: {
    favoriteChores: string[];
    notifications: boolean;
    reminderTime: string;
  };
  invited?: boolean;
  tempId?: string;
}

const OnboardingOrchestrator = ({
  currentStep = "family-setup",
  onComplete,
  existingFamily,
}: OnboardingOrchestratorProps) => {
  const { data: session } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(currentStep);
  const [familyData, setFamilyData] = useState<FamilyData | null>(
    existingFamily || null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [onboardingProgress, setOnboardingProgress] = useState({
    familyCreated: !!existingFamily,
    membersInvited: false,
    choresCreated: false,
    tutorialCompleted: false,
  });

  useEffect(() => {
    // Load onboarding progress from localStorage
    const savedProgress = localStorage.getItem(
      `onboarding-progress-${session?.user?.id}`,
    );
    if (savedProgress) {
      setOnboardingProgress(JSON.parse(savedProgress));
    }
  }, [session?.user?.id]);

  const saveProgress = (progress: typeof onboardingProgress) => {
    setOnboardingProgress(progress);
    localStorage.setItem(
      `onboarding-progress-${session?.user?.id}`,
      JSON.stringify(progress),
    );
  };

  const handleFamilySetupComplete = (family: FamilyData) => {
    setFamilyData(family);
    const newProgress = { ...onboardingProgress, familyCreated: true };
    saveProgress(newProgress);

    toast.success(
      "🎉 Family created successfully! Now let's invite some members.",
      {
        duration: 5000,
      },
    );

    setStep("member-invitation");
  };

  const handleMemberInvitationComplete = () => {
    const newProgress = { ...onboardingProgress, membersInvited: true };
    saveProgress(newProgress);

    toast.success(
      "📧 Great! Invitations sent. Let's set up some starter chores.",
      {
        duration: 4000,
      },
    );

    setStep("chore-setup");
  };

  const handleChoreSetupComplete = () => {
    const newProgress = { ...onboardingProgress, choresCreated: true };
    saveProgress(newProgress);

    toast.success(
      "📋 Awesome! Your chores are ready. Time for a quick tutorial!",
      {
        duration: 4000,
      },
    );

    setStep("tutorial");
  };

  const handleTutorialComplete = () => {
    const newProgress = { ...onboardingProgress, tutorialCompleted: true };
    saveProgress(newProgress);

    toast.success("🎓 Onboarding complete! Welcome to ChoreMinder!", {
      duration: 6000,
      icon: "🎉",
    });

    // Clear onboarding progress
    localStorage.removeItem(`onboarding-progress-${session?.user?.id}`);

    setStep("complete");
    onComplete();
  };

  const skipStep = () => {
    switch (step) {
      case "family-setup":
        toast(
          "Family setup skipped. You can create a family later from your dashboard.",
          { icon: "ℹ️" },
        );
        setStep("complete");
        onComplete();
        break;
      case "member-invitation":
        toast(
          "Member invitations skipped. You can invite family members later.",
          { icon: "ℹ️" },
        );
        setStep("chore-setup");
        break;
      case "chore-setup":
        toast(
          "Chore setup skipped. You can create chores from your dashboard.",
          { icon: "ℹ️" },
        );
        setStep("tutorial");
        break;
      case "tutorial":
        toast("Tutorial skipped. You can access help anytime from the menu.", {
          icon: "ℹ️",
        });
        handleTutorialComplete();
        break;
    }
  };

  const getStepProgress = () => {
    const steps = [
      "family-setup",
      "member-invitation",
      "chore-setup",
      "tutorial",
    ];
    const currentIndex = steps.indexOf(step);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  const getStepTitle = () => {
    switch (step) {
      case "family-setup":
        return "Create Your Family";
      case "member-invitation":
        return "Invite Family Members";
      case "chore-setup":
        return "Set Up Initial Chores";
      case "tutorial":
        return "Learn the Basics";
      case "complete":
        return "Welcome to ChoreMinder!";
      default:
        return "Getting Started";
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case "family-setup":
        return "Let's create your family profile and set up your preferences";
      case "member-invitation":
        return "Invite parents and children to join your family";
      case "chore-setup":
        return "Create some starter chores to get your family going";
      case "tutorial":
        return "Take a quick tour to learn how everything works";
      case "complete":
        return "You're all set up and ready to start managing chores!";
      default:
        return "Setting up your ChoreMinder experience";
    }
  };

  if (step === "complete") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-2xl px-6">
          <div className="text-8xl mb-6">🎉</div>

          <h1 className="text-4xl font-bold text-primary mb-4">
            Welcome to ChoreMinder!
          </h1>

          <p className="text-xl text-gray-700 mb-8">
            Your family is all set up and ready to start managing chores
            together. Here's what you can do next:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="card bg-white shadow-lg border-2 border-primary/20">
              <div className="card-body p-6 text-center">
                <div className="text-4xl mb-3">📋</div>
                <h3 className="font-bold text-lg mb-2">Manage Chores</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Create, assign, and track chores for your family members
                </p>
                <button
                  onClick={() => router.push("/dashboard/parent/chores")}
                  className="btn btn-primary btn-sm"
                >
                  Go to Chores
                </button>
              </div>
            </div>

            <div className="card bg-white shadow-lg border-2 border-primary/20">
              <div className="card-body p-6 text-center">
                <div className="text-4xl mb-3">👨‍👩‍👧‍👦</div>
                <h3 className="font-bold text-lg mb-2">Family Dashboard</h3>
                <p className="text-sm text-gray-600 mb-4">
                  View your family's progress and activity
                </p>
                <button
                  onClick={() => router.push("/dashboard/parent")}
                  className="btn btn-secondary btn-sm"
                >
                  View Dashboard
                </button>
              </div>
            </div>
          </div>

          <div className="alert alert-success">
            <span className="text-lg">💡</span>
            <div>
              <p className="font-semibold">Pro Tips for Success:</p>
              <ul className="text-sm mt-2 space-y-1 text-left">
                <li>• Start with simple, age-appropriate chores</li>
                <li>• Use photo verification to celebrate good work</li>
                <li>• Check in regularly and provide encouraging feedback</li>
                <li>
                  • Adjust points and rewards based on what motivates your kids
                </li>
              </ul>
            </div>
          </div>

          <button onClick={onComplete} className="btn btn-primary btn-lg">
            🚀 Start Using ChoreMinder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Progress Header */}
      <div className="bg-white shadow-lg border-b-2 border-primary/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-primary">
                {getStepTitle()}
              </h1>
              <p className="text-gray-600 text-sm">{getStepDescription()}</p>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">
                Onboarding Progress
              </div>
              <div className="w-32 bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${getStepProgress()}%` }}
                />
              </div>
            </div>
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div
              className={`flex items-center ${onboardingProgress.familyCreated ? "text-green-600" : step === "family-setup" ? "text-primary" : "text-gray-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${onboardingProgress.familyCreated ? "bg-green-100" : step === "family-setup" ? "bg-primary text-white" : "bg-gray-200"}`}
              >
                {onboardingProgress.familyCreated ? "✓" : "1"}
              </div>
              <span className="ml-2 text-sm font-medium hidden sm:inline">
                Family
              </span>
            </div>

            <div className="flex-1 h-1 mx-3 bg-gray-200 rounded">
              <div
                className={`h-full rounded transition-all ${onboardingProgress.familyCreated ? "bg-green-400" : "bg-gray-200"}`}
              />
            </div>

            <div
              className={`flex items-center ${onboardingProgress.membersInvited ? "text-green-600" : step === "member-invitation" ? "text-primary" : "text-gray-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${onboardingProgress.membersInvited ? "bg-green-100" : step === "member-invitation" ? "bg-primary text-white" : "bg-gray-200"}`}
              >
                {onboardingProgress.membersInvited ? "✓" : "2"}
              </div>
              <span className="ml-2 text-sm font-medium hidden sm:inline">
                Members
              </span>
            </div>

            <div className="flex-1 h-1 mx-3 bg-gray-200 rounded">
              <div
                className={`h-full rounded transition-all ${onboardingProgress.membersInvited ? "bg-green-400" : "bg-gray-200"}`}
              />
            </div>

            <div
              className={`flex items-center ${onboardingProgress.choresCreated ? "text-green-600" : step === "chore-setup" ? "text-primary" : "text-gray-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${onboardingProgress.choresCreated ? "bg-green-100" : step === "chore-setup" ? "bg-primary text-white" : "bg-gray-200"}`}
              >
                {onboardingProgress.choresCreated ? "✓" : "3"}
              </div>
              <span className="ml-2 text-sm font-medium hidden sm:inline">
                Chores
              </span>
            </div>

            <div className="flex-1 h-1 mx-3 bg-gray-200 rounded">
              <div
                className={`h-full rounded transition-all ${onboardingProgress.choresCreated ? "bg-green-400" : "bg-gray-200"}`}
              />
            </div>

            <div
              className={`flex items-center ${onboardingProgress.tutorialCompleted ? "text-green-600" : step === "tutorial" ? "text-primary" : "text-gray-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${onboardingProgress.tutorialCompleted ? "bg-green-100" : step === "tutorial" ? "bg-primary text-white" : "bg-gray-200"}`}
              >
                {onboardingProgress.tutorialCompleted ? "✓" : "4"}
              </div>
              <span className="ml-2 text-sm font-medium hidden sm:inline">
                Tutorial
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="container mx-auto px-4 py-8">
        {step === "family-setup" && (
          <FamilySetupWizard
            onComplete={handleFamilySetupComplete}
            onSkip={skipStep}
            existingFamily={familyData || undefined}
          />
        )}

        {step === "member-invitation" && familyData && (
          <div className="max-w-4xl mx-auto">
            <MemberInvitation
              familyId={familyData.id || ""}
              familyName={familyData.name}
              onInvitationSent={() => {}}
            />

            <div className="text-center mt-8">
              <button
                onClick={handleMemberInvitationComplete}
                className="btn btn-primary btn-lg mr-4"
              >
                Continue to Chore Setup →
              </button>
              <button onClick={skipStep} className="btn btn-ghost">
                Skip for Now
              </button>
            </div>
          </div>
        )}

        {step === "chore-setup" && familyData && (
          <InitialChoreSetup
            familyId={familyData.id || ""}
            familyMembers={familyData.members as any}
            onComplete={handleChoreSetupComplete}
            onSkip={skipStep}
          />
        )}

        {step === "tutorial" && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="card bg-white shadow-2xl border-2 border-primary/20">
              <div className="card-body p-8">
                <div className="text-6xl mb-6">🎓</div>
                <h2 className="text-2xl font-bold mb-4">
                  Ready for Your Tutorial?
                </h2>
                <p className="text-gray-700 mb-6">
                  Take a quick 3-minute tour to learn how ChoreMinder works.
                  This will help you get the most out of your family's chore
                  management experience.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => {
                      // Start the tutorial
                      setTimeout(handleTutorialComplete, 2000); // Simulate tutorial completion
                    }}
                    className="btn btn-primary btn-lg"
                  >
                    🚀 Start Tutorial
                  </button>
                  <button onClick={skipStep} className="btn btn-ghost">
                    Skip Tutorial
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tutorial System */}
      <TutorialSystem
        userRole="parent"
        isVisible={step === "tutorial"}
        startTutorial="parent-getting-started"
        onComplete={handleTutorialComplete}
        onSkip={skipStep}
      />
    </div>
  );
};

export default OnboardingOrchestrator;
