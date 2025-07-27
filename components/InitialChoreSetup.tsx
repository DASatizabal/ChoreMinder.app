"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface InitialChoreSetupProps {
  familyId: string;
  familyMembers: FamilyMember[];
  onComplete: (chores: ChoreTemplate[]) => void;
  onSkip?: () => void;
}

interface FamilyMember {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  role: "parent" | "child" | "admin";
  age?: number;
  preferences: {
    favoriteChores: string[];
    notifications: boolean;
    reminderTime: string;
  };
}

interface ChoreTemplate {
  title: string;
  description: string;
  category: string;
  priority: "low" | "medium" | "high";
  points: number;
  estimatedMinutes: number;
  requiresPhotoVerification: boolean;
  assignedTo?: string; // member ID
  recurrence?: {
    type: "daily" | "weekly" | "monthly";
    interval: number;
  };
  ageGroup: "young" | "teen" | "all";
  difficulty: "easy" | "medium" | "hard";
}

interface PresetChore extends ChoreTemplate {
  id: string;
  emoji: string;
  tips: string[];
}

const InitialChoreSetup = ({
  familyId,
  familyMembers,
  onComplete,
  onSkip,
}: InitialChoreSetupProps) => {
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedChores, setSelectedChores] = useState<ChoreTemplate[]>([]);
  const [customChores, setCustomChores] = useState<ChoreTemplate[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>("all");

  const children = familyMembers.filter((m) => m.role === "child");

  // Preset chore templates organized by category and age
  const presetChores: PresetChore[] = [
    // Young Children (3-8 years)
    {
      id: "put-toys-away",
      title: "Put toys away",
      description: "Clean up toys and put them in their proper places",
      category: "Organization",
      priority: "medium",
      points: 5,
      estimatedMinutes: 10,
      requiresPhotoVerification: true,
      ageGroup: "young",
      difficulty: "easy",
      emoji: "🧸",
      tips: [
        "Make it a game - 'toy rescue mission!'",
        "Use picture labels on toy bins",
        "Set a fun timer and race the clock",
      ],
    },
    {
      id: "make-bed",
      title: "Make your bed",
      description: "Pull up covers and arrange pillows neatly",
      category: "Cleaning",
      priority: "medium",
      points: 8,
      estimatedMinutes: 5,
      requiresPhotoVerification: true,
      ageGroup: "young",
      difficulty: "easy",
      emoji: "🛏️",
      tips: [
        "Start simple - just pull up the blanket",
        "Praise effort over perfection",
        "Create a morning routine chart",
      ],
    },
    {
      id: "feed-pet",
      title: "Feed the pet",
      description: "Give food and fresh water to family pets",
      category: "Pet Care",
      priority: "high",
      points: 10,
      estimatedMinutes: 5,
      requiresPhotoVerification: false,
      ageGroup: "young",
      difficulty: "easy",
      emoji: "🐕",
      tips: [
        "Show them how much food to give",
        "Make it the same time each day",
        "Let them choose a special pet bowl",
      ],
    },
    {
      id: "sort-socks",
      title: "Sort clean socks",
      description: "Match pairs of socks and put them away",
      category: "Laundry",
      priority: "low",
      points: 6,
      estimatedMinutes: 10,
      requiresPhotoVerification: false,
      ageGroup: "young",
      difficulty: "easy",
      emoji: "🧦",
      tips: [
        "Turn it into a matching game",
        "Start with family member's socks",
        "Celebrate finding pairs!",
      ],
    },

    // Teenagers (9-18 years)
    {
      id: "vacuum-room",
      title: "Vacuum bedroom and hallway",
      description: "Vacuum carpet and clean under furniture",
      category: "Cleaning",
      priority: "medium",
      points: 15,
      estimatedMinutes: 20,
      requiresPhotoVerification: true,
      ageGroup: "teen",
      difficulty: "medium",
      emoji: "🧹",
      tips: [
        "Move small items before vacuuming",
        "Use attachments for corners",
        "Empty vacuum bag when full",
      ],
    },
    {
      id: "load-dishwasher",
      title: "Load the dishwasher",
      description: "Load dirty dishes and start the dishwasher",
      category: "Kitchen",
      priority: "high",
      points: 12,
      estimatedMinutes: 15,
      requiresPhotoVerification: true,
      ageGroup: "teen",
      difficulty: "medium",
      emoji: "🍽️",
      tips: [
        "Rinse dishes first",
        "Face dirty surfaces toward center",
        "Use proper detergent amount",
      ],
    },
    {
      id: "take-out-trash",
      title: "Take out trash and recycling",
      description: "Empty trash cans and take bins to curb",
      category: "Outdoor",
      priority: "high",
      points: 10,
      estimatedMinutes: 10,
      requiresPhotoVerification: true,
      ageGroup: "teen",
      difficulty: "easy",
      emoji: "🗑️",
      tips: [
        "Check schedule for pickup day",
        "Replace trash bags",
        "Bring bins back after pickup",
      ],
    },
    {
      id: "fold-laundry",
      title: "Fold and put away laundry",
      description: "Fold clean clothes and put them in drawers",
      category: "Laundry",
      priority: "medium",
      points: 18,
      estimatedMinutes: 30,
      requiresPhotoVerification: true,
      ageGroup: "teen",
      difficulty: "medium",
      emoji: "👕",
      tips: [
        "Fold immediately after drying",
        "Sort by family member first",
        "Use folding techniques for neat stacks",
      ],
    },
    {
      id: "clean-bathroom",
      title: "Clean bathroom",
      description: "Wipe surfaces, clean toilet, and mop floor",
      category: "Cleaning",
      priority: "medium",
      points: 25,
      estimatedMinutes: 45,
      requiresPhotoVerification: true,
      ageGroup: "teen",
      difficulty: "hard",
      emoji: "🚿",
      tips: [
        "Use appropriate cleaners for each surface",
        "Work top to bottom",
        "Don't forget behind the toilet",
      ],
    },

    // All Ages
    {
      id: "set-table",
      title: "Set the table",
      description: "Put out plates, utensils, and napkins for dinner",
      category: "Kitchen",
      priority: "medium",
      points: 8,
      estimatedMinutes: 10,
      requiresPhotoVerification: true,
      ageGroup: "all",
      difficulty: "easy",
      emoji: "🍴",
      tips: [
        "Count how many people are eating",
        "Forks go on the left, knives on the right",
        "Add special touches like flowers",
      ],
    },
    {
      id: "water-plants",
      title: "Water plants",
      description: "Check and water indoor and outdoor plants",
      category: "Outdoor",
      priority: "medium",
      points: 10,
      estimatedMinutes: 15,
      requiresPhotoVerification: true,
      ageGroup: "all",
      difficulty: "easy",
      emoji: "🪴",
      tips: [
        "Check soil moisture first",
        "Water slowly and evenly",
        "Remove dead leaves while watering",
      ],
    },
    {
      id: "organize-backpack",
      title: "Organize school backpack",
      description: "Clean out backpack and organize school supplies",
      category: "Organization",
      priority: "medium",
      points: 12,
      estimatedMinutes: 20,
      requiresPhotoVerification: true,
      ageGroup: "all",
      difficulty: "medium",
      emoji: "🎒",
      tips: [
        "Empty everything out first",
        "Throw away trash and old papers",
        "Organize by subject or type",
      ],
    },
  ];

  const categories = [
    { id: "all", name: "All Categories", emoji: "📋" },
    { id: "Cleaning", name: "Cleaning", emoji: "🧹" },
    { id: "Kitchen", name: "Kitchen", emoji: "🍽️" },
    { id: "Laundry", name: "Laundry", emoji: "👕" },
    { id: "Outdoor", name: "Outdoor", emoji: "🌳" },
    { id: "Pet Care", name: "Pet Care", emoji: "🐕" },
    { id: "Organization", name: "Organization", emoji: "📦" },
  ];

  const ageGroups = [
    { id: "all", name: "All Ages", emoji: "👨‍👩‍👧‍👦" },
    { id: "young", name: "Young (3-8)", emoji: "👶" },
    { id: "teen", name: "Teen (9-18)", emoji: "👦" },
  ];

  const steps = [
    {
      id: "introduction",
      title: "Welcome to Chore Setup! 🎉",
      description: "Let's create your first chores to get your family started",
    },
    {
      id: "select-chores",
      title: "Choose Starter Chores",
      description: "Select from our recommended chores or create your own",
    },
    {
      id: "assign-chores",
      title: "Assign to Family Members",
      description: "Decide who will do each chore and when",
    },
    {
      id: "review",
      title: "Review & Create",
      description: "Review your chore setup and create them all",
    },
  ];

  const getFilteredChores = () => {
    return presetChores.filter((chore) => {
      const categoryMatch =
        selectedCategory === "all" || chore.category === selectedCategory;
      const ageMatch =
        selectedAgeGroup === "all" ||
        chore.ageGroup === selectedAgeGroup ||
        chore.ageGroup === "all";
      return categoryMatch && ageMatch;
    });
  };

  const isChoreSelected = (choreId: string) => {
    return selectedChores.some(
      (chore) =>
        chore.title === presetChores.find((p) => p.id === choreId)?.title,
    );
  };

  const toggleChoreSelection = (chore: PresetChore) => {
    const choreTemplate: ChoreTemplate = {
      title: chore.title,
      description: chore.description,
      category: chore.category,
      priority: chore.priority,
      points: chore.points,
      estimatedMinutes: chore.estimatedMinutes,
      requiresPhotoVerification: chore.requiresPhotoVerification,
      ageGroup: chore.ageGroup,
      difficulty: chore.difficulty,
    };

    if (isChoreSelected(chore.id)) {
      setSelectedChores((prev) => prev.filter((c) => c.title !== chore.title));
    } else {
      setSelectedChores((prev) => [...prev, choreTemplate]);
    }
  };

  const addCustomChore = () => {
    const newChore: ChoreTemplate = {
      title: "New Custom Chore",
      description: "",
      category: "General",
      priority: "medium",
      points: 10,
      estimatedMinutes: 30,
      requiresPhotoVerification: false,
      ageGroup: "all",
      difficulty: "medium",
    };
    setCustomChores((prev) => [...prev, newChore]);
  };

  const updateCustomChore = (
    index: number,
    updates: Partial<ChoreTemplate>,
  ) => {
    setCustomChores((prev) =>
      prev.map((chore, i) => (i === index ? { ...chore, ...updates } : chore)),
    );
  };

  const removeCustomChore = (index: number) => {
    setCustomChores((prev) => prev.filter((_, i) => i !== index));
  };

  const assignChoreToMember = (choreIndex: number, memberId: string) => {
    setSelectedChores((prev) =>
      prev.map((chore, i) =>
        i === choreIndex ? { ...chore, assignedTo: memberId } : chore,
      ),
    );
  };

  const updateChoreRecurrence = (
    choreIndex: number,
    recurrence: ChoreTemplate["recurrence"],
  ) => {
    setSelectedChores((prev) =>
      prev.map((chore, i) =>
        i === choreIndex ? { ...chore, recurrence } : chore,
      ),
    );
  };

  const getRecommendedAssignment = (chore: ChoreTemplate) => {
    if (children.length === 0) return null;

    // Find children who prefer this category
    const preferredChildren = children.filter((child) =>
      child.preferences.favoriteChores.includes(chore.category),
    );

    if (preferredChildren.length > 0) {
      return preferredChildren[0];
    }

    // Age-based recommendations
    if (chore.ageGroup === "young") {
      const youngChildren = children.filter((child) => (child.age || 10) <= 8);
      if (youngChildren.length > 0) return youngChildren[0];
    }

    if (chore.ageGroup === "teen") {
      const teenagers = children.filter((child) => (child.age || 10) >= 9);
      if (teenagers.length > 0) return teenagers[0];
    }

    // Default to first child
    return children[0];
  };

  const completeSetup = async () => {
    const allChores = [
      ...selectedChores,
      ...customChores.filter((c) => c.title.trim()),
    ];

    if (allChores.length === 0) {
      toast.error("Please select or create at least one chore");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/families/${familyId}/chores/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chores: allChores.map((chore) => ({
            ...chore,
            assignedBy: {
              _id: session?.user?.id,
              name: session?.user?.name,
            },
            familyId,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create chores");
      }

      const result = await response.json();

      toast.success(`🎉 Created ${allChores.length} chores successfully!`, {
        duration: 6000,
        icon: "📋",
      });

      onComplete(allChores);
    } catch (error) {
      console.error("Error creating chores:", error);
      toast.error("Failed to create chores. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const renderIntroduction = () => (
    <div className="text-center space-y-6">
      <div className="text-8xl mb-6">🏠</div>

      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-primary">
          Let's Set Up Your First Chores!
        </h3>
        <p className="text-lg text-gray-700 max-w-2xl mx-auto">
          We'll help you choose age-appropriate chores for your family members.
          You can start with our recommendations and customize them later.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
          <div className="card-body p-6 text-center">
            <div className="text-4xl mb-3">🎯</div>
            <h4 className="font-bold text-blue-700">Smart Recommendations</h4>
            <p className="text-sm text-blue-600">
              Age-appropriate chores based on development and family preferences
            </p>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
          <div className="card-body p-6 text-center">
            <div className="text-4xl mb-3">⚡</div>
            <h4 className="font-bold text-green-700">Quick Start</h4>
            <p className="text-sm text-green-600">
              Get up and running in minutes with pre-made chore templates
            </p>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200">
          <div className="card-body p-6 text-center">
            <div className="text-4xl mb-3">🔧</div>
            <h4 className="font-bold text-purple-700">Fully Customizable</h4>
            <p className="text-sm text-purple-600">
              Modify any chore or create your own from scratch
            </p>
          </div>
        </div>
      </div>

      <div className="stats shadow bg-white border-2 border-gray-200 mt-8">
        <div className="stat">
          <div className="stat-title">Family Members</div>
          <div className="stat-value text-primary">
            {familyMembers.length + 1}
          </div>
          <div className="stat-desc">Ready to start!</div>
        </div>

        <div className="stat">
          <div className="stat-title">Available Templates</div>
          <div className="stat-value text-secondary">{presetChores.length}</div>
          <div className="stat-desc">Chore options</div>
        </div>

        <div className="stat">
          <div className="stat-title">Setup Time</div>
          <div className="stat-value text-accent">5 min</div>
          <div className="stat-desc">Average setup</div>
        </div>
      </div>
    </div>
  );

  const renderChoreSelection = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold mb-2">Choose Your Starter Chores</h3>
        <p className="text-gray-600">
          Select from our recommended chores or create custom ones
        </p>
      </div>

      {/* Filters */}
      <div className="card bg-white shadow-lg border-2 border-primary/20">
        <div className="card-body p-6">
          <h4 className="font-bold mb-4">Filter Chores</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category Filter */}
            <div>
              <label className="label">
                <span className="label-text font-semibold">Category</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`btn btn-sm ${
                      selectedCategory === category.id
                        ? "btn-primary"
                        : "btn-outline"
                    }`}
                  >
                    {category.emoji} {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Age Group Filter */}
            <div>
              <label className="label">
                <span className="label-text font-semibold">Age Group</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {ageGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => setSelectedAgeGroup(group.id)}
                    className={`btn btn-sm ${
                      selectedAgeGroup === group.id
                        ? "btn-primary"
                        : "btn-outline"
                    }`}
                  >
                    {group.emoji} {group.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preset Chores */}
      <div className="card bg-white shadow-lg border-2 border-gray-200">
        <div className="card-body p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold">
              Recommended Chores ({getFilteredChores().length})
            </h4>
            <div className="text-sm text-gray-600">
              {selectedChores.length} selected
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getFilteredChores().map((chore) => (
              <div
                key={chore.id}
                className={`card cursor-pointer transition-all transform hover:scale-105 ${
                  isChoreSelected(chore.id)
                    ? "bg-primary text-primary-content border-2 border-primary shadow-xl"
                    : "bg-white hover:bg-base-200 border-2 border-transparent shadow-lg"
                }`}
                onClick={() => toggleChoreSelection(chore)}
              >
                <div className="card-body p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-2xl">{chore.emoji}</div>
                    {isChoreSelected(chore.id) && (
                      <div className="text-xl">✅</div>
                    )}
                  </div>

                  <h5 className="font-bold text-sm mb-1">{chore.title}</h5>
                  <p className="text-xs opacity-80 mb-2 line-clamp-2">
                    {chore.description}
                  </p>

                  <div className="flex justify-between items-center text-xs">
                    <div className="badge badge-sm">{chore.points} pts</div>
                    <div className="badge badge-sm">
                      {chore.estimatedMinutes}m
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs mt-2">
                    <div
                      className={`badge badge-xs ${
                        chore.difficulty === "easy"
                          ? "badge-success"
                          : chore.difficulty === "medium"
                            ? "badge-warning"
                            : "badge-error"
                      }`}
                    >
                      {chore.difficulty}
                    </div>
                    <div className="badge badge-xs badge-outline">
                      {chore.ageGroup === "young"
                        ? "3-8y"
                        : chore.ageGroup === "teen"
                          ? "9-18y"
                          : "All"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Chores */}
      <div className="card bg-green-50 border-2 border-green-200">
        <div className="card-body p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-green-700">Custom Chores</h4>
            <button onClick={addCustomChore} className="btn btn-success btn-sm">
              + Add Custom Chore
            </button>
          </div>

          {customChores.length === 0 ? (
            <p className="text-gray-600 italic text-center py-4">
              No custom chores yet. Click "Add Custom Chore" to create one!
            </p>
          ) : (
            <div className="space-y-4">
              {customChores.map((chore, index) => (
                <div
                  key={index}
                  className="card bg-white border border-gray-200"
                >
                  <div className="card-body p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-bold">Custom Chore #{index + 1}</h5>
                      <button
                        onClick={() => removeCustomChore(index)}
                        className="btn btn-ghost btn-sm btn-circle text-red-500"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Chore title"
                        value={chore.title}
                        onChange={(e) =>
                          updateCustomChore(index, { title: e.target.value })
                        }
                        className="input input-bordered input-sm"
                      />

                      <select
                        value={chore.category}
                        onChange={(e) =>
                          updateCustomChore(index, { category: e.target.value })
                        }
                        className="select select-bordered select-sm"
                      >
                        <option value="General">General</option>
                        <option value="Cleaning">Cleaning</option>
                        <option value="Kitchen">Kitchen</option>
                        <option value="Laundry">Laundry</option>
                        <option value="Outdoor">Outdoor</option>
                        <option value="Pet Care">Pet Care</option>
                        <option value="Organization">Organization</option>
                      </select>

                      <input
                        type="number"
                        placeholder="Points"
                        min="1"
                        max="100"
                        value={chore.points}
                        onChange={(e) =>
                          updateCustomChore(index, {
                            points: parseInt(e.target.value) || 10,
                          })
                        }
                        className="input input-bordered input-sm"
                      />

                      <input
                        type="number"
                        placeholder="Minutes"
                        min="5"
                        max="180"
                        value={chore.estimatedMinutes}
                        onChange={(e) =>
                          updateCustomChore(index, {
                            estimatedMinutes: parseInt(e.target.value) || 30,
                          })
                        }
                        className="input input-bordered input-sm"
                      />
                    </div>

                    <textarea
                      placeholder="Chore description..."
                      value={chore.description}
                      onChange={(e) =>
                        updateCustomChore(index, {
                          description: e.target.value,
                        })
                      }
                      className="textarea textarea-bordered textarea-sm w-full mt-3"
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="alert alert-info">
        <span className="text-lg">💡</span>
        <span>
          <strong>Tip:</strong> Start with 3-5 chores per child. You can always
          add more later! Choose a mix of daily and weekly tasks to build good
          habits.
        </span>
      </div>
    </div>
  );

  const renderAssignment = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold mb-2">
          Assign Chores to Family Members
        </h3>
        <p className="text-gray-600">
          Choose who will do each chore and set up recurring schedules
        </p>
      </div>

      {selectedChores.length === 0 &&
      customChores.filter((c) => c.title.trim()).length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h4 className="text-xl font-bold mb-2">No Chores Selected</h4>
          <p className="text-gray-600 mb-4">
            Go back and select some chores to assign
          </p>
          <button onClick={() => setCurrentStep(1)} className="btn btn-primary">
            ← Back to Chore Selection
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {[
            ...selectedChores,
            ...customChores.filter((c) => c.title.trim()),
          ].map((chore, index) => (
            <div
              key={index}
              className="card bg-white shadow-lg border-2 border-gray-200"
            >
              <div className="card-body p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-lg">{chore.title}</h4>
                    <p className="text-gray-600 text-sm">{chore.description}</p>
                    <div className="flex gap-2 mt-2">
                      <div className="badge badge-primary">
                        {chore.points} points
                      </div>
                      <div className="badge badge-secondary">
                        {chore.estimatedMinutes} minutes
                      </div>
                      <div className="badge badge-outline">
                        {chore.category}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Assignment */}
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">
                        Assign to:
                      </span>
                    </label>
                    <select
                      value={chore.assignedTo || ""}
                      onChange={(e) =>
                        assignChoreToMember(index, e.target.value)
                      }
                      className="select select-bordered w-full"
                    >
                      <option value="">Choose a family member</option>
                      {children.map((child) => (
                        <option key={child._id} value={child._id}>
                          {child.user.name} {child.age ? `(${child.age}y)` : ""}
                        </option>
                      ))}
                    </select>

                    {(() => {
                      const recommended = getRecommendedAssignment(chore);
                      return recommended && !chore.assignedTo ? (
                        <div className="label">
                          <span className="label-text-alt text-blue-600">
                            💡 Recommended: {recommended.user.name}
                            <button
                              onClick={() =>
                                assignChoreToMember(index, recommended._id)
                              }
                              className="btn btn-ghost btn-xs ml-2"
                            >
                              Use recommendation
                            </button>
                          </span>
                        </div>
                      ) : null;
                    })()}
                  </div>

                  {/* Recurrence */}
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Repeat:</span>
                    </label>
                    <select
                      value={chore.recurrence?.type || ""}
                      onChange={(e) => {
                        if (e.target.value) {
                          updateChoreRecurrence(index, {
                            type: e.target.value as
                              | "daily"
                              | "weekly"
                              | "monthly",
                            interval: 1,
                          });
                        } else {
                          updateChoreRecurrence(index, undefined);
                        }
                      }}
                      className="select select-bordered w-full"
                    >
                      <option value="">One-time chore</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderReview = () => {
    const allChores = [
      ...selectedChores,
      ...customChores.filter((c) => c.title.trim()),
    ];
    const assignedChores = allChores.filter((c) => c.assignedTo);
    const unassignedChores = allChores.filter((c) => !c.assignedTo);

    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h3 className="text-xl font-bold mb-2">Review Your Chore Setup</h3>
          <p className="text-gray-600">
            Everything looks good? Let's create these chores and get started!
          </p>
        </div>

        {/* Summary Stats */}
        <div className="stats shadow bg-white border-2 border-gray-200">
          <div className="stat">
            <div className="stat-title">Total Chores</div>
            <div className="stat-value text-primary">{allChores.length}</div>
            <div className="stat-desc">Ready to create</div>
          </div>

          <div className="stat">
            <div className="stat-title">Assigned</div>
            <div className="stat-value text-success">
              {assignedChores.length}
            </div>
            <div className="stat-desc">To family members</div>
          </div>

          <div className="stat">
            <div className="stat-title">Total Points</div>
            <div className="stat-value text-secondary">
              {allChores.reduce((sum, c) => sum + c.points, 0)}
            </div>
            <div className="stat-desc">Available to earn</div>
          </div>
        </div>

        {/* Assigned Chores */}
        {assignedChores.length > 0 && (
          <div className="card bg-green-50 border-2 border-green-200">
            <div className="card-body p-6">
              <h4 className="font-bold text-green-700 mb-4">
                ✅ Assigned Chores ({assignedChores.length})
              </h4>

              <div className="space-y-3">
                {assignedChores.map((chore, index) => {
                  const assignedMember = children.find(
                    (c) => c._id === chore.assignedTo,
                  );
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-white rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-semibold">{chore.title}</div>
                        <div className="text-sm text-gray-600">
                          {chore.points} points • {chore.estimatedMinutes}{" "}
                          minutes
                          {chore.recurrence && ` • ${chore.recurrence.type}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-700">
                          {assignedMember?.user.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {chore.category}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Unassigned Chores */}
        {unassignedChores.length > 0 && (
          <div className="card bg-orange-50 border-2 border-orange-200">
            <div className="card-body p-6">
              <h4 className="font-bold text-orange-700 mb-4">
                ⚠️ Unassigned Chores ({unassignedChores.length})
              </h4>
              <p className="text-sm text-orange-600 mb-4">
                These chores will be created but not assigned to anyone yet
              </p>

              <div className="space-y-2">
                {unassignedChores.map((chore, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white rounded-lg"
                  >
                    <div className="font-semibold">{chore.title}</div>
                    <div className="text-sm text-gray-600">
                      {chore.points} points • {chore.category}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="alert alert-success">
          <span className="text-lg">🎉</span>
          <span>
            <strong>Ready to launch!</strong> Your chore setup looks great.
            Family members will be notified about their new chores and can start
            earning points right away!
          </span>
        </div>
      </div>
    );
  };

  const currentStepData = steps[currentStep];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Initial Chore Setup
          </h1>
          <p className="text-gray-600">
            Step {currentStep + 1} of {steps.length}:{" "}
            {currentStepData.description}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="steps steps-horizontal w-full">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`step ${index <= currentStep ? "step-primary" : ""}`}
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
            </div>

            {currentStep === 0 && renderIntroduction()}
            {currentStep === 1 && renderChoreSelection()}
            {currentStep === 2 && renderAssignment()}
            {currentStep === 3 && renderReview()}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <div className="flex gap-3">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
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
                Skip for Now
              </button>
            )}
          </div>

          <div className="flex gap-3">
            {currentStep === steps.length - 1 ? (
              <button
                onClick={completeSetup}
                disabled={isProcessing}
                className="btn btn-primary btn-lg"
              >
                {isProcessing ? (
                  <>
                    <span className="loading loading-spinner loading-sm mr-2"></span>
                    Creating Chores...
                  </>
                ) : (
                  <>🎉 Create Chores</>
                )}
              </button>
            ) : (
              <button
                onClick={() =>
                  setCurrentStep(Math.min(steps.length - 1, currentStep + 1))
                }
                disabled={isProcessing}
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

export default InitialChoreSetup;
