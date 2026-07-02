import API from '../../config/api'
import { unwrap } from '../../utils/apiUtils'
import { useState, useEffect, useCallback } from 'react'
import {
  Box, Typography, Grid, TextField, Button, Divider,
  InputAdornment, Alert, Collapse, CircularProgress,
  Fade, Skeleton, Chip, MenuItem,
} from '@mui/material'
import {
  CreditCardOutlined, EditOutlined, SaveOutlined,
  CheckRounded, RefreshOutlined, LockOutlined,
  CalendarTodayOutlined,
} from '@mui/icons-material'
import { useAuth } from '../../context/AuthContext'

// ---------------------------------------------------------------------------
// Shared field style (consistent with the rest of the user pages)
// ---------------------------------------------------------------------------
const fieldSx = {
  '& .MuiInputLabel-root': { fontFamily: '"DM Sans", sans-serif', fontSize: '0.82rem' },
  '& .MuiOutlinedInput-root': {
    fontFamily: '"DM Sans", sans-serif',
    fontSize: '0.88rem',
    '& fieldset': { borderColor: 'rgba(26,26,26,0.2)', transition: 'border-color 0.2s' },
    '&:hover fieldset': { borderColor: 'rgba(26,26,26,0.45)' },
    '&.Mui-focused fieldset': { borderColor: 'primary.main' },
  },
  '& .Mui-disabled': {
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(26,26,26,0.1) !important' },
    '-webkit-text-fill-color': '#6b6560 !important',
  },
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------
function Section({ title, subtitle, children }) {
  return (
    <Box sx={{ mb: 5 }}>
      <Box sx={{ mb: 2.5 }}>
        <Typography
          sx={{
            fontFamily: '"Cormorant Garamond", serif',
            fontSize: '1.35rem',
            fontWeight: 400,
            lineHeight: 1.2,
            mb: 0.4,
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      <Divider sx={{ mb: 3 }} />
      {children}
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Map card type string → brand colour palette for the visual card
const CARD_BRAND_STYLES = {
  visa:       { bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', accent: '#c8a96e', label: 'VISA' },
  mastercard: { bg: 'linear-gradient(135deg, #1a1a1a 0%, #2d0a0a 100%)', accent: '#eb5757', label: 'Mastercard' },
  amex:       { bg: 'linear-gradient(135deg, #0d2137 0%, #1a3a5c 100%)', accent: '#4db8ff', label: 'Amex' },
  discover:   { bg: 'linear-gradient(135deg, #1a1205 0%, #3d2a00 100%)', accent: '#f5a623', label: 'Discover' },
  elo:        { bg: 'linear-gradient(135deg, #0a1a0a 0%, #1a3320 100%)', accent: '#4caf7d', label: 'Elo' },
  default:    { bg: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)', accent: '#c8a96e', label: '' },
}

function getBrandStyle(cardType) {
  const key = (cardType ?? '').toLowerCase()
  return CARD_BRAND_STYLES[key] ?? CARD_BRAND_STYLES.default
}

// Format a raw card number into groups of 4, masking all but the last 4
function maskCardNumber(raw) {
  const digits = raw?.replace(/\D/g, '') ?? ''
  if (!digits) return '•••• •••• •••• ••••'
  const last4 = digits.slice(-4)
  return `•••• •••• •••• ${last4}`
}

// Validate MM/YY expiry
function isExpired(expire) {
  if (!expire) return false
  const [mm, yy] = expire.split('/')
  if (!mm || !yy) return false
  const exp = new Date(2000 + parseInt(yy, 10), parseInt(mm, 10) - 1, 1)
  return exp < new Date()
}

// ---------------------------------------------------------------------------
// Visual credit card — the "read" view
// ---------------------------------------------------------------------------
function CreditCardVisual({ bank }) {
  const brand = getBrandStyle(bank.cardType)
  const expired = isExpired(bank.cardExpire)

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 380,
        aspectRatio: '1.586',          // ISO 7810 ID-1 ratio
        borderRadius: 3,
        background: brand.bg,
        p: 3,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 16px 48px rgba(26,26,26,0.22)',
        userSelect: 'none',
      }}
    >
      {/* Decorative circles */}
      <Box sx={{
        position: 'absolute', top: -40, right: -40,
        width: 180, height: 180, borderRadius: '50%',
        background: `radial-gradient(circle, ${brand.accent}22 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <Box sx={{
        position: 'absolute', bottom: -60, left: -20,
        width: 220, height: 220, borderRadius: '50%',
        background: `radial-gradient(circle, ${brand.accent}11 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Top row: chip + brand label */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 'auto' }}>
        {/* SIM chip */}
        <Box
          sx={{
            width: 42,
            height: 32,
            borderRadius: 1,
            background: 'linear-gradient(135deg, #d4a843 0%, #f0c96e 40%, #b8882c 100%)',
            border: '1px solid rgba(255,255,255,0.15)',
            position: 'relative',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {/* Chip lines */}
          {[6, 13, 20].map((top) => (
            <Box key={top} sx={{
              position: 'absolute', top, left: 0, right: 0,
              height: '1px', bgcolor: 'rgba(0,0,0,0.15)',
            }} />
          ))}
          <Box sx={{
            position: 'absolute', top: 0, bottom: 0, left: 14, right: 14,
            borderLeft: '1px solid rgba(0,0,0,0.15)',
            borderRight: '1px solid rgba(0,0,0,0.15)',
          }} />
        </Box>

        {/* Card type label */}
        <Typography sx={{
          fontFamily: brand.label === 'VISA' ? '"Cormorant Garamond", serif' : '"DM Sans", sans-serif',
          fontSize: brand.label === 'VISA' ? '1.5rem' : '0.85rem',
          fontWeight: brand.label === 'VISA' ? 300 : 600,
          color: brand.accent,
          letterSpacing: brand.label === 'VISA' ? '0.15em' : '0.02em',
          mt: 0.25,
          textTransform: 'uppercase',
        }}>
          {brand.label || bank.cardType}
        </Typography>
      </Box>

      {/* Card number */}
      <Box sx={{ mt: 3, mb: 2.5 }}>
        <Typography sx={{
          fontFamily: '"DM Sans", sans-serif',
          fontSize: { xs: '1rem', sm: '1.15rem' },
          fontWeight: 300,
          color: 'rgba(255,255,255,0.9)',
          letterSpacing: '0.18em',
        }}>
          {maskCardNumber(bank.cardNumber)}
        </Typography>
      </Box>

      {/* Bottom row: expiry + lock */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{
            fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.45)', mb: 0.25,
          }}>
            Expires
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography sx={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.88rem',
              fontWeight: 400,
              color: expired ? '#eb5757' : 'rgba(255,255,255,0.85)',
              letterSpacing: '0.08em',
            }}>
              {bank.cardExpire || '••/••'}
            </Typography>
            {expired && (
              <Chip
                label="Expired"
                size="small"
                sx={{
                  height: 16,
                  fontSize: '0.55rem',
                  letterSpacing: '0.06em',
                  bgcolor: 'rgba(235,87,87,0.2)',
                  color: '#eb5757',
                  borderRadius: 0.5,
                }}
              />
            )}
          </Box>
        </Box>

        <LockOutlined sx={{ fontSize: 16, color: 'rgba(255,255,255,0.25)' }} />
      </Box>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Read-only card view
// ---------------------------------------------------------------------------
function PaymentCard({ bank, onEdit }) {
  const expired = isExpired(bank.cardExpire)

  return (
    <Fade in>
      <Box>
        {/* Visual card */}
        <Box sx={{ mb: 3 }}>
          <CreditCardVisual bank={bank} />
        </Box>

        {/* Detail rows */}
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden',
            mb: 3,
          }}
        >
          {/* Header */}
          <Box sx={{
            px: 3, py: 2,
            bgcolor: 'rgba(26,26,26,0.02)',
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CreditCardOutlined sx={{ fontSize: 17, color: 'secondary.dark' }} />
              <Typography variant="h6" sx={{ color: 'text.primary', fontSize: '0.7rem' }}>
                Primary Card
              </Typography>
            </Box>
            <Chip
              label="Default"
              size="small"
              sx={{
                height: 20,
                fontSize: '0.6rem',
                letterSpacing: '0.08em',
                bgcolor: 'rgba(200,169,110,0.12)',
                color: 'secondary.dark',
                borderRadius: 1,
              }}
            />
          </Box>

          {/* Detail grid */}
          <Box sx={{ px: 3, py: 0 }}>
            {[
              {
                label: 'Card Number',
                value: maskCardNumber(bank.cardNumber),
                mono: true,
              },
              {
                label: 'Card Type',
                value: bank.cardType,
              },
              {
                label: 'Expiry Date',
                value: bank.cardExpire,
                chip: expired ? { label: 'Expired', color: '#eb5757', bg: 'rgba(235,87,87,0.1)' } : null,
              },
            ].map(({ label, value, mono, chip }, idx, arr) => (
              <Box
                key={label}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  py: 1.75,
                  borderBottom: idx < arr.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                }}
              >
                <Typography sx={{
                  fontSize: '0.65rem',
                  color: 'text.secondary',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  fontWeight: 500,
                }}>
                  {label}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{
                    fontSize: '0.85rem',
                    fontFamily: mono ? 'monospace' : '"DM Sans", sans-serif',
                    fontWeight: mono ? 400 : 400,
                    letterSpacing: mono ? '0.1em' : 'normal',
                    color: 'text.primary',
                  }}>
                    {value}
                  </Typography>
                  {chip && (
                    <Chip
                      label={chip.label}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.6rem',
                        bgcolor: chip.bg,
                        color: chip.color,
                        borderRadius: 0.5,
                      }}
                    />
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        <Button
          variant="outlined"
          onClick={onEdit}
          startIcon={<EditOutlined sx={{ fontSize: 16 }} />}
          sx={{ fontSize: '0.7rem', letterSpacing: '0.08em', py: 1 }}
        >
          Edit Card
        </Button>
      </Box>
    </Fade>
  )
}

// ---------------------------------------------------------------------------
// Card number input — formats as groups of 4 digits
// ---------------------------------------------------------------------------
function formatCardNumber(value) {
  const digits = value.replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

// Expiry input — auto-inserts slash after MM
function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return digits
}

// ---------------------------------------------------------------------------
// Edit form
// ---------------------------------------------------------------------------
const CARD_TYPES = ['Visa', 'Mastercard', 'Amex', 'Discover', 'Elo', 'Other']

function PaymentForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    cardNumber: initial?.cardNumber ?? '',
    cardType:   initial?.cardType ?? '',
    cardExpire: initial?.cardExpire ?? '',
  })
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    let { name, value } = e.target
    if (name === 'cardNumber') value = formatCardNumber(value)
    if (name === 'cardExpire') value = formatExpiry(value)
    setForm((p) => ({ ...p, [name]: value }))
    setErrors((p) => ({ ...p, [name]: '' }))
  }

  const validate = () => {
    const errs = {}
    const digits = form.cardNumber.replace(/\D/g, '')
    if (!digits) errs.cardNumber = 'Card number is required'
    else if (digits.length < 13 || digits.length > 19)
      errs.cardNumber = 'Enter a valid card number (13–19 digits)'

    if (!form.cardType.trim()) errs.cardType = 'Card type is required'

    const expMatch = /^(\d{2})\/(\d{2})$/.test(form.cardExpire)
    if (!form.cardExpire) errs.cardExpire = 'Expiry date is required'
    else if (!expMatch) errs.cardExpire = 'Use MM/YY format'
    return errs
  }

  // Button is disabled until all fields are validly filled
  const isComplete = (
    form.cardNumber.replace(/\D/g, '').length >= 13 &&
    form.cardType.trim() !== '' &&
    /^\d{2}\/\d{2}$/.test(form.cardExpire)
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    // Strip spaces before saving
    onSave({ ...form, cardNumber: form.cardNumber.replace(/\s/g, '') })
  }

  return (
    <Fade in>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Grid container spacing={2.5}>
          {/* Card number */}
          <Grid item xs={12}>
            <TextField
              fullWidth size="small"
              name="cardNumber"
              label="Card Number"
              value={form.cardNumber}
              onChange={handleChange}
              error={!!errors.cardNumber}
              helperText={errors.cardNumber || 'Shown masked — only the last 4 digits are displayed'}
              inputProps={{ maxLength: 19 }}
              placeholder="1234 5678 9012 3456"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CreditCardOutlined sx={{ fontSize: 16, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              sx={fieldSx}
            />
          </Grid>

          {/* Card type */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth size="small" select
              name="cardType"
              label="Card Type"
              value={form.cardType}
              onChange={handleChange}
              error={!!errors.cardType}
              helperText={errors.cardType}
              sx={fieldSx}
            >
              {CARD_TYPES.map((t) => (
                <MenuItem key={t} value={t}
                  sx={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.85rem' }}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Expiry */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth size="small"
              name="cardExpire"
              label="Expiry Date"
              value={form.cardExpire}
              onChange={handleChange}
              error={!!errors.cardExpire}
              helperText={errors.cardExpire}
              placeholder="MM/YY"
              inputProps={{ maxLength: 5 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarTodayOutlined sx={{ fontSize: 15, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              sx={fieldSx}
            />
          </Grid>
        </Grid>

        {/* Security note */}
        <Box sx={{
          mt: 2.5,
          px: 2,
          py: 1.5,
          borderRadius: 1.5,
          bgcolor: 'rgba(200,169,110,0.07)',
          border: '1px solid rgba(200,169,110,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}>
          <LockOutlined sx={{ fontSize: 15, color: 'secondary.dark', flexShrink: 0 }} />
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', lineHeight: 1.5 }}>
            This is a demo — card data is sent to the DummyJSON mock API and is not stored or processed.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, mt: 3 }}>
          <Button
            type="submit"
            variant="contained"
            disabled={!isComplete || saving}
            startIcon={
              saving
                ? <CircularProgress size={14} sx={{ color: 'inherit' }} />
                : <SaveOutlined sx={{ fontSize: 16 }} />
            }
            sx={{ fontSize: '0.7rem', letterSpacing: '0.08em', py: 1 }}
          >
            {saving ? 'Saving…' : 'Save Card'}
          </Button>
          {onCancel && (
            <Button
              variant="outlined"
              onClick={onCancel}
              disabled={saving}
              sx={{ fontSize: '0.7rem', letterSpacing: '0.08em', py: 1 }}
            >
              Cancel
            </Button>
          )}
        </Box>
      </Box>
    </Fade>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------
function PaymentSkeleton() {
  return (
    <Box>
      {/* Card visual skeleton */}
      <Skeleton
        variant="rounded"
        sx={{ maxWidth: 380, aspectRatio: '1.586', mb: 3, borderRadius: 3 }}
      />
      {/* Detail table skeleton */}
      <Skeleton variant="rounded" height={140} sx={{ mb: 3, borderRadius: 2 }} />
      <Skeleton variant="rounded" width={120} height={36} sx={{ borderRadius: 1 }} />
    </Box>
  )
}

// ---------------------------------------------------------------------------
// PaymentMethodsPanel — top-level export
// ---------------------------------------------------------------------------
export default function PaymentMethodsPanel() {
  const { user, authFetch, updateUser } = useAuth()

  const [bank, setBank]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [loadError, setLoadError] = useState('')
  const [editing, setEditing]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [saveError, setSaveError] = useState('')

  // ── Load bank info from /auth/me ─────────────────────────────────────────
  const loadBank = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const res  = await authFetch(API.auth.me)
      const data = await unwrap(res)   // { id, firstName, ..., address, bank, ... }
      setBank(data.bank ?? null)
    } catch (err) {
      setLoadError(err.message || 'Could not load payment methods.')
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => { loadBank() }, [loadBank])

  // ── Save via PATCH /users/:id ────────────────────────────────────────────
  const handleSave = async (formData) => {
    setSaving(true)
    setSaveError('')
    try {
      // Merge with existing bank data to preserve currency/iban fields
      const updatedBank = { ...(bank ?? {}), ...formData }

      const res     = await authFetch(API.users.byId(user.id), {
        method: 'PATCH',
        body:   JSON.stringify({ bank: updatedBank }),
      })
      const updated = await unwrap(res)   // { id, firstName, ..., bank, ... }
      const newBank = updated.bank ?? updatedBank
      setBank(newBank)
      updateUser({ bank: newBank })

      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3500)
    } catch (err) {
      setSaveError(err.message || 'Could not save card. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditing(false)
    setSaveError('')
  }

  return (
    <Fade in>
      <Box>
        <Section
          title="Payment Methods"
          subtitle="Your saved card for fast checkout. Only the last 4 digits are ever shown on screen."
        >
          {/* Feedback banners */}
          <Collapse in={!!loadError}>
            <Alert
              severity="error"
              action={
                <Button size="small" color="inherit" onClick={loadBank}
                  startIcon={<RefreshOutlined sx={{ fontSize: 14 }} />}
                  sx={{ fontSize: '0.68rem', letterSpacing: '0.05em' }}>
                  Retry
                </Button>
              }
              sx={{ mb: 2.5, fontSize: '0.78rem' }}
            >
              {loadError}
            </Alert>
          </Collapse>

          <Collapse in={!!saveError}>
            <Alert severity="error" sx={{ mb: 2.5, fontSize: '0.78rem' }} onClose={() => setSaveError('')}>
              {saveError}
            </Alert>
          </Collapse>

          <Collapse in={saved}>
            <Alert
              severity="success"
              icon={<CheckRounded fontSize="small" />}
              sx={{ mb: 2.5, fontSize: '0.78rem' }}
            >
              Payment method saved successfully.
            </Alert>
          </Collapse>

          {/* Content */}
          {loading ? (
            <PaymentSkeleton />
          ) : editing || !bank ? (
            <PaymentForm
              initial={bank}
              onSave={handleSave}
              onCancel={bank ? handleCancel : undefined}
              saving={saving}
            />
          ) : (
            <PaymentCard bank={bank} onEdit={() => setEditing(true)} />
          )}
        </Section>
      </Box>
    </Fade>
  )
}
