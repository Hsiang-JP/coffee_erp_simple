import { create } from 'zustand';

export const useStore = create((set) => ({
  coffees: [],
  cuppingReports: [],
  milestones: [],
  refreshTrigger: 0,
  // Actions
  setCoffees: (coffees) => set({ coffees }),
  setCuppingReports: (reports) => set({ cuppingReports: reports }),
  setMilestones: (milestones) => set({ milestones }),
  triggerRefresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),
}));
