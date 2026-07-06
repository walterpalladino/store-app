import API from '../config/api'
import { unwrap } from '../utils/apiUtils'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Container, Grid, Typography, Button, Divider, Chip,
  CircularProgress, Alert, IconButton, Tooltip,
  TextField, InputAdornment,
} from '@mui/material'
import {
  ArrowBack, EditOutlined, LockOutlined,
  HomeOutlined, CreditCardOutlined, ReceiptLongOutlined,
  SaveOutlined, CloseOutlined, FmdGoodOutlined,
  LocationCityOutlined, PublicOutlined, MarkunreadMailboxOutlined,
  ShoppingBagOutlined,
} from '@mui/icons-material'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { startCheckout } from '../services/checkoutService'
import logger from '../utils/logger'

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------
const TAX_RATE      = 0.08
const SHIPPING_COST = 9.99
const SHIPPING_FREE = 75

const fmt = (n) =>
  Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

const fieldSx = {
  '& .MuiInputLabel-root': { fontFamily: '"DM Sans", sans-serif', fontSize: '0.82rem' },
  '& .MuiOutlinedInput-root': {
    fontFamily: '"DM Sans", sans-serif', fontSize: '0.85rem',
    '& fieldset': { borderColor: 'rgba(26,26,26,0.2)', transition: 'border-color 0.2s' },
    '&:hover fieldset': { borderColor: 'rgba(26,26,26,0.45)' },
    '&.Mui-focused fieldset': { borderColor: 'primary.main' },
  },
}


// ---------------------------------------------------------------------------
// Section card wrapper
// ---------------------------------------------------------------------------
function SectionCard({ icon, title, badge, children, action }) {
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', mb: 3 }}>
      <Box sx={{
        px: 2.5, py: 1.75,
        bgcolor: 'rgba(26,26,26,0.02)',
        borderBottom: '1px solid', borderColor: 'divider',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ color: 'secondary.dark', display: 'flex' }}>{icon}</Box>
          <Typography variant="h6" sx={{ fontSize: '0.7rem', color: 'text.primary' }}>{title}</Typography>
          {badge}
        </Box>
        {action}
      </Box>
      <Box sx={{ p: 2.5 }}>{children}</Box>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Address review / edit block
// ---------------------------------------------------------------------------
function AddressBlock({ address, onChange }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm]       = useState({ ...address })
  const [errors, setErrors]   = useState({})

  const hasAddress = address && Object.values(address).some(Boolean)

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
    setErrors((p) => ({ ...p, [e.target.name]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.address?.trim()) errs.address    = 'Required'
    if (!form.city?.trim())    errs.city        = 'Required'
    if (!form.state?.trim())   errs.state       = 'Required'
    if (!form.postalCode?.trim()) errs.postalCode = 'Required'
    if (!form.country?.trim()) errs.country     = 'Required'
    return errs
  }

  const handleSave = () => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    onChange(form)
    setEditing(false)
  }

  const handleCancel = () => {
    setForm({ ...address })
    setErrors({})
    setEditing(false)
  }

  const fields = [
    { name: 'address',    label: 'Street Address', xs: 12,         icon: <FmdGoodOutlined sx={{ fontSize: 15 }} /> },
    { name: 'city',       label: 'City',           xs: 12, sm: 6,  icon: <LocationCityOutlined sx={{ fontSize: 15 }} /> },
    { name: 'state',      label: 'State',          xs: 12, sm: 6  },
    { name: 'postalCode', label: 'ZIP / Postal',   xs: 12, sm: 6,  icon: <MarkunreadMailboxOutlined sx={{ fontSize: 15 }} /> },
    { name: 'country',    label: 'Country',        xs: 12, sm: 6,  icon: <PublicOutlined sx={{ fontSize: 15 }} /> },
  ]

  if (editing) {
    return (
      <Box>
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          {fields.map(({ name, label, xs, sm, icon }) => (
            <Grid item xs={xs} sm={sm} key={name}>
              <TextField
                fullWidth size="small" name={name} label={label}
                value={form[name] ?? ''} onChange={handleChange}
                error={!!errors[name]} helperText={errors[name]}
                InputProps={icon ? { startAdornment: <InputAdornment position="start"><Box sx={{ color: 'text.secondary', display: 'flex' }}>{icon}</Box></InputAdornment> } : undefined}
                sx={fieldSx}
              />
            </Grid>
          ))}
        </Grid>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="contained" onClick={handleSave} startIcon={<SaveOutlined sx={{ fontSize: 14 }} />} sx={{ fontSize: '0.68rem', letterSpacing: '0.07em', py: 0.8 }}>Save</Button>
          <Button size="small" variant="outlined"  onClick={handleCancel} startIcon={<CloseOutlined sx={{ fontSize: 14 }} />} sx={{ fontSize: '0.68rem', letterSpacing: '0.07em', py: 0.8 }}>Cancel</Button>
        </Box>
      </Box>
    )
  }

  if (!hasAddress) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 1.5 }}>No address saved to your account.</Typography>
        <Button size="small" variant="outlined" onClick={() => setEditing(true)} startIcon={<EditOutlined sx={{ fontSize: 14 }} />} sx={{ fontSize: '0.68rem', letterSpacing: '0.07em', py: 0.8 }}>Add Address</Button>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
      <Box>
        <Typography sx={{ fontSize: '0.9rem', fontFamily: '"Cormorant Garamond", serif', fontWeight: 400, mb: 0.25 }}>{address.address}</Typography>
        <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>{address.city}, {address.state} {address.postalCode}</Typography>
        <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>{address.country}</Typography>
      </Box>
      <Tooltip title="Change address" arrow>
        <IconButton size="small" onClick={() => setEditing(true)} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, flexShrink: 0 }}>
          <EditOutlined sx={{ fontSize: 15 }} />
        </IconButton>
      </Tooltip>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Order items summary (read-only compact list)
