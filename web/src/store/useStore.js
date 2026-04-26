import { create } from 'zustand';

const useStore = create((set) => ({
  // Global Filters
  filters: {
    buyer_id: null,
    line_id: null,
    station_id: null,
    time_range: '7d', // 1d, 7d, 30d, all
  },

  // UI State
  activeTab: 'dashboard',
  isSidebarCollapsed: false,

  // Actions
  setFilter: (key, value) => set((state) => ({
    filters: { ...state.filters, [key]: value }
  })),

  clearFilters: () => set({
    filters: {
      buyer_id: null,
      line_id: null,
      station_id: null,
      time_range: '7d',
    }
  }),

  setActiveTab: (tab) => set({ activeTab: tab }),
  
  toggleSidebar: () => set((state) => ({ 
    isSidebarCollapsed: !state.isSidebarCollapsed 
  })),
}));

export default useStore;
