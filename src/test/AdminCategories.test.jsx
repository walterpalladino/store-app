import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { okEnvelope, errEnvelope, mockJsonResponse } from './helpers.jsx'

// Mock the merchant auth context so we can inject a controllable merchantFetch.
vi.mock('../context/MerchantAuthContext', () => ({ useMerchantAuth: vi.fn() }))
import { useMerchantAuth } from '../context/MerchantAuthContext'
import AdminCategories from '../pages/admin/AdminCategories'
import API from '../config/api'

afterEach(() => { vi.restoreAllMocks() })

function mockList(cats) {
  global.fetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(cats)))
}

describe('AdminCategories', () => {
  it('renders the category list from GET /api/products/categories', async () => {
    useMerchantAuth.mockReturnValue({ merchantFetch: vi.fn() })
    mockList([
      { slug: 'beauty', name: 'Beauty', url: '/api/products/category/beauty' },
      { slug: 'groceries', name: 'Groceries', url: '/api/products/category/groceries' },
    ])

    render(<AdminCategories />)

    expect(await screen.findByText('Beauty')).toBeInTheDocument()
    expect(screen.getByText('Groceries')).toBeInTheDocument()
    // slug chip rendered too
    expect(screen.getByText('beauty')).toBeInTheDocument()
  })

  it('shows an error with a retry when the list fails to load', async () => {
    useMerchantAuth.mockReturnValue({ merchantFetch: vi.fn() })
    global.fetch = vi.fn().mockResolvedValue(mockJsonResponse(errEnvelope('Server error'), 500))

    render(<AdminCategories />)

    expect(await screen.findByText('Server error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('creates a category via an authenticated POST and lists it', async () => {
    const merchantFetch = vi.fn().mockResolvedValue(
      mockJsonResponse(okEnvelope({ slug: 'home-decoration', name: 'Home Decoration' }), 201)
    )
    useMerchantAuth.mockReturnValue({ merchantFetch })
    mockList([])

    render(<AdminCategories />)
    await waitFor(() => expect(screen.getByText(/No categories yet/i)).toBeInTheDocument())

    // Open the Add drawer, fill the name (slug auto-derives), and submit.
    fireEvent.click(screen.getByRole('button', { name: /add new category/i }))
    fireEvent.change(screen.getByLabelText('Display Name'), { target: { value: 'Home Decoration' } })
    fireEvent.click(screen.getByRole('button', { name: /create category/i }))

    await waitFor(() => expect(merchantFetch).toHaveBeenCalledOnce())
    const [url, opts] = merchantFetch.mock.calls[0]
    expect(url).toBe(API.products.categories)
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body)).toMatchObject({ slug: 'home-decoration', name: 'Home Decoration' })

    // New category appears in the table.
    expect(await screen.findByText('Home Decoration')).toBeInTheDocument()
  })

  it('surfaces a server error (e.g. duplicate slug) in the form', async () => {
    const merchantFetch = vi.fn().mockResolvedValue(
      mockJsonResponse(errEnvelope('A category with that slug already exists', 'CONFLICT'), 409)
    )
    useMerchantAuth.mockReturnValue({ merchantFetch })
    mockList([])

    render(<AdminCategories />)
    await waitFor(() => expect(screen.getByText(/No categories yet/i)).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /add new category/i }))
    fireEvent.change(screen.getByLabelText('Slug *'), { target: { value: 'beauty' } })
    fireEvent.click(screen.getByRole('button', { name: /create category/i }))

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument()
  })

  it('updates an existing category via PATCH to its slug', async () => {
    const merchantFetch = vi.fn().mockResolvedValue(
      mockJsonResponse(okEnvelope({ slug: 'beauty', name: 'Beauty & Care' }))
    )
    useMerchantAuth.mockReturnValue({ merchantFetch })
    mockList([{ slug: 'beauty', name: 'Beauty', url: '/x' }])

    render(<AdminCategories />)
    await screen.findByText('Beauty')

    // Open the row for editing and change the display name.
    fireEvent.click(screen.getByRole('button', { name: /edit category/i }))
    fireEvent.change(screen.getByLabelText('Display Name'), { target: { value: 'Beauty & Care' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(merchantFetch).toHaveBeenCalledOnce())
    const [url, opts] = merchantFetch.mock.calls[0]
    expect(url).toBe(API.products.categoryBySlug('beauty'))
    expect(opts.method).toBe('PATCH')
    expect(await screen.findByText('Beauty & Care')).toBeInTheDocument()
  })
})
