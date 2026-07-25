import { describe, it, expect, vi } from 'vitest'
import { okEnvelope, mockJsonResponse } from './helpers.jsx'
import {
  fetchOrderPayments, fetchPayment, fetchPayments,
  fetchPaymentStatusOptions, changePaymentStatus,
} from '../services/paymentsService'
import API from '../config/api'

// Money is integer cents on the wire; the service converts at the boundary.
const payment = (over = {}) => ({
  id: 11,
  orderId: '018f9a2c-7b3e-7c21-9e2a-3f1b6d4e5a90',
  status: 'paid',
  amount: 2400,
  currency: 'usd',
  paidOn: '2026-07-05T10:00:00.000Z',
  amountRefunded: 0,
  refundStatus: 'none',
  refundedOn: null,
  createdAt: '2026-07-05T09:58:00.000Z',
  updatedAt: '2026-07-05T10:00:00.000Z',
  ...over,
})

describe('paymentsService.fetchOrderPayments', () => {
  it('reads an order\'s payments and converts money cents → units', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      mockJsonResponse(okEnvelope({ payments: [payment({ amountRefunded: 400 })] })),
    )

    const [p] = await fetchOrderPayments(fetcher, 5)

    expect(fetcher).toHaveBeenCalledWith(API.orders.payments(5))
    expect(p.amount).toBe(24)
    expect(p.amountRefunded).toBe(4)
  })

  it('throws the server message when the order is not the caller\'s (404)', async () => {
    const fetcher = vi.fn().mockResolvedValue(mockJsonResponse({ message: 'Order not found' }, 404))
    await expect(fetchOrderPayments(fetcher, 99)).rejects.toThrow('Order not found')
  })
})

describe('paymentsService.fetchPayment', () => {
  it('reads one payment by its numeric id', async () => {
    const fetcher = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(payment())))

    const p = await fetchPayment(fetcher, 11)

    expect(fetcher).toHaveBeenCalledWith(API.payments.byId(11))
    expect(p).toMatchObject({ id: 11, amount: 24 })
  })
})

describe('paymentsService.fetchPaymentStatusOptions', () => {
  it('reads the admin status list', async () => {
    const statuses = ['pending', 'paid', 'payment_failed', 'cancelled', 'refunded', 'partially_refunded']
    const merchantFetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope({ statuses })))

    expect(await fetchPaymentStatusOptions(merchantFetch)).toEqual(statuses)
    expect(merchantFetch).toHaveBeenCalledWith(API.payments.statusOptions)
  })

  it('degrades to an empty list instead of throwing (403 non-admin)', async () => {
    const merchantFetch = vi.fn().mockResolvedValue(mockJsonResponse({ message: 'Forbidden' }, 403))
    await expect(fetchPaymentStatusOptions(merchantFetch)).resolves.toEqual([])
  })
})

describe('paymentsService.changePaymentStatus', () => {
  it('POSTs the status and returns the updated payment in decimal units', async () => {
    const merchantFetch = vi.fn().mockResolvedValue(
      mockJsonResponse(okEnvelope(payment({ status: 'cancelled' }))),
    )

    const updated = await changePaymentStatus(merchantFetch, 11, 'cancelled')

    expect(merchantFetch).toHaveBeenCalledWith(API.payments.setStatus(11), expect.objectContaining({ method: 'POST' }))
    expect(JSON.parse(merchantFetch.mock.calls[0][1].body)).toEqual({ status: 'cancelled' })
    expect(updated).toMatchObject({ id: 11, status: 'cancelled', amount: 24 })
  })

  it('throws the server message on an unknown status (422)', async () => {
    const merchantFetch = vi.fn().mockResolvedValue(mockJsonResponse({ message: 'Unknown status' }, 422))
    await expect(changePaymentStatus(merchantFetch, 11, 'nope')).rejects.toThrow('Unknown status')
  })
})

describe('paymentsService.fetchPayments', () => {
  // There is no list-all route, so the list is composed from the orders the
  // caller can see, one payments request each.
  const orders = [
    { id: 5, orderId: 'aaaa-1', orderStatus: 'confirmed', paymentStatus: 'paid',   discountedTotal: 2400, currency: 'usd' },
    { id: 6, orderId: 'bbbb-2', orderStatus: 'pending',   paymentStatus: 'unpaid', discountedTotal: 900,  currency: 'usd' },
  ]

  function setup({ perOrder } = {}) {
    return vi.fn((url) => {
      const u = String(url)
      const m = u.match(/\/orders\/(\d+)\/payments$/)
      if (m) {
        const res = perOrder?.[m[1]]
        if (res) return Promise.resolve(res)
        return Promise.resolve(mockJsonResponse(okEnvelope({ payments: [] })))
      }
      return Promise.resolve(mockJsonResponse(okEnvelope({ orders })))
    })
  }

  it('fans out over the orders and returns every payment, newest first', async () => {
    const fetcher = setup({
      perOrder: {
        5: mockJsonResponse(okEnvelope({ payments: [payment({ id: 11, createdAt: '2026-07-01T00:00:00.000Z' })] })),
        6: mockJsonResponse(okEnvelope({ payments: [payment({ id: 12, createdAt: '2026-07-09T00:00:00.000Z', status: 'pending' })] })),
      },
    })

    const { payments, orderCount, truncated, failed } = await fetchPayments(fetcher)

    expect(fetcher).toHaveBeenCalledWith(API.orders.list)
    expect(payments.map((p) => p.id)).toEqual([12, 11])
    // Each payment carries a summary of the order it belongs to.
    expect(payments[0].order).toMatchObject({ id: 6, orderId: 'bbbb-2', paymentStatus: 'unpaid' })
    expect({ orderCount, truncated, failed }).toEqual({ orderCount: 2, truncated: false, failed: 0 })
  })

  it('narrows the scan through the order search endpoint when filtering', async () => {
    const fetcher = setup()

    await fetchPayments(fetcher, { orderId: 'aaaa' })

    expect(fetcher).toHaveBeenCalledWith(API.orders.search('aaaa'))
    expect(fetcher).not.toHaveBeenCalledWith(API.orders.list)
  })

  it('skips (and counts) an order whose payments cannot be read', async () => {
    const fetcher = setup({
      perOrder: {
        5: mockJsonResponse(okEnvelope({ payments: [payment({ id: 11 })] })),
        6: mockJsonResponse({ message: 'Boom' }, 500),
      },
    })

    const { payments, failed } = await fetchPayments(fetcher)

    expect(payments.map((p) => p.id)).toEqual([11])
    expect(failed).toBe(1)
  })

  it('throws when the orders request itself fails', async () => {
    const fetcher = vi.fn().mockResolvedValue(mockJsonResponse({ message: 'Forbidden' }, 403))
    await expect(fetchPayments(fetcher)).rejects.toThrow('Forbidden')
  })
})
