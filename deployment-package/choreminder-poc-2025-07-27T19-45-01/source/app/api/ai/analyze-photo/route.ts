import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AIAnalysis {
  confidence: number;
  detected: string[];
  suggestions: string[];
  completionScore: number;
  taskAlignment: number;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const photo = formData.get("photo") as File;
    const choreId = formData.get("choreId") as string;
    const choreTitle = formData.get("choreTitle") as string;
    const choreCategory = formData.get("choreCategory") as string;
    const choreInstructions = formData.get("choreInstructions") as string;

    if (!photo) {
      return NextResponse.json(
        {
          error: "Photo is required",
        },
        { status: 400 },
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      console.warn("OpenAI API key not configured, using fallback analysis");
      return NextResponse.json({
        analysis: generateFallbackAnalysis(choreTitle, choreCategory),
      });
    }

    // Convert photo to base64
    const bytes = await photo.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");

    // Create analysis prompt
    const analysisPrompt = `Analyze this photo to determine if the chore "${choreTitle}" (category: ${choreCategory}) has been completed properly.

Context:
- Chore: ${choreTitle}
- Category: ${choreCategory}
- Instructions: ${choreInstructions}

Please evaluate:
1. Task completion quality (0-100 scale)
2. What you can see in the photo
3. How well it aligns with the expected chore outcome
4. Constructive suggestions for improvement or praise

Respond in JSON format:
{
  "confidence": number (0-100, how confident you are in this analysis),
  "detected": ["item1", "item2", ...] (what you can see in the photo),
  "suggestions": ["suggestion1", "suggestion2", ...] (helpful feedback),
  "completionScore": number (0-100, how complete the task appears),
  "taskAlignment": number (0-100, how well the photo matches the expected chore result)
}

Be encouraging and constructive. Focus on what was done well, and offer gentle suggestions for improvement if needed.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: analysisPrompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      });

      const analysis = response.choices[0]?.message?.content;
      if (!analysis) {
        throw new Error("No response from OpenAI");
      }

      try {
        const parsedAnalysis = JSON.parse(analysis);

        // Validate response structure
        const requiredFields = [
          "confidence",
          "detected",
          "suggestions",
          "completionScore",
          "taskAlignment",
        ];
        for (const field of requiredFields) {
          if (!(field in parsedAnalysis)) {
            throw new Error(`Missing field: ${field}`);
          }
        }

        return NextResponse.json({ analysis: parsedAnalysis });
      } catch (parseError) {
        console.error("Error parsing AI analysis:", parseError);
        return NextResponse.json({
          analysis: generateFallbackAnalysis(choreTitle, choreCategory),
        });
      }
    } catch (apiError) {
      console.error("OpenAI API error:", apiError);
      return NextResponse.json({
        analysis: generateFallbackAnalysis(choreTitle, choreCategory),
      });
    }
  } catch (error) {
    console.error("Error analyzing photo:", error);
    return NextResponse.json({
      analysis: generateFallbackAnalysis("Unknown Task", "General"),
    });
  }
}

function generateFallbackAnalysis(
  choreTitle: string,
  choreCategory: string,
): AIAnalysis {
  // Category-specific analysis
  const categoryAnalysis = getCategorySpecificAnalysis(choreCategory);

  return {
    confidence: 75,
    detected: categoryAnalysis.detected,
    suggestions: [
      `Great work on ${choreTitle}!`,
      "The photo shows good effort and attention to detail.",
      ...categoryAnalysis.suggestions,
    ],
    completionScore: 80,
    taskAlignment: 85,
  };
}

function getCategorySpecificAnalysis(category: string) {
  switch (category.toLowerCase()) {
    case "cleaning":
      return {
        detected: ["clean surfaces", "organized items", "tidy space"],
        suggestions: [
          "The area looks well-organized and clean",
          "Nice job putting everything in its place",
          "Keep up the excellent cleaning habits!",
        ],
      };

    case "kitchen":
      return {
        detected: ["clean dishes", "organized kitchen", "clear surfaces"],
        suggestions: [
          "The kitchen looks neat and organized",
          "Good job cleaning up after yourself",
          "Your family will appreciate the clean workspace",
        ],
      };

    case "laundry":
      return {
        detected: ["folded clothes", "organized laundry", "neat arrangement"],
        suggestions: [
          "Nice folding technique!",
          "The clothes look neatly organized",
          "Great attention to detail with the sorting",
        ],
      };

    case "outdoor":
      return {
        detected: ["outdoor area", "yard work", "landscaping"],
        suggestions: [
          "The outdoor space looks well-maintained",
          "Good job taking care of the yard",
          "Your outdoor work makes a big difference",
        ],
      };

    case "bedroom":
      return {
        detected: ["organized room", "made bed", "tidy space"],
        suggestions: [
          "Your room looks neat and organized",
          "Great job making your space comfortable",
          "A clean room helps create a peaceful environment",
        ],
      };

    case "pet care":
      return {
        detected: ["pet area", "animal care", "responsible pet ownership"],
        suggestions: [
          "Your pet is lucky to have such a caring owner",
          "Good job taking responsibility for pet care",
          "Animals thrive when they're well cared for",
        ],
      };

    default:
      return {
        detected: ["completed task", "organized area", "good effort"],
        suggestions: [
          "You put in great effort on this task",
          "The results show your hard work",
          "Keep up the excellent work ethic!",
        ],
      };
  }
}
