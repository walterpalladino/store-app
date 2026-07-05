import { describe, it, expect, vi } from 'vitest'
import { startCheckout, getOpenOrder, isSuccess, REDIRECT_STATUS } from '../services/checkoutService'
import { okEnvelope, errEnvelope, mockJsonResponse } from './helpers.jsx'
import API from '../config/api'

describe('checkoutService.isSuccess', () => {
  it('is true for a settled payment', () => {
    expect(isSuccess('succeeded')).toBe(true)
    expect(isSuccess('complete')).toBe(true)
    expect(isSuccess('paid')).toBe(true)
  })

  it('is false otherwise', () => {
    expect(isSuccess('failed')).toBe(false)
    expect(isSuccess(REDIRECT_STATUS.CANCELED)).toBe(false)
    expect(isSuccess(undefined)).toBe(false)
  })
})

describe('checkoutService.startCheckout', () => {
  it('POSTs to /api/checkout with an empty JSON body and returns { order, checkout }', async () => {
    // The API returns money in integer cents; startCheckout converts to units.
    const data = {
      order: { id: 5, status: 'Payment Pending' },
      checkout: { sessionId: 'cs_1', clientSecret: 'x', amountTotal: 2400, returnUrl: '/checkout/return' },
    }
    const authFetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(data), 201))

    const res = await startCheckout(authFetch)
    expect(res.order).toMatchObject({ id: 5, status: 'Payment Pending' })
    expect(res.checkout).toMatchObject({ sessionId: 'cs_1', clientSecret: 'x', amountTotal: 24, returnUrl: '/checkout/return' })
    const [url, opts] = authFetch.mock.calls[0]
    expect(url).toBe(API.checkout)
    expect(opts.method).toBe('POST')
    // Must send a body: authFetch sets Content-Type: application/json, and the
    // backend 500s on a JSON content-type with an empty body.
    expect(opts.body).toBe('{}')
  })

  it('resumes the existing open order on 409 instead of failing', async () => {
    // Money is integer cents on the wire ($1821.86 → 182186); the resumed order
    // and its rebuilt session are handed back in decimal units.
    const openOrder = {
      id: 7, status: 'Payment Pending', discountedTotal: 182186,
      payment: { sessionId: 'cs_test_9', amountTotal: 182186, currency: 'usd', status: 'open', returnUrl: '/checkout/return' },
    }
    const authFetch = vi.fn()
      // 1st call: POST /api/checkout → 409
      .mockResolvedValueOnce(mockJsonResponse(errEnvelope('You already have an open order'), 409))
      // 2nd call: GET /api/orders → the open order
      .mockResolvedValueOnce(mockJsonResponse(okEnvelope({ orders: [openOrder] })))

    const { order, checkout, resumed } = await startCheckout(authFetch)
    expect(resumed).toBe(true)
    expect(order).toMatchObject({ id: 7, status: 'Payment Pending', discountedTotal: 1821.86 })
    expect(checkout).toMatchObject({ sessionId: 'cs_test_9', amountTotal: 1821.86 })
    expect(authFetch.mock.calls[1][0]).toBe(API.orders.list)
  })

  it('resumes when the backend reports the snake_case "pending_payment" status', async () => {
    const openOrder = {
      id: 8, status: 'pending_payment', discountedTotal: 5701,   // integer cents ($57.01)
      payment: { sessionId: 'cs_test_p', amountTotal: 5701, currency: 'usd', status: 'open', returnUrl: '/checkout/return' },
    }
    const authFetch = vi.fn()
      .mockResolvedValueOnce(mockJsonResponse(errEnvelope('You already have an open order'), 409))
      .mockResolvedValueOnce(mockJsonResponse(okEnvelope({ orders: [openOrder] })))

    const { order, resumed } = await startCheckout(authFetch)
    expect(resumed).toBe(true)
    expect(order).toMatchObject({ id: 8, status: 'pending_payment', discountedTotal: 57.01 })
  })

  it('still throws on 409 when no open order can be found', async () => {
    const authFetch = vi.fn()
      .mockResolvedValueOnce(mockJsonResponse(errEnvelope('You already have an open order'), 409))
      .mockResolvedValueOnce(mockJsonResponse(okEnvelope({ orders: [] })))
    await expect(startCheckout(authFetch)).rejects.toThrow('open order')
  })

  it('throws on 422 (empty cart)', async () => {
    const authFetch = vi.fn().mockResolvedValue(mockJsonResponse(errEnvelope('cart is empty'), 422))
    await expect(startCheckout(authFetch)).rejects.toThrow('cart is empty')
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
