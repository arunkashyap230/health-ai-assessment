import { GoogleGenAI } from "@google/genai";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export async function generateHealthReport(
  conversation: Message[]
) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  const ai = new GoogleGenAI({
    apiKey,
  });

  const conversationText = conversation
    .map(
      (message) =>
        `${message.role}: ${message.content}`
    )
    .join("\n");

  const prompt = `
You are a health screening report generator.

Create a concise structured health screening summary
from the conversation below.

IMPORTANT:
- Do NOT diagnose any disease.
- Do NOT prescribe medicine.
- Do NOT invent information.
- Only use information actually provided by the user.
- If information is not available, write "Not provided".
- Clearly distinguish user-reported information from AI observations.
- If the conversation is very short, still generate a report using the available information.

Return the report using EXACTLY this structure:

HEALTH SCREENING SUMMARY

Main Concern:
[main concern]

Key Symptoms:
- [symptom]
- [symptom]

Duration:
[duration]

Severity:
[severity]

Relevant History / Context:
[relevant information]

Follow-up / Important Flags:
[important information or "None identified from the provided information"]

Disclaimer:
This is an AI-generated screening summary and not a medical diagnosis. Please consult a qualified healthcare professional for medical advice.

Conversation:

${conversationText}
`;

  const interaction =
    await ai.interactions.create({
      model: "gemini-3.6-flash",
      input: prompt,
    });

  return (
    interaction.output_text?.trim() ||
    "Unable to generate health screening report."
  );
}