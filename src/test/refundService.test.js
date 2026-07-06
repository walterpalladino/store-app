import { describe, it, expect, vi } from 'vitest'
import { startRefund } from '../services/refundService'
import { okEnvelope, mockJsonResponse } from './helpers.jsx'
import API from '../config/api'

const flatError = (message, status) =>
  new Response(JSON.stringify({ message }), { status, headers: { 'Content-Type': 'application/json' } })

describe('refundService.startRefund', () => {
  it('POSTs { orderId } to /api/refund and converts money to units', async () => {
    const merchantFetch = vi.fn().mockResolvedValue(
      mockJsonResponse(okEnvelope({
        order:  { id: 5, status: 'paid', refundStatus: 'pending', discountedTotal: 2400 },
        refund: { provider: 'stripe', refundId: 're_1', status: 'pending', amount: 2400, currency: 'usd' },
      }), 201),
    )

    const { order, refund } = await startRefund(merchantFetch, 5)

    const [url, opts] = merchantFetch.mock.calls[0]
    expect(url).toBe(API.refund)
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body)).toEqual({ orderId: 5 })

    // Integer cents on the wire → decimal units out ($24.00).
    expect(order).toMatchObject({ id: 5, status: 'paid', refundStatus: 'pending', discountedTotal: 24 })
    expect(refund).toMatchObject({ refundId: 're_1', status: 'pending', amount: 24 })
  })

  it('throws the server message on failure (flat { message })', async () => {
    const merchantFetch = vi.fn().mockResolvedValue(flatError('Order is not paid', 409))
    await expect(startRefund(merchantFetch, 5)).rejects.toThrow('Order is not paid')
  })
})
