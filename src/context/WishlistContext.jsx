import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from './AuthContext'

const WishlistContext = createContext(null)

const storageKey = (userId) => `shop_wishlist_${userId}`

export function WishlistProvider({ children }) {
  const { user, isLoggedIn } = useAuth()
  const userId = user?.id ?? null

  // Each item: { id, title, price, discountPercentage, thumbnail, category }
  const [items, setItems] = useState([])

  // Load from localStorage whenever the user changes
  useEffect(() => {
    if (!userId) { setItems([]); return }
    try {
      const stored = localStorage.getItem(storageKey(userId))
      setItems(stored ? JSON.parse(stored) : [])
    } catch {
      setItems([])
    }
  }, [userId])

  // Persist to localStorage on every change
  useEffect(() => {
    if (!userId) return
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(items))
    } catch { /* quota exceeded — ignore */ }
  }, [items, userId])

  const isWishlisted = useCallback(
    (productId) => items.some((i) => i.id === productId),
    [items]
  )

  // Add a product — stores only the fields needed for display
  const addToWishlist = useCallback((product) => {
    if (!userId) return
    setItems((prev) => {
      if (prev.some((i) => i.id === product.id)) return prev
      return [
        ...prev,
        {
          id:                 product.id,
          title:              product.title,
          price:              product.price,
          discountPercentage: product.discountPercentage ?? 0,
          thumbnail:          product.thumbnail,
          category:           product.category,
          addedAt:            new Date().toISOString(),
        },
      ]
    })
  }, [userId])

  const removeFromWishlist = useCallback((productId) => {
    if (!userId) return
    setItems((prev) => prev.filter((i) => i.id !== productId))
  }, [userId])

  const toggleWishlist = useCallback((product) => {
    if (!userId) return false   // caller can redirect to login
    const already = items.some((i) => i.id === product.id)
    if (already) removeFromWishlist(product.id)
    else addToWishlist(product)
    return !already
  }, [userId, items, addToWishlist, removeFromWishlist])

  const clearWishlist = useCallback(() => {
    if (!userId) return
    setItems([])
  }, [userId])

  return (
    <WishlistContext.Provider value={{
      items,
      isWishlisted,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      clearWishlist,
      count: items.length,
    }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used inside WishlistProvider')
  return ctx
}
