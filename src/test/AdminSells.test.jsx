import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { useLocation } from 'react-router-dom'
import { renderWithProviders, okEnvelope, mockJsonResponse } from './helpers.jsx'

// Mock the merchant auth context so we can inject a controllable merchantFetch.
vi.mock('../context/MerchantAuthContext', () => ({ useMerchantAuth: vi.fn() }))
import { useMerchantAuth } from '../context/MerchantAuthContext'
import AdminSells from '../pages/admin/AdminSells'
import API from '../config/api'

afterEach(() => { vi.restoreAllMocks() })

// The 🔒 orders list, the refund POST and the admin status endpoints are
// role-checked at the backend, so they go through the authenticated
// merchantFetch. Public product-thumbnail lookups go through global.fetch.
//   `orders` / `refund` / `statuses` / `setStatus` are optional factories
//   returning a Response (or a rejected promise) for each respective call.
// GET /api/orders/status lists the *fulfilment* axis only (`orderStatus`) —
// the money axis is a rollup of the order's payments and is not settable.
const DEFAULT_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']

function setup({ orders, refund, statuses, setStatus } = {}) {
  const merchantFetch = vi.fn((url, opts) => {
    const u = String(url)
    if (u.includes('/api/refund')) {
      return Promise.resolve(refund ? refund() : mockJsonResponse(okEnvelope({}), 201))
    }
    if (/\/orders\/status(\?|$)/.test(u)) {
      return Promise.resolve(statuses ? statuses() : mockJsonResponse(okEnvelope({ statuses: DEFAULT_STATUSES })))
    }
    if (/\/orders\/[^/]+\/status$/.test(u)) {
      return Promise.resolve(setStatus ? setStatus(url, opts) : mockJsonResponse(okEnvelope({ id: 7, orderStatus: 'delivered' })))
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

    renderWithProviders(<AdminSells />)

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

    renderWithProviders(<AdminSells />)

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
      orderStatus: 'delivered', paymentStatus: 'paid',
    }]
    const { merchantFetch } = setup({ orders: () => mockJsonResponse(okEnvelope({ orders })) })

    renderWithProviders(<AdminSells />)

    await waitFor(() => expect(screen.getByText('#00007')).toBeInTheDocument())
    // The list was requested through the authenticated admin fetcher.
    expect(merchantFetch).toHaveBeenCalledWith(API.orders.list)
    // No fallback warning on the happy path.
    expect(screen.queryByText(/Live API unavailable/i)).not.toBeInTheDocument()
    // The Product Breakdown renders the lean line-item without crashing.
    expect(screen.getByText('Product Breakdown')).toBeInTheDocument()
  })

  it('renders item names from the denormalised sku/description order shape', async () => {
    // Real backend order shape: line-items are a denormalised snapshot carrying
    // sku + description + qty (money in cents) — no title/quantity/discountedTotal.
    // The public `orderId` (UUID) is what the admin sees instead of the db id.
    const orders = [{
      id: 9,
      orderId: 'b562e3ae-792f-11f1-9844-97b9d913d5f0',
      products: [
        { sku: 'BEA-NAI-NAI-005', description: 'Red Nail Polish',        unitPrice: 899,   discountPrice: 796,   qty: 1 },
        { sku: 'FRA-CHA-CHA-007', description: 'Chanel Coco Noir Eau De', unitPrice: 12999, discountPrice: 10853, qty: 1 },
      ],
      total: 13898, discountedTotal: 11649, totalProducts: 2, totalQuantity: 2,
      orderStatus: 'pending', paymentStatus: 'unpaid',
    }]
    setup({ orders: () => mockJsonResponse(okEnvelope({ orders })) })

    renderWithProviders(<AdminSells />)

    // Item names resolve from `description` (regression: previously undefined) …
    expect(await screen.findByText('Red Nail Polish')).toBeInTheDocument()
    // Chanel is the top-revenue line, so it shows in both the breakdown and the
    // "Top Product by Revenue" card (previously the literal string "undefined").
    expect(screen.getAllByText('Chanel Coco Noir Eau De').length).toBeGreaterThan(0)
    expect(screen.queryByText('undefined')).not.toBeInTheDocument()
    // … and the short public order id is shown instead of the numeric db id.
    expect(screen.getByText('#b562e3ae')).toBeInTheDocument()
  })
})

