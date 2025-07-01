import React, { useState } from "react";
import { ReactMic } from "react-mic";
import axios from "axios";
import { Howl } from "howler";
import Loader from "./Loader";
import useTranscriptStore from "../store/useTranscriptStore";
import "../styles/AudioRecorder.css";

const AudioRecorder = ({ setFormData }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isTranscriptReady, setIsTranscriptReady] = useState(false);

  const clickSound = new Howl({
    src: ["/sound.mp3"],
    volume: 0.2,
  });
  const stopSound = new Howl({
    src: ["/ui.wav"],
    volume: 0.2,
  });
  const setTranscript = useTranscriptStore((state) => state.setTranscript);

  const playClickSound = () => clickSound.play();
  const playStopSound = () => stopSound.play();

  const startRecording = () => {
    playClickSound();
    setIsRecording(true);
    setIsPaused(false);
    setIsTranscriptReady(false);
  };

  const stopRecording = () => {
    playStopSound();
    setIsRecording(false);
    setIsPaused(false);
  };

  const togglePauseResume = () => {
    playClickSound();
    setIsPaused((prev) => !prev);
  };

  const resetRecording = () => {
    playClickSound();
    setIsRecording(false);
    setIsPaused(false);
    setIsTranscriptReady(false);

    setFormData({
      patientName: "",
      age: "",
      fileNumber: "",
      chiefComplaint: "",
      personalHistory: "",
      presentIllness: "",
      medicalHistory: "",
      pastHistory: "",
      familyHistory: "",
      systemReview: "",
    });
  };

  const handleTranscription = async (recordedBlob) => {
    const audioFile = new File([recordedBlob.blob], "temp.wav", {
      type: "audio/wav",
    });
    const formData = new FormData();
    formData.append("audio_data", audioFile);

    try {
      setLoading(true);

      const { data: transcriptionData } = await axios.post(
        "https://medical-report-editor-ai-powered-backend.onrender.com/transcribe",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const transcript = transcriptionData.transcript;
      console.log("Transcript:", transcript);
      setTranscript(transcript);

      const { data: fieldsData } = await axios.post(
        "https://medical-report-editor-ai-powered-backend.onrender.com/extract_fields",
        { transcript }
      );

      console.log("Extracted Fields:", fieldsData);
      setFormData(fieldsData);
      setIsTranscriptReady(true);
    } catch (error) {
      console.error("Transcription error:", error);
    } finally {
      setLoading(false);
    }
  };

  const onStop = (recordedBlob) => {
    console.log("Recorded Blob:", recordedBlob);
    handleTranscription(recordedBlob);
  };

  const handleTransfer = () => {
    const payload = {
      transcript: {
        patientName: "",
        age: "",
        fileNumber: "",
        chiefComplaint: "",
        personalHistory: "",
        presentIllness: "",
        medicalHistory: "",
        pastHistory: "",
        familyHistory: "",
        systemReview: "",
      },
    };

    console.log("Transfer Payload:", JSON.stringify(payload, null, 2));
    alert("Data prepared for transfer! Check console.");
  };

  return (
    <div className="audio-recorder">
      <h3>Medical Transcription 🎙️</h3>
      <ReactMic
        record={isRecording}
        pause={isPaused}
        onStop={onStop}
        strokeColor="#007bff"
        visualSetting="frequencyBars"
        backgroundColor="#FFFFFF"
      />
      <div className="recorder-buttons">
        <button onClick={startRecording} disabled={isRecording && !isPaused}>
          Record
        </button>
        <button onClick={stopRecording} disabled={!isRecording}>
          Stop
        </button>
        <button onClick={togglePauseResume} disabled={!isRecording}>
          {isPaused ? "Resume" : "Pause"}
        </button>
        <button onClick={resetRecording} disabled={!isTranscriptReady}>
          New Recording
        </button>
      </div>
      {loading && (
        <div className="loader-container">
          <Loader isLoading={loading} />
        </div>
      )}
      {isTranscriptReady && (
        <p className="transcript-ready">Transcribed and fields filled!</p>
      )}
    </div>
  );
};

export default AudioRecorder;