// ---------------------------------------------------------------------------
function OrderItemsList({ items }) {
  return (
    <Box>
      {items.map((item, idx) => {
        const unit = item.product.price * (1 - (item.product.discountPercentage ?? 0) / 100)
        return (
          <Box key={item.product.sku} sx={{
            display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25,
            borderBottom: idx < items.length - 1 ? '1px solid' : 'none',
            borderColor: 'divider',
          }}>
            <Box sx={{
              width: 42, height: 42, flexShrink: 0, borderRadius: 1,
              bgcolor: '#f0ece3', border: '1px solid rgba(26,26,26,0.07)',
              overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0.5,
            }}>
              {item.product.thumbnail
                ? <Box component="img" src={item.product.thumbnail} alt={item.product.title} sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                : <ShoppingBagOutlined sx={{ fontSize: 18, color: 'rgba(26,26,26,0.2)' }} />
              }
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.82rem', fontFamily: '"Cormorant Garamond", serif', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.product.title}
              </Typography>
              <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                {fmt(unit)} × {item.quantity}
              </Typography>
            </Box>
            <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '0.95rem', fontWeight: 500, flexShrink: 0 }}>
              {fmt(unit * item.quantity)}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Order total summary panel
// ---------------------------------------------------------------------------
function TotalsPanel({ subtotal }) {
  const shipping = subtotal >= SHIPPING_FREE ? 0 : SHIPPING_COST
  const tax      = subtotal * TAX_RATE
  const total    = subtotal + shipping + tax

  return (
    <Box>
      {[
        { label: 'Subtotal', value: fmt(subtotal) },
        { label: 'Shipping', value: shipping === 0 ? 'Free' : fmt(shipping), green: shipping === 0 },
        { label: `Tax (${(TAX_RATE * 100).toFixed(0)}%)`, value: fmt(tax) },
      ].map(({ label, value, green }) => (
        <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{label}</Typography>
          <Typography sx={{ fontSize: '0.82rem', color: green ? 'success.main' : 'text.primary', fontWeight: green ? 500 : 400 }}>{value}</Typography>
        </Box>
      ))}
      <Divider sx={{ my: 1.5 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Total</Typography>
        <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.6rem', fontWeight: 500 }}>{fmt(total)}</Typography>
      </Box>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// CheckoutPage
// ---------------------------------------------------------------------------
export default function CheckoutPage() {
  const navigate   = useNavigate()
  const { authFetch } = useAuth()
  const { items, subtotal, totalQuantity, clearCart } = useCart()

  const [address,    setAddress]    = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [profileError,   setProfileError]   = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [submitError, setSubmitError] = useState('')
  // Once checkout starts, clearing the cart must not trigger the empty-cart
  // redirect below (we're navigating to the payment step instead).
  const checkingOutRef = useRef(false)

  const shipping = subtotal >= SHIPPING_FREE ? 0 : SHIPPING_COST
  const tax      = subtotal * TAX_RATE
  const total    = subtotal + shipping + tax

  // Load saved address from /auth/me. Payment methods are no longer stored on
  // the backend, so the card is entered manually at checkout time.
  const loadProfile = useCallback(async () => {
    setLoadingProfile(true)
    setProfileError('')
    try {
      const res  = await authFetch(API.auth.me)
      const data = await unwrap(res)  // { id, firstName, ..., address, ... }
      setAddress(data.address ?? null)
    } catch (err) {
      setProfileError(err.message)
    } finally {
      setLoadingProfile(false)
    }
  }, [authFetch])

  useEffect(() => { loadProfile() }, [loadProfile])

  // Redirect if the cart is empty (unless we just placed the order).
  useEffect(() => {
    if (!checkingOutRef.current && !loadingProfile && items.length === 0) {
      navigate('/cart', { replace: true })
    }
  }, [items, loadingProfile, navigate])

  const canSubmit = !loadingProfile && !submitting && items.length > 0

  // Place the order via POST /api/checkout. The backend builds the order from
  // the cart, starts the Stripe **hosted** Checkout Session and clears the cart;
  // we then hand off by redirecting the browser to the hosted payment page
  // (`checkout.url`). Stripe redirects back to our success/cancel routes.
  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true); setSubmitError('')
    try {
      const { successUrl, cancelUrl } = API.checkoutReturn
      const { checkout, resumed } = await startCheckout(authFetch, { successUrl, cancelUrl })
      if (checkout?.url) {
        // A fresh checkout empties the cart backend-side, so sync local state.
        checkingOutRef.current = true
        clearCart()
        window.location.assign(checkout.url)   // hand off to Stripe's hosted page
        return
      }
      // 409 → an order is already awaiting payment; the hosted session can't be
      // resumed by redirect, so tell the user rather than dead-ending.
      setSubmitError(resumed
        ? 'You already have an order awaiting payment — see Purchase History in your account.'
        : 'Could not start checkout. Please try again.')
    } catch (err) {
      logger.error('Checkout failed:', err.message ?? err)
      setSubmitError(err.message || 'Could not start checkout. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Checkout form ─────────────────────────────────────────────────────────
  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Page header */}
      <Box sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', py: { xs: 2.5, md: 3.5 } }}>
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="overline" sx={{ color: 'secondary.dark', letterSpacing: '0.2em', display: 'block', mb: 0.5 }}>Secure Checkout</Typography>
              <Typography variant="h2" sx={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: { xs: '1.8rem', md: '2.4rem' }, lineHeight: 1 }}>
                Review & Pay
              </Typography>
            </Box>
            <Button
              startIcon={<ArrowBack sx={{ fontSize: 15 }} />}
              onClick={() => navigate('/cart')}
              sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 300, fontSize: '0.82rem', letterSpacing: '0.03em', '&:hover': { color: 'text.primary', bgcolor: 'transparent' } }}
            >
              Back to bag
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Grid container spacing={{ xs: 3, md: 5 }}>

          {/* ── Left column: address + payment ── */}
          <Grid item xs={12} md={7} lg={7.5}>

            {/* Address */}
            <SectionCard
              icon={<HomeOutlined sx={{ fontSize: 17 }} />}
              title="Shipping Address"
              badge={
                address && Object.values(address).some(Boolean)
                  ? <Chip label="Default" size="small" sx={{ height: 18, fontSize: '0.58rem', letterSpacing: '0.07em', bgcolor: 'rgba(200,169,110,0.12)', color: 'secondary.dark', borderRadius: 0.75, ml: 1 }} />
                  : null
              }
            >
              {loadingProfile ? (
                <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>Loading…</Typography>
              ) : (
                <AddressBlock address={address ?? {}} onChange={setAddress} />
              )}
            </SectionCard>

            {/* Payment */}
            <SectionCard
              icon={<CreditCardOutlined sx={{ fontSize: 17 }} />}
              title="Payment"
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <LockOutlined sx={{ fontSize: 18, color: 'secondary.dark' }} />
                <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', lineHeight: 1.5 }}>
                  You’ll enter your card securely with <strong>Stripe</strong> on the next step —
                  we never store your card details.
                </Typography>
              </Box>
            </SectionCard>

            {profileError && (
              <Alert severity="warning" action={<Button size="small" onClick={loadProfile}>Retry</Button>} sx={{ mb: 3, fontSize: '0.78rem' }}>
                {profileError} — you can still enter details manually.
              </Alert>
            )}
          </Grid>

          {/* ── Right column: order summary ── */}
          <Grid item xs={12} md={5} lg={4.5}>
            <Box sx={{ position: 'sticky', top: 88 }}>

              {/* Items */}
              <SectionCard icon={<ReceiptLongOutlined sx={{ fontSize: 17 }} />} title={`Order Summary (${items.length} ${items.length === 1 ? 'product' : 'products'} · ${totalQuantity} ${totalQuantity === 1 ? 'unit' : 'units'})`}>
                <OrderItemsList items={items} />
              </SectionCard>

              {/* Totals */}
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', mb: 3 }}>
                <Box sx={{ px: 2.5, py: 2.5 }}>
                  <TotalsPanel subtotal={subtotal} />
                </Box>

                {/* Place order button */}
                <Box sx={{ px: 2.5, pb: 2.5 }}>
                  {submitError && (
                    <Alert severity="error" sx={{ mb: 2, fontSize: '0.74rem', py: 0.5 }} onClose={() => setSubmitError('')}>
                      {submitError}
                    </Alert>
                  )}

                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    startIcon={
                      submitting
                        ? <CircularProgress size={16} sx={{ color: 'inherit' }} />
                        : <LockOutlined sx={{ fontSize: 16 }} />
                    }
                    sx={{ py: 1.5, fontSize: '0.74rem', letterSpacing: '0.1em' }}
                  >
                    {submitting ? 'Starting checkout…' : `Continue to Payment · ${fmt(total)}`}
                  </Button>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75, mt: 1.5 }}>
                    <LockOutlined sx={{ fontSize: 12, color: 'text.secondary' }} />
                    <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', letterSpacing: '0.04em' }}>
                      Secured · Demo mode — no real charge
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}
