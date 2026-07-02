import { Box, Typography, Button, Chip, Fade } from '@mui/material'
import { Link } from 'react-router-dom'
import {
  CheckCircleOutline, ErrorOutline, LocalShippingOutlined,
  HomeOutlined, CreditCardOutlined, ShoppingBagOutlined,
} from '@mui/icons-material'

const fmt = (n) =>
  Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

const maskCard = (n) => {
  const d = String(n ?? '').replace(/\D/g, '')
  return d.length >= 4 ? `•••• •••• •••• ${d.slice(-4)}` : '••••'
}

const STATUS_STYLES = {
  'delivered':          { color: '#4a7c59', bg: 'rgba(74,124,89,0.1)',    icon: CheckCircleOutline },
  'payment completed':  { color: '#4a7c59', bg: 'rgba(74,124,89,0.1)',    icon: CheckCircleOutline },
  'completed':          { color: '#4a7c59', bg: 'rgba(74,124,89,0.1)',    icon: CheckCircleOutline },
  'shipped':            { color: '#4a7c59', bg: 'rgba(74,124,89,0.1)',    icon: LocalShippingOutlined },
  'processing':         { color: '#c8a96e', bg: 'rgba(200,169,110,0.12)', icon: CheckCircleOutline },
  'pending':            { color: '#c8a96e', bg: 'rgba(200,169,110,0.12)', icon: CheckCircleOutline },
  'error':              { color: '#b85c4a', bg: 'rgba(184,92,74,0.1)',    icon: ErrorOutline },
  'payment could not be processed': { color: '#b85c4a', bg: 'rgba(184,92,74,0.1)', icon: ErrorOutline },
  'cancelled':          { color: '#b85c4a', bg: 'rgba(184,92,74,0.1)',    icon: ErrorOutline },
}

function getStatusStyle(status) {
  const key = (status ?? '').toLowerCase()
  return STATUS_STYLES[key] ?? { color: '#4a7c59', bg: 'rgba(74,124,89,0.1)', icon: CheckCircleOutline }
}

function isErrorStatus(status) {
  const key = (status ?? '').toLowerCase()
  return key.includes('error') || key.includes('could not') || key.includes('fail') || key.includes('cancel')
}

/**
 * Order confirmation / error screen. Driven entirely by `result.status`:
 * an error-ish status renders the red "not completed" state with a retry action.
 */
export default function OrderResult({ result, onBack, onContinueShopping }) {
  const isError    = isErrorStatus(result.status)
  const style      = getStatusStyle(result.status)
  const StatusIcon = style.icon

  return (
    <Fade in>
      <Box sx={{ maxWidth: 640, mx: 'auto', py: { xs: 4, md: 6 }, px: 2 }}>
        {/* Status hero */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{
            width: 80, height: 80, borderRadius: '50%',
            bgcolor: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            mx: 'auto', mb: 2.5,
            border: `1.5px solid ${style.color}40`,
          }}>
            <StatusIcon sx={{ fontSize: 38, color: style.color }} />
          </Box>

          <Chip
            label={result.status}
            sx={{ height: 24, fontSize: '0.68rem', letterSpacing: '0.08em', bgcolor: style.bg, color: style.color, fontWeight: 600, borderRadius: 1, mb: 2 }}
          />

          <Typography variant="h2" sx={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: { xs: '1.8rem', md: '2.4rem' }, mb: 1 }}>
            {isError ? 'Order Not Completed' : 'Order Confirmed!'}
          </Typography>
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', maxWidth: 400, mx: 'auto' }}>
            {isError
              ? 'There was an issue processing your payment. Please review your details and try again.'
              : `Thank you for your purchase! Order #${String(result.id ?? 1).padStart(5, '0')} has been received.`
            }
          </Typography>
        </Box>

        {/* Order detail card */}
        {!isError && (
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', mb: 4 }}>
            {/* Dark header */}
            <Box sx={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)', px: 3, py: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography sx={{ fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,169,110,0.7)', mb: 0.25 }}>Order</Typography>
                <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.3rem', fontWeight: 300, color: '#f5f0e8' }}>
                  #{String(result.id ?? 1).padStart(5, '0')}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.45)', mb: 0.25 }}>Total Paid</Typography>
                <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.6rem', fontWeight: 500, color: '#f5f0e8', lineHeight: 1 }}>
                  {fmt(result.discountedTotal ?? result.total ?? 0)}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ height: '2px', background: 'linear-gradient(90deg, transparent, #c8a96e, transparent)' }} />

            {/* Address + Payment row */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ flex: 1, minWidth: 200, px: 3, py: 2, borderRight: { sm: '1px solid' }, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                  <HomeOutlined sx={{ fontSize: 14, color: 'secondary.dark' }} />
                  <Typography sx={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.secondary', fontWeight: 500 }}>Ship to</Typography>
                </Box>
                {result.address ? (
                  <>
                    <Typography sx={{ fontSize: '0.82rem' }}>{result.address.address}</Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{result.address.city}, {result.address.state} {result.address.postalCode}</Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{result.address.country}</Typography>
                  </>
                ) : <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>—</Typography>}
              </Box>
              <Box sx={{ flex: 1, minWidth: 200, px: 3, py: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                  <CreditCardOutlined sx={{ fontSize: 14, color: 'secondary.dark' }} />
                  <Typography sx={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.secondary', fontWeight: 500 }}>Payment</Typography>
                </Box>
                {result.payment ? (
                  <>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 500 }}>{result.payment.cardType || result.payment.method || 'Card'}</Typography>
                    {result.payment.cardNumber && (
                      <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', fontFamily: 'monospace' }}>{maskCard(result.payment.cardNumber)}</Typography>
                    )}
                  </>
                ) : <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>—</Typography>}
              </Box>
            </Box>

            {/* Products */}
            <Box sx={{ px: 3, py: 2 }}>
              <Typography sx={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.secondary', fontWeight: 500, mb: 1.5 }}>Items</Typography>
              {result.products?.map((p, idx) => (
                <Box key={p.sku ?? p.id ?? idx} sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  py: 1, borderBottom: idx < result.products.length - 1 ? '1px solid' : 'none', borderColor: 'divider',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 36, height: 36, bgcolor: '#f0ece3', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', p: 0.5, border: '1px solid rgba(26,26,26,0.07)', flexShrink: 0 }}>
                      {p.thumbnail
                        ? <Box component="img" src={p.thumbnail} alt={p.title} sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        : <ShoppingBagOutlined sx={{ fontSize: 15, color: 'rgba(26,26,26,0.2)' }} />
                      }
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '0.8rem', fontFamily: '"Cormorant Garamond", serif' }}>{p.title}</Typography>
                      <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>× {p.quantity}</Typography>
                    </Box>
                  </Box>
                  <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '0.9rem', fontWeight: 500 }}>
                    {fmt(p.discountedTotal ?? p.total ?? 0)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Action buttons */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, justifyContent: 'center' }}>
          {isError ? (
            <Button variant="contained" onClick={onBack} sx={{ py: 1.4, px: 4, fontSize: '0.72rem', letterSpacing: '0.1em' }}>
              Review Order
            </Button>
          ) : (
            <Button variant="contained" onClick={onContinueShopping} sx={{ py: 1.4, px: 4, fontSize: '0.72rem', letterSpacing: '0.1em' }}>
              Continue Shopping
            </Button>
          )}
          <Button component={Link} to="/account?tab=history" variant="outlined" sx={{ py: 1.4, px: 3, fontSize: '0.72rem', letterSpacing: '0.08em' }}>
            View Order History
          </Button>
        </Box>
      </Box>
    </Fade>
  )
}
