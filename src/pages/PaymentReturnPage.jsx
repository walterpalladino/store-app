import { useNavigate, useLocation, useSearchParams, Navigate } from 'react-router-dom'
import { Box, Container, Typography } from '@mui/material'
import { isSuccess, REDIRECT_STATUS } from '../services/checkoutService'
import OrderResult from '../components/OrderResult'

// Map the checkout order (created by POST /api/checkout) into the shape
// OrderResult renders. The order's line items use the cart-snapshot shape
// ({ sku, description, unitPrice, discountPrice, qty }).
function toResult(order, statusLabel) {
  return {
    id:              order?.id,
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
// PaymentReturnPage — the callback the embedded checkout redirects to.
//
// The order was already created by POST /api/checkout (this is why the front
// end no longer creates orders — no more duplicates). Here we simply read the
// settled payment outcome and display it.
//
// URL: /checkout/return?session_id=...&redirect_status=succeeded|failed|canceled
// ---------------------------------------------------------------------------
export default function PaymentReturnPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()

  const sessionId      = params.get('session_id')
  const redirectStatus = params.get('redirect_status')
  const { order }      = location.state || {}

  // Nothing to show (direct navigation) → back to the cart.
  if (!sessionId && !order) return <Navigate to="/cart" replace />

  const label = isSuccess(redirectStatus)
    ? 'Payment Completed'
    : redirectStatus === REDIRECT_STATUS.CANCELED
      ? 'Cancelled'
      : 'Payment could not be processed'

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
        <OrderResult
          result={result}
          onBack={() => navigate('/cart')}
          onContinueShopping={() => navigate('/')}
        />
      </Container>
    </Box>
  )
}
