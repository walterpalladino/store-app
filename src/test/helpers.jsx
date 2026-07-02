import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { vi } from 'vitest'
import theme from '../theme/theme'

// ── Render helpers ─────────────────────────────────────────────────────────

/**
 * Render a component inside MemoryRouter + MUI ThemeProvider.
 * Most component tests need at least one of these.
 */
export function renderWithProviders(ui, { route = '/', ...options } = {}) {
  function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </MemoryRouter>
    )
  }
  return render(ui, { wrapper: Wrapper, ...options })
}

// ── Mock factories ─────────────────────────────────────────────────────────

export function makeProduct(overrides = {}) {
  return {
    id:                 1,
    title:              'Test Product',
    description:        'A test product description',
    category:           'electronics',
    price:              99.99,
    discountPercentage: 10,
    rating:             4.5,
    stock:              50,
    sku:                'TEST-001',
    thumbnail:          'https://example.com/thumb.jpg',
    images:             ['https://example.com/img1.jpg'],
    brand:              'TestBrand',
    weight:             200,
    availabilityStatus: 'In Stock',
    warrantyInformation: '1 year warranty',
    returnPolicy:       '30 days',
    minimumOrderQuantity: 1,
    reviews:            [],
    ...overrides,
  }
}

export function makeUser(overrides = {}) {
  return {
    id:        1,
    firstName: 'Emily',
    lastName:  'Johnson',
    username:  'emilys',
    email:     'emily@test.com',
    phone:     '+1 555-0100',
    image:     '',
    role:      'user',
    address: {
      address:    '123 Main St',
      city:       'Phoenix',
      state:      'AZ',
      postalCode: '85001',
      country:    'United States',
    },
    ...overrides,
  }
}

export function makeTransaction(overrides = {}) {
  return {
    id:              1,
    userId:          1,
    total:           99.99,
    discountedTotal: 89.99,
    totalProducts:   1,
    totalQuantity:   2,
    status:          'Delivered',
    products: [
      {
        id:                 1,
        sku:                'TEST-001',
        title:              'Test Product',
        price:              49.99,
        quantity:           2,
        total:              99.98,
        discountPercentage: 10,
        discountedTotal:    89.98,
      },
    ],
    payment: { cardType: 'Visa', cardNumber: '4111111111111111', currency: 'USD' },
    address: { address: '123 Main St', city: 'Phoenix', state: 'AZ', postalCode: '85001', country: 'United States' },
    ...overrides,
  }
}

// ── Envelope helpers ───────────────────────────────────────────────────────

/** Wrap data in the API success envelope */
export const okEnvelope   = (data)    => ({ success: true,  data })

/** Wrap an error in the API error envelope */
export const errEnvelope  = (message, code = 'VALIDATION_ERROR') =>
  ({ success: false, error: { code, message } })

/** Create a mock fetch Response with a JSON body */
export function mockJsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** vi.fn() that resolves to a success envelope Response */
export const fetchOk  = (data)    => vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(data)))
export const fetchErr = (message, status = 422) =>
  vi.fn().mockResolvedValue(mockJsonResponse(errEnvelope(message), status))
