import {create} from "zustand";

export const useStore = create((set) => ({
  generatedData: null,
  setGeneratedData: (data) => set({ generatedData: data }),
  resetGeneratedData: () => set({ generatedData: null }),
}));
