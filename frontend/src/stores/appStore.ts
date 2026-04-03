import { create } from 'zustand'

interface AppState {
  currentRole: string
  setCurrentRole: (role: string) => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentRole: localStorage.getItem('hrms-role') || 'employee',
  setCurrentRole: (role) => {
    localStorage.setItem('hrms-role', role)
    set({ currentRole: role })
  },
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}))
