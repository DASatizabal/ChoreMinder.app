"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

import config from "@/config";

interface FamilySetupWizardProps {
  onComplete: (familyData: FamilyData) => void;
  onSkip?: () => void;
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

interface WizardStep {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
  isValid: boolean;
  isOptional: boolean;
}

const FamilySetupWizard = ({
  onComplete,
  onSkip,
  existingFamily,
}: FamilySetupWizardProps) => {
  const { data: session } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [numberOfKids, setNumberOfKids] = useState(1);
  const [userPlan, setUserPlan] = useState<string | null>(null);
  const [familyData, setFamilyData] = useState<FamilyData>({
    name: "",
    description: "",
    rules: [
      "Be respectful",
      "Complete chores on time",
      "Ask for help when needed",
    ],
    settings: {
      allowChildDecline: true,
      requirePhotoVerification: false,
      pointsEnabled: true,
      reminderFrequency: "daily",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    members: [],
    kids: [],
  });

  // Initialize with existing family data if editing
  useEffect(() => {
    if (existingFamily) {
      setFamilyData(existingFamily);
    }
  }, [existingFamily]);

  // Fetch user plan information
  useEffect(() => {
    const fetchUserPlan = async () => {
      try {
        const response = await fetch("/api/user/plan");
        if (response.ok) {
          const data = await response.json();
          setUserPlan(data.planName);
        }
      } catch (error) {
        console.error("Error fetching user plan:", error);
      }
    };

    if (session?.user) {
      fetchUserPlan();
    }
  }, [session]);

  // Helper function to get max kids based on plan
  const getMaxKids = () => {
    if (!userPlan) return 10; // Default to max if plan not loaded yet

    const plan = config.stripe.plans.find((p) => p.name === userPlan);
    if (!plan) return 10;

    const kidsFeature = plan.features.find(
      (f) =>
        f.name.toLowerCase().includes("kids") ||
        f.name.toLowerCase().includes("kid"),
    );

    if (kidsFeature) {
      const match = kidsFeature.name.match(/(\d+)/);
      return match ? parseInt(match[1]) : 10;
    }

    return 10;
  };

  const predefinedRules = [
    "Be respectful to family members",
    "Complete chores on time",
    "Ask for help when needed",
    "Take responsibility for mistakes",
    "Communicate openly about problems",
    "Celebrate each other's successes",
    "Keep common areas clean",
    "Help without being asked",
    "Be honest about completed work",
    "Show appreciation for others' efforts",
  ];

  const choreCategories = [
    "Cleaning",
    "Kitchen",
    "Laundry",
    "Outdoor",
    "Pet Care",
    "Homework",
    "Organization",
    "Maintenance",
    "Shopping",
  ];

  const validateFamilyInfo = () => {
    return familyData.name.trim().length >= 3;
  };

  const validateMembers = () => {
    return (
      familyData.members.length >= 1 &&
      familyData.members.every((m) => m.name.trim() && m.email.trim() && m.role)
    );
  };

  const validateSettings = () => {
    return true; // Settings have defaults, so always valid
  };

  const validateKidsSetup = () => {
    return familyData.kids.every(
      (kid) => kid.name.trim().length > 0 && kid.email.trim().length > 0,
    );
  };

  const steps: WizardStep[] = [
    {
      id: "welcome",
      title: "Welcome to ChoreMinder!",
      description:
        "Let's set up your family and get started with smart chore management",
      component: renderWelcomeStep(),
      isValid: true,
      isOptional: false,
    },
    {
      id: "family-info",
      title: "Family Information",
      description: "Tell us about your family",
      component: renderFamilyInfoStep(),
      isValid: validateFamilyInfo(),
      isOptional: false,
    },
    {
      id: "kids-setup",
      title: "Kids Setup",
      description: "Add your children to the family",
      component: renderKidsSetupStep(),
      isValid: validateKidsSetup(),
      isOptional: false,
    },
    {
      id: "family-rules",
      title: "Family Rules",
      description: "Set expectations and guidelines",
      component: renderFamilyRulesStep(),
      isValid: true,
      isOptional: true,
    },
    {
      id: "add-members",
      title: "Add Family Members",
      description: "Invite parents and children to join",
      component: renderAddMembersStep(),
      isValid: validateMembers(),
      isOptional: false,
    },
    {
      id: "family-settings",
      title: "Family Settings",
      description: "Configure how your family uses ChoreMinder",
      component: renderFamilySettingsStep(),
      isValid: validateSettings(),
      isOptional: true,
    },
    {
      id: "review",
      title: "Review & Complete",
      description: "Review your setup and create your family",
      component: renderReviewStep(),
      isValid: true,
      isOptional: false,
    },
  ];

  function renderWelcomeStep() {
    return (
      <div className="text-center space-y-6">
        <div className="text-8xl mb-6">👨‍👩‍👧‍👦</div>

        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-primary">
            Welcome to ChoreMinder!
          </h3>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            ChoreMinder helps families organize household tasks, teach
            responsibility, and celebrate achievements together. Let's get your
            family set up in just a few minutes!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
            <div className="card-body p-6 text-center">
              <div className="text-4xl mb-3">📋</div>
              <h4 className="font-bold text-blue-700">Smart Assignment</h4>
              <p className="text-sm text-blue-600">
                AI-powered chore recommendations based on age, skills, and
                preferences
              </p>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
            <div className="card-body p-6 text-center">
              <div className="text-4xl mb-3">📸</div>
              <h4 className="font-bold text-green-700">Photo Verification</h4>
              <p className="text-sm text-green-600">
                Kids submit photos of completed work for parent approval
              </p>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200">
            <div className="card-body p-6 text-center">
              <div className="text-4xl mb-3">🏆</div>
              <h4 className="font-bold text-purple-700">Rewards & Growth</h4>
              <p className="text-sm text-purple-600">
                Points, achievements, and progress tracking to motivate kids
              </p>
            </div>
          </div>
        </div>

        <div className="alert alert-info mt-6">
          <span className="text-lg">💡</span>
          <span>
            <strong>Tip:</strong> This setup takes about 5 minutes. You can
            always modify these settings later!
          </span>
        </div>
      </div>
    );
  }

  function renderFamilyInfoStep() {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏠</div>
          <h3 className="text-xl font-bold mb-2">Tell Us About Your Family</h3>
          <p className="text-gray-600">
            This information helps us personalize your ChoreMinder experience
          </p>
        </div>

        <div className="max-w-md mx-auto space-y-6">
          {/* Family Name */}
          <div>
            <label className="label">
              <span className="label-text font-bold">Family Name *</span>
            </label>
            <input
              type="text"
              placeholder="e.g., The Johnson Family"
              value={familyData.name}
              onChange={(e) =>
                setFamilyData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="input input-bordered w-full"
              maxLength={50}
            />
            <div className="label">
              <span className="label-text-alt text-gray-500">
                {familyData.name.length}/50 characters
              </span>
            </div>
          </div>

          {/* Family Description */}
          <div>
            <label className="label">
              <span className="label-text font-bold">
                Family Description (Optional)
              </span>
            </label>
            <textarea
              placeholder="Tell us what makes your family special..."
              value={familyData.description}
              onChange={(e) =>
                setFamilyData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="textarea textarea-bordered w-full"
              rows={3}
              maxLength={200}
            />
            <div className="label">
              <span className="label-text-alt text-blue-600">
                💡 This helps us suggest age-appropriate chores and activities
              </span>
            </div>
          </div>

          {/* Timezone */}
          <div>
            <label className="label">
              <span className="label-text font-bold">Timezone</span>
            </label>
            <select
              value={familyData.settings.timezone}
              onChange={(e) =>
                setFamilyData((prev) => ({
                  ...prev,
                  settings: { ...prev.settings, timezone: e.target.value },
                }))
              }
              className="select select-bordered w-full"
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  function renderKidsSetupStep() {
    const maxKids = getMaxKids();

    // Initialize kids array if empty
    if (familyData.kids.length === 0) {
      const newKids: KidData[] = Array.from(
        { length: numberOfKids },
        (_, index) => ({
          name: "",
          email: "",
          invited: false,
          tempId: `kid_${Date.now()}_${index}`,
        }),
      );
      setFamilyData((prev) => ({ ...prev, kids: newKids }));
    }

    const updateNumberOfKids = (num: number) => {
      setNumberOfKids(num);

      // Create new kids array with the right length
      const newKids: KidData[] = Array.from({ length: num }, (_, index) => {
        // Keep existing kid data if it exists
        const existingKid = familyData.kids[index];
        return (
          existingKid || {
            name: "",
            email: "",
            invited: false,
            tempId: `kid_${Date.now()}_${index}`,
          }
        );
      });

      setFamilyData((prev) => ({ ...prev, kids: newKids }));
    };

    const updateKid = (index: number, updates: Partial<KidData>) => {
      setFamilyData((prev) => ({
        ...prev,
        kids: prev.kids.map((kid, i) =>
          i === index ? { ...kid, ...updates } : kid,
        ),
      }));
    };

    const sendInvite = async (kidIndex: number) => {
      const kid = familyData.kids[kidIndex];
      if (!kid.name || !kid.email) {
        toast.error("Please fill in name and email before sending invite");
        return;
      }

      try {
        // This would be implemented to send an actual invite
        toast.success(`Invite sent to ${kid.name}!`);
        updateKid(kidIndex, { invited: true });
      } catch (error) {
        toast.error("Failed to send invite");
      }
    };

    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">👶</div>
          <h3 className="text-xl font-bold mb-2">Add Your Kids</h3>
          <p className="text-gray-600">
            Let's set up accounts for your children so they can start helping
            with chores!
          </p>
          {userPlan && (
            <div className="badge badge-primary mt-2">
              {userPlan} - Up to {maxKids} kids
            </div>
          )}
        </div>

        {/* Number of Kids Selector */}
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
          <div className="card-body p-6 text-center">
            <h4 className="font-bold mb-4 text-blue-700">
              How many kids do you have?
            </h4>
            <select
              value={numberOfKids}
              onChange={(e) => updateNumberOfKids(parseInt(e.target.value))}
              className="select select-bordered w-full max-w-xs mx-auto"
            >
              {Array.from({ length: maxKids }, (_, i) => i + 1).map((num) => (
                <option key={num} value={num}>
                  {num} kid{num > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Kids Input Fields */}
        <div className="space-y-4">
          {familyData.kids.map((kid, index) => (
            <div
              key={kid.tempId}
              className="card bg-white shadow-lg border-2 border-gray-200"
            >
              <div className="card-body p-6">
                <h4 className="font-bold mb-4">
                  {index === 0
                    ? "1st"
                    : index === 1
                      ? "2nd"
                      : index === 2
                        ? "3rd"
                        : `${index + 1}th`}{" "}
                  Kid
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Kid's Name */}
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">
                        {index === 0
                          ? "1st"
                          : index === 1
                            ? "2nd"
                            : index === 2
                              ? "3rd"
                              : `${index + 1}th`}{" "}
                        Kid's Name *
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter kid's name"
                      value={kid.name}
                      onChange={(e) =>
                        updateKid(index, { name: e.target.value })
                      }
                      className="input input-bordered w-full"
                    />
                  </div>

                  {/* Kid's Email */}
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">
                        {index === 0
                          ? "1st"
                          : index === 1
                            ? "2nd"
                            : index === 2
                              ? "3rd"
                              : `${index + 1}th`}{" "}
                        Kid's Email Address *
                      </span>
                    </label>
                    <input
                      type="email"
                      placeholder="Enter kid's email"
                      value={kid.email}
                      onChange={(e) =>
                        updateKid(index, { email: e.target.value })
                      }
                      className="input input-bordered w-full"
                    />
                  </div>
                </div>

                {/* Send Invite Button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => sendInvite(index)}
                    disabled={!kid.name || !kid.email || kid.invited}
                    className={`btn ${kid.invited ? "btn-success" : "btn-primary"}`}
                  >
                    {kid.invited ? <>✓ Invite Sent</> : <>📧 Send Invite</>}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="alert alert-info">
          <span className="text-lg">💡</span>
          <span>
            <strong>Tip:</strong> Your kids will receive email invitations to
            join your family. They can use these to create their accounts and
            start receiving chore assignments!
          </span>
        </div>
      </div>
    );
  }

  function renderFamilyRulesStep() {
    const addRule = (rule: string) => {
      if (!familyData.rules.includes(rule)) {
        setFamilyData((prev) => ({
          ...prev,
          rules: [...prev.rules, rule],
        }));
      }
    };

    const removeRule = (index: number) => {
      setFamilyData((prev) => ({
        ...prev,
        rules: prev.rules.filter((_, i) => i !== index),
      }));
    };

    const addCustomRule = () => {
      const customRule = (
        document.getElementById("custom-rule") as HTMLInputElement
      )?.value;
      if (customRule && customRule.trim()) {
        addRule(customRule.trim());
        (document.getElementById("custom-rule") as HTMLInputElement).value = "";
      }
    };

    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">📜</div>
          <h3 className="text-xl font-bold mb-2">
            Family Rules & Expectations
          </h3>
          <p className="text-gray-600">
            Set clear guidelines that help everyone understand what's expected
          </p>
        </div>

        {/* Current Rules */}
        <div className="card bg-white shadow-lg border-2 border-primary/20">
          <div className="card-body p-6">
            <h4 className="font-bold mb-4">Your Family Rules:</h4>

            {familyData.rules.length === 0 ? (
              <p className="text-gray-500 italic">No rules added yet</p>
            ) : (
              <div className="space-y-2">
                {familyData.rules.map((rule, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="flex-1">• {rule}</span>
                    <button
                      onClick={() => removeRule(index)}
                      className="btn btn-ghost btn-sm btn-circle text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Predefined Rules */}
        <div className="card bg-blue-50 border-2 border-blue-200">
          <div className="card-body p-6">
            <h4 className="font-bold mb-4 text-blue-700">Suggested Rules:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {predefinedRules.map((rule, index) => (
                <button
                  key={index}
                  onClick={() => addRule(rule)}
                  disabled={familyData.rules.includes(rule)}
                  className={`btn btn-sm text-left justify-start ${
                    familyData.rules.includes(rule)
                      ? "btn-success btn-disabled"
                      : "btn-outline btn-primary"
                  }`}
                >
                  {familyData.rules.includes(rule) ? "✓" : "+"} {rule}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Add Custom Rule */}
        <div className="card bg-green-50 border-2 border-green-200">
          <div className="card-body p-6">
            <h4 className="font-bold mb-4 text-green-700">Add Custom Rule:</h4>
            <div className="flex gap-2">
              <input
                id="custom-rule"
                type="text"
                placeholder="Write your own family rule..."
                className="input input-bordered flex-1"
                maxLength={100}
                onKeyPress={(e) => e.key === "Enter" && addCustomRule()}
              />
              <button onClick={addCustomRule} className="btn btn-primary">
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="alert alert-info">
          <span className="text-lg">💡</span>
          <span>
            <strong>Tip:</strong> Keep rules positive and specific. Instead of
            "Don't be messy," try "Keep your room tidy" or "Clean up after
            yourself."
          </span>
        </div>
      </div>
    );
  }

  function renderAddMembersStep() {
    const addMember = () => {
      const newMember: FamilyMember = {
        name: "",
        email: "",
        role: "child",
        preferences: {
          favoriteChores: [],
          notifications: true,
          reminderTime: "18:00",
        },
        tempId: `temp_${Date.now()}`,
      };
      setFamilyData((prev) => ({
        ...prev,
        members: [...prev.members, newMember],
      }));
    };

    const updateMember = (index: number, updates: Partial<FamilyMember>) => {
      setFamilyData((prev) => ({
        ...prev,
        members: prev.members.map((member, i) =>
          i === index ? { ...member, ...updates } : member,
        ),
      }));
    };

    const removeMember = (index: number) => {
      setFamilyData((prev) => ({
        ...prev,
        members: prev.members.filter((_, i) => i !== index),
      }));
    };

    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-bold mb-2">Add Family Members</h3>
          <p className="text-gray-600">
            Add parents and children who will use ChoreMinder. We'll send them
            invitations!
          </p>
        </div>

        {/* Current User */}
        <div className="card bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/20">
          <div className="card-body p-6">
            <div className="flex items-center gap-4">
              <div className="avatar">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-content flex items-center justify-center">
                  {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-bold">{session?.user?.name} (You)</h4>
                <p className="text-sm text-gray-600">{session?.user?.email}</p>
                <div className="badge badge-primary mt-1">Family Admin</div>
              </div>
              <div className="text-2xl">👑</div>
            </div>
          </div>
        </div>

        {/* Family Members */}
        <div className="space-y-4">
          {familyData.members.map((member, index) => (
            <div
              key={member.tempId || index}
              className="card bg-white shadow-lg border-2 border-gray-200"
            >
              <div className="card-body p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold">Family Member #{index + 1}</h4>
                  <button
                    onClick={() => removeMember(index)}
                    className="btn btn-ghost btn-sm btn-circle text-red-500"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Name *</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter name"
                      value={member.name}
                      onChange={(e) =>
                        updateMember(index, { name: e.target.value })
                      }
                      className="input input-bordered w-full"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Email *</span>
                    </label>
                    <input
                      type="email"
                      placeholder="Enter email"
                      value={member.email}
                      onChange={(e) =>
                        updateMember(index, { email: e.target.value })
                      }
                      className="input input-bordered w-full"
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Role *</span>
                    </label>
                    <select
                      value={member.role}
                      onChange={(e) =>
                        updateMember(index, {
                          role: e.target.value as "parent" | "child",
                        })
                      }
                      className="select select-bordered w-full"
                    >
                      <option value="child">Child</option>
                      <option value="parent">Parent</option>
                    </select>
                  </div>

                  {/* Age (for children) */}
                  {member.role === "child" && (
                    <div>
                      <label className="label">
                        <span className="label-text font-semibold">
                          Age (Optional)
                        </span>
                      </label>
                      <input
                        type="number"
                        min="3"
                        max="18"
                        placeholder="Age"
                        value={member.age || ""}
                        onChange={(e) =>
                          updateMember(index, {
                            age: parseInt(e.target.value) || undefined,
                          })
                        }
                        className="input input-bordered w-full"
                      />
                    </div>
                  )}
                </div>

                {/* Favorite Chores (for children) */}
                {member.role === "child" && (
                  <div className="mt-4">
                    <label className="label">
                      <span className="label-text font-semibold">
                        Favorite Chore Categories (Optional)
                      </span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {choreCategories.map((category) => (
                        <button
                          key={category}
                          onClick={() => {
                            const favorites =
                              member.preferences.favoriteChores.includes(
                                category,
                              )
                                ? member.preferences.favoriteChores.filter(
                                    (c) => c !== category,
                                  )
                                : [
                                    ...member.preferences.favoriteChores,
                                    category,
                                  ];
                            updateMember(index, {
                              preferences: {
                                ...member.preferences,
                                favoriteChores: favorites,
                              },
                            });
                          }}
                          className={`btn btn-sm ${
                            member.preferences.favoriteChores.includes(category)
                              ? "btn-primary"
                              : "btn-outline"
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add Member Button */}
        <button
          onClick={addMember}
          className="btn btn-primary btn-outline btn-lg w-full"
        >
          + Add Family Member
        </button>

        <div className="alert alert-info">
          <span className="text-lg">📧</span>
          <span>
            <strong>Note:</strong> We'll send email invitations to all family
            members. They'll be able to join your family by clicking the link in
            their email.
          </span>
        </div>
      </div>
    );
  }

  function renderFamilySettingsStep() {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">⚙️</div>
          <h3 className="text-xl font-bold mb-2">Family Settings</h3>
          <p className="text-gray-600">
            Configure how your family will use ChoreMinder
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Chore Settings */}
          <div className="card bg-blue-50 border-2 border-blue-200">
            <div className="card-body p-6">
              <h4 className="font-bold mb-4 text-blue-700">
                📋 Chore Settings
              </h4>

              <div className="space-y-4">
                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text">
                      Allow children to decline chores
                    </span>
                    <input
                      type="checkbox"
                      checked={familyData.settings.allowChildDecline}
                      onChange={(e) =>
                        setFamilyData((prev) => ({
                          ...prev,
                          settings: {
                            ...prev.settings,
                            allowChildDecline: e.target.checked,
                          },
                        }))
                      }
                      className="checkbox checkbox-primary"
                    />
                  </label>
                  <div className="label">
                    <span className="label-text-alt text-gray-500">
                      Children can request to negotiate or decline assigned
                      chores
                    </span>
                  </div>
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text">
                      Require photo verification
                    </span>
                    <input
                      type="checkbox"
                      checked={familyData.settings.requirePhotoVerification}
                      onChange={(e) =>
                        setFamilyData((prev) => ({
                          ...prev,
                          settings: {
                            ...prev.settings,
                            requirePhotoVerification: e.target.checked,
                          },
                        }))
                      }
                      className="checkbox checkbox-primary"
                    />
                  </label>
                  <div className="label">
                    <span className="label-text-alt text-gray-500">
                      Children must submit photos of completed chores by default
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rewards Settings */}
          <div className="card bg-green-50 border-2 border-green-200">
            <div className="card-body p-6">
              <h4 className="font-bold mb-4 text-green-700">
                🏆 Rewards Settings
              </h4>

              <div className="space-y-4">
                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text">Enable points system</span>
                    <input
                      type="checkbox"
                      checked={familyData.settings.pointsEnabled}
                      onChange={(e) =>
                        setFamilyData((prev) => ({
                          ...prev,
                          settings: {
                            ...prev.settings,
                            pointsEnabled: e.target.checked,
                          },
                        }))
                      }
                      className="checkbox checkbox-primary"
                    />
                  </label>
                  <div className="label">
                    <span className="label-text-alt text-gray-500">
                      Children earn points for completing chores
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reminder Settings */}
          <div className="card bg-purple-50 border-2 border-purple-200 md:col-span-2">
            <div className="card-body p-6">
              <h4 className="font-bold mb-4 text-purple-700">
                🔔 Reminder Settings
              </h4>

              <div>
                <label className="label">
                  <span className="label-text font-semibold">
                    Reminder Frequency
                  </span>
                </label>
                <select
                  value={familyData.settings.reminderFrequency}
                  onChange={(e) =>
                    setFamilyData((prev) => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        reminderFrequency: e.target.value as any,
                      },
                    }))
                  }
                  className="select select-bordered w-full max-w-xs"
                >
                  <option value="daily">Daily reminders</option>
                  <option value="weekly">Weekly reminders</option>
                  <option value="custom">Custom schedule</option>
                </select>
                <div className="label">
                  <span className="label-text-alt text-gray-500">
                    How often should we remind family members about pending
                    chores?
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="alert alert-info">
          <span className="text-lg">💡</span>
          <span>
            <strong>Tip:</strong> You can always change these settings later in
            your family dashboard. Start with what feels comfortable and adjust
            as needed!
          </span>
        </div>
      </div>
    );
  }

  function renderReviewStep() {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-bold mb-2">Review Your Family Setup</h3>
          <p className="text-gray-600">
            Everything looks good? Let's create your family and get started!
          </p>
        </div>

        {/* Family Info Summary */}
        <div className="card bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/20">
          <div className="card-body p-6">
            <h4 className="font-bold mb-4 text-primary">
              👨‍👩‍👧‍👦 Family Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Name:</strong> {familyData.name}
              </div>
              <div>
                <strong>Timezone:</strong> {familyData.settings.timezone}
              </div>
              <div className="md:col-span-2">
                <strong>Description:</strong>{" "}
                {familyData.description || "No description provided"}
              </div>
            </div>
          </div>
        </div>

        {/* Members Summary */}
        <div className="card bg-blue-50 border-2 border-blue-200">
          <div className="card-body p-6">
            <h4 className="font-bold mb-4 text-blue-700">
              👥 Family Members ({familyData.members.length + 1})
            </h4>

            {/* Current User */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg mb-3">
              <div className="badge badge-primary">Admin</div>
              <span className="font-semibold">{session?.user?.name} (You)</span>
              <span className="text-gray-600">{session?.user?.email}</span>
            </div>

            {/* Other Members */}
            {familyData.members.map((member, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-white rounded-lg mb-2"
              >
                <div
                  className={`badge ${member.role === "parent" ? "badge-secondary" : "badge-accent"}`}
                >
                  {member.role}
                </div>
                <span className="font-semibold">{member.name}</span>
                <span className="text-gray-600">{member.email}</span>
                {member.age && (
                  <span className="text-sm text-gray-500">
                    Age {member.age}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Rules Summary */}
        {familyData.rules.length > 0 && (
          <div className="card bg-green-50 border-2 border-green-200">
            <div className="card-body p-6">
              <h4 className="font-bold mb-4 text-green-700">
                📜 Family Rules ({familyData.rules.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {familyData.rules.map((rule, index) => (
                  <div key={index} className="text-sm bg-white p-2 rounded">
                    • {rule}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Settings Summary */}
        <div className="card bg-purple-50 border-2 border-purple-200">
          <div className="card-body p-6">
            <h4 className="font-bold mb-4 text-purple-700">⚙️ Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Child Decline:</strong>{" "}
                {familyData.settings.allowChildDecline
                  ? "Allowed"
                  : "Not Allowed"}
              </div>
              <div>
                <strong>Photo Verification:</strong>{" "}
                {familyData.settings.requirePhotoVerification
                  ? "Required"
                  : "Optional"}
              </div>
              <div>
                <strong>Points System:</strong>{" "}
                {familyData.settings.pointsEnabled ? "Enabled" : "Disabled"}
              </div>
              <div>
                <strong>Reminders:</strong>{" "}
                {familyData.settings.reminderFrequency}
              </div>
            </div>
          </div>
        </div>

        <div className="alert alert-success">
          <span className="text-lg">🎉</span>
          <span>
            <strong>Ready to go!</strong> Your family setup looks great. We'll
            send invitations to all family members and help you create your
            first chores.
          </span>
        </div>
      </div>
    );
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/families/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(familyData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create family");
      }

      const result = await response.json();

      toast.success("🎉 Family created successfully! Welcome to ChoreMinder!", {
        duration: 6000,
        icon: "👨‍👩‍👧‍👦",
      });

      onComplete(result.family);
    } catch (error) {
      console.error("Error creating family:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create family",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Family Setup Wizard
          </h1>
          <p className="text-gray-600">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="steps steps-horizontal w-full">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`step ${index <= currentStep ? "step-primary" : ""} ${
                  !step.isValid && index === currentStep ? "step-error" : ""
                }`}
              >
                <span className="hidden sm:inline">{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="card bg-white shadow-2xl border-2 border-gray-200 mb-8">
          <div className="card-body p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
              <p className="text-gray-600 mt-2">
                {currentStepData.description}
              </p>
            </div>

            {currentStepData.component}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <div className="flex gap-3">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0 || isProcessing}
              className="btn btn-ghost"
            >
              ← Previous
            </button>

            {onSkip && currentStep === 0 && (
              <button
                onClick={onSkip}
                disabled={isProcessing}
                className="btn btn-ghost"
              >
                Skip Setup
              </button>
            )}
          </div>

          <div className="flex gap-3">
            {currentStep === steps.length - 1 ? (
              <button
                onClick={handleComplete}
                disabled={!currentStepData.isValid || isProcessing}
                className="btn btn-primary btn-lg"
              >
                {isProcessing ? (
                  <>
                    <span className="loading loading-spinner loading-sm mr-2"></span>
                    Creating Family...
                  </>
                ) : (
                  <>🎉 Create Family</>
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={
                  (!currentStepData.isValid && !currentStepData.isOptional) ||
                  isProcessing
                }
                className="btn btn-primary"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilySetupWizard;
