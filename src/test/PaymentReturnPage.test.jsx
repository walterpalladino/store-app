import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, okEnvelope, mockJsonResponse } from './helpers.jsx'
import PaymentReturnPage from '../pages/PaymentReturnPage'

// authFetch comes from AuthContext; mock it so the page gets a token-bearing
// fetch. The hosted success callback arrives as a full browser redirect from
// Stripe (no React state) carrying only ?session_id=… — the page must look the
// order up by that session id.
const authFetch = vi.fn()
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ authFetch }) }))

const ORDER = {
  id: 5,
  orderId: 'b562e3ae-792f-11f1-9844-97b9d913d5f0',
  // Money is integer cents on the wire.
  products: [{ sku: 'BEA-NAI-NAI-005', description: 'Red Nail Polish', unitPrice: 899, discountPrice: 796, qty: 1 }],
  total: 899, discountedTotal: 796, totalProducts: 1, totalQuantity: 1,
  status: 'paid', address: {},
  payment: { provider: 'stripe', sessionId: 'cs_target', status: 'complete', amountTotal: 796, currency: 'usd' },
}

afterEach(() => { vi.clearAllMocks() })

describe('PaymentReturnPage (hosted success callback)', () => {
  it('looks the order up by session id and shows the completed purchase', async () => {
    authFetch.mockResolvedValue(mockJsonResponse(okEnvelope({ orders: [ORDER] })))

    renderWithProviders(<PaymentReturnPage />, { route: '/checkout/return?session_id=cs_target' })

    // Resolves the order for this session and renders it as completed …
    expect(await screen.findByText('Payment Completed')).toBeInTheDocument()
    expect(screen.getByText('Red Nail Polish')).toBeInTheDocument()
    // … having requested the caller's orders through the authenticated fetcher.
    expect(authFetch).toHaveBeenCalledWith(expect.stringContaining('/api/orders'))
  })

  it('shows a processing state when the webhook has not settled the order yet', async () => {
    authFetch.mockResolvedValue(mockJsonResponse(okEnvelope({
      orders: [{ ...ORDER, status: 'pending_payment' }],
    })))

    renderWithProviders(<PaymentReturnPage />, { route: '/checkout/return?session_id=cs_target' })

    expect(await screen.findByText('Processing')).toBeInTheDocument()
  })

  it('redirects to the cart on direct navigation with no session id', async () => {
    authFetch.mockResolvedValue(mockJsonResponse(okEnvelope({ orders: [] })))

    renderWithProviders(<PaymentReturnPage />, { route: '/checkout/return' })

    // Nothing to confirm → OrderResult is never shown (Navigate to /cart).
    await waitFor(() => expect(screen.queryByText('Payment Completed')).not.toBeInTheDocument())
    expect(screen.queryByText('Processing')).not.toBeInTheDocument()
  })
})
