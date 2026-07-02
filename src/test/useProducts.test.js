import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useProducts, useCategories, useProduct } from '../hooks/useProducts'
import { okEnvelope, errEnvelope, makeProduct } from './helpers.jsx'

// ── helpers ────────────────────────────────────────────────────────────────
function makeProductsResponse(products = [], total = null) {
  return { products, total: total ?? products.length, skip: 0, limit: 30 }
}

function mockFetch(body, status = 200) {
  global.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  )
}

afterEach(() => { vi.restoreAllMocks() })

// ── useProducts ────────────────────────────────────────────────────────────
describe('useProducts', () => {
  const baseFilters = {
    category: 'all', search: '', minPrice: 0, maxPrice: 2000, page: 1, limit: 12,
  }

  it('starts in loading state', () => {
    mockFetch(okEnvelope(makeProductsResponse()))
    const { result } = renderHook(() => useProducts(baseFilters))
    expect(result.current.loading).toBe(true)
  })

  it('returns products and total on success', async () => {
    const products = [makeProduct({ id: 1, price: 10 }), makeProduct({ id: 2, price: 20 })]
    mockFetch(okEnvelope(makeProductsResponse(products, 2)))

    const { result } = renderHook(() => useProducts(baseFilters))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.products).toHaveLength(2)
    expect(result.current.total).toBe(2)
    expect(result.current.error).toBeNull()
  })

  it('filters products by price range client-side', async () => {
    const products = [
      makeProduct({ id: 1, price: 5 }),
      makeProduct({ id: 2, price: 50 }),
      makeProduct({ id: 3, price: 500 }),
    ]
    mockFetch(okEnvelope(makeProductsResponse(products, 3)))

    const filters = { ...baseFilters, minPrice: 10, maxPrice: 100 }
    const { result } = renderHook(() => useProducts(filters))
    await waitFor(() => expect(result.current.loading).toBe(false))

    // Only product id:2 (price:50) falls in 10–100 range
    expect(result.current.products).toHaveLength(1)
    expect(result.current.products[0].id).toBe(2)
    expect(result.current.total).toBe(1)
  })

  it('uses search endpoint when search is provided', async () => {
    mockFetch(okEnvelope(makeProductsResponse()))
    const filters = { ...baseFilters, search: 'laptop' }
    renderHook(() => useProducts(filters))
    await waitFor(() => expect(fetch).toHaveBeenCalled())

    const [url] = fetch.mock.calls[0]
    expect(url).toContain('/search')
    expect(url).toContain('q=laptop')
  })

  it('uses category endpoint when category is set', async () => {
    mockFetch(okEnvelope(makeProductsResponse()))
    const filters = { ...baseFilters, category: 'smartphones' }
    renderHook(() => useProducts(filters))
    await waitFor(() => expect(fetch).toHaveBeenCalled())

    const [url] = fetch.mock.calls[0]
    expect(url).toContain('/category/smartphones')
  })

  it('uses list endpoint when no search or category', async () => {
    mockFetch(okEnvelope(makeProductsResponse()))
    renderHook(() => useProducts(baseFilters))
    await waitFor(() => expect(fetch).toHaveBeenCalled())

    const [url] = fetch.mock.calls[0]
    expect(url).toContain('/products?')
    expect(url).not.toContain('/search')
    expect(url).not.toContain('/category/')
  })

  it('sets error state on API failure', async () => {
    mockFetch(errEnvelope('Server error'), 500)
    const { result } = renderHook(() => useProducts(baseFilters))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('Server error')
    expect(result.current.products).toEqual([])
  })

  it('paginates results client-side', async () => {
    // 15 products, page 2 of 5 per page
    const products = Array.from({ length: 15 }, (_, i) =>
      makeProduct({ id: i + 1, price: 10 })
    )
    mockFetch(okEnvelope(makeProductsResponse(products, 15)))

    const filters = { ...baseFilters, page: 2, limit: 5 }
    const { result } = renderHook(() => useProducts(filters))
    await waitFor(() => expect(result.current.loading).toBe(false))

    // page 2 of 5 = items 5–9 (indices 5-9)
    expect(result.current.products).toHaveLength(5)
    expect(result.current.products[0].id).toBe(6)
  })
})

// ── useCategories ──────────────────────────────────────────────────────────
describe('useCategories', () => {
  it('starts loading', () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}))
    const { result } = renderHook(() => useCategories())
    expect(result.current.loading).toBe(true)
  })

  it('returns categories array on success (object format)', async () => {
    const cats = [
      { slug: 'beauty',      name: 'Beauty',      url: 'http://...' },
      { slug: 'electronics', name: 'Electronics', url: 'http://...' },
    ]
    mockFetch(okEnvelope(cats))

    const { result } = renderHook(() => useCategories())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.categories).toHaveLength(2)
    expect(result.current.categories[0].slug).toBe('beauty')
  })

  it('returns categories array on success (string format)', async () => {
    mockFetch(okEnvelope(['beauty', 'electronics', 'furniture']))

    const { result } = renderHook(() => useCategories())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.categories).toHaveLength(3)
  })

  it('returns empty array on fetch failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network'))
    const { result } = renderHook(() => useCategories())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.categories).toEqual([])
  })
})

// ── useProduct ─────────────────────────────────────────────────────────────
describe('useProduct', () => {
  it('starts loading when id is provided', () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}))
    const { result } = renderHook(() => useProduct(1))
    expect(result.current.loading).toBe(true)
  })

  it('returns product on success', async () => {
    const product = makeProduct({ id: 42, title: 'Special Item' })
    mockFetch(okEnvelope(product))

    const { result } = renderHook(() => useProduct(42))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.product).toMatchObject({ id: 42, title: 'Special Item' })
    expect(result.current.error).toBeNull()
  })

  it('calls the correct URL with the product id', async () => {
    mockFetch(okEnvelope(makeProduct()))
    renderHook(() => useProduct(99))
    await waitFor(() => expect(fetch).toHaveBeenCalled())

    const [url] = fetch.mock.calls[0]
    expect(url).toContain('/products/99')
  })

  it('sets error on API failure', async () => {
    mockFetch(errEnvelope('Product not found'), 404)
    const { result } = renderHook(() => useProduct(9999))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('Product not found')
    expect(result.current.product).toBeNull()
  })

  it('does nothing when id is undefined', () => {
    global.fetch = vi.fn()
    renderHook(() => useProduct(undefined))
    expect(fetch).not.toHaveBeenCalled()
  })
})
