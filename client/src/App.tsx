import { useRef, useState } from "react";
import { useVoiceRecorder } from "./hooks/useVoiceRecorder";
import "./App.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001";

function App() {
  const [sessionId, setSessionId] = useState("");
  const sessionIdRef = useRef("");

  const [aiResponse, setAiResponse] = useState("");
  const [report, setReport] = useState("");

  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const [questionNumber, setQuestionNumber] = useState(1);

  // =====================================================
  // TEXT -> VOICE
  // =====================================================

  const speakText = (
    text: string,
    onFinished?: () => void
  ) => {
    if (!text) {
      onFinished?.();
      return;
    }

    window.speechSynthesis.cancel();

    const speech =
      new SpeechSynthesisUtterance(text);

    speech.lang = "hi-IN";
    speech.rate = 1;
    speech.pitch = 1;

    speech.onstart = () => {
      console.log("🔊 AI speaking");
      setIsSpeaking(true);
    };

    speech.onend = () => {
      console.log("🔊 AI finished speaking");

      setIsSpeaking(false);

      onFinished?.();
    };

    speech.onerror = (event) => {
      console.error(
        "❌ TTS error:",
        event.error
      );

      setIsSpeaking(false);

      onFinished?.();
    };

    window.speechSynthesis.speak(speech);
  };

  // =====================================================
  // FINAL USER TRANSCRIPT
  // =====================================================

  const handleFinalTranscript = async (
    text: string
  ) => {
    if (!text.trim()) {
      return;
    }

    console.log(
      "📥 Final transcript:",
      text
    );

    await sendTranscriptToBackend(text);
  };

  const {
    isRecording,
    transcript,
    startRecording,
    stopRecording,
  } = useVoiceRecorder(
    handleFinalTranscript
  );

  // =====================================================
  // START ASSESSMENT
  // =====================================================

  const startAssessment = async () => {
    try {
      setIsStarting(true);

      setReport("");
      setAiResponse("");
      setQuestionNumber(1);

      const response = await fetch(
        `${API_BASE_URL}/api/call/start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      console.log(
        "START API RESPONSE:",
        data
      );

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to start assessment"
        );
      }

      const newSessionId =
        data.sessionId;

      if (!newSessionId) {
        throw new Error(
          "Session ID missing"
        );
      }

      // Ref + state dono update
      sessionIdRef.current =
        newSessionId;

      setSessionId(newSessionId);

      setAiResponse(data.message);

      // AI first question bolega
      // Speech finish hone ke baad mic start
      speakText(data.message, () => {
        startRecording();
      });
    } catch (error) {
      console.error(
        "❌ Start assessment error:",
        error
      );
    } finally {
      setIsStarting(false);
    }
  };

  // =====================================================
  // SEND USER ANSWER TO BACKEND
  // =====================================================

  const sendTranscriptToBackend = async (
    text: string
  ) => {
    try {
      setIsSending(true);

      const currentSessionId =
        sessionIdRef.current;

      console.log(
        "📌 Session ID:",
        currentSessionId
      );

      console.log(
        "📤 Sending to backend:",
        text
      );

      if (!currentSessionId) {
        throw new Error(
          "Session ID is missing"
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/api/call/message`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            sessionId:
              currentSessionId,
            message: text.trim(),
          }),
        }
      );

      const data = await response.json();

      console.log(
        "BACKEND RESPONSE:",
        data
      );

      // Gemini quota
      if (response.status === 429) {
        setAiResponse(
          "AI usage limit has been reached. Please try again later."
        );

        return;
      }

      // Other errors
      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            data.message ||
            "Backend request failed"
        );
      }

      const responseText =
        data.assistantMessage;

      if (!responseText) {
        throw new Error(
          "AI response is empty"
        );
      }

      setAiResponse(responseText);

      // Question number
      setQuestionNumber(
        (prev) => prev + 1
      );

      // AI next question bolega
      // Speech finish hone ke baad mic start
      speakText(
        responseText,
        () => {
          startRecording();
        }
      );
    } catch (error) {
      console.error(
        "❌ Error sending transcript:",
        error
      );
    } finally {
      setIsSending(false);
    }
  };

  // =====================================================
  // END ASSESSMENT
  // =====================================================

  const endAssessment = async () => {
    try {
      setIsEnding(true);

      // AI speech stop
      window.speechSynthesis.cancel();

      setIsSpeaking(false);

      // Mic stop
      stopRecording();

      const currentSessionId =
        sessionIdRef.current;

      if (!currentSessionId) {
        throw new Error(
          "Session ID is missing"
        );
      }

      console.log(
        "🛑 Ending assessment:",
        currentSessionId
      );

      const response = await fetch(
        `${API_BASE_URL}/api/call/end`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            sessionId:
              currentSessionId,
          }),
        }
      );

      const data = await response.json();

      console.log(
        "📄 REPORT RESPONSE:",
        data
      );

      // Gemini quota
      if (response.status === 429) {
        alert(
          "AI usage limit reached while generating report."
        );

        return;
      }

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Failed to generate report"
        );
      }

      if (!data.report) {
        throw new Error(
          "Report is empty"
        );
      }

      // Final report
      setReport(data.report);

      console.log(
        "✅ Report displayed"
      );
    } catch (error) {
      console.error(
        "❌ End assessment error:",
        error
      );
    } finally {
      setIsEnding(false);
    }
  };

  // =====================================================
  // NEW ASSESSMENT
  // =====================================================

  const startNewAssessment = () => {
    // Speech stop
    window.speechSynthesis.cancel();

    // Mic stop
    stopRecording();

    // Session clear
    sessionIdRef.current = "";

    setSessionId("");

    setAiResponse("");

    setReport("");

    setQuestionNumber(1);

    setIsSpeaking(false);

    setIsEnding(false);

    setIsSending(false);
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="app-shell">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="topbar">
        <div className="brand">

          <div className="brand-icon">
            🩺
          </div>

          <div>
            <div className="brand-name">
              HealthAI
            </div>

            <div className="brand-subtitle">
              Voice Health Screening
            </div>
          </div>

        </div>

        <div className="secure-badge">
          <span className="secure-dot" />
          Secure Session
        </div>
      </header>

      <main className="main-container">

        {/* =================================================
            WELCOME SCREEN
        ================================================= */}

        {!sessionId && !report && (
          <section className="welcome-section">

            <div className="welcome-badge">
              AI-powered screening
            </div>

            <h1>
              Your health,
              <br />
              <span>
                one conversation away.
              </span>
            </h1>

            <p className="welcome-description">
              Have a short voice conversation
              with our AI health screening
              assistant. Answer naturally and
              we'll summarize what you shared.
            </p>

            <div className="welcome-card">

              <div className="welcome-avatar">
                <span>🤖</span>
              </div>

              <div className="welcome-card-content">

                <strong>
                  How it works
                </strong>

                <div className="steps">

                  <div className="step">
                    <div className="step-number">
                      1
                    </div>

                    <span>
                      AI asks questions
                    </span>
                  </div>

                  <div className="step">
                    <div className="step-number">
                      2
                    </div>

                    <span>
                      You answer by voice
                    </span>
                  </div>

                  <div className="step">
                    <div className="step-number">
                      3
                    </div>

                    <span>
                      Get a screening summary
                    </span>
                  </div>

                </div>
              </div>
            </div>

            <button
              className="primary-button"
              onClick={startAssessment}
              disabled={isStarting}
            >
              {isStarting ? (
                <>
                  <span className="spinner" />
                  Starting...
                </>
              ) : (
                <>
                  <span className="mic-icon">
                    🎙
                  </span>

                  Start Assessment
                </>
              )}
            </button>

            <p className="disclaimer-small">
              This screening is not a medical
              diagnosis or a substitute for
              professional medical advice.
            </p>

          </section>
        )}

        {/* =================================================
            ASSESSMENT SCREEN
        ================================================= */}

        {sessionId && !report && (
          <section className="assessment-section">

            {/* Assessment Header */}

            <div className="assessment-header">

              <div>
                <div className="section-label">
                  HEALTH SCREENING
                </div>

                <h2>
                  Voice Assessment
                </h2>
              </div>

              <div className="question-counter">

                <strong>
                  {questionNumber}
                </strong>

                <span>
                  / 5
                </span>

              </div>

            </div>

            {/* Progress */}

            <div className="progress-wrapper">

              <div className="progress-track">

                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(
                      (questionNumber / 5) *
                        100,
                      100
                    )}%`,
                  }}
                />

              </div>

              <div className="progress-labels">

                <span>
                  Question{" "}
                  {questionNumber}
                </span>

                <span>
                  5 questions
                </span>

              </div>

            </div>

            {/* AI Area */}

            <div className="ai-area">

              <div
                className={`ai-avatar ${
                  isSpeaking
                    ? "ai-speaking"
                    : ""
                }`}
              >

                <div className="avatar-face">
                  🤖
                </div>

                {isSpeaking && (
                  <>
                    <span className="pulse pulse-one" />
                    <span className="pulse pulse-two" />
                  </>
                )}

              </div>

              {/* AI Speaking */}

              {isSpeaking && (
                <div className="status speaking-status">

                  <span className="status-dot" />

                  AI is speaking

                </div>
              )}

              {/* AI Thinking */}

              {!isSpeaking &&
                !isRecording &&
                isSending && (
                  <div className="status">

                    <span className="spinner small" />

                    AI is thinking

                  </div>
                )}

              {/* User Listening */}

              {isRecording && (
                <div className="status listening-status">

                  <span className="recording-dot" />

                  Listening...
                  Speak naturally

                </div>
              )}

            </div>

            {/* =================================================
                AI MESSAGE
            ================================================= */}

            {aiResponse && (
              <div className="message-card ai-message">

                <div className="message-header">

                  <div className="message-avatar">
                    🤖
                  </div>

                  <span>
                    AI Assistant
                  </span>

                </div>

                <p>
                  {aiResponse}
                </p>

              </div>
            )}

            {/* =================================================
                USER TRANSCRIPT
            ================================================= */}

            {transcript && (
              <div className="message-card user-message">

                <div className="message-header">

                  <div className="message-avatar user-avatar">
                    👤
                  </div>

                  <span>
                    You said
                  </span>

                </div>

                <p>
                  {transcript}
                </p>

              </div>
            )}

            {/* =================================================
                RECORDING CONTROLS
            ================================================= */}

            {isRecording && (
              <div className="recording-area">

                <div className="recording-animation">

                  <span />
                  <span />
                  <span />
                  <span />
                  <span />

                </div>

                <button
                  className="stop-button"
                  onClick={stopRecording}
                >
                  <span>
                    ■
                  </span>

                  Stop Listening
                </button>

              </div>
            )}

            {/* =================================================
                END ASSESSMENT
                IMPORTANT:
                Ye recording ke bahar hai.
                Isliye mic stop hone par bhi visible rahega.
            ================================================= */}

            <div
              className="end-assessment-area"
              style={{
                marginTop: "25px",
                textAlign: "center",
              }}
            >

              <button
                className="end-button"
                onClick={endAssessment}
                disabled={
                  isEnding ||
                  isSending ||
                  isSpeaking
                }
              >
                {isEnding ? (
                  <>
                    <span className="spinner" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    ✓ End Assessment
                  </>
                )}
              </button>

            </div>

            {/* =================================================
                THINKING
            ================================================= */}

            {isSending && (
              <div className="thinking-card">

                <span className="thinking-dot" />
                <span className="thinking-dot" />
                <span className="thinking-dot" />

                <span>
                  Processing your response...
                </span>

              </div>
            )}

            <p className="assessment-disclaimer">
              Your responses are used only
              to generate this screening
              conversation.
            </p>

          </section>
        )}

        {/* =================================================
            FINAL REPORT
        ================================================= */}

        {report && (
          <section className="report-section">

            <div className="complete-icon">
              ✓
            </div>

            <div className="complete-badge">
              Assessment Complete
            </div>

            <h1>
              Your screening
              <br />
              <span>
                summary is ready.
              </span>
            </h1>

            <p className="report-intro">
              Here's a summary based on
              the information you shared
              during the conversation.
            </p>

            <div className="report-card">

              <div className="report-card-header">

                <div>

                  <div className="section-label">
                    HEALTH SCREENING
                  </div>

                  <h2>
                    Screening Summary
                  </h2>

                </div>

                <div className="report-check">
                  ✓
                </div>

              </div>

              <div className="report-content">
                {report}
              </div>

            </div>

            {/* Safety */}

            <div className="safety-card">

              <div className="safety-icon">
                !
              </div>

              <div>

                <strong>
                  Important
                </strong>

                <p>
                  This is an AI-generated
                  screening summary, not a
                  medical diagnosis. Please
                  consult a qualified healthcare
                  professional for medical advice.
                </p>

              </div>

            </div>

            {/* New Assessment */}

            <button
              className="primary-button new-assessment"
              onClick={
                startNewAssessment
              }
            >
              ↻ Start New Assessment
            </button>

          </section>
        )}

      </main>

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="footer">

        <span>
          HealthAI Voice Screening
        </span>

        <span>
          For screening purposes only
        </span>

      </footer>

    </div>
  );
}

export default App;