import { describe, expect, it } from 'vitest'
import zh from '../zh.json'
import en from '../en.json'

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object') return [prefix]
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => flattenKeys(child, prefix ? `${prefix}.${key}` : key))
}

describe('locales', () => {
  it('keeps Chinese and English keys aligned', () => {
    expect(flattenKeys(zh).sort()).toEqual(flattenKeys(en).sort())
  })

  it('keeps total interpolation available', () => {
    expect(zh.common.total).toContain('{{count}}')
    expect(en.common.total).toContain('{{count}}')
  })
})