describe('AdminSells — payments drill-down', () => {
  it('sends the admin to the Payments panel filtered by the order id', async () => {
    const orders = [{
      id: 7,
      orderId: 'b562e3ae-792f-11f1-9844-97b9d913d5f0',
      products: [{ productId: 1, quantity: 1, price: 1000 }],
      total: 1000, discountedTotal: 1000, totalProducts: 1, totalQuantity: 1,
      orderStatus: 'confirmed', paymentStatus: 'paid',
    }]
    setup({ orders: () => mockJsonResponse(okEnvelope({ orders })) })

    let search = ''
    function LocationProbe() {
      search = useLocation().search
      return null
    }
    renderWithProviders(<><AdminSells /><LocationProbe /></>)

    fireEvent.click(await screen.findByRole('button', { name: /view payments for order #b562e3ae/i }))

    // Same URL the Payments panel reads its filter from — deep-linking there is
    // equivalent to opening Payments and typing the order id in.
    await waitFor(() => expect(search).toContain('tab=payments'))
    expect(search).toContain(`orderId=${orders[0].orderId}`)
  })
})

describe('AdminSells — refunds', () => {
  // A paid order (integer cents on the wire) that is eligible for a refund:
  // refundability is read from the money axis, not the fulfilment one.
  const paidOrder = {
    id: 7,
    products: [{ productId: 1, quantity: 1, price: 1000 }],
    total: 1000, discountedTotal: 1000, totalProducts: 1, totalQuantity: 1,
    orderStatus: 'confirmed', paymentStatus: 'paid',
  }

  it('disables the Refund button for orders that are not paid', async () => {
    // Delivered but never settled — the fulfilment axis must not unlock refunds.
    setup({ orders: () => mockJsonResponse(okEnvelope({ orders: [{ ...paidOrder, orderStatus: 'delivered', paymentStatus: 'unpaid' }] })) })

    renderWithProviders(<AdminSells />)
    const btn = await screen.findByRole('button', { name: /refund/i })
    expect(btn).toBeDisabled()
  })

  it('starts a refund via an authenticated POST and reports the pending status', async () => {
    const { merchantFetch } = setup({
      orders: () => mockJsonResponse(okEnvelope({ orders: [paidOrder] })),
      refund: () => mockJsonResponse(okEnvelope({
        order:  { id: 7, orderStatus: 'confirmed', paymentStatus: 'paid' },
        refund: { provider: 'stripe', refundId: 're_1', status: 'pending', amount: 1000, currency: 'usd' },
      }), 201),
    })

    renderWithProviders(<AdminSells />)
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

    renderWithProviders(<AdminSells />)
    fireEvent.click(await screen.findByRole('button', { name: /refund/i }))

    expect(await screen.findByText(/Order is not paid/i)).toBeInTheDocument()
    // Still refundable (row unchanged) — the button is back.
    expect(screen.getByRole('button', { name: /refund/i })).toBeEnabled()
  })
})

describe('AdminSells — manual status override', () => {
  const order = {
    id: 7,
    products: [{ productId: 1, quantity: 1, price: 1000 }],
    total: 1000, discountedTotal: 1000, totalProducts: 1, totalQuantity: 1,
    orderStatus: 'confirmed', paymentStatus: 'paid',
  }

  it('confirms before calling the endpoint, then POSTs the chosen status', async () => {
    const { merchantFetch } = setup({
      orders:    () => mockJsonResponse(okEnvelope({ orders: [order] })),
      setStatus: () => mockJsonResponse(okEnvelope({ id: 7, orderStatus: 'delivered' })),
    })

    renderWithProviders(<AdminSells />)

    // Open the per-row status picker and choose a new status.
    fireEvent.click(await screen.findByRole('button', { name: /change status of order #00007/i }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Delivered' }))

    // A confirmation dialog appears — and nothing has been sent yet.
    expect(await screen.findByText(/Change fulfilment status\?/i)).toBeInTheDocument()
    expect(merchantFetch.mock.calls.some(([u]) => /\/orders\/7\/status$/.test(String(u)))).toBe(false)

    // Confirm → POSTs the new status through the authenticated fetcher.
    fireEvent.click(screen.getByRole('button', { name: /confirm change/i }))
    await waitFor(() =>
      expect(merchantFetch.mock.calls.some(([u]) => /\/orders\/7\/status$/.test(String(u)))).toBe(true)
    )
    const call = merchantFetch.mock.calls.find(([u]) => /\/orders\/7\/status$/.test(String(u)))
    expect(call[1].method).toBe('POST')
    expect(JSON.parse(call[1].body)).toEqual({ status: 'delivered' })

    // Outcome is reported and the row reflects the new status.
    expect(await screen.findByText(/Order #00007 set to/i)).toBeInTheDocument()
  })

  it('does not call the endpoint when the confirmation is cancelled', async () => {
    const { merchantFetch } = setup({ orders: () => mockJsonResponse(okEnvelope({ orders: [order] })) })

    renderWithProviders(<AdminSells />)
    fireEvent.click(await screen.findByRole('button', { name: /change status of order #00007/i }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Cancelled' }))
    fireEvent.click(await screen.findByRole('button', { name: /^cancel$/i }))

    // The override endpoint was never hit.
    await waitFor(() => expect(screen.queryByText(/Change fulfilment status\?/i)).not.toBeInTheDocument())
    expect(merchantFetch.mock.calls.some(([u]) => /\/orders\/7\/status$/.test(String(u)))).toBe(false)
  })
})
