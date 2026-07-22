import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { okEnvelope, errEnvelope, mockJsonResponse } from './helpers.jsx'

// Mock the merchant auth context so we can inject a controllable merchantFetch.
vi.mock('../context/MerchantAuthContext', () => ({ useMerchantAuth: vi.fn() }))
import { useMerchantAuth } from '../context/MerchantAuthContext'
import AdminTags from '../pages/admin/AdminTags'
import API from '../config/api'

afterEach(() => { vi.restoreAllMocks() })

function mockList(tags) {
  global.fetch = vi.fn().mockResolvedValue(mockJsonResponse(okEnvelope(tags)))
}

describe('AdminTags', () => {
  it('renders the tag list from GET /api/tags', async () => {
    useMerchantAuth.mockReturnValue({ merchantFetch: vi.fn() })
    mockList([{ id: 1, name: 'beauty' }, { id: 2, name: 'mascara' }])

    render(<AdminTags />)

    expect(await screen.findByText('beauty')).toBeInTheDocument()
    expect(screen.getByText('mascara')).toBeInTheDocument()
  })

  it('shows an error with a retry when the list fails to load', async () => {
    useMerchantAuth.mockReturnValue({ merchantFetch: vi.fn() })
    global.fetch = vi.fn().mockResolvedValue(mockJsonResponse(errEnvelope('Server error'), 500))

    render(<AdminTags />)

    expect(await screen.findByText('Server error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('creates a tag via an authenticated POST and lists it', async () => {
    const merchantFetch = vi.fn().mockResolvedValue(
      mockJsonResponse(okEnvelope({ id: 3, name: 'waterproof' }), 201)
    )
    useMerchantAuth.mockReturnValue({ merchantFetch })
    mockList([])

    render(<AdminTags />)
    await waitFor(() => expect(screen.getByText(/No tags yet/i)).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /add new tag/i }))
    fireEvent.change(screen.getByLabelText('Tag Name *'), { target: { value: 'waterproof' } })
    fireEvent.click(screen.getByRole('button', { name: /create tag/i }))

    await waitFor(() => expect(merchantFetch).toHaveBeenCalledOnce())
    const [url, opts] = merchantFetch.mock.calls[0]
    expect(url).toBe(API.tags.list)
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body)).toEqual({ name: 'waterproof' })

    expect(await screen.findByText('waterproof')).toBeInTheDocument()
  })

  it('surfaces a server error (e.g. duplicate name) in the form', async () => {
    const merchantFetch = vi.fn().mockResolvedValue(
      mockJsonResponse(errEnvelope('A tag with that name already exists', 'CONFLICT'), 409)
    )
    useMerchantAuth.mockReturnValue({ merchantFetch })
    mockList([])

    render(<AdminTags />)
    await waitFor(() => expect(screen.getByText(/No tags yet/i)).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /add new tag/i }))
    fireEvent.change(screen.getByLabelText('Tag Name *'), { target: { value: 'beauty' } })
    fireEvent.click(screen.getByRole('button', { name: /create tag/i }))

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument()
  })

  it('does not submit when the name is blank', async () => {
    const merchantFetch = vi.fn()
    useMerchantAuth.mockReturnValue({ merchantFetch })
    mockList([])

    render(<AdminTags />)
    await waitFor(() => expect(screen.getByText(/No tags yet/i)).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /add new tag/i }))
    fireEvent.click(screen.getByRole('button', { name: /create tag/i }))

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument()
    expect(merchantFetch).not.toHaveBeenCalled()
  })

  it('updates an existing tag via PATCH to its id', async () => {
    const merchantFetch = vi.fn().mockResolvedValue(
      mockJsonResponse(okEnvelope({ id: 1, name: 'cosmetics' }))
    )
    useMerchantAuth.mockReturnValue({ merchantFetch })
    mockList([{ id: 1, name: 'beauty' }])

    render(<AdminTags />)
    await screen.findByText('beauty')

    fireEvent.click(screen.getByRole('button', { name: /edit tag/i }))
    fireEvent.change(screen.getByLabelText('Tag Name *'), { target: { value: 'cosmetics' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(merchantFetch).toHaveBeenCalledOnce())
    const [url, opts] = merchantFetch.mock.calls[0]
    expect(url).toBe(API.tags.byId(1))
    expect(opts.method).toBe('PATCH')
    expect(await screen.findByText('cosmetics')).toBeInTheDocument()
  })
})
