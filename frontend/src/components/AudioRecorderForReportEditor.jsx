import React, { useState } from "react";
import { ReactMic } from "react-mic";
import axios from "axios";
import Loader from "./Loader";
import "../styles/AudioRecorder.css";

const AudioRecorderForReportEditor = ({
  setPatientName,
  setPatientAge,
  setPatientFileNumber,
  setMedicalReportText,
  onSpeechText,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isTranscriptReady, setIsTranscriptReady] = useState(false);

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
      setMedicalReportText(fields.medicalReport || transcript || "");

      // Call onSpeechText if provided
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
    <div className="audio-recorder">
      <h3>Record Patient Info & Report 🎤</h3>
      <ReactMic
        record={isRecording}
        pause={isPaused}
        onStop={onStop}
        strokeColor="#007bff"
        visualSetting="frequencyBars"
        backgroundColor="#FFFFFF"
      />
      <div>
        <button onClick={startRecording} disabled={isRecording && !isPaused}>
          Record
        </button>
        <button onClick={stopRecording} disabled={!isRecording}>
          Stop
        </button>
        <button onClick={togglePause} disabled={!isRecording}>
          {isPaused ? "Resume" : "Pause"}
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
