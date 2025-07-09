import React, { useState } from "react";
import { ReactMic } from "react-mic";
import axios from "axios";
import Loader from "./Loader";
import "../styles/AudioRecorder.css";
import { ContentState, EditorState } from "draft-js";
import { useLanguage } from "./LanguageContext";

const AudioRecorderForReportEditor = ({
  setPatientName,
  setPatientAge,
  setPatientFileNumber,
  setEditorState, // ✅ NEW: Inject directly into Draft.js editor
  onSpeechText,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isTranscriptReady, setIsTranscriptReady] = useState(false);
  const { language } = useLanguage();
  const isArabic = language === "ar";

  const startRecording = () => {
    setIsRecording(true);
    setIsPaused(false);
    setIsTranscriptReady(false);
  };

  const stopRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
  };

  const togglePause = () => setIsPaused((p) => !p);

  const onStop = async (recordedBlob) => {
    setLoading(true);
    const audioFile = new File([recordedBlob.blob], "temp.wav", {
      type: "audio/wav",
    });
    const fd = new FormData();
    fd.append("audio_data", audioFile);

    try {
      const { data: transData } = await axios.post(
        "https://medical-report-editor-ai-powered-backend.onrender.com/transcribe",
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const transcript = transData.transcript;

      const { data: fields } = await axios.post(
        "https://medical-report-editor-ai-powered-backend.onrender.com/extract_report_fields",
        { transcript }
      );

      setPatientName(fields.patientName || "");
      setPatientAge(fields.age || "");
      setPatientFileNumber(fields.fileNumber || "");

      const fullText =
        fields?.medicalReport?.trim() || transcript?.trim() || "";

      // ✅ Inject into Draft.js editor
      const contentState = ContentState.createFromText(fullText);
      const newEditorState = EditorState.createWithContent(contentState);
      setEditorState(newEditorState);

      if (onSpeechText) {
        onSpeechText(transcript);
      }

      setIsTranscriptReady(true);
    } catch (err) {
      console.error("Transcription error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="audio-recorder" dir={language === "ar" ? "rtl" : "ltr"}>
      <h3>
        {isArabic
          ? "سجّل معلومات المريض والتقرير 🎤"
          : "Record Patient Info & Report 🎤"}
      </h3>
      <ReactMic
        record={isRecording}
        pause={isPaused}
        onStop={onStop}
        strokeColor="#007bff"
        visualSetting="frequencyBars"
        backgroundColor="#FFFFFF"
      />
      <div className="mic3btns">
        <button onClick={startRecording} disabled={isRecording && !isPaused}>
          {isArabic ? "بدء التسجيل" : "Record"}
        </button>
        <button onClick={stopRecording} disabled={!isRecording}>
          {isArabic ? "إيقاف" : "Stop"}
        </button>
        <button onClick={togglePause} disabled={!isRecording}>
          {isPaused
            ? isArabic
              ? "استئناف"
              : "Resume"
            : isArabic
            ? "إيقاف مؤقت"
            : "Pause"}
        </button>
      </div>
      {loading && (
        <div className="loader-container">
          <Loader isLoading={loading} />
        </div>
      )}
    </div>
  );
};

export default AudioRecorderForReportEditor;
