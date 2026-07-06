import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom'
import { Box, Container, Typography, CircularProgress } from '@mui/material'
import { useAuth } from '../context/AuthContext'
import { isSuccess, getOrderBySession } from '../services/checkoutService'
import OrderResult from '../components/OrderResult'

// Map the checkout order (created by POST /api/checkout) into the shape
// OrderResult renders. The order's line items use the cart-snapshot shape
// ({ sku, description, unitPrice, discountPrice, qty }).
function toResult(order, statusLabel) {
  return {
    id:              order?.id,
    orderId:         order?.orderId,
    status:          statusLabel,
    discountedTotal: order?.discountedTotal ?? order?.total,
    address:         order?.address,
    payment:         order?.payment,
    products: (order?.products || []).map((p) => ({
      sku:             p.sku,
      title:           p.description ?? p.title,
      quantity:        p.qty ?? p.quantity,
      discountedTotal: (p.discountPrice ?? p.unitPrice ?? p.price ?? 0) * (p.qty ?? p.quantity ?? 0),
    })),
  }
}

// ---------------------------------------------------------------------------
// PaymentReturnPage — the **success** callback Stripe's hosted checkout
// redirects to (the `successUrl` we sent to POST /api/checkout).
//
// Reaching this URL means the payment form was submitted; the order was already
// created by POST /api/checkout and settles asynchronously via the checkout
// webhook (backend-owned). This is a full browser redirect back from Stripe, so
// there is no React navigation state — we only get `?session_id=…` and look the
// order up by it to display the outcome.
// ---------------------------------------------------------------------------
export default function PaymentReturnPage() {
  const navigate = useNavigate()
  const { authFetch } = useAuth()
  const [params] = useSearchParams()
  const sessionId = params.get('session_id')

  const [order, setOrder]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    getOrderBySession(authFetch, sessionId)
      .then((o) => { if (alive) setOrder(o) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [authFetch, sessionId])

  // Direct navigation with no session and nothing to show → back to the cart.
  if (!sessionId && !loading && !order) return <Navigate to="/cart" replace />

  // Arriving here is a success; the webhook may not have flipped the order to
  // `paid` yet, so show "Payment Completed" once settled, else "Processing".
  const label = order && isSuccess(order.status) ? 'Payment Completed' : 'Processing'
  const result = toResult(order, label)

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Minimal header */}
      <Box sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', py: 2 }}>
        <Container maxWidth="xl">
          <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: '1.4rem', letterSpacing: '0.15em', textAlign: 'center' }}>
            SHŌP
          </Typography>
        </Container>
      </Box>
      <Box sx={{ height: '2px', background: 'linear-gradient(90deg, transparent, #c8a96e, transparent)' }} />

      <Container maxWidth="md">
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 12 }}>
            <CircularProgress size={28} sx={{ color: 'secondary.dark' }} />
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>Confirming your payment…</Typography>
          </Box>
        ) : (
          <OrderResult
            result={result}
            onBack={() => navigate('/account')}
            onContinueShopping={() => navigate('/')}
          />
        )}
      </Container>
    </Box>
  )
}
