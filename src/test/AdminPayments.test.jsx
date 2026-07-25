import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithProviders, okEnvelope, mockJsonResponse } from './helpers.jsx'

// Mock the merchant auth context so we can inject a controllable merchantFetch.
vi.mock('../context/MerchantAuthContext', () => ({ useMerchantAuth: vi.fn() }))
import { useMerchantAuth } from '../context/MerchantAuthContext'
import AdminPayments from '../pages/admin/AdminPayments'

afterEach(() => { vi.restoreAllMocks() })

const ORDERS = [
  { id: 5, orderId: 'b562e3ae-792f-11f1-9844-97b9d913d5f0', orderStatus: 'confirmed', paymentStatus: 'paid', discountedTotal: 2400, currency: 'usd' },
]

// Money is integer cents on the wire ($24.00 → 2400).
const PAYMENT = {
  id: 11,
  orderId: 'b562e3ae-792f-11f1-9844-97b9d913d5f0',
  status: 'paid',
  amount: 2400,
  currency: 'usd',
  paidOn: '2026-07-05T10:00:00.000Z',
  amountRefunded: 0,
  refundStatus: 'none',
  refundedOn: null,
  createdAt: '2026-07-05T09:58:00.000Z',
  updatedAt: '2026-07-05T10:00:00.000Z',
}

function setup({ orders = ORDERS, payments = [PAYMENT], one } = {}) {
  const merchantFetch = vi.fn((url) => {
    const u = String(url)
    if (/\/orders\/\d+\/payments$/.test(u)) {
      return Promise.resolve(mockJsonResponse(okEnvelope({ payments })))
    }
    if (/\/payments\/\d+$/.test(u)) {
      return Promise.resolve(one ? one() : mockJsonResponse(okEnvelope(PAYMENT)))
    }
    return Promise.resolve(mockJsonResponse(okEnvelope({ orders })))
  })
  useMerchantAuth.mockReturnValue({ merchantFetch })
  return { merchantFetch }
}

describe('AdminPayments — list', () => {
  it('composes the list from the caller\'s orders and shows money in units', async () => {
    const { merchantFetch } = setup()

    renderWithProviders(<AdminPayments />)

    expect(await screen.findByText('#11')).toBeInTheDocument()
    // Cents → units at the boundary; the order is shown by its short public id.
    expect(screen.getAllByText('$24.00').length).toBeGreaterThan(0)
    expect(screen.getByText('#b562e3ae')).toBeInTheDocument()
    // No list-all route exists — the list is one payments request per order.
    await waitFor(() =>
      expect(merchantFetch.mock.calls.some(([u]) => /\/orders\/5\/payments$/.test(String(u)))).toBe(true),
    )
  })

  it('says so when there is nothing to show', async () => {
    setup({ payments: [] })

    renderWithProviders(<AdminPayments />)

    expect(await screen.findByText('No payments')).toBeInTheDocument()
  })

  it('surfaces a failure from the orders request', async () => {
    useMerchantAuth.mockReturnValue({
      merchantFetch: vi.fn().mockResolvedValue(mockJsonResponse({ message: 'Forbidden' }, 403)),
    })

    renderWithProviders(<AdminPayments />)

    expect(await screen.findByText(/Forbidden/)).toBeInTheDocument()
  })
})

describe('AdminPayments — order filter', () => {
  it('adopts ?orderId from the URL and narrows the scan through order search', async () => {
    const { merchantFetch } = setup()

    renderWithProviders(<AdminPayments />, {
      route: '/admin?tab=payments&orderId=b562e3ae-792f-11f1-9844-97b9d913d5f0',
    })

    // The filter box is pre-filled, and the search endpoint is what gets hit.
    expect(screen.getByLabelText(/filter payments by order id/i)).toHaveValue('b562e3ae-792f-11f1-9844-97b9d913d5f0')
    await waitFor(() =>
      expect(merchantFetch.mock.calls.some(([u]) => String(u).includes('/api/orders/search?q=b562e3ae'))).toBe(true),
    )
    expect(await screen.findByText('#11')).toBeInTheDocument()
  })

  it('typing an order id re-runs the scan against the search endpoint', async () => {
    const { merchantFetch } = setup()

    renderWithProviders(<AdminPayments />)
    await screen.findByText('#11')

    fireEvent.change(screen.getByLabelText(/filter payments by order id/i), { target: { value: 'b562e3ae' } })

    await waitFor(() =>
      expect(merchantFetch.mock.calls.some(([u]) => String(u).includes('/api/orders/search?q=b562e3ae'))).toBe(true),
    )
  })
})

describe('AdminPayments — detail', () => {
  it('opens a payment through GET /api/payments/:id and shows its settlement fields', async () => {
    const { merchantFetch } = setup()

    renderWithProviders(<AdminPayments />)
    fireEvent.click(await screen.findByText('#11'))

    await waitFor(() =>
      expect(merchantFetch.mock.calls.some(([u]) => /\/api\/payments\/11$/.test(String(u)))).toBe(true),
    )
    expect(await screen.findByText('Refund status')).toBeInTheDocument()
    expect(screen.getByText('Paid on')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /back to payments/i })).toBeInTheDocument()
  })

  it('jumps from a payment back to every payment of its order', async () => {
    setup()

    renderWithProviders(<AdminPayments />)
    fireEvent.click(await screen.findByText('#11'))

    fireEvent.click(await screen.findByRole('button', { name: /all payments for this order/i }))

    await waitFor(() =>
      expect(screen.getByLabelText(/filter payments by order id/i))
        .toHaveValue('b562e3ae-792f-11f1-9844-97b9d913d5f0'),
    )
  })
})
