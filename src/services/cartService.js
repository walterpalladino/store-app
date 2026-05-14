// ---------------------------------------------------------------------------
// CartService — pure in-memory cart store, keyed by userId.
// This simulates what a real backend cart service would do.
// The service is a singleton so state survives component re-renders.
// ---------------------------------------------------------------------------

class CartService {
  constructor() {
    // Map<userId, CartItem[]>
    // CartItem: { product: ProductObject, quantity: number, addedAt: Date }
    this._carts = new Map()
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  _getCart(userId) {
    if (!this._carts.has(userId)) {
      this._carts.set(userId, [])
    }
    return this._carts.get(userId)
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Return a shallow copy of the user's cart items.
   * @returns {CartItem[]}
   */
  getItems(userId) {
    return [...this._getCart(userId)]
  }

  /**
   * Add a product to the cart or increment its quantity.
   * @param {string|number} userId
   * @param {object} product  Full product object from DummyJSON
   * @param {number} quantity Defaults to 1
   * @returns {CartItem[]} Updated cart
   */
  addItem(userId, product, quantity = 1) {
    const cart = this._getCart(userId)
    const existing = cart.find((i) => i.product.id === product.id)

    if (existing) {
      existing.quantity += quantity
    } else {
      cart.push({ product, quantity, addedAt: new Date() })
    }

    return [...cart]
  }

  /**
   * Set the quantity of a cart item explicitly.
   * Removes the item if quantity <= 0.
   * @returns {CartItem[]} Updated cart
   */
  setQuantity(userId, productId, quantity) {
    const cart = this._getCart(userId)

    if (quantity <= 0) {
      return this.removeItem(userId, productId)
    }

    const item = cart.find((i) => i.product.id === productId)
    if (item) item.quantity = quantity

    return [...cart]
  }

  /**
   * Remove a product from the cart entirely.
   * @returns {CartItem[]} Updated cart
   */
  removeItem(userId, productId) {
    const cart = this._getCart(userId)
    const filtered = cart.filter((i) => i.product.id !== productId)
    this._carts.set(userId, filtered)
    return [...filtered]
  }

  /**
   * Empty the cart.
   * @returns {CartItem[]} Empty array
   */
  clearCart(userId) {
    this._carts.set(userId, [])
    return []
  }

  /**
   * Total number of individual units in the cart (for badge).
   */
  getTotalQuantity(userId) {
    return this._getCart(userId).reduce((sum, i) => sum + i.quantity, 0)
  }

  /**
   * Subtotal before any shipping / tax.
   */
  getSubtotal(userId) {
    return this._getCart(userId).reduce((sum, i) => {
      const unitPrice = i.product.price * (1 - (i.product.discountPercentage ?? 0) / 100)
      return sum + unitPrice * i.quantity
    }, 0)
  }
}

// Singleton export
const cartService = new CartService()
export default cartService
