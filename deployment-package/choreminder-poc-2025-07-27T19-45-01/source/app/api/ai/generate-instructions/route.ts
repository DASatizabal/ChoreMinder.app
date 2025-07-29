import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import OpenAI from "openai";

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
  familyContext?: {
    rules: string[];
    settings: {
      allowChildDecline: boolean;
      requirePhotoVerification: boolean;
    };
  };
}

interface GenerationOptions {
  includeMotivation: boolean;
  includeSafety: boolean;
  includePhotoGuidelines: boolean;
  includeParentNotes: boolean;
  complexityLevel: "simple" | "age-appropriate" | "detailed";
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt, choreData, options, template } = await req.json();

    if (!prompt || !choreData) {
      return NextResponse.json(
        {
          error: "Prompt and chore data are required",
        },
        { status: 400 },
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      console.warn(
        "OpenAI API key not configured, using fallback instructions",
      );
      return NextResponse.json({
        instructions: generateFallbackInstructions(choreData, options),
      });
    }

    // Build the system prompt
    const systemPrompt = `You are an expert family chore assistant that creates age-appropriate, encouraging instructions for children. Your goal is to help kids complete tasks successfully while building confidence and independence.

IMPORTANT GUIDELINES:
- Always be encouraging and positive
- Use age-appropriate language and concepts
- Focus on safety first
- Break complex tasks into simple steps
- Include practical tips for success
- Consider the child's developmental stage
- Make instructions clear and actionable

Response format: Return a JSON object with these exact fields:
{
  "stepByStep": ["Step 1", "Step 2", ...],
  "photoGuidelines": ["Guideline 1", "Guideline 2", ...],
  "motivationalMessage": "Encouraging message for the child",
  "ageAppropriateInstructions": "Special notes for this age group",
  "safetyReminders": ["Safety tip 1", "Safety tip 2", ...],
  "estimatedTime": number_in_minutes,
  "difficultyLevel": "easy" | "medium" | "hard",
  "tips": ["Helpful tip 1", "Helpful tip 2", ...],
  "parentNotes": ["Note for parents 1", "Note for parents 2", ...]
}`;

    // Generate instructions using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error("No response from OpenAI");
    }

    try {
      const instructions = JSON.parse(response);

      // Validate the response structure
      const requiredFields = [
        "stepByStep",
        "photoGuidelines",
        "motivationalMessage",
        "ageAppropriateInstructions",
        "safetyReminders",
        "estimatedTime",
        "difficultyLevel",
        "tips",
        "parentNotes",
      ];

      for (const field of requiredFields) {
        if (!(field in instructions)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      return NextResponse.json({ instructions });
    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError);
      // Fallback to structured instructions
      return NextResponse.json({
        instructions: generateFallbackInstructions(choreData, options),
      });
    }
  } catch (error) {
    console.error("Error generating AI instructions:", error);

    // Return fallback instructions instead of error
    const { choreData, options } = await req.json().catch(() => ({}));
    return NextResponse.json({
      instructions: generateFallbackInstructions(
        choreData || {},
        options || {},
      ),
    });
  }
}

function generateFallbackInstructions(
  choreData: ChoreData,
  options: GenerationOptions,
) {
  const age = choreData.assignedTo?.age || 10;
  const isYoung = age <= 8;
  const isTeen = age >= 13;

  return {
    stepByStep: generateStepByStep(choreData, age),
    photoGuidelines: [
      "Show the completed work clearly in your photo",
      "Make sure there's good lighting",
      "Include the whole area in the shot",
      "Take the photo from a good angle",
    ],
    motivationalMessage: generateMotivationalMessage(choreData, age),
    ageAppropriateInstructions: generateAgeAppropriateInstructions(age),
    safetyReminders: generateSafetyReminders(choreData, age),
    estimatedTime: choreData.estimatedMinutes || 30,
    difficultyLevel: getDifficultyLevel(choreData, age),
    tips: generateTips(choreData, age),
    parentNotes: generateParentNotes(choreData, age),
  };
}

