import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from '../Layout'

describe('Layout', () => {
  it('renders layout with sidebar navigation', () => {
    render(
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<div data-testid="test-content">测试内容</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    )

    expect(screen.getByTestId('test-content')).toBeTruthy()
  })
})
