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

// ── PaymentMethodsPanel isComplete logic ──────────────────────────────────
function isPaymentComplete(form) {
  return (
    form.cardNumber.replace(/\D/g, '').length >= 13 &&
    form.cardType.trim() !== '' &&
    /^\d{2}\/\d{2}$/.test(form.cardExpire)
  )
}

const FULL_CARD = {
  cardNumber: '4111 1111 1111 1111',   // 16 digits with spaces
  cardType:   'Visa',
  cardExpire: '01/30',
}

describe('PaymentMethodsPanel — isComplete logic', () => {
  it('is true when all three fields are valid', () => {
    expect(isPaymentComplete(FULL_CARD)).toBe(true)
  })

  it('is false when cardNumber has fewer than 13 digits', () => {
    expect(isPaymentComplete({ ...FULL_CARD, cardNumber: '1234 5678' })).toBe(false)
  })

  it('is true with exactly 13 digits (Amex short)', () => {
    expect(isPaymentComplete({ ...FULL_CARD, cardNumber: '1234567890123' })).toBe(true)
  })

  it('ignores spaces when counting card number digits', () => {
    // "4111 1111 1111 111" = 15 digits — still valid
    expect(isPaymentComplete({ ...FULL_CARD, cardNumber: '4111 1111 1111 111' })).toBe(true)
  })

  it('is false when cardNumber is empty', () => {
    expect(isPaymentComplete({ ...FULL_CARD, cardNumber: '' })).toBe(false)
  })

  it('is false when cardType is not selected', () => {
    expect(isPaymentComplete({ ...FULL_CARD, cardType: '' })).toBe(false)
  })

  it('is false when cardType is whitespace only', () => {
    expect(isPaymentComplete({ ...FULL_CARD, cardType: '   ' })).toBe(false)
  })

  it('is false when cardExpire does not match MM/YY', () => {
    expect(isPaymentComplete({ ...FULL_CARD, cardExpire: '1/30' })).toBe(false)
    expect(isPaymentComplete({ ...FULL_CARD, cardExpire: '01/2030' })).toBe(false)
    expect(isPaymentComplete({ ...FULL_CARD, cardExpire: 'MM/YY' })).toBe(false)
    expect(isPaymentComplete({ ...FULL_CARD, cardExpire: '' })).toBe(false)
  })

  it('is true for valid MM/YY values', () => {
    expect(isPaymentComplete({ ...FULL_CARD, cardExpire: '12/99' })).toBe(true)
    expect(isPaymentComplete({ ...FULL_CARD, cardExpire: '01/25' })).toBe(true)
  })
})
