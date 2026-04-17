import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAppStore } from '../appStore'
import { act } from '@testing-library/react'

describe('appStore', () => {
  beforeEach(() => {
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    }
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
    })

    act(() => {
      useAppStore.setState({
        currentRole: 'employee',
        sidebarCollapsed: false,
      })
    })
  })

  it('should have initial state', () => {
    const state = useAppStore.getState()
    expect(state.currentRole).toBe('employee')
    expect(state.sidebarCollapsed).toBe(false)
  })

  it('should toggle sidebar', () => {
    act(() => {
      useAppStore.getState().toggleSidebar()
    })
    expect(useAppStore.getState().sidebarCollapsed).toBe(true)
  })

  it('should set current role', () => {
    act(() => {
      useAppStore.getState().setCurrentRole('manager')
    })
    expect(useAppStore.getState().currentRole).toBe('manager')
  })
})
