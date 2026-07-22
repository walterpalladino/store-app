import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// We test the URL construction by importing after setting the env variable.
// Vite inlines import.meta.env at build time, so in tests we stub it via vi.stubEnv.

describe('API config', () => {
  let API

  beforeEach(async () => {
    vi.stubEnv('VITE_API_BASE', 'http://localhost:3000')
    // Dynamic import so each test can control the env
    const mod = await import('../config/api.js?t=' + Date.now())
    API = mod.default
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  // ── Auth ─────────────────────────────────────────────────────────────────
  describe('auth endpoints', () => {
    it('builds login URL',          () => expect(API.auth.login).toBe('http://localhost:3000/api/auth/login'))
    it('builds refresh URL',        () => expect(API.auth.refresh).toBe('http://localhost:3000/api/auth/refresh'))
    it('builds me URL',             () => expect(API.auth.me).toBe('http://localhost:3000/api/auth/me'))
    it('builds passwordChange URL', () => expect(API.auth.passwordChange).toBe('http://localhost:3000/api/auth/password-change'))
  })

  // ── Users ─────────────────────────────────────────────────────────────────
  describe('users endpoints', () => {
    it('builds add URL',        () => expect(API.users.add).toBe('http://localhost:3000/api/users'))
    it('builds byId URL',       () => expect(API.users.byId(42)).toBe('http://localhost:3000/api/users/42'))
    it('coerces numeric id',    () => expect(API.users.byId(1)).toContain('/1'))
    it('builds cart URL',       () => expect(API.users.cart(10)).toBe('http://localhost:3000/api/users/10/cart'))
    it('builds wishlist URL',   () => expect(API.users.wishlist(10)).toBe('http://localhost:3000/api/users/10/wishlist'))
  })

  // ── Products ──────────────────────────────────────────────────────────────
  describe('products endpoints', () => {
    it('builds list URL',         () => expect(API.products.list).toBe('http://localhost:3000/api/products'))
    it('builds search URL',       () => expect(API.products.search).toBe('http://localhost:3000/api/products/search'))
    it('builds add URL',          () => expect(API.products.add).toBe('http://localhost:3000/api/products'))
    it('builds byId URL',         () => expect(API.products.byId(7)).toBe('http://localhost:3000/api/products/7'))
    it('builds bySku URL',        () => expect(API.products.bySku('BMW-PNC-001')).toBe('http://localhost:3000/api/products/sku/BMW-PNC-001'))
    it('encodes special chars in bySku', () => expect(API.products.bySku('a b')).toContain('a%20b'))
    it('builds categories URL',   () => expect(API.products.categories).toBe('http://localhost:3000/api/products/categories'))
    it('builds categoryBySlug URL', () => expect(API.products.categoryBySlug('home-decoration')).toBe('http://localhost:3000/api/products/categories/home-decoration'))
    it('encodes special chars in categoryBySlug', () => expect(API.products.categoryBySlug('a b')).toContain('a%20b'))
    it('builds categoryList URL', () => expect(API.products.categoryList).toBe('http://localhost:3000/api/products/category-list'))

    it('encodes special chars in category slug', () => {
      expect(API.products.byCategory('smart phones')).toContain('smart%20phones')
    })

    it('builds byCategory URL', () => {
      expect(API.products.byCategory('beauty')).toBe(
        'http://localhost:3000/api/products/category/beauty'
      )
    })

    it('builds images list URL', () => {
      expect(API.products.images(7)).toBe('http://localhost:3000/api/products/7/images')
    })

    it('builds image-by-id URL', () => {
      expect(API.products.imageById(7, 10)).toBe('http://localhost:3000/api/products/7/images/10')
    })
  })

  // ── Images / media ──────────────────────────────────────────────────────────
  describe('media config + resolveImageUrl', () => {
    it('returns absolute URLs unchanged', async () => {
      const { resolveImageUrl } = await import('../config/api.js?t=' + Date.now() + 'media')
      expect(resolveImageUrl('https://cdn.example.com/a.webp')).toBe('https://cdn.example.com/a.webp')
    })

    it('leaves protocol-relative URLs unchanged', async () => {
      const { resolveImageUrl } = await import('../config/api.js?t=' + Date.now() + 'proto')
      expect(resolveImageUrl('//cdn.example.com/a.webp')).toBe('//cdn.example.com/a.webp')
    })

    it('prefixes a relative path with the API base when no image base is set', async () => {
      const { resolveImageUrl } = await import('../config/api.js?t=' + Date.now() + 'rel')
      expect(resolveImageUrl('products/SKU/a.webp')).toBe('http://localhost:3000/products/SKU/a.webp')
    })

    it('prefixes with VITE_IMAGE_BASE_URL when provided', async () => {
      vi.stubEnv('VITE_IMAGE_BASE_URL', 'https://media.example.com/')
      vi.resetModules()
      const { resolveImageUrl } = await import('../config/api.js?t=' + Date.now() + 'imgbase')
      expect(resolveImageUrl('/products/SKU/a.webp')).toBe('https://media.example.com/products/SKU/a.webp')
    })

    it('returns empty string for a falsy URL', async () => {
      const { resolveImageUrl } = await import('../config/api.js?t=' + Date.now() + 'empty')
      expect(resolveImageUrl('')).toBe('')
      expect(resolveImageUrl(undefined)).toBe('')
    })

    it('rewrites a backend-origin URL to a same-origin relative path in dev (for the proxy)', async () => {
      // import.meta.env.DEV is true under vitest, matching the dev runtime.
      const { resolveImageUrl } = await import('../config/api.js?t=' + Date.now() + 'proxy')
      expect(resolveImageUrl('http://localhost:3000/media/products/SKU/uuid.webp'))
        .toBe('/media/products/SKU/uuid.webp')
    })

    it('parses the allowed-origins list', async () => {
      vi.stubEnv('VITE_IMAGE_ALLOWED_ORIGINS', 'http://localhost:3000, https://cdn.example.com/ ')
      vi.resetModules()
      const mod = await import('../config/api.js?t=' + Date.now() + 'origins')
      expect(mod.default.media.allowedOrigins).toEqual(['http://localhost:3000', 'https://cdn.example.com'])
    })
  })

  // ── Orders (read-only) ─────────────────────────────────────────────────────
  describe('orders endpoints', () => {
    it('builds list URL', () => expect(API.orders.list).toBe('http://localhost:3000/api/orders'))
    it('builds byId URL', () => expect(API.orders.byId(5)).toBe('http://localhost:3000/api/orders/5'))
    it('has no create URL (orders are read-only)', () => expect(API.orders.create).toBeUndefined())
  })

  // ── Checkout ───────────────────────────────────────────────────────────────
  describe('checkout endpoint', () => {
    it('builds checkout URL', () => expect(API.checkout).toBe('http://localhost:3000/api/checkout'))
  })

  // ── Base URL handling ──────────────────────────────────────────────────────
  describe('trailing slash handling', () => {
    it('strips trailing slash from base URL', async () => {
      vi.stubEnv('VITE_API_BASE', 'http://localhost:3000/')
      vi.resetModules()
      const mod = await import('../config/api.js?t=' + Date.now() + 'b')
      expect(mod.default.auth.login).toBe('http://localhost:3000/api/auth/login')
    })
  })
})
