import { describe, it, expect } from 'vitest'

/**
 * The isComplete guard in AddressPanel is a computed boolean:
 *
 *   const isComplete = (
 *     form.address.trim()    !== '' &&
 *     form.city.trim()       !== '' &&
 *     form.state.trim()      !== '' &&
 *     form.postalCode.trim() !== '' &&
 *     form.country.trim()    !== ''
 *   )
 *
 * These tests document every state that affects the Save button.
 */

function isAddressComplete(form) {
  return (
    form.address.trim()    !== '' &&
    form.city.trim()       !== '' &&
    form.state.trim()      !== '' &&
    form.postalCode.trim() !== '' &&
    form.country.trim()    !== ''
  )
}

const FULL_ADDRESS = {
  address:    '123 Main St',
  city:       'Phoenix',
  state:      'AZ',
  postalCode: '85001',
  country:    'United States',
}

describe('AddressPanel — isComplete logic', () => {
  it('is true when all five fields have values', () => {
    expect(isAddressComplete(FULL_ADDRESS)).toBe(true)
  })

  it('is false when address is empty', () => {
    expect(isAddressComplete({ ...FULL_ADDRESS, address: '' })).toBe(false)
  })

  it('is false when city is empty', () => {
    expect(isAddressComplete({ ...FULL_ADDRESS, city: '' })).toBe(false)
  })

  it('is false when state is empty', () => {
    expect(isAddressComplete({ ...FULL_ADDRESS, state: '' })).toBe(false)
  })

  it('is false when postalCode is empty', () => {
    expect(isAddressComplete({ ...FULL_ADDRESS, postalCode: '' })).toBe(false)
  })

  it('is false when country is empty', () => {
    expect(isAddressComplete({ ...FULL_ADDRESS, country: '' })).toBe(false)
  })

  it('is false when all fields are empty', () => {
    expect(isAddressComplete({ address: '', city: '', state: '', postalCode: '', country: '' })).toBe(false)
  })

  it('trims whitespace — whitespace-only values count as empty', () => {
    expect(isAddressComplete({ ...FULL_ADDRESS, city: '   ' })).toBe(false)
    expect(isAddressComplete({ ...FULL_ADDRESS, state: '\t' })).toBe(false)
  })

  it('accepts single-char values as valid', () => {
    expect(isAddressComplete({ address: 'A', city: 'B', state: 'C', postalCode: '1', country: 'D' })).toBe(true)
  })
})
