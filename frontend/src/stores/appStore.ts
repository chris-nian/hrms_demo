import { create } from 'zustand'
import type { Role } from '@/api/index'

const validRoles: Role[] = ['employee', 'manager', 'hr']
const storedRole = localStorage.getItem('hrms-role') as Role | null
const initialRole: Role = storedRole && validRoles.includes(storedRole) ? storedRole : 'employee'

interface AppState {
  currentRole: Role
  setCurrentRole: (role: Role) => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentRole: initialRole,
  setCurrentRole: (role) => {
    localStorage.setItem('hrms-role', role)
    set({ currentRole: role })
  },
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}))
