import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import App from './App'

test('renders the hello cell page with the not-medical-advice note', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /hello, cell/i })).toBeInTheDocument()
  expect(screen.getByText(/not medical advice/i)).toBeInTheDocument()
})
