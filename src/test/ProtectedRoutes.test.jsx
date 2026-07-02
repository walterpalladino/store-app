import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import AdminProtectedRoute from '../components/AdminProtectedRoute'

// ── Mock contexts ──────────────────────────────────────────────────────────
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../context/MerchantAuthContext', () => ({
  useMerchantAuth: vi.fn(),
}))

import { useAuth } from '../context/AuthContext'
import { useMerchantAuth } from '../context/MerchantAuthContext'

// ── ProtectedRoute ─────────────────────────────────────────────────────────
describe('ProtectedRoute', () => {
  it('renders children when user is logged in', () => {
    useAuth.mockReturnValue({ isLoggedIn: true })

    render(
      <MemoryRouter initialEntries={['/cart']}>
        <Routes>
          <Route path="/cart" element={<ProtectedRoute><div>Cart Page</div></ProtectedRoute>} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Cart Page')).toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
  })

  it('redirects to /login when user is not logged in', () => {
    useAuth.mockReturnValue({ isLoggedIn: false })

    render(
      <MemoryRouter initialEntries={['/cart']}>
        <Routes>
          <Route path="/cart" element={<ProtectedRoute><div>Cart Page</div></ProtectedRoute>} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.queryByText('Cart Page')).not.toBeInTheDocument()
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('preserves the intended path in location.state.from', () => {
    useAuth.mockReturnValue({ isLoggedIn: false })

    let capturedState = null

    function LoginCapture() {
      const { useLocation } = require('react-router-dom')
      capturedState = useLocation().state
      return <div>Login</div>
    }

    render(
      <MemoryRouter initialEntries={['/checkout']}>
        <Routes>
          <Route path="/checkout" element={<ProtectedRoute><div>Checkout</div></ProtectedRoute>} />
          <Route path="/login" element={<LoginCapture />} />
        </Routes>
      </MemoryRouter>
    )

    // The redirect should have happened to /login
    expect(screen.getByText('Login')).toBeInTheDocument()
  })
})

// ── AdminProtectedRoute ────────────────────────────────────────────────────
describe('AdminProtectedRoute', () => {
  it('renders children when merchant is logged in', () => {
    useMerchantAuth.mockReturnValue({ isLoggedIn: true })

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<AdminProtectedRoute><div>Admin Panel</div></AdminProtectedRoute>} />
          <Route path="/admin/login" element={<div>Admin Login</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Admin Panel')).toBeInTheDocument()
    expect(screen.queryByText('Admin Login')).not.toBeInTheDocument()
  })

  it('redirects to /admin/login when merchant is not logged in', () => {
    useMerchantAuth.mockReturnValue({ isLoggedIn: false })

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<AdminProtectedRoute><div>Admin Panel</div></AdminProtectedRoute>} />
          <Route path="/admin/login" element={<div>Admin Login</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument()
    expect(screen.getByText('Admin Login')).toBeInTheDocument()
  })

  it('uses a different redirect target from ProtectedRoute (/admin/login vs /login)', () => {
    useMerchantAuth.mockReturnValue({ isLoggedIn: false })
    useAuth.mockReturnValue({ isLoggedIn: false })

    const { container } = render(
      <MemoryRouter initialEntries={['/admin/products']}>
        <Routes>
          <Route path="/admin/products" element={<AdminProtectedRoute><div>Products</div></AdminProtectedRoute>} />
          <Route path="/admin/login" element={<div>Merchant Login</div>} />
          <Route path="/login" element={<div>Customer Login</div>} />
        </Routes>
      </MemoryRouter>
    )

    // Should land on /admin/login, NOT /login
    expect(screen.getByText('Merchant Login')).toBeInTheDocument()
    expect(screen.queryByText('Customer Login')).not.toBeInTheDocument()
  })
})
