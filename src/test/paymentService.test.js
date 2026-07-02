import { describe, it, expect, vi, beforeEach } from 'vitest'
import { okEnvelope, mockJsonResponse } from './helpers.jsx'
import API from '../config/api'
// Default import runs in mock mode (no VITE_STRIPE_MOCK in the test env).
import { createCheckoutSession, getPaymentStatus, isSuccess, PAYMENT_STATUS } from '../services/paymentService'

describe('paymentService — helpers', () => {
  it('isSuccess is true only for "succeeded"', () => {
    expect(isSuccess('succeeded')).toBe(true)
    expect(isSuccess('SUCCEEDED')).toBe(true)
    expect(isSuccess('failed')).toBe(false)
  })
})

describe('paymentService — mock mode (default)', () => {
  it('createCheckoutSession returns a synthetic session without calling the backend', async () => {
    const authFetch = vi.fn()
    const s = await createCheckoutSession(authFetch, { amount: 20 })
    expect(s.mock).toBe(true)
    expect(s.id).toMatch(/^cs_mock_/)
    expect(s.amount).toBe(20)
    expect(authFetch).not.toHaveBeenCalled()
  })

  it('getPaymentStatus echoes the simulated status', async () => {
    expect((await getPaymentStatus(vi.fn(), 'cs', PAYMENT_STATUS.FAILED)).status).toBe('failed')
    expect((await getPaymentStatus(vi.fn(), 'cs')).status).toBe(PAYMENT_STATUS.SUCCEEDED)
  })
})

describe('paymentService — real mode', () => {
  beforeEach(() => { vi.resetModules() })

  it('createCheckoutSession POSTs to the session endpoint and returns data', async () => {
    vi.doMock('../config/stripe', () => ({ STRIPE_MOCK: false }))
    const { createCheckoutSession: create } = await import('../services/paymentService')
    const authFetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope({ id: 'cs_1', clientSecret: 'x' })))

    const res = await create(authFetch, { amount: 20, order: {} })
    expect(res).toEqual({ id: 'cs_1', clientSecret: 'x' })
    const [url, opts] = authFetch.mock.calls[0]
    expect(url).toBe(API.payments.createSession)
    expect(opts.method).toBe('POST')
    vi.doUnmock('../config/stripe')
  })

  it('getPaymentStatus GETs the session status', async () => {
    vi.doMock('../config/stripe', () => ({ STRIPE_MOCK: false }))
    const { getPaymentStatus: get } = await import('../services/paymentService')
    const authFetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope({ status: 'succeeded', orderId: 1 })))

    const res = await get(authFetch, 'cs_1')
    expect(res.status).toBe('succeeded')
    expect(authFetch).toHaveBeenCalledWith(API.payments.session('cs_1'))
    vi.doUnmock('../config/stripe')
  })

  it('throws the server message on error', async () => {
    vi.doMock('../config/stripe', () => ({ STRIPE_MOCK: false }))
    const { createCheckoutSession: create } = await import('../services/paymentService')
    const authFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'bad amount' }), { status: 422, headers: { 'Content-Type': 'application/json' } }),
    )
    await expect(create(authFetch, { amount: -1 })).rejects.toThrow('bad amount')
    vi.doUnmock('../config/stripe')
  })
})
