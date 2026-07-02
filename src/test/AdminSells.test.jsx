import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import AdminSells from '../pages/admin/AdminSells'

afterEach(() => { vi.restoreAllMocks() })

// Build a fetch mock that answers the orders list from `ordersBody` and every
// other request (background thumbnail lookups) with a generic product.
function mockOrders(ordersBody, status = 200) {
  global.fetch = vi.fn().mockImplementation((url) => {
    if (String(url).includes('/api/orders')) {
      return Promise.resolve(new Response(JSON.stringify(ordersBody), {
        status, headers: { 'Content-Type': 'application/json' },
      }))
    }
    return Promise.resolve(new Response(JSON.stringify({ success: true, data: { thumbnail: 'x.png' } }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }))
  })
}

describe('AdminSells — error handling', () => {
  it('falls back to demo data and shows a warning when the orders API rejects', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network down'))

    render(<AdminSells />)

    // Warning alert surfaces the underlying error message …
    await waitFor(() =>
      expect(screen.getByText(/Live API unavailable/i)).toBeInTheDocument()
    )
    expect(screen.getByText(/Network down/)).toBeInTheDocument()
    // … and the fallback demo order (#00001) is still rendered.
    expect(screen.getByText('#00001')).toBeInTheDocument()
  })

  it('falls back to demo data when the orders API returns an error envelope', async () => {
    mockOrders({ success: false, error: { code: 'SERVER', message: 'Boom' } }, 500)

    render(<AdminSells />)

    await waitFor(() =>
      expect(screen.getByText(/Live API unavailable/i)).toBeInTheDocument()
    )
    expect(screen.getByText(/Boom/)).toBeInTheDocument()
    expect(screen.getByText('#00001')).toBeInTheDocument()
  })

  it('renders live orders from the { data: { orders } } envelope on success', async () => {
    // Lean order shape from the new /api/orders contract: line-items carry only
    // productId/quantity/price — no title, discountedTotal, or discountPercentage.
    const orders = [{
      id: 7,
      products: [{ productId: 1, quantity: 2, price: 10 }],
      total: 20, discountedTotal: 20, totalProducts: 1, totalQuantity: 2,
      status: 'Delivered',
      payment: { method: 'card', status: 'authorized' },
    }]
    mockOrders({ success: true, data: { orders } })

    render(<AdminSells />)

    await waitFor(() => expect(screen.getByText('#00007')).toBeInTheDocument())
    // No fallback warning on the happy path.
    expect(screen.queryByText(/Live API unavailable/i)).not.toBeInTheDocument()
    // The Product Breakdown renders the lean line-item without crashing.
    expect(screen.getByText('Product Breakdown')).toBeInTheDocument()
  })
})
