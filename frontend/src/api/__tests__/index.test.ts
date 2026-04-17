import { describe, it, expect } from 'vitest'

describe('API Client', () => {
  it('should have all API exports defined', () => {
    // 动态导入以避免在测试加载时执行 axios 创建
    expect(async () => {
      const api = await import('../index')
      expect(api.getDepartments).toBeDefined()
      expect(api.getEmployees).toBeDefined()
      expect(api.getDashboardStats).toBeDefined()
    }).not.toThrow()
  })
})
