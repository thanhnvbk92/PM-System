import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set) => ({
      // Global Filters
      filters: {
        buyer_id: null,
        line_id: null,
        station_id: null,
        time_range: '7d', // 1d, 7d, 30d, all
      },

      // UI State
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

      toggleSidebar: () => set((state) => ({ 
        isSidebarCollapsed: !state.isSidebarCollapsed 
      })),
    }),
    {
      name: 'pm-system-storage', // tên khóa trong localStorage
    }
  )
);

export default useStore;
