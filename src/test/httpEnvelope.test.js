import { describe, it, expect } from 'vitest'
import { readError, readData } from '../services/httpEnvelope'

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('httpEnvelope.readError', () => {
  it('reads the flat { message } shape', async () => {
    expect(await readError(json({ message: 'Nope' }, 400))).toBe('Nope')
  })

  it('reads the { error: { message } } shape', async () => {
    expect(await readError(json({ error: { message: 'Rate limited' } }, 429))).toBe('Rate limited')
  })

  it('falls back to a status message when there is no message', async () => {
    expect(await readError(json({}, 500))).toBe('Request failed (500)')
  })

  it('falls back to a status message when the body is not JSON', async () => {
    const res = new Response('boom', { status: 502, headers: { 'Content-Type': 'text/plain' } })
    expect(await readError(res)).toBe('Request failed (502)')
  })
})

describe('httpEnvelope.readData', () => {
  it('unwraps the { success, data } envelope', async () => {
    expect(await readData(json({ success: true, data: { id: 1 } }))).toEqual({ id: 1 })
  })

  it('returns the raw body when there is no data field', async () => {
    expect(await readData(json({ id: 2 }))).toEqual({ id: 2 })
  })
})
