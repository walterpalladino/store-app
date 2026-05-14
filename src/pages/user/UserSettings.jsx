import API from '../../config/api'
import { useState } from 'react'
import {
  Box, Typography, Grid, TextField, Button, Divider, Avatar,
  InputAdornment, IconButton, Alert, Collapse, CircularProgress,
  Fade,
} from '@mui/material'
import {
  PersonOutline, EmailOutlined, PhoneOutlined, LockOutlined,
  EditOutlined, CheckRounded, Visibility, VisibilityOff,
  SaveOutlined,
} from '@mui/icons-material'
import { useAuth } from '../../context/AuthContext'

// ---------------------------------------------------------------------------
// Shared field style
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
// Profile section
// ---------------------------------------------------------------------------
function ProfileSection({ user }) {
  const { login } = useAuth()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
  })
  const [fieldErrors, setFieldErrors] = useState({})

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
    setFieldErrors((p) => ({ ...p, [e.target.name]: '' }))
    setError('')
  }

  const validate = () => {
    const errs = {}
    if (!form.firstName.trim()) errs.firstName = 'Required'
    if (!form.lastName.trim()) errs.lastName = 'Required'
    if (!form.email.trim()) errs.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email'
    return errs
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setSaving(true)
    setError('')
    try {
      // Simulate a PATCH /users/:id call — DummyJSON accepts but doesn't persist
      await fetch(API.users.byId(user.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
        }),
      })
      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Could not save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setForm({
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
    })
    setFieldErrors({})
    setError('')
    setEditing(false)
  }

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase()

  return (
    <Section
      title="Personal Information"
      subtitle="Your name and contact details as they appear on your account."
    >
      {/* Avatar row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 3.5 }}>
        <Avatar
          src={user?.image}
          sx={{
            width: 64,
            height: 64,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontSize: '1.2rem',
            fontWeight: 600,
            border: '3px solid',
            borderColor: 'background.default',
            boxShadow: '0 0 0 1px rgba(26,26,26,0.12)',
          }}
        >
          {!user?.image && initials}
        </Avatar>
        <Box>
          <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.1rem', fontWeight: 400 }}>
            {user?.firstName} {user?.lastName}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            @{user?.username}
          </Typography>
        </Box>
      </Box>

      <Collapse in={!!error}>
        <Alert severity="error" sx={{ mb: 2.5, fontSize: '0.78rem' }}>{error}</Alert>
      </Collapse>

      <Collapse in={saved}>
        <Alert severity="success" icon={<CheckRounded fontSize="small" />} sx={{ mb: 2.5, fontSize: '0.78rem' }}>
          Profile updated successfully.
        </Alert>
      </Collapse>

      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth size="small" label="First Name" name="firstName"
            value={form.firstName} onChange={handleChange}
            disabled={!editing}
            error={!!fieldErrors.firstName} helperText={fieldErrors.firstName}
            InputProps={{ startAdornment: <InputAdornment position="start"><PersonOutline sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment> }}
            sx={fieldSx}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth size="small" label="Last Name" name="lastName"
            value={form.lastName} onChange={handleChange}
            disabled={!editing}
            error={!!fieldErrors.lastName} helperText={fieldErrors.lastName}
            sx={fieldSx}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth size="small" label="Email Address" name="email" type="email"
            value={form.email} onChange={handleChange}
            disabled={!editing}
            error={!!fieldErrors.email} helperText={fieldErrors.email}
            InputProps={{ startAdornment: <InputAdornment position="start"><EmailOutlined sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment> }}
            sx={fieldSx}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth size="small" label="Phone Number (optional)" name="phone"
            value={form.phone} onChange={handleChange}
            disabled={!editing}
            InputProps={{ startAdornment: <InputAdornment position="start"><PhoneOutlined sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment> }}
            sx={fieldSx}
          />
        </Grid>
      </Grid>

      {/* Action buttons */}
      <Box sx={{ display: 'flex', gap: 1.5, mt: 3 }}>
        {editing ? (
          <>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : <SaveOutlined sx={{ fontSize: 16 }} />}
              sx={{ fontSize: '0.7rem', letterSpacing: '0.08em', py: 1 }}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
            <Button
              variant="outlined"
              onClick={handleCancel}
              disabled={saving}
              sx={{ fontSize: '0.7rem', letterSpacing: '0.08em', py: 1 }}
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            variant="outlined"
            onClick={() => setEditing(true)}
            startIcon={<EditOutlined sx={{ fontSize: 16 }} />}
            sx={{ fontSize: '0.7rem', letterSpacing: '0.08em', py: 1 }}
          >
            Edit Profile
          </Button>
        )}
      </Box>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Reset Password section
