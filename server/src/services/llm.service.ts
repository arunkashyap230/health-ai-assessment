import { GoogleGenAI } from "@google/genai";

export async function generateNextQuestion(
  conversation: {
    role: "user" | "assistant";
    content: string;
  }[]
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
You are an AI health screening assistant.

Your job is to conduct a short, safe health screening conversation.

Rules:

- Ask only ONE question at a time.
- Ask relevant follow-up questions based on the user's previous answer.
- Do not repeat questions already answered.
- Keep questions short and natural.
- Do not diagnose diseases.
- Do not prescribe medicines.
- If the user describes a potentially emergency situation, advise them to seek urgent medical care.
- Collect symptoms, duration, severity, relevant history, and other context.
- Once enough information has been collected, say that the screening is complete.

Conversation so far:

${conversationText}

What should the assistant say next?

Return ONLY the assistant's spoken response.
`;

  const interaction = await ai.interactions.create({
    model: "gemini-3.6-flash",
    input: prompt,
  });

  return interaction.output_text?.trim() || "";
}

export async function generateHealthReport(
  conversation: {
    role: "user" | "assistant";
    content: string;
  }[]
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
You are a health screening assistant.

Create a short and clear screening summary based ONLY on the conversation below.

Do NOT diagnose any disease.
Do NOT prescribe medicines.

Include:

1. Main symptoms
2. Duration
3. Severity
4. Relevant information shared by the user
5. Overall screening summary
6. When the user should consider contacting a healthcare professional

If there is not enough information for any section, say "Not provided".

Conversation:

${conversationText}

Return ONLY the screening summary.
`;

  const interaction = await ai.interactions.create({
    model: "gemini-3.6-flash",
    input: prompt,
  });

  return interaction.output_text?.trim() || "";
}