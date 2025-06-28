import { create } from "zustand";
import axios from "axios";

const useAudioStore = create((set) => ({
  isRecording: false,
  isPaused: false,
  aiResponse: null,
  loading: false,
  error: null,

  startRecording: () => set({ isRecording: true, isPaused: false }),
  stopRecording: async () => {
    set({ isRecording: false, isPaused: false, loading: true, error: null });
    try {
      const response = await axios.post("http://localhost:5000/generate", {
        // Add payload if required
        input: "example_input_data", // Replace this with actual input data
      });
      set({ aiResponse: response.data, loading: false });
    } catch (err) {
      set({ error: "Failed to fetch AI response. Try again later.", loading: false });
    }
  },
  togglePauseResume: () =>
    set((state) => ({ isPaused: !state.isPaused })),
  resetRecording: () =>
    set({
      isRecording: false,
      isPaused: false,
      aiResponse: null,
      error: null,
    }),
}));

export default useAudioStore;
