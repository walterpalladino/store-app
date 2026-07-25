import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithProviders, okEnvelope, mockJsonResponse } from './helpers.jsx'
import { PurchaseHistoryPanel } from '../pages/user/PurchaseHistoryPanel'

// authFetch is provided by AuthContext; mock it so the panel gets a token-bearing
// fetch that returns the CURRENT backend order shape.
const authFetch = vi.fn()
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ authFetch }),
}))

// Current backend order shape (see API_CONTRACT.md): sku-only line items with
// description/unitPrice/discountPrice/qty, two status axes, and no payment
// details at all — settlement lives on the separate Payments resource.
const NEW_ORDER = {
  id: 9,
  userId: 1,
  // Money is integer cents per the API contract ($8.99 → 899).
  products: [
    { sku: 'BEA-NAI-NAI-005', description: 'Red Nail Polish', unitPrice: 899, discountPrice: 796, qty: 1 },
    { sku: 'FRA-CHA-CHA-007', description: 'Chanel Coco Noir', unitPrice: 12999, discountPrice: 10853, qty: 1 },
  ],
  total: 13898,
  discountedTotal: 11649,
  totalProducts: 2,
  totalQuantity: 2,
  orderStatus: 'pending',
  paymentStatus: 'unpaid',
  address: {},
}

// GET /api/orders/9/payments — one pending checkout attempt (money in cents).
const PAYMENTS = [
  { id: 11, orderId: 'b562e3ae-792f-11f1-9844-97b9d913d5f0', status: 'pending', amount: 11649, currency: 'usd', paidOn: null, amountRefunded: 0, refundStatus: 'none', refundedOn: null },
]

beforeEach(() => {
  authFetch.mockReset()
  // Orders list (🔒) via authFetch; product thumbnails via global.fetch (public).
  authFetch.mockResolvedValue(mockJsonResponse(okEnvelope({ orders: [NEW_ORDER] })))
  global.fetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope({ sku: 'X', thumbnail: '' })))
})
afterEach(() => { vi.restoreAllMocks() })

describe('PurchaseHistoryPanel — current API order shape', () => {
  it('renders the order list without crashing and maps the new fields', async () => {
    renderWithProviders(<PurchaseHistoryPanel />)

    // Order number renders, plus a chip for each status axis.
    expect(await screen.findByText('#00009')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()   // orderStatus
    expect(screen.getByText('Unpaid')).toBeInTheDocument()    // paymentStatus
    expect(screen.getByText(/2 products · 2 units/)).toBeInTheDocument()

    // Orders were requested with the authenticated fetch, not a bare fetch.
    expect(authFetch).toHaveBeenCalledWith(expect.stringContaining('/api/orders'))
  })

  it('opens the detail view with remapped line items (no NaN, no card fields)', async () => {
    // List → { orders: [...] }; payments (…/orders/9/payments) → { payments };
    // detail (…/orders/9) → the single order.
    authFetch.mockImplementation((url) =>
      Promise.resolve(mockJsonResponse(okEnvelope(
        /\/orders\/\d+\/payments$/.test(url) ? { payments: PAYMENTS }
          : /\/orders\/\d+/.test(url) ? NEW_ORDER
            : { orders: [NEW_ORDER] },
      ))),
    )
    renderWithProviders(<PurchaseHistoryPanel />)

    fireEvent.click(await screen.findByRole('button', { name: /view/i }))

    // description → title, unitPrice → price
    expect(await screen.findByText('Red Nail Polish')).toBeInTheDocument()
    expect(screen.getByText('BEA-NAI-NAI-005')).toBeInTheDocument()
    // Settlement comes from the Payments resource, not from the order object.
    expect(await screen.findByText('Payments')).toBeInTheDocument()
    expect(screen.getByText('#11')).toBeInTheDocument()
    expect(authFetch).toHaveBeenCalledWith(expect.stringContaining('/api/orders/9/payments'))
    await waitFor(() => expect(document.body.textContent).not.toMatch(/NaN/))
  })
})
