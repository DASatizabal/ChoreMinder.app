import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import OpenAI from "openai";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { section, choreData, currentInstructions, template } =
      await req.json();

    if (!section || !choreData || !currentInstructions) {
      return NextResponse.json(
        {
          error: "Section, chore data, and current instructions are required",
        },
        { status: 400 },
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      console.warn(
        "OpenAI API key not configured, using fallback regeneration",
      );
      return NextResponse.json({
        newContent: generateFallbackSection(section, choreData),
      });
    }

    // Create section-specific prompt
    const prompt = createSectionPrompt(
      section,
      choreData,
      currentInstructions,
      template,
    );

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are an expert family chore assistant. Generate only the requested section content in the format specified. Be encouraging, age-appropriate, and practical.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 800,
      temperature: 0.8, // Higher temperature for more variety
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error("No response from OpenAI");
    }

    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response);
      return NextResponse.json({ newContent: parsed });
    } catch {
      // If not JSON, treat as direct content based on section type
      const processedContent = processSectionResponse(section, response);
      return NextResponse.json({ newContent: processedContent });
    }
  } catch (error) {
    console.error("Error regenerating section:", error);

    // Return fallback content
    const { section, choreData } = await req.json().catch(() => ({}));
    return NextResponse.json({
      newContent: generateFallbackSection(section, choreData || {}),
    });
  }
}

function createSectionPrompt(
  section: keyof GeneratedInstructions,
  choreData: ChoreData,
  currentInstructions: GeneratedInstructions,
  template: string,
): string {
  const age = choreData.assignedTo?.age || 10;
  const choreTitle = choreData.title;
  const category = choreData.category;

  const baseContext = `
Chore: ${choreTitle}
Category: ${category}
Child's Age: ${age}
Current ${section}: ${JSON.stringify(currentInstructions[section])}

Generate a fresh, alternative version of the ${section} section. Make it different from the current version while maintaining the same quality and appropriateness.`;

  switch (section) {
    case "stepByStep":
      return `${baseContext}

Create 5-7 clear, actionable steps for completing "${choreTitle}". Make each step specific and age-appropriate for a ${age}-year-old. Return as a JSON array of strings.

Example format: ["Step 1 description", "Step 2 description", ...]`;

    case "photoGuidelines":
      return `${baseContext}

Create 4-6 specific photo guidelines for documenting the completed chore "${choreTitle}". Focus on how to capture good evidence of the work done. Return as a JSON array of strings.

Example format: ["Guideline 1", "Guideline 2", ...]`;

    case "motivationalMessage":
      return `${baseContext}

Create an encouraging, inspiring message for a ${age}-year-old about to do "${choreTitle}". Make it personal and motivating. Return as a simple string (not JSON).

Example: "You're going to do amazing work on..."`;

    case "ageAppropriateInstructions":
      return `${baseContext}

Create age-specific guidance for a ${age}-year-old doing "${choreTitle}". Consider their developmental stage and abilities. Return as a simple string (not JSON).

Example: "Remember to take your time and..."`;

    case "safetyReminders":
      return `${baseContext}

Create 3-5 safety reminders specific to "${choreTitle}" and appropriate for a ${age}-year-old. Return as a JSON array of strings.

Example format: ["Safety tip 1", "Safety tip 2", ...]`;

    case "tips":
      return `${baseContext}

Create 4-6 helpful tips for successfully completing "${choreTitle}". Make them practical and encouraging for a ${age}-year-old. Return as a JSON array of strings.

Example format: ["Helpful tip 1", "Helpful tip 2", ...]`;

    case "parentNotes":
      return `${baseContext}

Create 3-5 notes for parents on how to support their ${age}-year-old with "${choreTitle}". Include guidance on supervision, encouragement, and expectations. Return as a JSON array of strings.

Example format: ["Parent note 1", "Parent note 2", ...]`;

    default:
      return `${baseContext}

Regenerate the ${section} section with fresh content.`;
  }
}

function processSectionResponse(
  section: keyof GeneratedInstructions,
  response: string,
): any {
  // Clean up the response
  const cleaned = response.trim().replace(/^```json\n?|\n?```$/g, "");

  try {
    return JSON.parse(cleaned);
  } catch {
    // If JSON parsing fails, process based on section type
    switch (section) {
      case "stepByStep":
      case "photoGuidelines":
      case "safetyReminders":
      case "tips":
      case "parentNotes":
        // Try to extract array from text
        const lines = cleaned
          .split("\n")
          .map((line) => line.replace(/^[\d\-\*\•]\s*/, "").trim())
          .filter((line) => line.length > 0);
        return lines.length > 0 ? lines : ["Unable to regenerate this section"];

      case "motivationalMessage":
      case "ageAppropriateInstructions":
        return cleaned || "Unable to regenerate this section";

      default:
        return "Unable to regenerate this section";
    }
  }
}

function generateFallbackSection(
  section: keyof GeneratedInstructions,
  choreData: ChoreData,
): any {
  const age = choreData.assignedTo?.age || 10;
  const choreTitle = choreData.title || "this task";

  switch (section) {
    case "stepByStep":
      return [
        `Prepare everything you need for ${choreTitle}`,
        "Take your time and work systematically",
        "Check your progress regularly",
        "Stay focused and do your best work",
        "Clean up and admire your accomplishment!",
      ];

    case "photoGuidelines":
      return [
        "Show the completed work clearly",
        "Use good lighting for the photo",
        "Include the whole work area",
        "Take the photo from the best angle",
        "Make sure everything is visible",
      ];

    case "motivationalMessage":
      return `You have everything it takes to do an excellent job with ${choreTitle}! Your effort and care make all the difference.`;

    case "ageAppropriateInstructions":
      if (age <= 8) {
        return "Take it one step at a time and remember that learning is more important than perfection. Ask for help when you need it!";
      } else if (age <= 12) {
        return "You're capable of doing great work! Focus on quality and take pride in contributing to your family.";
      } else {
        return "This is a chance to practice responsibility and develop valuable life skills. Your maturity and effort really show.";
      }

    case "safetyReminders":
      return [
        "Ask an adult if you're not sure about something",
        "Work at a comfortable pace",
        "Be aware of your surroundings",
        "Take breaks when you need them",
      ];

    case "tips":
      return [
        "Break the task into smaller parts",
        "Celebrate progress along the way",
        "Focus on doing your best",
        "Learn something new from the experience",
        "Enjoy the sense of accomplishment!",
      ];

    case "parentNotes":
      return [
        "Provide encouragement and support",
        "Focus on effort rather than perfection",
        "Be available to help when needed",
        "Celebrate their completion and hard work",
        "Use this as a learning opportunity",
      ];

    default:
      return "Section regenerated successfully";
  }
}
