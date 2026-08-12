import { Router } from "express";

import {
  generateNextQuestion,
} from "../services/llm.service.js";

import {
  generateHealthReport,
} from "../services/report.service.js";

const router = Router();

type Message = {
  role: "user" | "assistant";
  content: string;
};

// Har session ki conversation temporarily memory me store hogi
const conversations = new Map<string, Message[]>();

// =====================================================
// START ASSESSMENT
// =====================================================

router.post("/start", (_req, res) => {
  try {
    const sessionId = `session-${Date.now()}`;

    const firstMessage =
      "Hello! I am your health screening assistant. May I know your name?";

    // Initial AI message save karo
    conversations.set(sessionId, [
      {
        role: "assistant",
        content: firstMessage,
      },
    ]);

    console.log("New session:", sessionId);

    return res.json({
      success: true,
      sessionId,
      message: firstMessage,
    });
  } catch (error) {
    console.error("Start error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to start assessment",
    });
  }
});

// =====================================================
// USER MESSAGE
// =====================================================

router.post("/message", async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    console.log("Session ID:", sessionId);
    console.log("User message:", message);

    // -------------------------------------------------
    // Session validation
    // -------------------------------------------------

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required",
      });
    }

    // -------------------------------------------------
    // Message validation
    // -------------------------------------------------

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    // -------------------------------------------------
    // Existing conversation
    // -------------------------------------------------

    let conversation = conversations.get(sessionId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // -------------------------------------------------
    // USER ANSWER SAVE
    // -------------------------------------------------

    conversation.push({
      role: "user",
      content: message.trim(),
    });

    console.log("User:", message.trim());

    // -------------------------------------------------
    // GEMINI → NEXT QUESTION
    // -------------------------------------------------

    const aiResponse =
      await generateNextQuestion(
        conversation
      );

    console.log("AI:", aiResponse);

    // -------------------------------------------------
    // AI RESPONSE SAVE
    // -------------------------------------------------

    conversation.push({
      role: "assistant",
      content: aiResponse,
    });

    // -------------------------------------------------
    // FRONTEND RESPONSE
    // -------------------------------------------------

    return res.json({
      success: true,
      sessionId,
      userMessage: message.trim(),
      assistantMessage: aiResponse,
    });
  } catch (error: any) {
    console.error("❌ LLM error:", error);

    // Gemini quota / rate limit
    if (error?.status === 429) {
      return res.status(429).json({
        success: false,
        message:
          "AI usage limit reached. Please try again later.",
        error: "GEMINI_QUOTA_EXCEEDED",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to generate AI response",
      error:
        error?.message || String(error),
    });
  }
});

// =====================================================
// END ASSESSMENT + GENERATE FINAL REPORT
// =====================================================

router.post("/end", async (req, res) => {
  try {
    const { sessionId } = req.body;

    console.log(
      "Ending session:",
      sessionId
    );

    // -------------------------------------------------
    // Session validation
    // -------------------------------------------------

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required",
      });
    }

    // -------------------------------------------------
    // Get conversation
    // -------------------------------------------------

    const conversation =
      conversations.get(sessionId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    console.log(
      "Conversation:",
      conversation
    );

    // -------------------------------------------------
    // Generate report
    // -------------------------------------------------

    console.log(
      "📄 Generating final health report..."
    );

    const report =
      await generateHealthReport(
        conversation
      );

    if (!report) {
      return res.status(500).json({
        success: false,
        message:
          "Failed to generate health report",
      });
    }

    console.log(
      "✅ Final report generated"
    );

    // -------------------------------------------------
    // Return report to frontend
    // -------------------------------------------------

    return res.json({
      success: true,
      sessionId,
      report,
    });
  } catch (error: any) {
    console.error(
      "❌ Report generation error:",
      error
    );

    // Gemini quota / rate limit
    if (error?.status === 429) {
      return res.status(429).json({
        success: false,
        message:
          "AI usage limit reached while generating report.",
        error: "GEMINI_QUOTA_EXCEEDED",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to generate health report",
      error:
        error?.message || String(error),
    });
  }
});

export default router;