import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ThemeProvider } from '@mui/material'
import { MemoryRouter } from 'react-router-dom'
import theme from '../theme/theme'
import AdminProducts from '../pages/admin/AdminProducts'
import { MerchantAuthProvider } from '../context/MerchantAuthContext'

afterEach(() => { vi.restoreAllMocks() })

function mockJson(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

// AdminProducts reads merchantFetch from MerchantAuthContext, so it must render
// inside the provider (and a router, which the provider's logout path uses).
function renderAdmin() {
  return render(
    <MemoryRouter>
      <MerchantAuthProvider>
        <ThemeProvider theme={theme}><AdminProducts /></ThemeProvider>
      </MerchantAuthProvider>
    </MemoryRouter>
  )
}

describe('AdminProducts — mount + Generate SKU', () => {
  it('renders the page and the Add drawer without crashing, and generates a SKU', async () => {
    global.fetch = vi.fn((url) => {
      if (String(url).includes('/products/sku/generate')) {
        return Promise.resolve(mockJson({ success: true, data: { sku: 'GEN-ABC-123' } }))
      }
      if (String(url).includes('/categories')) {
        return Promise.resolve(mockJson({ success: true, data: [] }))
      }
      // product list
      return Promise.resolve(mockJson({ success: true, data: { products: [], total: 0, skip: 0, limit: 15 } }))
    })

    renderAdmin()

    // Page mounted
    expect(screen.getByText('Products')).toBeInTheDocument()

    // Open the Add New Product drawer → renders the form incl. the SKU generator
    fireEvent.click(screen.getByRole('button', { name: /Add New Product/i }))
    expect(await screen.findByRole('button', { name: /Generate SKU/i })).toBeInTheDocument()

    // Fill category + brand, then generate
    fireEvent.change(screen.getByLabelText(/Category \*/i), { target: { value: 'smartphones' } })
    fireEvent.change(screen.getByLabelText(/^Brand$/i), { target: { value: 'Apple' } })
    fireEvent.click(screen.getByRole('button', { name: /Generate SKU/i }))

    // The returned SKU lands in the SKU field
    await waitFor(() => {
      expect(screen.getByLabelText(/^SKU$/i)).toHaveValue('GEN-ABC-123')
    })

    // Only non-empty attrs were posted
    const genCall = global.fetch.mock.calls.find((c) => String(c[0]).includes('/sku/generate'))
    expect(genCall).toBeTruthy()
    expect(JSON.parse(genCall[1].body)).toEqual({ category: 'smartphones', brand: 'Apple' })
  })
})
