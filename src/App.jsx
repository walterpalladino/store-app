import { Routes, Route } from 'react-router-dom'
import { Box } from '@mui/material'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { WishlistProvider } from './context/WishlistContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import ProductDetailPage from './pages/ProductDetailPage'
import LoginPage from './pages/LoginPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import UserPage from './pages/user/UserPage'

function AppShell() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="*"
          element={
            <>
              <Navbar />
              <Routes>
                <Route path="/"           element={<HomePage />} />
                <Route path="/product/:id" element={<ProductDetailPage />} />
                <Route path="/cart"       element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
                <Route path="/checkout"   element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
                <Route path="/account"    element={<ProtectedRoute><UserPage /></ProtectedRoute>} />
              </Routes>
            </>
          }
        />
      </Routes>
    </Box>
  )
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <AppShell />
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  )
}

export default App
