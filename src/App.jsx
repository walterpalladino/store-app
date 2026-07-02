import { Routes, Route } from 'react-router-dom'
import { Box } from '@mui/material'
import { AuthProvider }         from './context/AuthContext'
import { CartProvider }         from './context/CartContext'
import { WishlistProvider }     from './context/WishlistContext'
import { MerchantAuthProvider } from './context/MerchantAuthContext'
import Navbar                   from './components/Navbar'
import ProtectedRoute           from './components/ProtectedRoute'
import AdminProtectedRoute      from './components/AdminProtectedRoute'
import HomePage                 from './pages/HomePage'
import ProductDetailPage        from './pages/ProductDetailPage'
import LoginPage                from './pages/LoginPage'
import CartPage                 from './pages/CartPage'
import CheckoutPage             from './pages/CheckoutPage'
import UserPage                 from './pages/user/UserPage'
import PaymentPage              from './pages/PaymentPage'
import PaymentReturnPage        from './pages/PaymentReturnPage'
import AdminLoginPage           from './pages/admin/AdminLoginPage'
import AdminPage                from './pages/admin/AdminPage'

// ── Customer shell (with Navbar) ────────────────────────────────────────────
function CustomerShell() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/"            element={<HomePage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/cart"        element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
        <Route path="/checkout"    element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
        <Route path="/account"     element={<ProtectedRoute><UserPage /></ProtectedRoute>} />
      </Routes>
    </>
  )
}

// ── App ─────────────────────────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <MerchantAuthProvider>
            <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
              <Routes>
                {/* ── Admin section (no customer Navbar) ── */}
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route
                  path="/admin/*"
                  element={
                    <AdminProtectedRoute>
                      <AdminPage />
                    </AdminProtectedRoute>
                  }
                />

                {/* ── Payment step (focused, no customer Navbar) ── */}
                <Route path="/checkout/payment" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
                <Route path="/checkout/return"  element={<ProtectedRoute><PaymentReturnPage /></ProtectedRoute>} />

                {/* ── Customer section (standalone login) ── */}
                <Route path="/login" element={<LoginPage />} />

                {/* ── Customer shell with Navbar ── */}
                <Route path="/*" element={<CustomerShell />} />
              </Routes>
            </Box>
          </MerchantAuthProvider>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  )
}

export default App
