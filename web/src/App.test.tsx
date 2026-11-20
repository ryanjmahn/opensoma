import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import App from './App'

test('shell renders navigation and the not-medical-advice note before data loads', () => {
  render(<App />)
  expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
  expect(screen.getByText(/it is not medical advice/i)).toBeInTheDocument()
})
