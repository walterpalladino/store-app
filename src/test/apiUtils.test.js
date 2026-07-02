import { describe, it, expect } from 'vitest'
import { unwrap, safeUnwrap, apiFetch, safeApiFetch } from '../utils/apiUtils'
import { mockJsonResponse, okEnvelope, errEnvelope } from './helpers.jsx'

// ── helpers ────────────────────────────────────────────────────────────────
const successResp = (data, status = 200) =>
  mockJsonResponse(okEnvelope(data), status)

const failureResp = (message, status = 422) =>
  mockJsonResponse(errEnvelope(message), status)

const brokenResp = (status = 500) =>
  new Response('not-json', { status, headers: { 'Content-Type': 'text/plain' } })

// ── unwrap ─────────────────────────────────────────────────────────────────
describe('unwrap', () => {
  it('returns data on success:true', async () => {
    const result = await unwrap(successResp({ id: 1, name: 'Alice' }))
    expect(result).toEqual({ id: 1, name: 'Alice' })
  })

  it('throws with server message on success:false', async () => {
    await expect(unwrap(failureResp('Invalid credentials'))).rejects.toThrow(
      'Invalid credentials'
    )
  })

  it('throws generic message when error object has no message', async () => {
    const resp = mockJsonResponse({ success: false, error: {} }, 422)
    await expect(unwrap(resp)).rejects.toThrow('Request failed (422)')
  })

  it('throws when response body is not valid JSON', async () => {
    await expect(unwrap(brokenResp(500))).rejects.toThrow('Server error (500)')
  })

  it('returns data when success field is absent but body.data exists', async () => {
    // Graceful with non-standard responses (success field undefined → not false)
    const resp = mockJsonResponse({ data: { items: [] } })
    const result = await unwrap(resp)
    expect(result).toEqual({ items: [] })
  })

  it('handles nested data payloads', async () => {
    const payload = { products: [{ id: 1 }], total: 1 }
    const result = await unwrap(successResp(payload))
    expect(result.products).toHaveLength(1)
    expect(result.total).toBe(1)
  })
})

// ── safeUnwrap ─────────────────────────────────────────────────────────────
describe('safeUnwrap', () => {
  it('returns { data, error: null } on success', async () => {
    const { data, error } = await safeUnwrap(successResp({ id: 42 }))
    expect(data).toEqual({ id: 42 })
    expect(error).toBeNull()
  })

  it('returns { data: null, error: message } on API error', async () => {
    const { data, error } = await safeUnwrap(failureResp('Not found'))
    expect(data).toBeNull()
    expect(error).toBe('Not found')
  })

  it('returns { data: null, error } on broken JSON', async () => {
    const { data, error } = await safeUnwrap(brokenResp(500))
    expect(data).toBeNull()
    expect(error).toMatch(/Server error/)
  })

  it('never throws', async () => {
    const resp = new Response(null, { status: 503 })
    await expect(safeUnwrap(resp)).resolves.toBeDefined()
  })
})

// ── apiFetch ───────────────────────────────────────────────────────────────
describe('apiFetch', () => {
  it('fetches and returns unwrapped data', async () => {
    global.fetch = vi.fn().mockResolvedValue(successResp({ ok: true }))
    const result = await apiFetch('http://test/api/health')
    expect(result).toEqual({ ok: true })
    expect(fetch).toHaveBeenCalledWith(
      'http://test/api/health',
      expect.objectContaining({ headers: expect.objectContaining({ 'Content-Type': 'application/json' }) })
    )
  })

  it('merges caller headers with default Content-Type', async () => {
    global.fetch = vi.fn().mockResolvedValue(successResp({}))
    await apiFetch('http://test', { headers: { Authorization: 'Bearer tok' } })
    expect(fetch).toHaveBeenCalledWith(
      'http://test',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type':  'application/json',
          Authorization:   'Bearer tok',
        }),
      })
    )
  })

  it('throws on API error response', async () => {
    global.fetch = vi.fn().mockResolvedValue(failureResp('Unauthorized', 401))
    await expect(apiFetch('http://test')).rejects.toThrow('Unauthorized')
  })

  it('throws on network failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(apiFetch('http://test')).rejects.toThrow('Failed to fetch')
  })
})

// ── safeApiFetch ───────────────────────────────────────────────────────────
describe('safeApiFetch', () => {
  it('returns { data, error: null } on success', async () => {
    global.fetch = vi.fn().mockResolvedValue(successResp({ list: [] }))
    const { data, error } = await safeApiFetch('http://test')
    expect(data).toEqual({ list: [] })
    expect(error).toBeNull()
  })

  it('returns { data: null, error } on API failure', async () => {
    global.fetch = vi.fn().mockResolvedValue(failureResp('Not found', 404))
    const { data, error } = await safeApiFetch('http://test')
    expect(data).toBeNull()
    expect(error).toBe('Not found')
  })

  it('returns { data: null, error } on network failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network down'))
    const { data, error } = await safeApiFetch('http://test')
    expect(data).toBeNull()
    expect(error).toBe('Network down')
  })

  it('never throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('boom'))
    await expect(safeApiFetch('http://test')).resolves.toHaveProperty('error')
  })
})
