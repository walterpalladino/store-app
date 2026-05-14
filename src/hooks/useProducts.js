import API from '../config/api'

import { useState, useEffect, useCallback } from 'react'

export function useProducts(filters) {
  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let url
      const { category, search, minPrice, maxPrice, page, limit } = filters
      const skip = (page - 1) * limit

      if (search) {
        url = `${API.products.search}?q=${encodeURIComponent(search)}&limit=200&skip=0`
      } else if (category && category !== 'all') {
        url = `${API.products.byCategory(category)}?limit=200&skip=0`
      } else {
        url = `${API.products.list}?limit=200&skip=0`
      }

      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch products')
      const data = await res.json()

      // Client-side price filtering
      let filtered = data.products.filter(
        (p) => p.price >= minPrice && p.price <= maxPrice
      )

      setTotal(filtered.length)
      // Client-side pagination after filtering
      setProducts(filtered.slice(skip, skip + limit))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  return { products, total, loading, error }
}

export function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(API.products.categories)
      .then((r) => r.json())
      .then((data) => {
        setCategories(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return { categories, loading }
}

export function useProduct(id) {
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(API.products.byId(id))
      .then((r) => {
        if (!r.ok) throw new Error('Product not found')
        return r.json()
      })
      .then((data) => {
        setProduct(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [id])

  return { product, loading, error }
}
