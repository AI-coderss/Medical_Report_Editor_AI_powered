import { create } from 'zustand';


const useLanguageStore = create((set) => ({
  selectedLanguage: "en-GB", // Default language
  setSelectedLanguage: (language) => set({ selectedLanguage: language }),
}));

export default useLanguageStore;