// ---------------------------------------------------------------------------
function ResetPasswordSection() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [show, setShow] = useState({ current: false, next: false, confirm: false })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [apiError, setApiError] = useState('')

  const toggleShow = (field) => setShow((p) => ({ ...p, [field]: !p[field] }))

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
    setErrors((p) => ({ ...p, [e.target.name]: '' }))
    setApiError('')
  }

  const validate = () => {
    const errs = {}
    if (!form.current) errs.current = 'Current password is required'
    if (!form.next) errs.next = 'New password is required'
    else if (form.next.length < 6) errs.next = 'Minimum 6 characters'
    if (!form.confirm) errs.confirm = 'Please confirm your new password'
    else if (form.next !== form.confirm) errs.confirm = 'Passwords do not match'
    if (form.current && form.next && form.current === form.next)
      errs.next = 'New password must differ from current'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    setApiError('')
    try {
      // Simulated — DummyJSON has no real password-change endpoint
      await new Promise((r) => setTimeout(r, 900))
      setSuccess(true)
      setForm({ current: '', next: '', confirm: '' })
      setTimeout(() => setSuccess(false), 4000)
    } catch {
      setApiError('Could not update password. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const endIcon = (field) => (
    <InputAdornment position="end">
      <IconButton size="small" tabIndex={-1} onClick={() => toggleShow(field)} edge="end">
        {show[field]
          ? <VisibilityOff sx={{ fontSize: 16 }} />
          : <Visibility sx={{ fontSize: 16 }} />}
      </IconButton>
    </InputAdornment>
  )

  return (
    <Section
      title="Reset Password"
      subtitle="Choose a strong password you haven't used before."
    >
      <Collapse in={!!apiError}>
        <Alert severity="error" sx={{ mb: 2.5, fontSize: '0.78rem' }}>{apiError}</Alert>
      </Collapse>
      <Collapse in={success}>
        <Alert severity="success" icon={<CheckRounded fontSize="small" />} sx={{ mb: 2.5, fontSize: '0.78rem' }}>
          Password updated successfully.
        </Alert>
      </Collapse>

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={8} md={6}>
            <TextField
              fullWidth size="small" label="Current Password" name="current"
              type={show.current ? 'text' : 'password'}
              value={form.current} onChange={handleChange}
              error={!!errors.current} helperText={errors.current}
              autoComplete="current-password"
              InputProps={{
                startAdornment: <InputAdornment position="start"><LockOutlined sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment>,
                endAdornment: endIcon('current'),
              }}
              sx={fieldSx}
            />
          </Grid>
          <Grid item xs={12} />
          <Grid item xs={12} sm={8} md={6}>
            <TextField
              fullWidth size="small" label="New Password" name="next"
              type={show.next ? 'text' : 'password'}
              value={form.next} onChange={handleChange}
              error={!!errors.next} helperText={errors.next}
              autoComplete="new-password"
              InputProps={{
                startAdornment: <InputAdornment position="start"><LockOutlined sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment>,
                endAdornment: endIcon('next'),
              }}
              sx={fieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={8} md={6}>
            <TextField
              fullWidth size="small" label="Confirm New Password" name="confirm"
              type={show.confirm ? 'text' : 'password'}
              value={form.confirm} onChange={handleChange}
              error={!!errors.confirm} helperText={errors.confirm}
              autoComplete="new-password"
              InputProps={{
                startAdornment: <InputAdornment position="start"><LockOutlined sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment>,
                endAdornment: endIcon('confirm'),
              }}
              sx={fieldSx}
            />
          </Grid>
        </Grid>

        {/* Password strength hints */}
        <Box sx={{ mt: 2, mb: 3 }}>
          {[
            { label: 'At least 6 characters', met: form.next.length >= 6 },
            { label: 'Passwords match', met: form.next.length > 0 && form.next === form.confirm },
            { label: 'Different from current', met: form.current.length > 0 && form.next.length > 0 && form.current !== form.next },
          ].map(({ label, met }) => (
            <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
              <Box sx={{
                width: 6, height: 6, borderRadius: '50%',
                bgcolor: met ? 'success.main' : 'rgba(26,26,26,0.18)',
                transition: 'background-color 0.25s',
                flexShrink: 0,
              }} />
              <Typography sx={{ fontSize: '0.72rem', color: met ? 'success.main' : 'text.secondary', transition: 'color 0.25s' }}>
                {label}
              </Typography>
            </Box>
          ))}
        </Box>

        <Button
          type="submit"
          variant="contained"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : <LockOutlined sx={{ fontSize: 16 }} />}
          sx={{ fontSize: '0.7rem', letterSpacing: '0.08em', py: 1 }}
        >
          {saving ? 'Updating…' : 'Update Password'}
        </Button>
      </Box>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
export default function UserSettings() {
  const { user } = useAuth()

  return (
    <Fade in>
      <Box>
        <ProfileSection user={user} />
        <ResetPasswordSection />
      </Box>
    </Fade>
  )
}
