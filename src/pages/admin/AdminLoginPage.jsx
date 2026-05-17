import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Box, Typography, TextField, Button, InputAdornment,
  IconButton, Alert, CircularProgress, Fade, Collapse,
} from '@mui/material'
import {
  PersonOutline, LockOutlined, Visibility, VisibilityOff,
  StorefrontOutlined,
} from '@mui/icons-material'
import { useMerchantAuth } from '../../context/MerchantAuthContext'

const fieldSx = {
  '& .MuiInputLabel-root': {
    fontFamily: '"DM Sans", sans-serif',
    fontSize: '0.82rem',
    color: 'rgba(245,240,232,0.5)',
  },
  '& .MuiInputLabel-root.Mui-focused': { color: '#c8a96e' },
  '& .MuiOutlinedInput-root': {
    fontFamily: '"DM Sans", sans-serif',
    fontSize: '0.88rem',
    color: '#f5f0e8',
    '& fieldset': { borderColor: 'rgba(245,240,232,0.15)' },
    '&:hover fieldset': { borderColor: 'rgba(245,240,232,0.35)' },
    '&.Mui-focused fieldset': { borderColor: '#c8a96e' },
  },
  '& .MuiInputAdornment-root svg': { color: 'rgba(245,240,232,0.4)' },
  '& input': { color: '#f5f0e8' },
  '& input:-webkit-autofill': {
    WebkitBoxShadow: '0 0 0 100px #1a1a1a inset',
    WebkitTextFillColor: '#f5f0e8',
  },
}

export default function AdminLoginPage() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const { login, isLoggedIn } = useMerchantAuth()

  const from = location.state?.from || '/admin'

  const [form, setForm]       = useState({ username: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  if (isLoggedIn) { navigate(from, { replace: true }); return null }

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
    setFieldErrors((p) => ({ ...p, [e.target.name]: '' }))
    setError('')
  }

  const validate = () => {
    const errs = {}
    if (!form.username.trim()) errs.username = 'Required'
    if (!form.password)        errs.password = 'Required'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setLoading(true)
    try {
      await login(form.username.trim(), form.password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#0d0d0d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background grid texture */}
      <Box sx={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(245,240,232,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(245,240,232,0.03) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      {/* Glow */}
      <Box sx={{
        position: 'absolute', top: '-20%', left: '50%',
        transform: 'translateX(-50%)',
        width: 600, height: 400,
        background: 'radial-gradient(ellipse, rgba(200,169,110,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <Box sx={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          {/* Logo mark */}
          <Box
            sx={{
              width: 56, height: 56,
              bgcolor: '#c8a96e',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              mx: 'auto', mb: 2.5,
            }}
          >
            <StorefrontOutlined sx={{ fontSize: 26, color: '#0d0d0d' }} />
          </Box>

          <Typography
            sx={{
              fontFamily: '"Cormorant Garamond", serif',
              fontWeight: 300,
              fontSize: '1.6rem',
              letterSpacing: '0.25em',
              color: '#f5f0e8',
              lineHeight: 1,
              mb: 0.5,
            }}
          >
            SHŌP
          </Typography>
          <Typography sx={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.62rem', letterSpacing: '0.3em', color: '#c8a96e', textTransform: 'uppercase' }}>
            Merchant Admin
          </Typography>
        </Box>

        {/* Card */}
        <Box
          sx={{
            bgcolor: '#1a1a1a',
            border: '1px solid rgba(245,240,232,0.08)',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          {/* Gold top accent */}
          <Box sx={{ height: '2px', background: 'linear-gradient(90deg, transparent, #c8a96e, transparent)' }} />

          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ p: 3.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Collapse in={!!error}>
              <Alert
                severity="error"
                sx={{
                  bgcolor: 'rgba(184,92,74,0.12)', color: '#f0ebe0',
                  border: '1px solid rgba(184,92,74,0.3)',
                  fontSize: '0.78rem',
                  '& .MuiAlert-icon': { color: '#b85c4a' },
                }}
              >
                {error}
              </Alert>
            </Collapse>

            <TextField
              fullWidth size="small"
              label="Username"
              name="username"
              value={form.username}
              onChange={handleChange}
              error={!!fieldErrors.username}
              helperText={fieldErrors.username}
              autoComplete="username"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutline sx={{ fontSize: 17 }} />
                  </InputAdornment>
                ),
              }}
              sx={fieldSx}
            />

            <TextField
              fullWidth size="small"
              label="Password"
              name="password"
              type={showPwd ? 'text' : 'password'}
              value={form.password}
              onChange={handleChange}
              error={!!fieldErrors.password}
              helperText={fieldErrors.password}
              autoComplete="current-password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined sx={{ fontSize: 17 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPwd((v) => !v)} edge="end" tabIndex={-1} sx={{ color: 'rgba(245,240,232,0.4)' }}>
                      {showPwd ? <VisibilityOff sx={{ fontSize: 17 }} /> : <Visibility sx={{ fontSize: 17 }} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={fieldSx}
            />

            {/* Demo hint */}
            <Box sx={{ bgcolor: 'rgba(200,169,110,0.08)', border: '1px solid rgba(200,169,110,0.2)', borderRadius: 1, px: 2, py: 1.25 }}>
              <Typography sx={{ fontSize: '0.62rem', color: 'rgba(245,240,232,0.4)', mb: 0.25, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: '"DM Sans", sans-serif' }}>
                Demo credentials
              </Typography>
              <Typography sx={{ fontSize: '0.78rem', color: 'rgba(245,240,232,0.7)', fontFamily: 'monospace' }}>
                username: <strong style={{ color: '#c8a96e' }}>emilys</strong> · password: <strong style={{ color: '#c8a96e' }}>emilyspass</strong>
              </Typography>
            </Box>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{
                mt: 0.5, py: 1.4,
                fontSize: '0.72rem', letterSpacing: '0.1em',
                bgcolor: '#c8a96e', color: '#0d0d0d',
                fontFamily: '"DM Sans", sans-serif', fontWeight: 500,
                '&:hover': { bgcolor: '#d9c49a' },
                '&:disabled': { bgcolor: 'rgba(200,169,110,0.3)', color: 'rgba(13,13,13,0.4)' },
              }}
            >
              {loading ? <CircularProgress size={18} sx={{ color: '#0d0d0d' }} /> : 'Sign In to Admin'}
            </Button>
          </Box>
        </Box>

        {/* Back to store */}
        <Box sx={{ textAlign: 'center', mt: 2.5 }}>
          <Button
            onClick={() => navigate('/')}
            sx={{ color: 'rgba(245,240,232,0.35)', fontSize: '0.72rem', fontFamily: '"DM Sans", sans-serif', letterSpacing: '0.05em', '&:hover': { color: 'rgba(245,240,232,0.7)', bgcolor: 'transparent' } }}
          >
            ← Back to store
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
