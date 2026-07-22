import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  IMAGE_TYPES, fetchProductImages, uploadProductImage, deleteProductImage,
} from '../services/productImageService'
import { okEnvelope, errEnvelope, mockJsonResponse } from './helpers.jsx'

const IMG = {
  id: 10, productId: 1, url: 'https://cdn.example.com/products/SKU/uuid.webp',
  imageType: 'PRIMARY', altText: 'Front', sortOrder: 0,
}

beforeEach(() => { vi.restoreAllMocks() })
afterEach(() => { vi.restoreAllMocks() })

describe('productImageService — fetchProductImages', () => {
  it('unwraps { images } and returns the array', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope({ images: [IMG] })))
    const images = await fetchProductImages(1)
    expect(images).toHaveLength(1)
    expect(images[0].id).toBe(10)
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/api/products/1/images')
  })

  it('returns an empty array on 404 (product not found)', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockJsonResponse(errEnvelope('Not found'), 404))
    expect(await fetchProductImages(999)).toEqual([])
  })

  it('throws the API message on other errors', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockJsonResponse(errEnvelope('boom'), 500))
    await expect(fetchProductImages(1)).rejects.toThrow('boom')
  })
})

describe('productImageService — uploadProductImage', () => {
  it('POSTs multipart FormData with the file, altText and type', async () => {
    const authFetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(IMG), 201))
    const file = new File(['x'], 'photo.png', { type: 'image/png' })

    const created = await uploadProductImage(authFetch, 1, { file, altText: 'Front', imageType: 'primary' })

    expect(created.id).toBe(10)
    const [url, opts] = authFetch.mock.calls[0]
    expect(url).toBe('http://localhost:3000/api/products/1/images')
    expect(opts.method).toBe('POST')
    expect(opts.body).toBeInstanceOf(FormData)
    expect(opts.body.get('altText')).toBe('Front')
    expect(opts.body.get('imageType')).toBe('PRIMARY')   // upper-cased
    expect(opts.body.get('image')).toBeInstanceOf(File)
  })

  it('rejects when no file is given', async () => {
    const authFetch = vi.fn()
    await expect(uploadProductImage(authFetch, 1, {})).rejects.toThrow(/choose an image/i)
    expect(authFetch).not.toHaveBeenCalled()
  })

  it('surfaces a 413 (too large) with a friendly fallback', async () => {
    const authFetch = vi.fn().mockResolvedValue(mockJsonResponse({}, 413))
    const file = new File(['x'], 'big.png', { type: 'image/png' })
    await expect(uploadProductImage(authFetch, 1, { file })).rejects.toThrow(/too large/i)
  })

  it('omits optional parts when not provided', async () => {
    const authFetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(IMG), 201))
    const file = new File(['x'], 'photo.png', { type: 'image/png' })
    await uploadProductImage(authFetch, 1, { file })
    const body = authFetch.mock.calls[0][1].body
    expect(body.get('altText')).toBeNull()
    expect(body.get('imageType')).toBeNull()
  })
})

describe('productImageService — deleteProductImage', () => {
  it('DELETEs and returns the deleted image', async () => {
    const authFetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(IMG)))
    const deleted = await deleteProductImage(authFetch, 1, 10)
    expect(deleted.id).toBe(10)
    const [url, opts] = authFetch.mock.calls[0]
    expect(url).toBe('http://localhost:3000/api/products/1/images/10')
    expect(opts.method).toBe('DELETE')
  })

  it('returns null on 404', async () => {
    const authFetch = vi.fn().mockResolvedValue(mockJsonResponse(errEnvelope('gone'), 404))
    expect(await deleteProductImage(authFetch, 1, 10)).toBeNull()
  })
})

describe('productImageService — IMAGE_TYPES', () => {
  it('exposes the three slots', () => {
    expect(IMAGE_TYPES).toEqual(['PRIMARY', 'THUMBNAIL', 'OTHER'])
  })
})
