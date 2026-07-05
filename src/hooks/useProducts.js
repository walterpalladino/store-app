import API from '../config/api'
import { unwrap } from '../utils/apiUtils'
import { productFromCents } from '../utils/money'
import logger from '../utils/logger'
import { useState, useEffect, useCallback } from 'react'

export function useProducts(filters) {
  const [products, setProducts] = useState([])
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { category, search, minPrice, maxPrice, page, limit } = filters
      const skip = (page - 1) * limit

      let url
      if (search) {
        url = `${API.products.search}?q=${encodeURIComponent(search)}&limit=200&skip=0`
      } else if (category && category !== 'all') {
        url = `${API.products.byCategory(category)}?limit=200&skip=0`
      } else {
        url = `${API.products.list}?limit=200&skip=0`
      }

      const res  = await fetch(url)
      // Response: { success, data: { products: [...], total, skip, limit } }
      const data = await unwrap(res)

      // Prices arrive as integer cents — convert to currency units at the edge
      // so the price filter and every downstream page work in decimal dollars.
      const normalized = data.products.map(productFromCents)
      const filtered = normalized.filter(
        (p) => p.price >= minPrice && p.price <= maxPrice
      )

      setTotal(filtered.length)
      setProducts(filtered.slice(skip, skip + limit))
    } catch (err) {
      logger.error('Failed to load products:', err.message ?? err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  return { products, total, loading, error }
}

export function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    // Response: { success, data: [ { slug, name, url }, ... ] }
    fetch(API.products.categories)
      .then((r) => r.json())
      .then((body) => {
        const data = body.success ? body.data : body   // graceful fallback
        setCategories(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch((err) => { logger.error('Failed to load categories:', err.message ?? err); setLoading(false) })
  }, [])

  return { categories, loading }
}

export function useProduct(id) {
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    setLoading(true)
    // Response: { success, data: { ...product } }
    fetch(API.products.byId(id), { signal: controller.signal })
      .then((r) => r.json())
      .then((body) => {
        if (body.success === false) throw new Error(body.error?.message || 'Product not found')
        setProduct(productFromCents(body.data ?? body))   // cents → units; data field or root for compatibility
        setLoading(false)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return   // superseded request (id changed / StrictMode remount) — ignore
        logger.error(`Failed to load product ${id}:`, err.message ?? err)
        setError(err.message)
        setLoading(false)
      })
    // Cancel an in-flight request when the id changes or the component unmounts.
    return () => controller.abort()
  }, [id])

  return { product, loading, error }
}
