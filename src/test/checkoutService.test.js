import { describe, it, expect, vi } from 'vitest'
import { startCheckout, getOpenOrder, getOrderBySession, isSuccess } from '../services/checkoutService'
import { okEnvelope, errEnvelope, mockJsonResponse } from './helpers.jsx'
import API from '../config/api'

const CALLBACKS = { successUrl: 'http://app/checkout/return', cancelUrl: 'http://app/checkout/cancel' }

describe('checkoutService.isSuccess', () => {
  it('is true for a settled payment', () => {
    expect(isSuccess('succeeded')).toBe(true)
    expect(isSuccess('complete')).toBe(true)
    expect(isSuccess('paid')).toBe(true)
    expect(isSuccess('fulfilled')).toBe(true)
  })

  it('is false otherwise', () => {
    expect(isSuccess('failed')).toBe(false)
    expect(isSuccess('pending_payment')).toBe(false)
    expect(isSuccess(undefined)).toBe(false)
  })
})

describe('checkoutService.startCheckout', () => {
  it('POSTs the success/cancel URLs to /api/checkout and returns the hosted session', async () => {
    // The API returns money in integer cents; startCheckout converts to units.
    const data = {
      order: { id: 5, status: 'pending_payment' },
      checkout: { sessionId: 'cs_1', url: 'https://checkout.stripe.com/c/pay/cs_1', amountTotal: 2400, status: 'open' },
    }
    const authFetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(data), 201))

    const res = await startCheckout(authFetch, CALLBACKS)
    expect(res.order).toMatchObject({ id: 5, status: 'pending_payment' })
    // The hosted-page URL passes through; amountTotal is converted to units.
    expect(res.checkout).toMatchObject({ sessionId: 'cs_1', url: 'https://checkout.stripe.com/c/pay/cs_1', amountTotal: 24 })
    const [url, opts] = authFetch.mock.calls[0]
    expect(url).toBe(API.checkout)
    expect(opts.method).toBe('POST')
    // The body carries the callback URLs Stripe redirects back to (required).
    expect(JSON.parse(opts.body)).toEqual(CALLBACKS)
  })

  it('detects the existing open order on 409 and flags it as resumed (no hosted url)', async () => {
    // Money is integer cents on the wire ($1821.86 → 182186); the open order is
    // handed back in decimal units. The hosted session url is ephemeral and not
    // stored, so it cannot be resumed by redirect — checkout is null.
    const openOrder = {
      id: 7, status: 'pending_payment', discountedTotal: 182186,
      payment: { sessionId: 'cs_test_9', amountTotal: 182186, currency: 'usd', status: 'open' },
    }
    const authFetch = vi.fn()
      // 1st call: POST /api/checkout → 409
      .mockResolvedValueOnce(mockJsonResponse(errEnvelope('You already have an open order'), 409))
      // 2nd call: GET /api/orders → the open order
      .mockResolvedValueOnce(mockJsonResponse(okEnvelope({ orders: [openOrder] })))

    const { order, checkout, resumed } = await startCheckout(authFetch, CALLBACKS)
    expect(resumed).toBe(true)
    expect(checkout).toBeNull()
    expect(order).toMatchObject({ id: 7, status: 'pending_payment', discountedTotal: 1821.86 })
    expect(authFetch.mock.calls[1][0]).toBe(API.orders.list)
  })

  it('still throws on 409 when no open order can be found', async () => {
    const authFetch = vi.fn()
      .mockResolvedValueOnce(mockJsonResponse(errEnvelope('You already have an open order'), 409))
      .mockResolvedValueOnce(mockJsonResponse(okEnvelope({ orders: [] })))
    await expect(startCheckout(authFetch, CALLBACKS)).rejects.toThrow('open order')
  })

  it('throws on 422 (missing URLs / empty cart)', async () => {
    const authFetch = vi.fn().mockResolvedValue(mockJsonResponse(errEnvelope('cart is empty'), 422))
    await expect(startCheckout(authFetch, CALLBACKS)).rejects.toThrow('cart is empty')
  })
})

describe('checkoutService.getOrderBySession', () => {
  it('matches the caller order whose stored session id equals the callback session', async () => {
    const orders = [
      { id: 9, status: 'pending_payment', discountedTotal: 5701, payment: { sessionId: 'cs_other' } },
      { id: 7, status: 'paid',            discountedTotal: 2400, payment: { sessionId: 'cs_target' } },
    ]
    const authFetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope({ orders })))
    const order = await getOrderBySession(authFetch, 'cs_target')
    expect(order).toMatchObject({ id: 7, status: 'paid', discountedTotal: 24 })  // cents → units
  })

  it('falls back to the newest order when the session cannot be matched', async () => {
    const orders = [{ id: 9, status: 'pending_payment', payment: { sessionId: 'cs_a' } }]
    const authFetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope({ orders })))
    const order = await getOrderBySession(authFetch, 'cs_missing')
    expect(order).toMatchObject({ id: 9 })
  })

  it('returns null when the orders request fails', async () => {
    const authFetch = vi.fn().mockResolvedValue(mockJsonResponse(errEnvelope('nope'), 500))
    expect(await getOrderBySession(authFetch, 'cs_x')).toBeNull()
  })
})

describe('checkoutService.getOpenOrder', () => {
  it('returns the first order in an open state', async () => {
    const orders = [
      { id: 9, status: 'Fulfilled' },
      { id: 7, status: 'Payment Pending' },
    ]
    const authFetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope({ orders })))
    expect(await getOpenOrder(authFetch)).toEqual(orders[1])
  })

  it('returns null when no order is open', async () => {
    const authFetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope({ orders: [{ id: 9, status: 'Fulfilled' }] })))
    expect(await getOpenOrder(authFetch)).toBeNull()
  })
})
