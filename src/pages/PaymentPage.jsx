import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import {
  Box, Container, Typography, TextField, Button, InputAdornment,
  Alert, CircularProgress, Divider, Chip,
} from '@mui/material'
import {
  LockOutlined, CreditCardOutlined, MailOutlined, PersonOutline,
} from '@mui/icons-material'
import { REDIRECT_STATUS } from '../services/checkoutService'

const fmt = (n) =>
  Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

const STRIPE_PURPLE = '#635bff'

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    fontFamily: '"DM Sans", sans-serif', fontSize: '0.9rem', bgcolor: '#fff',
    '& fieldset': { borderColor: 'rgba(26,26,26,0.18)' },
    '&:hover fieldset': { borderColor: 'rgba(26,26,26,0.35)' },
    '&.Mui-focused fieldset': { borderColor: STRIPE_PURPLE, borderWidth: 2 },
  },
}

// ---------------------------------------------------------------------------
// PaymentPage — MOCK of the embedded Stripe payment step.
//
// The order + checkout session are already created by POST /api/checkout; this
// page stands in for Stripe's embedded Payment Element (mounted with
// `checkout.clientSecret` in a real integration). Because payment is mocked on
// the backend, we render a mock card form and let you simulate the outcome,
// then redirect to the return URL exactly like Stripe would.
// ---------------------------------------------------------------------------
export default function PaymentPage() {
  const navigate = useNavigate()
  const location = useLocation()

  // POST /api/checkout handed off { order, checkout } via navigation state.
  const { order, checkout } = location.state || {}

  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    email:  '',
    number: '4242 4242 4242 4242',
    expiry: '12 / 34',
    cvc:    '123',
    name:   '',
  })
  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  // No session in state (direct navigation / refresh) → back to checkout.
  if (!checkout) return <Navigate to="/checkout" replace />

  const amount = checkout.amountTotal != null ? checkout.amountTotal / 100 : (order?.discountedTotal ?? 0)

  // Redirect to the return URL the way Stripe does, carrying the order so the
  // return page can display it.
  const finish = (status) => {
    setSubmitting(true)
    const params = new URLSearchParams({
      session_id:      checkout.sessionId ?? 'cs_mock',
      redirect_status: status,
    })
    navigate(`/checkout/return?${params.toString()}`, { state: { order } })
  }

  return (
    <Box sx={{ bgcolor: '#f6f8fb', minHeight: '100vh', py: { xs: 3, md: 6 } }}>
      <Container maxWidth="sm">
        {/* Merchant + amount header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: '1.4rem', letterSpacing: '0.15em' }}>
            SHŌP
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mb: 1.5 }}>Pay with card</Typography>
          <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '2.4rem', fontWeight: 500, lineHeight: 1 }}>
            {fmt(amount)}
          </Typography>
        </Box>

        <Alert severity="warning" sx={{ mb: 2, fontSize: '0.76rem', borderRadius: 2 }}>
          <strong>Test mode</strong> — this stands in for Stripe’s embedded payment form (the
          backend session is mocked). No real card is charged. Use the buttons below to simulate
          the outcome.
        </Alert>

        {/* The "embedded" payment card */}
        <Box sx={{ bgcolor: '#fff', border: '1px solid rgba(26,26,26,0.1)', borderRadius: 3, p: { xs: 2.5, md: 3.5 }, boxShadow: '0 4px 24px rgba(26,26,26,0.06)' }}>
          <TextField
            fullWidth size="small" name="email" label="Email" value={form.email} onChange={handleChange}
            placeholder="you@example.com" sx={{ ...fieldSx, mb: 2 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><MailOutlined sx={{ fontSize: 17 }} /></InputAdornment> }}
          />

          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mb: 0.75, letterSpacing: '0.04em' }}>
            Card information
          </Typography>
          <TextField
            fullWidth size="small" name="number" label="Card number" value={form.number} onChange={handleChange}
            sx={{ ...fieldSx, '& .MuiOutlinedInput-root': { ...fieldSx['& .MuiOutlinedInput-root'], borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><CreditCardOutlined sx={{ fontSize: 17 }} /></InputAdornment>,
              endAdornment: <InputAdornment position="end"><Chip label="TEST" size="small" sx={{ height: 18, fontSize: '0.55rem', bgcolor: 'rgba(99,91,255,0.1)', color: STRIPE_PURPLE }} /></InputAdornment>,
            }}
          />
          <Box sx={{ display: 'flex' }}>
            <TextField
              size="small" name="expiry" label="MM / YY" value={form.expiry} onChange={handleChange}
              sx={{ ...fieldSx, flex: 1, '& .MuiOutlinedInput-root': { ...fieldSx['& .MuiOutlinedInput-root'], borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 } }}
            />
            <TextField
              size="small" name="cvc" label="CVC" value={form.cvc} onChange={handleChange}
              sx={{ ...fieldSx, flex: 1, '& .MuiOutlinedInput-root': { ...fieldSx['& .MuiOutlinedInput-root'], borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 0, ml: '-1px' } }}
            />
          </Box>

          <TextField
            fullWidth size="small" name="name" label="Name on card" value={form.name} onChange={handleChange}
            sx={{ ...fieldSx, mt: 2 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><PersonOutline sx={{ fontSize: 17 }} /></InputAdornment> }}
          />

          {/* Pay */}
          <Button
            fullWidth variant="contained" disabled={submitting} onClick={() => finish(REDIRECT_STATUS.SUCCEEDED)}
            startIcon={submitting ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : <LockOutlined sx={{ fontSize: 16 }} />}
            sx={{
              mt: 3, py: 1.4, fontSize: '0.8rem', letterSpacing: '0.04em', borderRadius: 2,
              bgcolor: STRIPE_PURPLE, '&:hover': { bgcolor: '#524ae0' },
              textTransform: 'none', fontWeight: 600,
            }}
          >
            {submitting ? 'Processing…' : `Pay ${fmt(amount)}`}
          </Button>

          <Divider sx={{ my: 2, fontSize: '0.62rem', color: 'text.secondary' }}>simulate outcome</Divider>

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button fullWidth size="small" variant="outlined" color="error" disabled={submitting}
              onClick={() => finish(REDIRECT_STATUS.FAILED)}
              sx={{ fontSize: '0.68rem', textTransform: 'none' }}>
              Declined card
            </Button>
            <Button fullWidth size="small" variant="text" disabled={submitting}
              onClick={() => navigate('/')}
              sx={{ fontSize: '0.68rem', textTransform: 'none', color: 'text.secondary' }}>
              Cancel
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75, mt: 2.5 }}>
          <LockOutlined sx={{ fontSize: 13, color: 'text.secondary' }} />
          <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
            Payments are processed securely by <strong>Stripe</strong>
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}