function generateStepByStep(choreData: ChoreData, age: number): string[] {
  const baseSteps = [
    `Get ready by gathering everything you need for ${choreData.title}`,
    "Take your time and work carefully",
    "Check your progress as you go",
    "Clean up any mess while you work",
    "Step back and admire your completed work!",
  ];

  // Customize based on category
  if (choreData.category === "Cleaning") {
    return [
      "Gather your cleaning supplies",
      "Clear the area of any items that don't belong",
      "Start from top to bottom (dust before vacuuming)",
      "Work in sections to stay organized",
      "Put everything back in its proper place",
      "Do a final check to make sure everything looks great!",
    ];
  }

  if (choreData.category === "Kitchen") {
    return [
      "Clear the counter and sink area",
      "Fill one side of sink with warm soapy water",
      "Wash dishes from cleanest to dirtiest",
      "Rinse each item with clean water",
      "Dry and put dishes away in their proper places",
      "Wipe down the counter and sink when finished",
    ];
  }

  return baseSteps;
}

function generateMotivationalMessage(
  choreData: ChoreData,
  age: number,
): string {
  const messages = [
    `You're going to do an amazing job with ${choreData.title}! Every great accomplishment starts with taking the first step.`,
    `${choreData.title} might seem big, but you've got this! Break it down into small parts and celebrate each victory.`,
    `Great job taking on ${choreData.title}! Your family is lucky to have such a helpful and responsible person.`,
    `You're building important life skills by doing ${choreData.title}. Future you will thank present you!`,
  ];

  return messages[Math.floor(Math.random() * messages.length)];
}

function generateAgeAppropriateInstructions(age: number): string {
  if (age <= 6) {
    return "Take your time and have fun! It's okay if it's not perfect - you're learning and that's what matters. Ask a grown-up for help whenever you need it.";
  } else if (age <= 10) {
    return "You're capable of doing great work! Focus on one step at a time and don't rush. Remember, practice makes progress, not perfection.";
  } else if (age <= 14) {
    return "You have the skills to do this well! Think about why this task is important for your family and take pride in contributing. Quality matters more than speed.";
  } else {
    return "You're developing valuable life skills that will serve you well. Consider this an opportunity to practice responsibility and attention to detail. Your effort makes a real difference.";
  }
}

function generateSafetyReminders(choreData: ChoreData, age: number): string[] {
  const generalSafety = [
    "Ask an adult if you're unsure about anything",
    "Take breaks if you feel tired",
    "Work at a pace that feels comfortable for you",
  ];

  if (choreData.category === "Kitchen") {
    return [
      ...generalSafety,
      "Be careful around sharp knives and hot surfaces",
      "Wash your hands before and after handling dishes",
      "Watch out for slippery floors when working with water",
    ];
  }

  if (choreData.category === "Cleaning") {
    return [
      ...generalSafety,
      "Read cleaning product labels and use as directed",
      "Make sure the room is well-ventilated",
      "Wear gloves if handling strong cleaning products",
    ];
  }

  return generalSafety;
}

function getDifficultyLevel(
  choreData: ChoreData,
  age: number,
): "easy" | "medium" | "hard" {
  const baseDifficulty = choreData.priority === "high" ? "medium" : "easy";

  if (age <= 8) {
    return baseDifficulty === "medium" ? "easy" : "easy";
  } else if (age >= 13) {
    return baseDifficulty === "easy" ? "medium" : "hard";
  }

  return baseDifficulty;
}

function generateTips(choreData: ChoreData, age: number): string[] {
  const generalTips = [
    "Break big tasks into smaller, manageable pieces",
    "Celebrate small wins along the way",
    "It's okay to ask for help when you need it",
    "Focus on doing your best, not being perfect",
  ];

  if (choreData.category === "Outdoor") {
    return [
      ...generalTips,
      "Check the weather before starting outdoor work",
      "Stay hydrated, especially on hot days",
      "Take care of plants and animals you encounter",
    ];
  }

  return generalTips;
}

function generateParentNotes(choreData: ChoreData, age: number): string[] {
  const baseNotes = [
    "Offer encouragement and guidance as needed",
    "Focus on effort rather than perfection",
    "Be available to help if they get stuck",
    "Celebrate their completion, regardless of the outcome",
  ];

  if (age <= 8) {
    return [
      ...baseNotes,
      "Young children need more supervision and support",
      "Break instructions into even smaller steps if needed",
      "Make it fun with music or games when appropriate",
    ];
  } else if (age >= 13) {
    return [
      ...baseNotes,
      "Teenagers can handle more independence",
      "Discuss the importance of the task and family contribution",
      "Respect their growing need for autonomy while staying supportive",
    ];
  }

  return baseNotes;
}
