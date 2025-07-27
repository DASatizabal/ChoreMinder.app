"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";

interface TutorialSystemProps {
  onComplete?: () => void;
  onSkip?: () => void;
  userRole: "parent" | "child" | "admin";
  isVisible: boolean;
  startTutorial?: string; // Specific tutorial to start
}

interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target?: string; // CSS selector for element to highlight
  placement: "top" | "bottom" | "left" | "right" | "center";
  action?: "click" | "hover" | "none";
  actionText?: string;
  skippable: boolean;
  showArrow: boolean;
  delay?: number; // ms to wait before showing
}

interface Tutorial {
  id: string;
  name: string;
  description: string;
  role: "parent" | "child" | "admin" | "all";
  category: "onboarding" | "feature" | "advanced";
  steps: TutorialStep[];
  estimatedTime: number; // minutes
  prerequisites?: string[]; // Other tutorial IDs
}

const TutorialSystem = ({
  onComplete,
  onSkip,
  userRole,
  isVisible,
  startTutorial,
}: TutorialSystemProps) => {
  const { data: session } = useSession();
  const [currentTutorial, setCurrentTutorial] = useState<Tutorial | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [highlightedElement, setHighlightedElement] = useState<Element | null>(
    null,
  );
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [completedTutorials, setCompletedTutorials] = useState<string[]>([]);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Tutorial definitions
  const tutorials: Tutorial[] = [
    // Parent Onboarding
    {
      id: "parent-getting-started",
      name: "Getting Started as a Parent",
      description: "Learn the basics of managing your family's chores",
      role: "parent",
      category: "onboarding",
      estimatedTime: 3,
      steps: [
        {
          id: "welcome",
          title: "Welcome to ChoreMinder! 👋",
          content:
            "Hi there! I'm here to help you get the most out of ChoreMinder. Let's take a quick tour of the key features that will help you manage your family's chores effectively.",
          placement: "center",
          action: "none",
          skippable: true,
          showArrow: false,
        },
        {
          id: "dashboard-overview",
          title: "Your Family Dashboard 📊",
          content:
            "This is your command center! Here you can see your family's chore progress, upcoming tasks, and recent activity. The cards show quick stats about what's happening in your household.",
          target: "[data-dashboard-overview]",
          placement: "bottom",
          action: "none",
          skippable: true,
          showArrow: true,
        },
        {
          id: "create-chore",
          title: "Creating Chores ➕",
          content:
            "Click here to create new chores for your family. You can assign them to specific children, set points, and even require photo verification. Try clicking this button!",
          target: "[data-create-chore-btn]",
          placement: "bottom",
          action: "click",
          actionText: "Click to create a chore",
          skippable: true,
          showArrow: true,
        },
        {
          id: "family-members",
          title: "Family Members 👨‍👩‍👧‍👦",
          content:
            "This section shows all your family members and their current status. You can invite new members, view their progress, and manage their roles from here.",
          target: "[data-family-members]",
          placement: "left",
          action: "none",
          skippable: true,
          showArrow: true,
        },
        {
          id: "notifications",
          title: "Stay Updated 🔔",
          content:
            "The notification bell keeps you informed about chore completions, photo submissions, and other family activities. Click it to see what's happening!",
          target: "[data-notifications]",
          placement: "bottom",
          action: "hover",
          actionText: "Hover to see notifications",
          skippable: true,
          showArrow: true,
        },
        {
          id: "mobile-friendly",
          title: "Mobile Ready 📱",
          content:
            "ChoreMinder works great on all devices! On mobile, you'll see a convenient tab bar at the bottom for easy navigation. Your family can manage chores from anywhere.",
          target: "[data-mobile-tab-bar]",
          placement: "top",
          action: "none",
          skippable: true,
          showArrow: true,
        },
        {
          id: "getting-started-complete",
          title: "You're All Set! 🎉",
          content:
            "Great job! You now know the basics of ChoreMinder. Start by creating your first chore or inviting family members. Remember, you can always access help from the menu. Happy chore managing!",
          placement: "center",
          action: "none",
          skippable: false,
          showArrow: false,
        },
      ],
    },

    // Child Onboarding
    {
      id: "child-getting-started",
      name: "Welcome, Young Champion!",
      description: "Learn how to rock your chores and earn awesome points",
      role: "child",
      category: "onboarding",
      estimatedTime: 2,
      steps: [
        {
          id: "welcome",
          title: "Hey There, Chore Champion! 🌟",
          content:
            "Welcome to your awesome chore adventure! I'm here to show you how to complete chores, earn points, and become the ultimate household hero. Ready to get started?",
          placement: "center",
          action: "none",
          skippable: true,
          showArrow: false,
        },
        {
          id: "your-chores",
          title: "Your Chore List 📝",
          content:
            "This is where you'll find all your chores! Each chore shows you how many points you can earn and how long it might take. The more chores you complete, the more points you earn!",
          target: "[data-child-chores]",
          placement: "bottom",
          action: "none",
          skippable: true,
          showArrow: true,
        },
        {
          id: "accept-chore",
          title: "Accept Your Mission 🚀",
          content:
            "When you get a new chore, you can accept it to start working! Click the accept button to begin your chore adventure. Don't worry - if you can't do it right now, you can let your parents know why.",
          target: "[data-accept-chore]",
          placement: "top",
          action: "click",
          actionText: "Try accepting a chore",
          skippable: true,
          showArrow: true,
        },
        {
          id: "photo-submission",
          title: "Show Your Work 📸",
          content:
            "For some chores, you'll need to take a photo to show you completed it! This is your chance to show off your amazing work. Parents love seeing the great job you've done!",
          target: "[data-photo-submit]",
          placement: "left",
          action: "none",
          skippable: true,
          showArrow: true,
        },
        {
          id: "points-progress",
          title: "Track Your Awesome Progress 🏆",
          content:
            "Watch your points grow as you complete chores! You can see your total points, current streak, and achievements. The more you help your family, the more points you earn!",
          target: "[data-points-display]",
          placement: "bottom",
          action: "none",
          skippable: true,
          showArrow: true,
        },
        {
          id: "help-support",
          title: "Need Help? We've Got You! 🆘",
          content:
            "If you ever get stuck or need help with a chore, just click the help button! You can ask questions, get tips, or request assistance from family members.",
          target: "[data-help-button]",
          placement: "top",
          action: "none",
          skippable: true,
          showArrow: true,
        },
        {
          id: "child-complete",
          title: "You're Ready to Be Amazing! ✨",
          content:
            "Fantastic! You're all set to start your chore journey. Remember: every chore you complete helps your family and earns you points. You're going to be an incredible help to your family!",
          placement: "center",
          action: "none",
          skippable: false,
          showArrow: false,
        },
      ],
    },

    // Advanced Features for Parents
    {
      id: "parent-advanced-features",
      name: "Advanced Parent Features",
      description: "Discover powerful tools for family management",
      role: "parent",
      category: "advanced",
      estimatedTime: 5,
      prerequisites: ["parent-getting-started"],
      steps: [
        {
          id: "workflow-monitoring",
          title: "Chore Workflow Monitoring 📊",
          content:
            "The workflow monitor shows you exactly where each chore stands in the completion process. You can see if chores are pending, in progress, or awaiting your approval.",
          target: "[data-workflow-monitor]",
          placement: "right",
          action: "none",
          skippable: true,
          showArrow: true,
        },
        {
          id: "photo-approval",
          title: "Photo Review & Approval 🔍",
          content:
            "When children submit photos, you can review them with detailed approval tools. Provide specific feedback to help your children improve and celebrate their successes!",
          target: "[data-photo-approval]",
          placement: "left",
          action: "hover",
          actionText: "Hover to see photo tools",
          skippable: true,
          showArrow: true,
        },
        {
          id: "assignment-wizard",
          title: "Smart Assignment Wizard 🧙‍♂️",
          content:
            "Use the assignment wizard to create detailed chores with smart recommendations based on your children's ages, preferences, and past performance.",
          target: "[data-assignment-wizard]",
          placement: "bottom",
          action: "none",
          skippable: true,
          showArrow: true,
        },
        {
          id: "family-analytics",
          title: "Family Analytics 📈",
          content:
            "View detailed analytics about your family's chore completion rates, point earnings, and trends over time. Use these insights to motivate and reward your children effectively.",
          target: "[data-analytics]",
          placement: "top",
          action: "none",
          skippable: true,
          showArrow: true,
        },
        {
          id: "notification-settings",
          title: "Notification Preferences ⚙️",
          content:
            "Customize how and when you receive notifications about chore activities. Set up reminders, escalations, and celebration messages to keep your family engaged.",
          target: "[data-notification-settings]",
          placement: "right",
          action: "none",
          skippable: true,
          showArrow: true,
        },
      ],
    },

    // Photo Features Tutorial
    {
      id: "photo-verification-guide",
      name: "Photo Verification Mastery",
      description: "Master the photo verification system",
      role: "all",
      category: "feature",
      estimatedTime: 3,
      steps: [
        {
          id: "photo-intro",
          title: "Photo Verification Power 📸",
          content:
            "Photo verification is one of ChoreMinder's most powerful features! It helps ensure chores are completed properly while building trust between family members.",
          placement: "center",
          action: "none",
          skippable: true,
          showArrow: false,
        },
        {
          id: "taking-photos",
          title: "Taking Great Photos 🎯",
          content:
            "When taking photos of completed chores, make sure to show the finished result clearly. Good lighting and multiple angles help parents see the great work that was done!",
          target: "[data-camera-btn]",
          placement: "bottom",
          action: "none",
          skippable: true,
          showArrow: true,
        },
        {
          id: "photo-guidelines",
          title: "Photo Guidelines 📋",
          content:
            "Follow these tips for the best photos: Show the whole area, include before/after if helpful, make sure it's well-lit, and capture any special details that show your hard work!",
          placement: "center",
          action: "none",
          skippable: true,
          showArrow: false,
        },
        {
          id: "review-process",
          title: "The Review Process ⭐",
          content:
            "Parents review photos to provide feedback and approve completed work. This isn't about being perfect - it's about learning, improving, and celebrating effort!",
          target: "[data-review-section]",
          placement: "top",
          action: "none",
          skippable: true,
          showArrow: true,
        },
      ],
    },
  ];

  useEffect(() => {
    if (startTutorial && isVisible) {
      const tutorial = tutorials.find((t) => t.id === startTutorial);
      if (tutorial && (tutorial.role === userRole || tutorial.role === "all")) {
        startSpecificTutorial(tutorial);
      }
    }
  }, [startTutorial, isVisible, userRole]);

  useEffect(() => {
    // Load completed tutorials from localStorage
    const saved = localStorage.getItem(
      `choreMinder-tutorials-${session?.user?.id}`,
    );
    if (saved) {
      setCompletedTutorials(JSON.parse(saved));
    }
  }, [session?.user?.id]);

  const startSpecificTutorial = (tutorial: Tutorial) => {
    // Check prerequisites
    if (tutorial.prerequisites) {
      const uncompletedPrereqs = tutorial.prerequisites.filter(
        (prereq) => !completedTutorials.includes(prereq),
      );
      if (uncompletedPrereqs.length > 0) {
        console.warn(
          `Tutorial ${tutorial.id} requires: ${uncompletedPrereqs.join(", ")}`,
        );
        return;
      }
    }

    setCurrentTutorial(tutorial);
    setCurrentStep(0);
    setIsActive(true);
    setShowOverlay(true);
  };

  const showStep = (step: TutorialStep) => {
    if (step.target) {
      const element = document.querySelector(step.target);
      if (element) {
        setHighlightedElement(element);

        // Calculate tooltip position
        const rect = element.getBoundingClientRect();
        const scrollTop =
          window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft =
          window.pageXOffset || document.documentElement.scrollLeft;

        let top = 0;
        let left = 0;

        switch (step.placement) {
          case "top":
            top = rect.top + scrollTop - 20;
            left = rect.left + scrollLeft + rect.width / 2;
            break;
          case "bottom":
            top = rect.bottom + scrollTop + 20;
            left = rect.left + scrollLeft + rect.width / 2;
            break;
          case "left":
            top = rect.top + scrollTop + rect.height / 2;
            left = rect.left + scrollLeft - 20;
            break;
          case "right":
            top = rect.top + scrollTop + rect.height / 2;
            left = rect.right + scrollLeft + 20;
            break;
          case "center":
          default:
            top = window.innerHeight / 2 + scrollTop;
            left = window.innerWidth / 2 + scrollLeft;
            break;
        }

        setTooltipPosition({ top, left });

        // Scroll element into view
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
      }
    } else {
      setHighlightedElement(null);
      setTooltipPosition({
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
      });
    }
  };

  const nextStep = () => {
    if (!currentTutorial) return;

    if (currentStep < currentTutorial.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTutorial();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipTutorial = () => {
    closeTutorial();
    if (onSkip) onSkip();
  };

  const completeTutorial = () => {
    if (currentTutorial) {
      const newCompleted = [...completedTutorials, currentTutorial.id];
      setCompletedTutorials(newCompleted);
      localStorage.setItem(
        `choreMinder-tutorials-${session?.user?.id}`,
        JSON.stringify(newCompleted),
      );
    }

    closeTutorial();
    if (onComplete) onComplete();
  };

  const closeTutorial = () => {
    setIsActive(false);
    setShowOverlay(false);
    setCurrentTutorial(null);
    setCurrentStep(0);
    setHighlightedElement(null);
  };

  useEffect(() => {
    if (isActive && currentTutorial) {
      const step = currentTutorial.steps[currentStep];
      if (step.delay) {
        setTimeout(() => showStep(step), step.delay);
      } else {
        showStep(step);
      }
    }
  }, [isActive, currentStep, currentTutorial]);

  const getAvailableTutorials = () => {
    return tutorials.filter((tutorial) => {
      // Check role
      if (tutorial.role !== "all" && tutorial.role !== userRole) return false;

      // Check if already completed
      if (completedTutorials.includes(tutorial.id)) return false;

      // Check prerequisites
      if (tutorial.prerequisites) {
        const uncompletedPrereqs = tutorial.prerequisites.filter(
          (prereq) => !completedTutorials.includes(prereq),
        );
        if (uncompletedPrereqs.length > 0) return false;
      }

      return true;
    });
  };

  const renderTutorialMenu = () => {
    const availableTutorials = getAvailableTutorials();

    return (
      <div className="dropdown dropdown-end">
        <label tabIndex={0} className="btn btn-ghost btn-circle">
          <div className="indicator">
            <span className="text-xl">🎓</span>
            {availableTutorials.length > 0 && (
              <span className="badge badge-xs badge-primary indicator-item">
                {availableTutorials.length}
              </span>
            )}
          </div>
        </label>

        <ul
          tabIndex={0}
          className="menu dropdown-content z-[1] p-2 shadow bg-base-100 rounded-box w-80 border-2 border-gray-200"
        >
          <li className="menu-title">
            <span>Available Tutorials</span>
          </li>

          {availableTutorials.length === 0 ? (
            <li>
              <span className="text-gray-500">All tutorials completed! 🎉</span>
            </li>
          ) : (
            availableTutorials.map((tutorial) => (
              <li key={tutorial.id}>
                <a
                  onClick={() => startSpecificTutorial(tutorial)}
                  className="flex flex-col items-start p-3"
                >
                  <div className="font-semibold">{tutorial.name}</div>
                  <div className="text-xs text-gray-500">
                    {tutorial.description}
                  </div>
                  <div className="flex gap-2 mt-1">
                    <div className="badge badge-xs badge-outline">
                      {tutorial.estimatedTime} min
                    </div>
                    <div className="badge badge-xs badge-primary">
                      {tutorial.category}
                    </div>
                  </div>
                </a>
              </li>
            ))
          )}

          <div className="divider my-1"></div>

          <li className="menu-title">
            <span>Completed ({completedTutorials.length})</span>
          </li>

          {completedTutorials.map((tutorialId) => {
            const tutorial = tutorials.find((t) => t.id === tutorialId);
            return tutorial ? (
              <li key={tutorialId}>
                <span className="flex items-center gap-2 text-gray-500">
                  <span>✅</span>
                  <span>{tutorial.name}</span>
                </span>
              </li>
            ) : null;
          })}
        </ul>
      </div>
    );
  };

  const renderActiveTooltip = () => {
    if (!isActive || !currentTutorial) return null;

    const step = currentTutorial.steps[currentStep];
    const isCenter = step.placement === "center" || !step.target;

    return (
      <>
        {/* Overlay */}
        {showOverlay && (
          <div
            ref={overlayRef}
            className="fixed inset-0 bg-black/50 z-[100]"
            style={{
              background: highlightedElement
                ? `radial-gradient(circle at ${tooltipPosition.left}px ${tooltipPosition.top}px, transparent 100px, rgba(0,0,0,0.5) 100px)`
                : "rgba(0,0,0,0.5)",
            }}
          />
        )}

        {/* Highlighted Element Border */}
        {highlightedElement && (
          <div
            className="fixed border-4 border-primary rounded-lg pointer-events-none z-[101]"
            style={{
              top:
                highlightedElement.getBoundingClientRect().top +
                window.pageYOffset -
                4,
              left:
                highlightedElement.getBoundingClientRect().left +
                window.pageXOffset -
                4,
              width: highlightedElement.getBoundingClientRect().width + 8,
              height: highlightedElement.getBoundingClientRect().height + 8,
            }}
          />
        )}

        {/* Tooltip */}
        <div
          className={`fixed z-[102] ${isCenter ? "transform -translate-x-1/2 -translate-y-1/2" : ""}`}
          style={{
            top: isCenter ? tooltipPosition.top : tooltipPosition.top,
            left: isCenter ? tooltipPosition.left : tooltipPosition.left,
            transform: isCenter
              ? "translate(-50%, -50%)"
              : step.placement === "top"
                ? "translate(-50%, -100%)"
                : step.placement === "bottom"
                  ? "translate(-50%, 0)"
                  : step.placement === "left"
                    ? "translate(-100%, -50%)"
                    : step.placement === "right"
                      ? "translate(0, -50%)"
                      : "none",
          }}
        >
          <div className="card bg-white shadow-2xl border-4 border-primary max-w-sm">
            <div className="card-body p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-primary">{step.title}</h3>
                <button
                  onClick={closeTutorial}
                  className="btn btn-ghost btn-sm btn-circle"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <p className="text-gray-700 mb-4">{step.content}</p>

              {/* Action Hint */}
              {step.action !== "none" && step.actionText && (
                <div className="alert alert-info mb-4">
                  <span className="text-sm">💡 {step.actionText}</span>
                </div>
              )}

              {/* Progress */}
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs text-gray-500">
                  Step {currentStep + 1} of {currentTutorial.steps.length}
                </div>
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{
                      width: `${((currentStep + 1) / currentTutorial.steps.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  {currentStep > 0 && (
                    <button
                      onClick={previousStep}
                      className="btn btn-ghost btn-sm"
                    >
                      ← Back
                    </button>
                  )}

                  {step.skippable && (
                    <button
                      onClick={skipTutorial}
                      className="btn btn-ghost btn-sm"
                    >
                      Skip Tour
                    </button>
                  )}
                </div>

                <button onClick={nextStep} className="btn btn-primary btn-sm">
                  {currentStep === currentTutorial.steps.length - 1
                    ? "Finish"
                    : "Next →"}
                </button>
              </div>
            </div>
          </div>

          {/* Arrow */}
          {step.showArrow && step.target && step.placement !== "center" && (
            <div
              className={`absolute w-0 h-0 ${
                step.placement === "top"
                  ? "border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white top-full left-1/2 transform -translate-x-1/2"
                  : step.placement === "bottom"
                    ? "border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-white bottom-full left-1/2 transform -translate-x-1/2"
                    : step.placement === "left"
                      ? "border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent border-l-white left-full top-1/2 transform -translate-y-1/2"
                      : step.placement === "right"
                        ? "border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-white right-full top-1/2 transform -translate-y-1/2"
                        : ""
              }`}
            />
          )}
        </div>
      </>
    );
  };

  return (
    <>
      {/* Tutorial Menu (always visible) */}
      {isVisible && renderTutorialMenu()}

      {/* Active Tutorial Tooltip */}
      {renderActiveTooltip()}
    </>
  );
};

// Tutorial Trigger Component
export const TutorialTrigger = ({
  tutorialId,
  children,
  className = "",
}: {
  tutorialId: string;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div data-tutorial-trigger={tutorialId} className={className}>
      {children}
    </div>
  );
};

// Tutorial Target Component
export const TutorialTarget = ({
  id,
  children,
  className = "",
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div data-tutorial-target={id} className={className}>
      {children}
    </div>
  );
};

export default TutorialSystem;
