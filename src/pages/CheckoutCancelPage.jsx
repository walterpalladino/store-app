import { useNavigate } from 'react-router-dom'
import { Box, Container, Typography, Button, Chip } from '@mui/material'
import { HighlightOffOutlined, ArrowBack, ShoppingBagOutlined } from '@mui/icons-material'

// ---------------------------------------------------------------------------
// CheckoutCancelPage — the **cancel** callback Stripe's hosted checkout
// redirects to (the `cancelUrl` we sent to POST /api/checkout). It is used
// as-is (no session id), so there is nothing to look up: the customer backed
// out of the hosted payment page before paying.
//
// The order stays open (pending payment) on the backend; the customer can head
// back to their bag and try again, which resumes/replaces that open order.
// ---------------------------------------------------------------------------
export default function CheckoutCancelPage() {
  const navigate = useNavigate()

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

      <Container maxWidth="sm">
        <Box sx={{ textAlign: 'center', py: { xs: 8, md: 12 } }}>
          <HighlightOffOutlined sx={{ fontSize: 56, color: '#b85c4a', mb: 2 }} />
          <Chip
            label="Payment cancelled"
            size="small"
            sx={{ mb: 2.5, height: 22, fontSize: '0.62rem', letterSpacing: '0.08em', bgcolor: 'rgba(184,92,74,0.1)', color: '#b85c4a', fontWeight: 500, borderRadius: 1 }}
          />
          <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.8rem', fontWeight: 300, mb: 1 }}>
            Checkout cancelled
          </Typography>
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', maxWidth: 420, mx: 'auto', mb: 4 }}>
            You left the payment page before completing your purchase and nothing was charged.
            Your items are waiting whenever you’re ready.
          </Typography>

          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              onClick={() => navigate('/cart')}
              startIcon={<ArrowBack sx={{ fontSize: 15 }} />}
              sx={{ py: 1.4, px: 4, fontSize: '0.72rem', letterSpacing: '0.1em' }}
            >
              Return to bag
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/')}
              startIcon={<ShoppingBagOutlined sx={{ fontSize: 15 }} />}
              sx={{ py: 1.4, px: 4, fontSize: '0.72rem', letterSpacing: '0.1em' }}
            >
              Continue shopping
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}
