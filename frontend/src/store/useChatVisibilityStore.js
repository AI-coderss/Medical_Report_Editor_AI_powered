// store/useChatVisibilityStore.js
import {create} from "zustand";

const useChatVisibilityStore = create((set) => ({
  isChatVisible: false,
  setChatVisible: (visible) => set({ isChatVisible: visible }),
}));

export default useChatVisibilityStore;
