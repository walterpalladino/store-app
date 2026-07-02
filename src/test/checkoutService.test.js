import { describe, it, expect, vi, beforeEach } from 'vitest'
import { submitOrder } from '../services/checkoutService'
import { okEnvelope, errEnvelope, makeTransaction } from './helpers.jsx'

const makePayload = (overrides = {}) => ({
  userId:          1,
  products: [
    {
      id:                 1,
      sku:                'TEST-001',
      title:              'Test Product',
      thumbnail:          'https://example.com/thumb.jpg',
      price:              49.99,
      quantity:           2,
      total:              99.98,
      discountPercentage: 10,
      discountedTotal:    89.98,
    },
  ],
  address:         { address: '123 Main St', city: 'Phoenix', state: 'AZ', postalCode: '85001', country: 'United States' },
  payment:         { cardType: 'Visa', cardNumber: '4111111111111111', currency: 'USD' },
  total:           99.98,
  discountedTotal: 89.98,
  totalProducts:   1,
  totalQuantity:   2,
  ...overrides,
})

describe('checkoutService.submitOrder', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('posts to the transactions endpoint with correct body', async () => {
    const serverResponse = { id: 42, status: 'Payment Completed', ...makeTransaction() }
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(okEnvelope(serverResponse)), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    )

    const payload = makePayload()
    await submitOrder(payload)

    expect(fetch).toHaveBeenCalledOnce()
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toContain('/api/orders')
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body)).toMatchObject({ userId: 1, totalProducts: 1 })
  })

  it('merges server response with submitted payload data', async () => {
    const serverData = { id: 99, status: 'Delivered', payment: { cardType: 'JCB' } }
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(okEnvelope(serverData)), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    )

    const payload = makePayload()
    const result  = await submitOrder(payload)

    // id and status come from server
    expect(result.id).toBe(99)
    expect(result.status).toBe('Delivered')

    // payload fields are preserved over server echo (richer data)
    expect(result.products).toEqual(payload.products)
    expect(result.address).toEqual(payload.address)
    expect(result.payment).toEqual(payload.payment)
    expect(result.total).toBe(payload.total)
    expect(result.discountedTotal).toBe(payload.discountedTotal)
    expect(result.userId).toBe(payload.userId)
  })

  it('throws with server error message on failure', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(errEnvelope('Payment could not be processed')), {
        status: 422, headers: { 'Content-Type': 'application/json' },
      })
    )
    await expect(submitOrder(makePayload())).rejects.toThrow(
      'Payment could not be processed'
    )
  })

  it('throws on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(submitOrder(makePayload())).rejects.toThrow('Failed to fetch')
  })

  it('includes thumbnail in submitted products', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(okEnvelope({ id: 1, status: 'Delivered' })), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    )
    const payload = makePayload()
    await submitOrder(payload)
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.products[0].thumbnail).toBe('https://example.com/thumb.jpg')
  })
})
