"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface AIInstructionGeneratorProps {
  choreData: ChoreData;
  onInstructionsGenerated: (instructions: GeneratedInstructions) => void;
  onClose?: () => void;
  mode: "create" | "enhance" | "review";
}

interface ChoreData {
  title: string;
  description?: string;
  category: string;
  priority: "low" | "medium" | "high";
  estimatedMinutes?: number;
  assignedTo?: {
    name: string;
    age?: number;
    preferences?: string[];
  };
  familyContext?: {
    rules: string[];
    settings: {
      allowChildDecline: boolean;
      requirePhotoVerification: boolean;
    };
  };
}

interface GeneratedInstructions {
  stepByStep: string[];
  photoGuidelines: string[];
  motivationalMessage: string;
  ageAppropriateInstructions: string;
  safetyReminders: string[];
  estimatedTime: number;
  difficultyLevel: "easy" | "medium" | "hard";
  tips: string[];
  parentNotes: string[];
}

interface AIPromptTemplate {
  id: string;
  name: string;
  description: string;
  ageGroup: "young" | "teen" | "all";
  category: string[];
  prompt: string;
}

const AIInstructionGenerator = ({
  choreData,
  onInstructionsGenerated,
  onClose,
  mode,
}: AIInstructionGeneratorProps) => {
  const { data: session } = useSession();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedInstructions, setGeneratedInstructions] =
    useState<GeneratedInstructions | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("default");
  const [customPrompt, setCustomPrompt] = useState("");
  const [generationOptions, setGenerationOptions] = useState({
    includeMotivation: true,
    includeSafety: true,
    includePhotoGuidelines:
      choreData.familyContext?.settings.requirePhotoVerification || false,
    includeParentNotes: true,
    complexityLevel: "age-appropriate" as
      | "simple"
      | "age-appropriate"
      | "detailed",
  });

  // AI prompt templates for different scenarios
  const promptTemplates: AIPromptTemplate[] = [
    {
      id: "default",
      name: "Standard Instructions",
      description: "Clear, step-by-step instructions suitable for most chores",
      ageGroup: "all",
      category: ["all"],
      prompt: `Create detailed, age-appropriate instructions for the chore: "{choreTitle}".

Context:
- Category: {category}
- Child's age: {age} years old
- Estimated time: {estimatedMinutes} minutes
- Description: {description}
- Family rules: {familyRules}

Please provide:
1. Step-by-step instructions (5-8 steps max)
2. Photo guidelines if photos are required
3. A motivational message to encourage the child
4. Safety reminders appropriate for the child's age
5. Helpful tips for success
6. Notes for parents on how to help

Make the language encouraging, clear, and appropriate for a {age}-year-old child. Focus on building confidence and independence.`,
    },
    {
      id: "young-child",
      name: "Young Child (3-8 years)",
      description: "Simple, fun instructions with lots of encouragement",
      ageGroup: "young",
      category: ["all"],
      prompt: `Create fun, simple instructions for a {age}-year-old to do this chore: "{choreTitle}".

Make it like a game or adventure! Use:
- Very simple words and short sentences
- Fun emojis and encouraging language
- Break everything into tiny, easy steps
- Include lots of praise and celebration
- Make safety the top priority
- Give parents tips on how to help without taking over

Remember: This child is just learning, so focus on effort over perfection!`,
    },
    {
      id: "teenager",
      name: "Teenager (13-18 years)",
      description: "Comprehensive instructions with efficiency tips",
      ageGroup: "teen",
      category: ["all"],
      prompt: `Create comprehensive instructions for a {age}-year-old to efficiently complete: "{choreTitle}".

Include:
- Detailed steps with pro tips for efficiency
- Quality standards and expectations
- Time management suggestions
- Problem-solving guidance
- Ways to take pride in the work
- How this builds life skills

Treat them as capable and responsible while still providing clear guidance.`,
    },
    {
      id: "cleaning-focused",
      name: "Cleaning Specialist",
      description: "Detailed cleaning instructions with technique tips",
      ageGroup: "all",
      category: ["Cleaning", "Kitchen", "Laundry"],
      prompt: `Create expert cleaning instructions for: "{choreTitle}".

Focus on:
- Proper cleaning techniques and order
- Which products/tools to use safely
- How to achieve professional results
- Efficient cleaning patterns
- Quality check points
- Storage and maintenance tips

Make it thorough but achievable for a {age}-year-old.`,
    },
    {
      id: "outdoor-adventure",
      name: "Outdoor Adventure",
      description: "Nature-focused instructions with environmental awareness",
      ageGroup: "all",
      category: ["Outdoor", "Pet Care"],
      prompt: `Create adventure-style instructions for the outdoor chore: "{choreTitle}".

Include:
- Connection to nature and environment
- Weather considerations
- Safety in outdoor settings
- How this helps plants/animals/ecosystem
- Seasonal variations
- Fun observations to make while working

Make it feel like an exciting outdoor mission!`,
    },
  ];

  const getRecommendedTemplate = () => {
    const age = choreData.assignedTo?.age || 10;
    const category = choreData.category;

    // Age-based recommendations
    if (age <= 8) return "young-child";
    if (age >= 13) return "teenager";

    // Category-based recommendations
    if (["Cleaning", "Kitchen", "Laundry"].includes(category))
      return "cleaning-focused";
    if (["Outdoor", "Pet Care"].includes(category)) return "outdoor-adventure";

    return "default";
  };

  useEffect(() => {
    setSelectedTemplate(getRecommendedTemplate());
  }, [choreData]);

  const generateInstructions = async () => {
    setIsGenerating(true);

    try {
      const template =
        promptTemplates.find((t) => t.id === selectedTemplate) ||
        promptTemplates[0];

      // Build the prompt with context
      let prompt = template.prompt
        .replace(/{choreTitle}/g, choreData.title)
        .replace(/{category}/g, choreData.category)
        .replace(/{age}/g, (choreData.assignedTo?.age || 10).toString())
        .replace(
          /{estimatedMinutes}/g,
          (choreData.estimatedMinutes || 30).toString(),
        )
        .replace(
          /{description}/g,
          choreData.description || "No additional description provided",
        )
        .replace(
          /{familyRules}/g,
          choreData.familyContext?.rules.join(", ") ||
            "Be respectful and responsible",
        );

      // Add custom prompt if provided
      if (customPrompt.trim()) {
        prompt += `\n\nAdditional requirements: ${customPrompt}`;
      }

      // Add generation options
      if (!generationOptions.includeMotivation) {
        prompt +=
          "\n\nNote: Skip motivational messages, focus on practical instructions only.";
      }

      if (!generationOptions.includeSafety) {
        prompt += "\n\nNote: Skip safety reminders unless absolutely critical.";
      }

      const response = await fetch("/api/ai/generate-instructions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          choreData,
          options: generationOptions,
          template: template.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate instructions");
      }

      const result = await response.json();
      setGeneratedInstructions(result.instructions);

      toast.success("🤖 AI instructions generated successfully!", {
        duration: 4000,
        icon: "✨",
      });
    } catch (error) {
      console.error("Error generating instructions:", error);
      toast.error("Failed to generate instructions. Please try again.");

      // Provide fallback instructions
      const fallbackInstructions: GeneratedInstructions = {
        stepByStep: [
          `Start by gathering everything you need for ${choreData.title}`,
          "Take your time and work carefully",
          "Check your progress as you go",
          "Clean up any mess you make while working",
          "Take a step back and admire your completed work!",
        ],
        photoGuidelines: [
          "Show the completed work clearly in your photo",
          "Make sure the lighting is good",
          "Include the whole area in the shot",
        ],
        motivationalMessage: `You're going to do an amazing job with ${choreData.title}! Take your time and be proud of your hard work.`,
        ageAppropriateInstructions:
          "Work at your own pace and ask for help if you need it. You've got this!",
        safetyReminders: [
          "Ask an adult if you're unsure about anything",
          "Be careful with any tools or cleaning products",
        ],
        estimatedTime: choreData.estimatedMinutes || 30,
        difficultyLevel: "medium",
        tips: [
          "Break the work into smaller parts",
          "Celebrate small victories along the way",
          "Remember that practice makes perfect",
        ],
        parentNotes: [
          "Offer encouragement and guidance as needed",
          "Focus on effort rather than perfection",
          "Be available to help if they get stuck",
        ],
      };

      setGeneratedInstructions(fallbackInstructions);
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateSection = async (section: keyof GeneratedInstructions) => {
    if (!generatedInstructions) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/regenerate-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section,
          choreData,
          currentInstructions: generatedInstructions,
          template: selectedTemplate,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setGeneratedInstructions((prev) =>
          prev
            ? {
                ...prev,
                [section]: result.newContent,
              }
            : null,
        );

        toast.success(`${section} regenerated successfully!`);
      }
    } catch (error) {
      console.error("Error regenerating section:", error);
      toast.error("Failed to regenerate section");
    } finally {
      setIsGenerating(false);
    }
  };

  const applyInstructions = () => {
    if (generatedInstructions) {
      onInstructionsGenerated(generatedInstructions);
      toast.success("✅ AI instructions applied to your chore!");
    }
  };

  const renderGenerationOptions = () => (
    <div className="card bg-white shadow-lg border-2 border-blue-200">
      <div className="card-body p-6">
        <h4 className="font-bold text-lg mb-4 text-blue-700">
          🎯 Generation Options
        </h4>

        {/* Template Selection */}
        <div className="mb-4">
          <label className="label">
            <span className="label-text font-semibold">Instruction Style</span>
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="select select-bordered w-full"
          >
            {promptTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} - {template.description}
              </option>
            ))}
          </select>
        </div>

        {/* Generation Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Include motivation</span>
              <input
                type="checkbox"
                checked={generationOptions.includeMotivation}
                onChange={(e) =>
                  setGenerationOptions((prev) => ({
                    ...prev,
                    includeMotivation: e.target.checked,
                  }))
                }
                className="checkbox checkbox-primary"
              />
            </label>
          </div>

          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Include safety reminders</span>
              <input
                type="checkbox"
                checked={generationOptions.includeSafety}
                onChange={(e) =>
                  setGenerationOptions((prev) => ({
                    ...prev,
                    includeSafety: e.target.checked,
                  }))
                }
                className="checkbox checkbox-primary"
              />
            </label>
          </div>

          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Photo guidelines</span>
              <input
                type="checkbox"
                checked={generationOptions.includePhotoGuidelines}
                onChange={(e) =>
                  setGenerationOptions((prev) => ({
                    ...prev,
                    includePhotoGuidelines: e.target.checked,
                  }))
                }
                className="checkbox checkbox-primary"
              />
            </label>
          </div>

          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Parent notes</span>
              <input
                type="checkbox"
                checked={generationOptions.includeParentNotes}
                onChange={(e) =>
                  setGenerationOptions((prev) => ({
                    ...prev,
                    includeParentNotes: e.target.checked,
                  }))
                }
                className="checkbox checkbox-primary"
              />
            </label>
          </div>
        </div>

        {/* Complexity Level */}
        <div className="mb-4">
          <label className="label">
            <span className="label-text font-semibold">Detail Level</span>
          </label>
          <select
            value={generationOptions.complexityLevel}
            onChange={(e) =>
              setGenerationOptions((prev) => ({
                ...prev,
                complexityLevel: e.target.value as any,
              }))
            }
            className="select select-bordered w-full"
          >
            <option value="simple">Simple - Basic steps only</option>
            <option value="age-appropriate">
              Age-Appropriate - Balanced detail
            </option>
            <option value="detailed">
              Detailed - Comprehensive instructions
            </option>
          </select>
        </div>

        {/* Custom Prompt */}
        <div>
          <label className="label">
            <span className="label-text font-semibold">
              Additional Requirements (Optional)
            </span>
          </label>
          <textarea
            placeholder="Any specific instructions or requirements for this chore..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="textarea textarea-bordered w-full"
            rows={3}
            maxLength={500}
          />
          <div className="label">
            <span className="label-text-alt text-blue-600">
              💡 Add specific family rules, preferences, or special
              considerations
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGeneratedInstructions = () => {
    if (!generatedInstructions) return null;

    return (
      <div className="space-y-6">
        {/* Step-by-Step Instructions */}
        <div className="card bg-white shadow-lg border-2 border-green-200">
          <div className="card-body p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-lg text-green-700">
                📋 Step-by-Step Instructions
              </h4>
              <button
                onClick={() => regenerateSection("stepByStep")}
                className="btn btn-ghost btn-sm"
                disabled={isGenerating}
              >
                🔄 Regenerate
              </button>
            </div>

            <ol className="list-decimal list-inside space-y-2">
              {generatedInstructions.stepByStep.map((step, index) => (
                <li key={index} className="text-gray-700">
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Motivational Message */}
        {generationOptions.includeMotivation && (
          <div className="card bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200">
            <div className="card-body p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-lg text-yellow-700">
                  🌟 Motivational Message
                </h4>
                <button
                  onClick={() => regenerateSection("motivationalMessage")}
                  className="btn btn-ghost btn-sm"
                  disabled={isGenerating}
                >
                  🔄 Regenerate
                </button>
              </div>

              <p className="text-yellow-700 italic text-lg">
                "{generatedInstructions.motivationalMessage}"
              </p>
            </div>
          </div>
        )}

        {/* Photo Guidelines */}
        {generationOptions.includePhotoGuidelines && (
          <div className="card bg-white shadow-lg border-2 border-purple-200">
            <div className="card-body p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-lg text-purple-700">
                  📸 Photo Guidelines
                </h4>
                <button
                  onClick={() => regenerateSection("photoGuidelines")}
                  className="btn btn-ghost btn-sm"
                  disabled={isGenerating}
                >
                  🔄 Regenerate
                </button>
              </div>

              <ul className="list-disc list-inside space-y-1">
                {generatedInstructions.photoGuidelines.map(
                  (guideline, index) => (
                    <li key={index} className="text-gray-700">
                      {guideline}
                    </li>
                  ),
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Safety and Tips */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Safety Reminders */}
          {generationOptions.includeSafety &&
            generatedInstructions.safetyReminders.length > 0 && (
              <div className="card bg-white shadow-lg border-2 border-red-200">
                <div className="card-body p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-lg text-red-700">
                      ⚠️ Safety Reminders
                    </h4>
                    <button
                      onClick={() => regenerateSection("safetyReminders")}
                      className="btn btn-ghost btn-sm"
                      disabled={isGenerating}
                    >
                      🔄 Regenerate
                    </button>
                  </div>

                  <ul className="list-disc list-inside space-y-1">
                    {generatedInstructions.safetyReminders.map(
                      (reminder, index) => (
                        <li key={index} className="text-gray-700">
                          {reminder}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </div>
            )}

          {/* Tips for Success */}
          <div className="card bg-white shadow-lg border-2 border-blue-200">
            <div className="card-body p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-lg text-blue-700">
                  💡 Tips for Success
                </h4>
                <button
                  onClick={() => regenerateSection("tips")}
                  className="btn btn-ghost btn-sm"
                  disabled={isGenerating}
                >
                  🔄 Regenerate
                </button>
              </div>

              <ul className="list-disc list-inside space-y-1">
                {generatedInstructions.tips.map((tip, index) => (
                  <li key={index} className="text-gray-700">
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Parent Notes */}
        {generationOptions.includeParentNotes && (
          <div className="card bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200">
            <div className="card-body p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-lg text-indigo-700">
                  👨‍👩‍👧‍👦 Notes for Parents
                </h4>
                <button
                  onClick={() => regenerateSection("parentNotes")}
                  className="btn btn-ghost btn-sm"
                  disabled={isGenerating}
                >
                  🔄 Regenerate
                </button>
              </div>

              <ul className="list-disc list-inside space-y-1">
                {generatedInstructions.parentNotes.map((note, index) => (
                  <li key={index} className="text-gray-700">
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="card bg-gray-50 border-2 border-gray-200">
          <div className="card-body p-6">
            <h4 className="font-bold text-lg text-gray-700 mb-4">
              📊 Chore Details
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-semibold">Estimated Time:</span>
                <div>{generatedInstructions.estimatedTime} minutes</div>
              </div>
              <div>
                <span className="font-semibold">Difficulty:</span>
                <div className="capitalize">
                  {generatedInstructions.difficultyLevel}
                </div>
              </div>
              <div>
                <span className="font-semibold">Steps:</span>
                <div>{generatedInstructions.stepByStep.length}</div>
              </div>
              <div>
                <span className="font-semibold">Age Group:</span>
                <div>
                  {choreData.assignedTo?.age
                    ? `${choreData.assignedTo.age} years`
                    : "All ages"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-primary mb-2">
          🤖 AI Instruction Generator
        </h2>
        <p className="text-gray-600">
          Generate personalized, age-appropriate instructions for "
          {choreData.title}"
        </p>
      </div>

      {/* Generation Options */}
      {!generatedInstructions && renderGenerationOptions()}

      {/* Generate Button */}
      {!generatedInstructions && (
        <div className="text-center mb-8">
          <button
            onClick={generateInstructions}
            disabled={isGenerating}
            className="btn btn-primary btn-lg"
          >
            {isGenerating ? (
              <>
                <span className="loading loading-spinner loading-sm mr-2"></span>
                Generating AI Instructions...
              </>
            ) : (
              <>✨ Generate Instructions</>
            )}
          </button>
        </div>
      )}

      {/* Generated Instructions */}
      {generatedInstructions && renderGeneratedInstructions()}

      {/* Action Buttons */}
      {generatedInstructions && (
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <button
            onClick={() => {
              setGeneratedInstructions(null);
              setCustomPrompt("");
            }}
            className="btn btn-ghost"
          >
            🔄 Generate New Instructions
          </button>
          <button
            onClick={applyInstructions}
            className="btn btn-primary btn-lg"
          >
            ✅ Use These Instructions
          </button>
          {onClose && (
            <button onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
          )}
        </div>
      )}

      {/* AI Disclaimer */}
      <div className="alert alert-info mt-8">
        <span className="text-lg">🤖</span>
        <div>
          <p className="font-semibold">AI-Generated Content</p>
          <p className="text-sm">
            These instructions are generated by AI and should be reviewed for
            appropriateness. Always consider your child's specific abilities and
            your family's safety guidelines.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIInstructionGenerator;
