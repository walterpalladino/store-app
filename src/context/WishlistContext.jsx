import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useAuth } from './AuthContext'
import API from '../config/api'
import { fetchWishlist, saveWishlist } from '../services/wishlistService'

const WishlistContext = createContext(null)

const DEFAULT_NAME = 'My Wishlist'

// Build the display item stored in context from a full product. `id` may be
// absent for products rebuilt from the SKU-only endpoint (which omits it).
function toItem(product) {
  return {
    sku:                product.sku,
    id:                 product.id,
    title:              product.title,
    price:              product.price,
    discountPercentage: product.discountPercentage ?? 0,
    thumbnail:          product.thumbnail,
    category:           product.category,
  }
}

// Fetch a product by SKU to rebuild wishlist display data (public endpoint).
async function fetchProductBySku(sku) {
  try {
    const res = await fetch(API.products.bySku(sku))
    if (!res.ok) return null
    const body = await res.json()
    return body?.data ?? body
  } catch {
    return null
  }
}

export function WishlistProvider({ children }) {
  const { user, isLoggedIn, authFetch } = useAuth()
  const userId = user?.id ?? null

  // Each item: { sku, id?, title, price, discountPercentage, thumbnail, category }
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const nameRef = useRef(DEFAULT_NAME)

  // ── Load the wishlist from the backend whenever the user changes ───────────
  const load = useCallback(async () => {
    if (!userId) { setItems([]); nameRef.current = DEFAULT_NAME; return }
    setLoading(true); setError('')
    try {
      const wl = await fetchWishlist(authFetch, userId) // { name, items:[{sku}] } | null
      if (!wl) { nameRef.current = DEFAULT_NAME; setItems([]); return }
      nameRef.current = wl.name || DEFAULT_NAME
      const skus = (wl.items || [])
        .map((i) => (typeof i === 'string' ? i : i?.sku))
        .filter(Boolean)
      // Rebuild display data by refetching each product by SKU.
      const products = await Promise.all(skus.map(fetchProductBySku))
      setItems(skus.map((sku, idx) => {
        const p = products[idx]
        return p ? toItem({ ...p, sku: p.sku ?? sku }) : { sku }
      }))
    } catch (err) {
      setError(err.message || 'Could not load your wishlist.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [userId, authFetch])

  useEffect(() => { load() }, [load])

  // ── Persist the full SKU set (optimistic; revert on failure) ───────────────
  const persist = useCallback(async (nextItems, prevItems) => {
    if (!userId) return
    try {
      await saveWishlist(authFetch, userId, {
        name: nameRef.current,
        skus: nextItems.map((i) => i.sku),
      })
    } catch (err) {
      setItems(prevItems)
      setError(err.message || 'Could not update your wishlist.')
    }
  }, [userId, authFetch])

  const isWishlisted = useCallback((sku) => items.some((i) => i.sku === sku), [items])

  const addToWishlist = useCallback((product) => {
    if (!userId || !product?.sku) return
    if (items.some((i) => i.sku === product.sku)) return
    const prev = items
    const next = [...items, toItem(product)]
    setItems(next)
    persist(next, prev)
  }, [userId, items, persist])

  const removeFromWishlist = useCallback((sku) => {
    if (!userId) return
    const prev = items
    const next = items.filter((i) => i.sku !== sku)
    setItems(next)
    persist(next, prev)
  }, [userId, items, persist])

  const toggleWishlist = useCallback((product) => {
    if (!userId) return false // caller can redirect to login
    const exists = items.some((i) => i.sku === product.sku)
    if (exists) removeFromWishlist(product.sku)
    else addToWishlist(product)
    return !exists
  }, [userId, items, addToWishlist, removeFromWishlist])

  const clearWishlist = useCallback(() => {
    if (!userId || items.length === 0) return
    const prev = items
    setItems([])
    persist([], prev)
  }, [userId, items, persist])

  const value = useMemo(() => ({
    items,
    isWishlisted,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    clearWishlist,
    count: items.length,
    loading,
    error,
    canUse: isLoggedIn,
  }), [items, isWishlisted, addToWishlist, removeFromWishlist, toggleWishlist, clearWishlist, loading, error, isLoggedIn])

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used inside WishlistProvider')
  return ctx
}
