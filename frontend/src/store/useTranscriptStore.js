import {create} from 'zustand';

const useTranscriptStore = create((set) => ({
  transcript: '', // Default transcript value
  setTranscript: (newTranscript) => set({ transcript: newTranscript }),
}));

export default useTranscriptStore;
