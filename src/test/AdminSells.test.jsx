import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { okEnvelope, mockJsonResponse } from './helpers.jsx'

// Mock the merchant auth context so we can inject a controllable merchantFetch.
vi.mock('../context/MerchantAuthContext', () => ({ useMerchantAuth: vi.fn() }))
import { useMerchantAuth } from '../context/MerchantAuthContext'
import AdminSells from '../pages/admin/AdminSells'
import API from '../config/api'

afterEach(() => { vi.restoreAllMocks() })

// The 🔒 orders list and the refund POST are role-checked at the backend, so
// they go through the authenticated merchantFetch. Public product-thumbnail
// lookups go through global.fetch.
//   `orders` / `refund` are optional factories returning a Response (or a
//   rejected promise) for each respective call.
function setup({ orders, refund } = {}) {
  const merchantFetch = vi.fn((url) => {
    if (String(url).includes('/api/refund')) {
      return Promise.resolve(refund ? refund() : mockJsonResponse(okEnvelope({}), 201))
    }
    return Promise.resolve(orders ? orders() : mockJsonResponse(okEnvelope({ orders: [] })))
  })
  useMerchantAuth.mockReturnValue({ merchantFetch })
  global.fetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope({ thumbnail: 'x.png' })))
  return { merchantFetch }
}

describe('AdminSells — error handling', () => {
  it('falls back to demo data and shows a warning when the orders API rejects', async () => {
    setup({ orders: () => Promise.reject(new Error('Network down')) })

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
    setup({ orders: () => mockJsonResponse({ success: false, error: { code: 'SERVER', message: 'Boom' } }, 500) })

    render(<AdminSells />)

    await waitFor(() =>
      expect(screen.getByText(/Live API unavailable/i)).toBeInTheDocument()
    )
    expect(screen.getByText(/Boom/)).toBeInTheDocument()
    expect(screen.getByText('#00001')).toBeInTheDocument()
  })

  it('renders live orders from the authenticated { data: { orders } } envelope on success', async () => {
    // Lean order shape from the new /api/orders contract: line-items carry only
    // productId/quantity/price — no title, discountedTotal, or discountPercentage.
    const orders = [{
      id: 7,
      // Money is integer cents per the API contract ($10 → 1000, $20 → 2000).
      products: [{ productId: 1, quantity: 2, price: 1000 }],
      total: 2000, discountedTotal: 2000, totalProducts: 1, totalQuantity: 2,
      status: 'Delivered',
      payment: { method: 'card', status: 'authorized' },
    }]
    const { merchantFetch } = setup({ orders: () => mockJsonResponse(okEnvelope({ orders })) })

    render(<AdminSells />)

    await waitFor(() => expect(screen.getByText('#00007')).toBeInTheDocument())
    // The list was requested through the authenticated admin fetcher.
    expect(merchantFetch).toHaveBeenCalledWith(API.orders.list)
    // No fallback warning on the happy path.
    expect(screen.queryByText(/Live API unavailable/i)).not.toBeInTheDocument()
    // The Product Breakdown renders the lean line-item without crashing.
    expect(screen.getByText('Product Breakdown')).toBeInTheDocument()
  })
})

describe('AdminSells — refunds', () => {
  // A paid order (integer cents on the wire) that is eligible for a refund.
  const paidOrder = {
    id: 7,
    products: [{ productId: 1, quantity: 1, price: 1000 }],
    total: 1000, discountedTotal: 1000, totalProducts: 1, totalQuantity: 1,
    status: 'paid', refundStatus: 'none',
    payment: { method: 'card', status: 'paid' },
  }

  it('disables the Refund button for orders that are not paid', async () => {
    setup({ orders: () => mockJsonResponse(okEnvelope({ orders: [{ ...paidOrder, status: 'fulfilled' }] })) })

    render(<AdminSells />)
    const btn = await screen.findByRole('button', { name: /refund/i })
    expect(btn).toBeDisabled()
  })

  it('starts a refund via an authenticated POST and reports the pending status', async () => {
    const { merchantFetch } = setup({
      orders: () => mockJsonResponse(okEnvelope({ orders: [paidOrder] })),
      refund: () => mockJsonResponse(okEnvelope({
        order:  { id: 7, status: 'paid', refundStatus: 'pending' },
        refund: { provider: 'stripe', refundId: 're_1', status: 'pending', amount: 1000, currency: 'usd' },
      }), 201),
    })

    render(<AdminSells />)
    fireEvent.click(await screen.findByRole('button', { name: /refund/i }))

    // Hits POST /api/refund with the order id, through the authenticated fetcher …
    await waitFor(() => expect(merchantFetch).toHaveBeenCalledWith(API.refund, expect.objectContaining({ method: 'POST' })))
    const refundCall = merchantFetch.mock.calls.find(([u]) => u === API.refund)
    expect(JSON.parse(refundCall[1].body)).toEqual({ orderId: 7 })

    // … surfaces the refund status to the admin and reflects it in the row.
    expect(await screen.findByText(/Refund pending for order #00007/i)).toBeInTheDocument()
    expect(screen.getByText('Refund pending')).toBeInTheDocument()
  })

  it('surfaces a server error (e.g. 409 already refunded) without changing the row', async () => {
    setup({
      orders: () => mockJsonResponse(okEnvelope({ orders: [paidOrder] })),
      refund: () => mockJsonResponse({ message: 'Order is not paid' }, 409),
    })

    render(<AdminSells />)
    fireEvent.click(await screen.findByRole('button', { name: /refund/i }))

    expect(await screen.findByText(/Order is not paid/i)).toBeInTheDocument()
    // Still refundable (row unchanged) — the button is back.
    expect(screen.getByRole('button', { name: /refund/i })).toBeEnabled()
  })
})
