import API from '../../config/api'
import { useState, useEffect, useCallback } from 'react'
import {
  Box, Typography, Grid, TextField, Button, Divider,
  InputAdornment, Alert, Collapse, CircularProgress,
  Fade, Skeleton, Chip,
} from '@mui/material'
import {
  HomeOutlined, LocationCityOutlined, FmdGoodOutlined,
  PublicOutlined, EditOutlined, SaveOutlined, CheckRounded,
  RefreshOutlined, MarkunreadMailboxOutlined,
} from '@mui/icons-material'
import { useAuth } from '../../context/AuthContext'

// ---------------------------------------------------------------------------
// Shared field style (same as UserSettings)
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
// Section wrapper (same visual pattern as UserSettings)
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
// Read-only address display card
// ---------------------------------------------------------------------------
function AddressCard({ address, onEdit }) {
  return (
    <Fade in>
      <Box>
        {/* Address display */}
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden',
            mb: 3,
          }}
        >
          {/* Card header */}
          <Box
            sx={{
              px: 3,
              py: 2,
              bgcolor: 'rgba(26,26,26,0.02)',
              borderBottom: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HomeOutlined sx={{ fontSize: 17, color: 'secondary.dark' }} />
              <Typography variant="h6" sx={{ color: 'text.primary', fontSize: '0.7rem' }}>
                Primary Address
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

          {/* Address lines */}
          <Box sx={{ px: 3, py: 2.5 }}>
            <Typography
              sx={{
                fontFamily: '"Cormorant Garamond", serif',
                fontSize: '1.05rem',
                fontWeight: 400,
                mb: 0.5,
                lineHeight: 1.4,
              }}
            >
              {address.address}
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', lineHeight: 1.6 }}>
              {address.city}, {address.state} {address.postalCode}
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
              {address.country}
            </Typography>
          </Box>

          {/* Formatted address row (visual details) */}
          <Box
            sx={{
              px: 3,
              py: 1.5,
              borderTop: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 3,
              bgcolor: 'rgba(26,26,26,0.01)',
            }}
          >
            {[
              { icon: <FmdGoodOutlined sx={{ fontSize: 13 }} />, label: 'Street', value: address.address },
              { icon: <LocationCityOutlined sx={{ fontSize: 13 }} />, label: 'City', value: address.city },
              { icon: <MarkunreadMailboxOutlined sx={{ fontSize: 13 }} />, label: 'Zip', value: address.postalCode },
              { icon: <PublicOutlined sx={{ fontSize: 13 }} />, label: 'Country', value: address.country },
            ].map(({ icon, label, value }) => (
              <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ color: 'text.secondary', display: 'flex' }}>{icon}</Box>
                <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                  {label}:{' '}
                  <Box component="span" sx={{ color: 'text.primary', fontWeight: 500 }}>
                    {value}
                  </Box>
                </Typography>
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
          Edit Address
        </Button>
      </Box>
    </Fade>
  )
}

// ---------------------------------------------------------------------------
// Editable address form
// ---------------------------------------------------------------------------
function AddressForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    address: initial?.address ?? '',
    city: initial?.city ?? '',
    state: initial?.state ?? '',
    postalCode: initial?.postalCode ?? '',
    country: initial?.country ?? '',
  })
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
    setErrors((p) => ({ ...p, [e.target.name]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.address.trim()) errs.address = 'Street address is required'
    if (!form.city.trim()) errs.city = 'City is required'
    if (!form.state.trim()) errs.state = 'State is required'
    if (!form.postalCode.trim()) errs.postalCode = 'ZIP / postal code is required'
    if (!form.country.trim()) errs.country = 'Country is required'
    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSave(form)
  }

  const fields = [
    {
      name: 'address', label: 'Street Address', xs: 12,
      icon: <FmdGoodOutlined sx={{ fontSize: 16, color: 'text.secondary' }} />,
      placeholder: '123 Main Street',
    },
    {
      name: 'city', label: 'City', xs: 12, sm: 6,
      icon: <LocationCityOutlined sx={{ fontSize: 16, color: 'text.secondary' }} />,
      placeholder: 'New York',
    },
    {
      name: 'state', label: 'State / Province', xs: 12, sm: 6,
      icon: null,
      placeholder: 'NY',
    },
    {
      name: 'postalCode', label: 'ZIP / Postal Code', xs: 12, sm: 6,
      icon: <MarkunreadMailboxOutlined sx={{ fontSize: 16, color: 'text.secondary' }} />,
      placeholder: '10001',
    },
    {
      name: 'country', label: 'Country', xs: 12, sm: 6,
      icon: <PublicOutlined sx={{ fontSize: 16, color: 'text.secondary' }} />,
      placeholder: 'United States',
    },
  ]

  return (
    <Fade in>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Grid container spacing={2.5}>
          {fields.map(({ name, label, xs, sm, icon, placeholder }) => (
            <Grid item xs={xs} sm={sm} key={name}>
              <TextField
                fullWidth
                size="small"
                name={name}
                label={label}
                value={form[name]}
                onChange={handleChange}
                error={!!errors[name]}
                helperText={errors[name]}
                placeholder={placeholder}
                InputProps={
                  icon
                    ? { startAdornment: <InputAdornment position="start">{icon}</InputAdornment> }
                    : undefined
                }
                sx={fieldSx}
              />
            </Grid>
          ))}
        </Grid>

        <Box sx={{ display: 'flex', gap: 1.5, mt: 3 }}>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            startIcon={
              saving
                ? <CircularProgress size={14} sx={{ color: 'inherit' }} />
                : <SaveOutlined sx={{ fontSize: 16 }} />
            }
            sx={{ fontSize: '0.7rem', letterSpacing: '0.08em', py: 1 }}
          >
            {saving ? 'Saving…' : 'Save Address'}
          </Button>
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={saving}
            sx={{ fontSize: '0.7rem', letterSpacing: '0.08em', py: 1 }}
          >
            Cancel
          </Button>
        </Box>
      </Box>
    </Fade>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------
function AddressSkeleton() {
  return (
    <Box>
      <Skeleton variant="rounded" height={160} sx={{ mb: 3, borderRadius: 2 }} />
      <Skeleton variant="rounded" width={140} height={36} sx={{ borderRadius: 1 }} />
    </Box>
  )
}

// ---------------------------------------------------------------------------
// AddressPanel — top-level export
// ---------------------------------------------------------------------------
export default function AddressPanel() {
  const { user, authFetch, updateUser } = useAuth()

  const [address, setAddress] = useState(null)   // null = not yet loaded
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  // ── Load address from DummyJSON /auth/me (authenticated) ────────────────
  const loadAddress = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const res = await authFetch(API.auth.me)
      if (!res.ok) throw new Error('Failed to load user data')
      const data = await res.json()
      // data.address = { address, city, state, stateCode, postalCode, country, coordinates }
      setAddress(data.address ?? null)
    } catch (err) {
      setLoadError(err.message || 'Could not load address.')
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => { loadAddress() }, [loadAddress])

  // ── Save via PATCH /users/:id ────────────────────────────────────────────
  const handleSave = async (formData) => {
    setSaving(true)
    setSaveError('')
    try {
      const res = await authFetch(API.users.byId(user.id), {
        method: 'PATCH',
        body: JSON.stringify({ address: formData }),
      })
      if (!res.ok) throw new Error('Failed to save address')
      const updated = await res.json()

      // DummyJSON echoes back the patched object
      const newAddress = updated.address ?? formData
      setAddress(newAddress)

      // Sync into AuthContext so other components see the latest address
      updateUser({ address: newAddress })

      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3500)
    } catch (err) {
      setSaveError(err.message || 'Could not save address. Please try again.')
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
          title="Saved Addresses"
          subtitle="Your primary shipping and billing address. Used at checkout to pre-fill delivery details."
        >
          {/* Feedback banners */}
          <Collapse in={!!loadError}>
            <Alert
              severity="error"
              action={
                <Button size="small" color="inherit" onClick={loadAddress} startIcon={<RefreshOutlined sx={{ fontSize: 14 }} />}
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
              Address saved successfully.
            </Alert>
          </Collapse>

          {/* Content */}
          {loading ? (
            <AddressSkeleton />
          ) : editing || !address ? (
            <AddressForm
              initial={address}
              onSave={handleSave}
              onCancel={address ? handleCancel : undefined}
              saving={saving}
            />
          ) : (
            <AddressCard address={address} onEdit={() => setEditing(true)} />
          )}
        </Section>
      </Box>
    </Fade>
  )
}
