import { useRef, useState } from "react";

interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;

  start: () => void;
  stop: () => void;
  abort: () => void;

  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult:
    | ((event: SpeechRecognitionEventLike) => void)
    | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function useVoiceRecorder(
  onFinalTranscript: (text: string) => void
) {
  const recognitionRef =
    useRef<SpeechRecognitionInstance | null>(null);

  const isProcessingRef = useRef(false);

  const [isRecording, setIsRecording] =
    useState(false);

  const [transcript, setTranscript] =
    useState("");

  const startRecording = () => {
    // Agar already listening hai to dobara start mat karo
    if (recognitionRef.current) {
      console.log("🎤 Already listening");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Speech Recognition supported nahi hai. Chrome use karo."
      );
      return;
    }

    console.log("🎤 Starting Hindi speech recognition...");

    const recognition = new SpeechRecognition();

    recognitionRef.current = recognition;

    /*
     * IMPORTANT
     *
     * false:
     * User ke sentence ko naturally complete hone do.
     * Continuous mode ki wajah se duplicate words nahi aayenge.
     */
    recognition.continuous = false;

    /*
     * Sirf final result chahiye.
     * Interim result false karne se:
     * "मेरा..."
     * "मेरा नाम..."
     * "मेरा नाम अरुण..."
     *
     * jaise duplicate updates nahi milenge.
     */
    recognition.interimResults = false;

    /*
     * Hindi
     */
    recognition.lang = "hi-IN";

    isProcessingRef.current = false;

    setTranscript("");

    // -----------------------------
    // Recognition Started
    // -----------------------------

    recognition.onstart = () => {
      console.log("🎤 Listening started");

      setIsRecording(true);
    };

    // -----------------------------
    // Final Speech Result
    // -----------------------------

    recognition.onresult = (event) => {
      console.log("📝 Speech result received");

      if (isProcessingRef.current) {
        return;
      }

      let finalText = "";

      /*
       * Saare final results collect karo
       */
      for (
        let i = 0;
        i < event.results.length;
        i++
      ) {
        finalText +=
          event.results[i][0].transcript + " ";
      }

      finalText = finalText.trim();

      if (!finalText) {
        console.log("⚠️ Empty transcript");
        return;
      }

      console.log(
        "✅ Final transcript:",
        finalText
      );

      isProcessingRef.current = true;

      setTranscript(finalText);
      setIsRecording(false);

      /*
       * Recognition ko stop karo
       */
      try {
        recognition.stop();
      } catch (error) {
        console.log(
          "Recognition stop error:",
          error
        );
      }

      recognitionRef.current = null;

      /*
       * Backend ko final answer bhejo
       */
      console.log(
        "📤 Sending final answer:",
        finalText
      );

      onFinalTranscript(finalText);
    };

    // -----------------------------
    // Error
    // -----------------------------

    recognition.onerror = (event) => {
      console.error(
        "❌ Speech recognition error:",
        event.error
      );

      setIsRecording(false);

      recognitionRef.current = null;

      isProcessingRef.current = false;

      /*
       * no-speech ko normal case samjho
       */
      if (event.error === "no-speech") {
        console.log(
          "⚠️ No speech detected. Try speaking again."
        );
      }

      if (event.error === "not-allowed") {
        alert(
          "Microphone permission allow karo."
        );
      }
    };

    // -----------------------------
    // Recognition End
    // -----------------------------

    recognition.onend = () => {
      console.log(
        "🛑 Speech recognition ended"
      );

      setIsRecording(false);

      /*
       * Agar result already process nahi hua
       * to reference clean karo.
       */
      if (!isProcessingRef.current) {
        recognitionRef.current = null;
      }
    };

    // -----------------------------
    // Start
    // -----------------------------

    try {
      recognition.start();
    } catch (error) {
      console.error(
        "❌ Failed to start recognition:",
        error
      );

      recognitionRef.current = null;
      setIsRecording(false);
    }
  };

  // -----------------------------
  // Manual Stop
  // -----------------------------

  const stopRecording = () => {
    console.log("⏹ Stop listening");

    const recognition =
      recognitionRef.current;

    if (!recognition) {
      setIsRecording(false);
      return;
    }

    isProcessingRef.current = true;

    try {
      recognition.stop();
    } catch (error) {
      console.error(
        "Stop recognition error:",
        error
      );
    }

    recognitionRef.current = null;

    setIsRecording(false);
  };

  return {
    isRecording,
    transcript,
    startRecording,
    stopRecording,
  };
}