import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import instrumentFetch from '../utils/instrumentFetch'

// jsdom under vitest resolves the log level to "debug" (dev), so logger.debug
// prints. This proves an actual fetch call produces a console line.

describe('instrumentFetch', () => {
  let logSpy
  let realFetch

  beforeEach(() => {
    realFetch = window.fetch
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterEach(() => {
    window.fetch = realFetch
    vi.restoreAllMocks()
  })

  it('logs a backend call (request + response) to the console', async () => {
    window.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    instrumentFetch()

    await fetch('http://localhost:3000/api/orders')

    const lines = logSpy.mock.calls.map((c) => c.join(' '))
    expect(lines.some((l) => l.includes('[DEBUG]') && l.includes('→ GET') && l.includes('/api/orders'))).toBe(true)
    expect(lines.some((l) => l.includes('[DEBUG]') && l.includes('← 200') && l.includes('/api/orders'))).toBe(true)
  })
})
