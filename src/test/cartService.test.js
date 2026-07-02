import { describe, it, expect, beforeEach } from 'vitest'
import { CartService } from '../services/cartService'

// Use a fresh instance per test (not the singleton) so tests are isolated
let service

const PRODUCT_A = { id: 1, title: 'Widget',  price: 10.00, discountPercentage: 0  }
const PRODUCT_B = { id: 2, title: 'Gadget',  price: 20.00, discountPercentage: 10 }
const PRODUCT_C = { id: 3, title: 'Doohickey', price: 5.00, discountPercentage: 0 }
const USER_1 = 'user-1'
const USER_2 = 'user-2'

beforeEach(() => {
  service = new CartService()
})

// ── getItems ───────────────────────────────────────────────────────────────
describe('getItems', () => {
  it('returns empty array for unknown user', () => {
    expect(service.getItems(USER_1)).toEqual([])
  })

  it('returns a copy — mutations do not affect internal state', () => {
    service.addItem(USER_1, PRODUCT_A, 1)
    const items = service.getItems(USER_1)
    items.push({ product: PRODUCT_B, quantity: 1 })
    expect(service.getItems(USER_1)).toHaveLength(1)
  })
})

// ── addItem ────────────────────────────────────────────────────────────────
describe('addItem', () => {
  it('adds a new product to an empty cart', () => {
    const items = service.addItem(USER_1, PRODUCT_A, 2)
    expect(items).toHaveLength(1)
    expect(items[0].product).toEqual(PRODUCT_A)
    expect(items[0].quantity).toBe(2)
  })

  it('defaults quantity to 1 when not specified', () => {
    const items = service.addItem(USER_1, PRODUCT_A)
    expect(items[0].quantity).toBe(1)
  })

  it('increments quantity when product already in cart', () => {
    service.addItem(USER_1, PRODUCT_A, 2)
    const items = service.addItem(USER_1, PRODUCT_A, 3)
    expect(items).toHaveLength(1)
    expect(items[0].quantity).toBe(5)
  })

  it('appends a different product as a new line', () => {
    service.addItem(USER_1, PRODUCT_A, 1)
    const items = service.addItem(USER_1, PRODUCT_B, 1)
    expect(items).toHaveLength(2)
  })

  it('isolates carts by userId', () => {
    service.addItem(USER_1, PRODUCT_A, 3)
    service.addItem(USER_2, PRODUCT_B, 1)
    expect(service.getItems(USER_1)).toHaveLength(1)
    expect(service.getItems(USER_2)).toHaveLength(1)
    expect(service.getItems(USER_1)[0].product.id).toBe(1)
    expect(service.getItems(USER_2)[0].product.id).toBe(2)
  })

  it('records addedAt as a Date', () => {
    const items = service.addItem(USER_1, PRODUCT_A)
    expect(items[0].addedAt).toBeInstanceOf(Date)
  })
})

// ── setQuantity ────────────────────────────────────────────────────────────
describe('setQuantity', () => {
  beforeEach(() => { service.addItem(USER_1, PRODUCT_A, 2) })

  it('updates quantity to the specified value', () => {
    const items = service.setQuantity(USER_1, PRODUCT_A.id, 7)
    expect(items[0].quantity).toBe(7)
  })

  it('removes the item when quantity is set to 0', () => {
    const items = service.setQuantity(USER_1, PRODUCT_A.id, 0)
    expect(items).toHaveLength(0)
  })

  it('removes the item when quantity is negative', () => {
    const items = service.setQuantity(USER_1, PRODUCT_A.id, -1)
    expect(items).toHaveLength(0)
  })

  it('is a no-op for a product not in the cart', () => {
    const items = service.setQuantity(USER_1, 999, 5)
    expect(items).toHaveLength(1)
    expect(items[0].quantity).toBe(2)   // unchanged
  })
})

// ── removeItem ─────────────────────────────────────────────────────────────
describe('removeItem', () => {
  beforeEach(() => {
    service.addItem(USER_1, PRODUCT_A, 1)
    service.addItem(USER_1, PRODUCT_B, 2)
  })

  it('removes the specified product', () => {
    const items = service.removeItem(USER_1, PRODUCT_A.id)
    expect(items).toHaveLength(1)
    expect(items[0].product.id).toBe(PRODUCT_B.id)
  })

  it('is a no-op when product is not in cart', () => {
    const items = service.removeItem(USER_1, 999)
    expect(items).toHaveLength(2)
  })

  it('results in an empty cart when last item removed', () => {
    service.removeItem(USER_1, PRODUCT_A.id)
    const items = service.removeItem(USER_1, PRODUCT_B.id)
    expect(items).toHaveLength(0)
  })
})

// ── clearCart ──────────────────────────────────────────────────────────────
describe('clearCart', () => {
  it('empties the cart and returns []', () => {
    service.addItem(USER_1, PRODUCT_A, 5)
    service.addItem(USER_1, PRODUCT_B, 3)
    const items = service.clearCart(USER_1)
    expect(items).toEqual([])
    expect(service.getItems(USER_1)).toEqual([])
  })

  it('does not affect other users', () => {
    service.addItem(USER_1, PRODUCT_A, 1)
    service.addItem(USER_2, PRODUCT_B, 2)
    service.clearCart(USER_1)
    expect(service.getItems(USER_2)).toHaveLength(1)
  })

  it('is safe to call on an empty cart', () => {
    expect(() => service.clearCart(USER_1)).not.toThrow()
    expect(service.getItems(USER_1)).toEqual([])
  })
})

// ── getTotalQuantity ───────────────────────────────────────────────────────
describe('getTotalQuantity', () => {
  it('returns 0 for empty cart', () => {
    expect(service.getTotalQuantity(USER_1)).toBe(0)
  })

  it('sums quantities across all line items', () => {
    service.addItem(USER_1, PRODUCT_A, 3)
    service.addItem(USER_1, PRODUCT_B, 2)
    expect(service.getTotalQuantity(USER_1)).toBe(5)
  })

  it('updates after removal', () => {
    service.addItem(USER_1, PRODUCT_A, 4)
    service.removeItem(USER_1, PRODUCT_A.id)
    expect(service.getTotalQuantity(USER_1)).toBe(0)
  })
})

// ── getSubtotal ────────────────────────────────────────────────────────────
describe('getSubtotal', () => {
  it('returns 0 for empty cart', () => {
    expect(service.getSubtotal(USER_1)).toBe(0)
  })

  it('calculates price × quantity for a single item (no discount)', () => {
    service.addItem(USER_1, PRODUCT_A, 3)   // 10.00 × 3 = 30.00
    expect(service.getSubtotal(USER_1)).toBeCloseTo(30.00)
  })

  it('applies discountPercentage to unit price', () => {
    service.addItem(USER_1, PRODUCT_B, 2)   // 20.00 × (1 - 0.10) × 2 = 36.00
    expect(service.getSubtotal(USER_1)).toBeCloseTo(36.00)
  })

  it('sums multiple line items including discounts', () => {
    service.addItem(USER_1, PRODUCT_A, 2)   // 10 × 2 = 20
    service.addItem(USER_1, PRODUCT_B, 1)   // 20 × 0.9 = 18
    service.addItem(USER_1, PRODUCT_C, 3)   // 5 × 3  = 15
    expect(service.getSubtotal(USER_1)).toBeCloseTo(53.00)
  })

  it('treats missing discountPercentage as 0', () => {
    const prod = { id: 4, price: 50 }       // no discountPercentage field
    service.addItem(USER_1, prod, 1)
    expect(service.getSubtotal(USER_1)).toBeCloseTo(50)
  })
})
