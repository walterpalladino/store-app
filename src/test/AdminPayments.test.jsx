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

// The payment lifecycle — a different set from the order fulfilment statuses.
const PAYMENT_STATUS_OPTIONS = ['pending', 'paid', 'payment_failed', 'cancelled', 'refunded', 'partially_refunded']

function setup({ orders = ORDERS, payments = [PAYMENT], one, statuses, setStatus } = {}) {
  const merchantFetch = vi.fn((url, opts) => {
    const u = String(url)
    if (/\/orders\/\d+\/payments$/.test(u)) {
      return Promise.resolve(mockJsonResponse(okEnvelope({ payments })))
    }
    if (/\/payments\/status$/.test(u)) {
      return Promise.resolve(statuses ? statuses() : mockJsonResponse(okEnvelope({ statuses: PAYMENT_STATUS_OPTIONS })))
    }
    if (/\/payments\/\d+\/status$/.test(u)) {
      return Promise.resolve(setStatus ? setStatus(url, opts) : mockJsonResponse(okEnvelope({ ...PAYMENT, status: 'cancelled' })))
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

describe('AdminPayments — status override', () => {
  it('confirms before calling the endpoint, then POSTs the chosen status', async () => {
    const { merchantFetch } = setup()

    renderWithProviders(<AdminPayments />)

    // Open the per-row status picker and pick a new payment status.
    fireEvent.click(await screen.findByRole('button', { name: /change status of payment #11/i }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Cancelled' }))

    // A confirmation dialog appears — and nothing has been sent yet.
    expect(await screen.findByText(/Change payment status\?/i)).toBeInTheDocument()
    expect(merchantFetch.mock.calls.some(([u]) => /\/payments\/11\/status$/.test(String(u)))).toBe(false)

    // Confirm → POSTs through the authenticated admin fetcher.
    fireEvent.click(screen.getByRole('button', { name: /confirm change/i }))
    await waitFor(() =>
      expect(merchantFetch.mock.calls.some(([u]) => /\/payments\/11\/status$/.test(String(u)))).toBe(true),
    )
    const call = merchantFetch.mock.calls.find(([u]) => /\/payments\/11\/status$/.test(String(u)))
    expect(call[1].method).toBe('POST')
    expect(JSON.parse(call[1].body)).toEqual({ status: 'cancelled' })

    // Outcome is reported to the admin.
    expect(await screen.findByText(/Payment #11 set to/i)).toBeInTheDocument()
  })

  it('offers the payment lifecycle, not the order fulfilment one', async () => {
    setup()

    renderWithProviders(<AdminPayments />)
    fireEvent.click(await screen.findByRole('button', { name: /change status of payment #11/i }))

    expect(await screen.findByRole('menuitem', { name: 'Payment Failed' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Shipped' })).not.toBeInTheDocument()
    // The payment's current status cannot be re-picked.
    expect(screen.getByRole('menuitem', { name: 'Paid' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('does not call the endpoint when the confirmation is cancelled', async () => {
    const { merchantFetch } = setup()

    renderWithProviders(<AdminPayments />)
    fireEvent.click(await screen.findByRole('button', { name: /change status of payment #11/i }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Cancelled' }))
    fireEvent.click(await screen.findByRole('button', { name: /^cancel$/i }))

    await waitFor(() => expect(screen.queryByText(/Change payment status\?/i)).not.toBeInTheDocument())
    expect(merchantFetch.mock.calls.some(([u]) => /\/payments\/11\/status$/.test(String(u)))).toBe(false)
  })

  it('surfaces a server error without changing the row', async () => {
    setup({ setStatus: () => mockJsonResponse({ message: 'Unknown status' }, 422) })

    renderWithProviders(<AdminPayments />)
    fireEvent.click(await screen.findByRole('button', { name: /change status of payment #11/i }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Cancelled' }))
    fireEvent.click(await screen.findByRole('button', { name: /confirm change/i }))

    expect(await screen.findByText(/Unknown status/i)).toBeInTheDocument()
    // The row's status chip is untouched (the confirmation stays open to retry).
    expect(screen.getAllByText('Paid').length).toBeGreaterThan(0)
    expect(screen.queryByText(/set to/i)).not.toBeInTheDocument()
  })

  it('can also be changed from the payment detail view', async () => {
    const { merchantFetch } = setup()

    renderWithProviders(<AdminPayments />)
    fireEvent.click(await screen.findByText('#11'))
    await screen.findByRole('button', { name: /back to payments/i })

    fireEvent.click(screen.getByRole('button', { name: /change status of payment #11/i }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Cancelled' }))
    fireEvent.click(await screen.findByRole('button', { name: /confirm change/i }))

    await waitFor(() =>
      expect(merchantFetch.mock.calls.some(([u]) => /\/payments\/11\/status$/.test(String(u)))).toBe(true),
    )
    // The open payment reflects the new status without a re-fetch — the header
    // chip and the Status field both read it back.
    expect(await screen.findByText(/Payment #11 set to/i)).toBeInTheDocument()
    expect(screen.getAllByText('Cancelled').length).toBeGreaterThanOrEqual(2)
  })
})
