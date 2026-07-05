import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import { useAuth } from './AuthContext'
import API from '../config/api'
import { fetchCart, saveCart, toCartItem } from '../services/cartService'
import { productFromCents } from '../utils/money'

const CartContext = createContext(null)

// Fetch a product by SKU to rebuild cart display data (public endpoint).
async function fetchProductBySku(sku) {
  try {
    const res = await fetch(API.products.bySku(sku))
    if (!res.ok) return null
    const body = await res.json()
    return productFromCents(body?.data ?? body)   // price cents → units
  } catch {
    return null
  }
}

// Turn a stored cart-item snapshot (+ optional refetched product) into the
// `{ product, quantity }` shape the UI renders. `product.id` is absent when
// rebuilt from SKU, so consumers key on SKU.
function toDisplayItem(cartItem, product) {
  const fallback = {
    sku:                cartItem.sku,
    title:              cartItem.description,
    price:              cartItem.unitPrice,
    discountPercentage: cartItem.unitPrice > 0
      ? Math.max(0, (1 - cartItem.discountPrice / cartItem.unitPrice) * 100)
      : 0,
  }
  const p = product ? { ...product, sku: product.sku ?? cartItem.sku } : fallback
  return { product: p, quantity: cartItem.qty }
}

export function CartProvider({ children }) {
  const { user, authFetch } = useAuth()
  const userId = user?.id ?? null

  // Each item: { product: {...}, quantity }
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  // ── Load the cart from the backend whenever the user changes ───────────────
  const load = useCallback(async () => {
    if (!userId) { setItems([]); return }
    setLoading(true); setError('')
    try {
      const cart = await fetchCart(authFetch, userId) // { items:[snapshot] } | null
      if (!cart) { setItems([]); return }
      const snapshots = cart.items || []
      const products = await Promise.all(snapshots.map((ci) => fetchProductBySku(ci.sku)))
      setItems(snapshots.map((ci, idx) => toDisplayItem(ci, products[idx])))
    } catch (err) {
      setError(err.message || 'Could not load your cart.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [userId, authFetch])

  useEffect(() => { load() }, [load])

  // ── Persist the full item set (optimistic; revert on failure) ──────────────
  const persist = useCallback(async (nextItems, prevItems) => {
    if (!userId) return
    try {
      await saveCart(authFetch, userId, {
        items: nextItems.map((i) => toCartItem(i.product, i.quantity)),
      })
    } catch (err) {
      setItems(prevItems)
      setError(err.message || 'Could not update your cart.')
    }
  }, [userId, authFetch])

  // ── Mutators — cart items are identified by SKU ────────────────────────────
  const addItem = useCallback((product, quantity = 1) => {
    if (!userId || !product?.sku) return
    const prev = items
    const existing = items.find((i) => i.product.sku === product.sku)
    const next = existing
      ? items.map((i) => (i.product.sku === product.sku ? { ...i, quantity: i.quantity + quantity } : i))
      : [...items, { product, quantity }]
    setItems(next)
    persist(next, prev)
  }, [userId, items, persist])

  const setQuantity = useCallback((sku, quantity) => {
    if (!userId) return
    const prev = items
    const next = quantity <= 0
      ? items.filter((i) => i.product.sku !== sku)
      : items.map((i) => (i.product.sku === sku ? { ...i, quantity } : i))
    setItems(next)
    persist(next, prev)
  }, [userId, items, persist])

  const removeItem = useCallback((sku) => {
    if (!userId) return
    const prev = items
    const next = items.filter((i) => i.product.sku !== sku)
    setItems(next)
    persist(next, prev)
  }, [userId, items, persist])

  const clearCart = useCallback(() => {
    if (!userId || items.length === 0) return
    const prev = items
    setItems([])
    persist([], prev)
  }, [userId, items, persist])

  // ── Derived values ─────────────────────────────────────────────────────────
  const totalQuantity = items.reduce((s, i) => s + i.quantity, 0)
  const subtotal = items.reduce((s, i) => {
    const unit = i.product.price * (1 - (i.product.discountPercentage ?? 0) / 100)
    return s + unit * i.quantity
  }, 0)

  const isInCart = useCallback((sku) => items.some((i) => i.product.sku === sku), [items])
  const getQuantity = useCallback(
    (sku) => items.find((i) => i.product.sku === sku)?.quantity ?? 0,
    [items],
  )

  const value = useMemo(() => ({
    items,
    totalQuantity,
    subtotal,
    isInCart,
    getQuantity,
    addItem,
    setQuantity,
    removeItem,
    clearCart,
    loading,
    error,
  }), [items, totalQuantity, subtotal, isInCart, getQuantity, addItem, setQuantity, removeItem, clearCart, loading, error])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
