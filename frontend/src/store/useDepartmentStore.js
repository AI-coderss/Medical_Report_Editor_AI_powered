// store/useDepartmentStore.js
import {create} from "zustand";

const useDepartmentStore = create((set) => ({
  selectedDepartment: "Orthopedics", // Default department
  setSelectedDepartment: (department) => set({ selectedDepartment: department }),
}));

export default useDepartmentStore;
