import OpenAI from "openai";

export async function speechToText(
  audioBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is missing"
    );
  }

  const openai = new OpenAI({
    apiKey,
  });

  const extension = mimeType.includes("webm")
    ? "webm"
    : "wav";

  const file = await OpenAI.toFile(
    audioBuffer,
    `audio.${extension}`,
    {
      type: mimeType,
    }
  );

  const transcription =
    await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
    });

  return transcription.text;
}