import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation, useSearchParams, Navigate } from 'react-router-dom'
import { Box, Container, Typography, CircularProgress } from '@mui/material'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { getPaymentStatus, isSuccess, PAYMENT_STATUS } from '../services/paymentService'
import { submitOrder } from '../services/checkoutService'
import OrderResult from '../components/OrderResult'

// ---------------------------------------------------------------------------
// PaymentReturnPage — the callback Stripe redirects to after the embedded
// payment. It confirms the payment status, finalizes the order on success
// (creating it + clearing the cart), and shows the outcome.
//
// URL: /checkout/return?session_id=...&redirect_status=succeeded|failed|canceled
// (mock mode also receives the order draft via navigation state).
// ---------------------------------------------------------------------------
export default function PaymentReturnPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const { authFetch } = useAuth()
  const { clearCart } = useCart()

  const sessionId      = params.get('session_id')
  const redirectStatus = params.get('redirect_status')
  const { order }      = location.state || {}

  const [phase, setPhase]   = useState('confirming') // 'confirming' | 'done'
  const [result, setResult] = useState(null)
  // Finalization must run exactly once — guard against StrictMode's double
  // effect and any re-render, otherwise the order would be created twice.
  const finalizedRef = useRef(false)

  const confirm = useCallback(async () => {
    setPhase('confirming')
    try {
      const { status } = await getPaymentStatus(authFetch, sessionId, redirectStatus)

      if (isSuccess(status)) {
        // Payment settled — create the order and empty the cart.
        let finalized = order
        try {
          if (order) finalized = await submitOrder(order)
        } catch {
          // Order creation failed after a successful charge — still show a
          // confirmation (backend/webhook will reconcile), but flag it softly.
          finalized = order
        }
        clearCart()
        setResult({ ...(finalized || {}), status: 'Payment Completed' })
      } else {
        const label = status === PAYMENT_STATUS.CANCELED ? 'Cancelled' : 'Payment could not be processed'
        setResult({ ...(order || {}), status: label })
      }
    } catch (err) {
      setResult({ ...(order || {}), status: 'Payment could not be processed', message: err.message })
    } finally {
      setPhase('done')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, redirectStatus, authFetch])

  useEffect(() => {
    if (finalizedRef.current) return
    finalizedRef.current = true
    confirm()
    // Run once on mount — confirm() is guarded above, so it is intentionally
    // not re-run when its dependencies (e.g. authFetch) change identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Nothing to confirm (direct navigation) → back to the cart.
  if (!sessionId && !order) return <Navigate to="/cart" replace />

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
        {phase === 'confirming' ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2.5, py: { xs: 8, md: 12 } }}>
            <CircularProgress size={30} sx={{ color: 'secondary.main' }} />
            <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.4rem', fontWeight: 300 }}>
              Confirming your payment…
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
              Please don’t close this window.
            </Typography>
          </Box>
        ) : (
          <OrderResult
            result={result}
            onBack={() => navigate('/checkout')}
            onContinueShopping={() => navigate('/')}
          />
        )}
      </Container>
    </Box>
  )
}
