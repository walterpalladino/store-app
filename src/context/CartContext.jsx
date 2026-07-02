import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from './AuthContext'
import cartService from '../services/cartService'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  // Local state mirrors the service so React re-renders on every change
  const [items, setItems] = useState([])

  // Sync when the logged-in user changes (login / logout / switch)
  useEffect(() => {
    if (userId) {
      setItems(cartService.getItems(userId))
    } else {
      setItems([])
    }
  }, [userId])

  // ── Mutators — each calls the service then syncs state ──────────────────

  const addItem = useCallback(
    (product, quantity = 1) => {
      if (!userId) return
      setItems(cartService.addItem(userId, product, quantity))
    },
    [userId]
  )

  const setQuantity = useCallback(
    (productId, quantity) => {
      if (!userId) return
      setItems(cartService.setQuantity(userId, productId, quantity))
    },
    [userId]
  )

  const removeItem = useCallback(
    (productId) => {
      if (!userId) return
      setItems(cartService.removeItem(userId, productId))
    },
    [userId]
  )

  const clearCart = useCallback(() => {
    if (!userId) return
    setItems(cartService.clearCart(userId))
  }, [userId])

  // ── Derived values ───────────────────────────────────────────────────────

  const totalQuantity = items.reduce((s, i) => s + i.quantity, 0)

  const subtotal = items.reduce((s, i) => {
    const unit = i.product.price * (1 - (i.product.discountPercentage ?? 0) / 100)
    return s + unit * i.quantity
  }, 0)

  const isInCart = useCallback(
    (productId) => items.some((i) => i.product.id === productId),
    [items]
  )

  const getQuantity = useCallback(
    (productId) => items.find((i) => i.product.id === productId)?.quantity ?? 0,
    [items]
  )

  const value = {
    items,
    totalQuantity,
    subtotal,
    isInCart,
    getQuantity,
    addItem,
    setQuantity,
    removeItem,
    clearCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
