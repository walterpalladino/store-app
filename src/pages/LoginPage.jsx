import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  Box, Container, Typography, TextField, Button, Divider,
  IconButton, InputAdornment, Alert, CircularProgress, Tabs, Tab,
  Fade, Chip,
} from '@mui/material'
import {
  Visibility, VisibilityOff, ArrowBack, PersonOutline,
  LockOutlined, EmailOutlined, BadgeOutlined, CheckCircleOutline,
} from '@mui/icons-material'
import { useAuth } from '../context/AuthContext'

// ---------------------------------------------------------------------------
// Shared styled field wrapper
// ---------------------------------------------------------------------------
function AuthField({ label, name, type = 'text', value, onChange, error, helperText, icon, endAdornment, autoComplete }) {
  return (
    <TextField
      fullWidth
      size="small"
      label={label}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      error={error}
      helperText={helperText}
      autoComplete={autoComplete}
      InputProps={{
        startAdornment: icon ? (
          <InputAdornment position="start">
            <Box sx={{ color: error ? 'error.main' : 'text.secondary', display: 'flex' }}>{icon}</Box>
          </InputAdornment>
        ) : undefined,
        endAdornment,
      }}
      sx={{
        '& .MuiInputLabel-root': { fontFamily: '"DM Sans", sans-serif', fontSize: '0.82rem' },
        '& .MuiOutlinedInput-root': {
          fontFamily: '"DM Sans", sans-serif',
          fontSize: '0.88rem',
          '& fieldset': { borderColor: 'rgba(26,26,26,0.2)', transition: 'border-color 0.2s' },
          '&:hover fieldset': { borderColor: 'rgba(26,26,26,0.5)' },
          '&.Mui-focused fieldset': { borderColor: 'primary.main' },
        },
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// Login form
// ---------------------------------------------------------------------------
function LoginForm({ onSuccess }) {
  const { login } = useAuth()
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: '' }))
    setError('')
  }

  const validate = () => {
    const errs = {}
    if (!form.username.trim()) errs.username = 'Username is required'
    if (!form.password) errs.password = 'Password is required'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }

    setLoading(true)
    setError('')
    try {
      await login(form.username.trim(), form.password)
      onSuccess()
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {error && (
        <Fade in>
          <Alert severity="error" sx={{ fontSize: '0.78rem', py: 0.5 }}>{error}</Alert>
        </Fade>
      )}

      <AuthField
        label="Username"
        name="username"
        value={form.username}
        onChange={handleChange}
        error={!!fieldErrors.username}
        helperText={fieldErrors.username}
        autoComplete="username"
        icon={<PersonOutline sx={{ fontSize: 17 }} />}
      />

      <AuthField
        label="Password"
        name="password"
        type={showPassword ? 'text' : 'password'}
        value={form.password}
        onChange={handleChange}
        error={!!fieldErrors.password}
        helperText={fieldErrors.password}
        autoComplete="current-password"
        icon={<LockOutlined sx={{ fontSize: 17 }} />}
        endAdornment={
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => setShowPassword((v) => !v)} edge="end" tabIndex={-1}>
              {showPassword ? <VisibilityOff sx={{ fontSize: 17 }} /> : <Visibility sx={{ fontSize: 17 }} />}
            </IconButton>
          </InputAdornment>
        }
      />

      {/* Demo hint */}
      <Box
        sx={{
          bgcolor: 'rgba(200,169,110,0.1)',
          border: '1px solid rgba(200,169,110,0.3)',
          borderRadius: 1,
          px: 2,
          py: 1.25,
        }}
      >
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mb: 0.25, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 500 }}>
          Demo credentials
        </Typography>
        <Typography sx={{ fontSize: '0.78rem', color: 'text.primary', fontFamily: 'monospace' }}>
          username: <strong>emilys</strong> &nbsp;·&nbsp; password: <strong>emilyspass</strong>
        </Typography>
      </Box>

      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={loading}
        sx={{ py: 1.4, mt: 0.5, fontSize: '0.72rem', letterSpacing: '0.1em' }}
      >
        {loading ? <CircularProgress size={18} sx={{ color: 'primary.contrastText' }} /> : 'Sign In'}
      </Button>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Register form
// ---------------------------------------------------------------------------
function RegisterForm({ onRegistered }) {
  const { register } = useAuth()
  const [form, setForm] = useState({
    firstName: '', lastName: '', username: '', email: '', password: '', confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: '' }))
    setError('')
  }

  const validate = () => {
    const errs = {}
    if (!form.firstName.trim()) errs.firstName = 'Required'
    if (!form.lastName.trim()) errs.lastName = 'Required'
    if (!form.username.trim()) errs.username = 'Username is required'
    else if (form.username.length < 3) errs.username = 'Min 3 characters'
    if (!form.email.trim()) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email'
    if (!form.password) errs.password = 'Password is required'
    else if (form.password.length < 6) errs.password = 'Min 6 characters'
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }

    setLoading(true)
    setError('')
    try {
      const created = await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      onRegistered(created)
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {error && (
        <Fade in>
          <Alert severity="error" sx={{ fontSize: '0.78rem', py: 0.5 }}>{error}</Alert>
        </Fade>
      )}

      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <AuthField label="First Name" name="firstName" value={form.firstName} onChange={handleChange}
          error={!!fieldErrors.firstName} helperText={fieldErrors.firstName} autoComplete="given-name"
          icon={<BadgeOutlined sx={{ fontSize: 17 }} />} />
        <AuthField label="Last Name" name="lastName" value={form.lastName} onChange={handleChange}
          error={!!fieldErrors.lastName} helperText={fieldErrors.lastName} autoComplete="family-name" />
      </Box>

      <AuthField label="Username" name="username" value={form.username} onChange={handleChange}
        error={!!fieldErrors.username} helperText={fieldErrors.username} autoComplete="username"
        icon={<PersonOutline sx={{ fontSize: 17 }} />} />

      <AuthField label="Email Address" name="email" type="email" value={form.email} onChange={handleChange}
        error={!!fieldErrors.email} helperText={fieldErrors.email} autoComplete="email"
        icon={<EmailOutlined sx={{ fontSize: 17 }} />} />

      <AuthField
        label="Password"
        name="password"
        type={showPassword ? 'text' : 'password'}
        value={form.password}
        onChange={handleChange}
        error={!!fieldErrors.password}
        helperText={fieldErrors.password}
        autoComplete="new-password"
        icon={<LockOutlined sx={{ fontSize: 17 }} />}
        endAdornment={
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => setShowPassword((v) => !v)} edge="end" tabIndex={-1}>
              {showPassword ? <VisibilityOff sx={{ fontSize: 17 }} /> : <Visibility sx={{ fontSize: 17 }} />}
            </IconButton>
          </InputAdornment>
        }
      />

      <AuthField label="Confirm Password" name="confirmPassword" type={showPassword ? 'text' : 'password'}
        value={form.confirmPassword} onChange={handleChange}
        error={!!fieldErrors.confirmPassword} helperText={fieldErrors.confirmPassword}
        autoComplete="new-password" icon={<LockOutlined sx={{ fontSize: 17 }} />} />

      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={loading}
        sx={{ py: 1.4, mt: 0.5, fontSize: '0.72rem', letterSpacing: '0.1em' }}
      >
        {loading ? <CircularProgress size={18} sx={{ color: 'primary.contrastText' }} /> : 'Create Account'}
      </Button>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Registration success state
// ---------------------------------------------------------------------------
function RegisterSuccess({ user, onGoToLogin }) {
  return (
    <Fade in>
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <CheckCircleOutline sx={{ fontSize: 52, color: 'success.main', mb: 2 }} />
        <Typography variant="h4" sx={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 400, mb: 1 }}>
          Account Created
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 0.5, fontSize: '0.88rem' }}>
          Welcome, <strong>{user.firstName} {user.lastName}</strong>!
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, fontSize: '0.78rem' }}>
          Your account has been registered. Please sign in to continue.
        </Typography>
        <Alert severity="info" sx={{ textAlign: 'left', fontSize: '0.75rem', mb: 3 }}>
          This is a mock API — your account won't persist. Use the demo credentials on the sign-in tab.
        </Alert>
        <Button variant="contained" fullWidth onClick={onGoToLogin} sx={{ py: 1.4, fontSize: '0.72rem', letterSpacing: '0.1em' }}>
          Go to Sign In
        </Button>
      </Box>
    </Fade>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoggedIn } = useAuth()
  const [tab, setTab] = useState(location.state?.tab === 'register' ? 1 : 0)
  const [registeredUser, setRegisteredUser] = useState(null)

  const from = location.state?.from || '/'

  // Already logged in — redirect
  if (isLoggedIn) {
    navigate(from, { replace: true })
    return null
  }

  const handleLoginSuccess = () => {
    navigate(from, { replace: true })
  }

  const handleRegistered = (user) => {
    setRegisteredUser(user)
  }

  const handleGoToLogin = () => {
    setRegisteredUser(null)
    setTab(0)
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top back link */}
      <Box sx={{ pt: 3, px: { xs: 2, md: 5 } }}>
        <Button
          component={Link}
          to="/"
          startIcon={<ArrowBack sx={{ fontSize: 15 }} />}
          sx={{
            color: 'text.secondary',
            textTransform: 'none',
            fontWeight: 300,
            fontSize: '0.82rem',
            letterSpacing: '0.03em',
            '&:hover': { color: 'text.primary', bgcolor: 'transparent' },
          }}
        >
          Back to shop
        </Button>
      </Box>

      {/* Card */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 5,
          px: 2,
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 460,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          {/* Card header */}
          <Box
            sx={{
              background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
              px: 4,
              py: 3.5,
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Decorative ring */}
            <Box sx={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 200, height: 200, borderRadius: '50%',
              border: '1px solid rgba(200,169,110,0.15)',
              pointerEvents: 'none',
            }} />

            <Typography
              sx={{
                fontFamily: '"Cormorant Garamond", serif',
                fontWeight: 300,
                fontSize: '1.7rem',
                letterSpacing: '0.2em',
                color: '#f5f0e8',
                lineHeight: 1,
                mb: 0.25,
              }}
            >
              SHŌP
            </Typography>
            <Typography sx={{ fontSize: '0.58rem', letterSpacing: '0.3em', color: 'rgba(200,169,110,0.8)', textTransform: 'uppercase' }}>
              curated goods
            </Typography>
          </Box>

          {/* Gold accent */}
          <Box sx={{ height: '2px', background: 'linear-gradient(90deg, transparent, #c8a96e, transparent)' }} />

          {/* Tabs */}
          {!registeredUser && (
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              variant="fullWidth"
              sx={{
                borderBottom: '1px solid',
                borderColor: 'divider',
                '& .MuiTab-root': {
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.68rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  py: 1.75,
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: 'secondary.main',
                  height: 2,
                },
              }}
            >
              <Tab label="Sign In" />
              <Tab label="Register" />
            </Tabs>
          )}

          {/* Form body */}
          <Box sx={{ px: 4, py: 3.5 }}>
            {registeredUser ? (
              <RegisterSuccess user={registeredUser} onGoToLogin={handleGoToLogin} />
            ) : tab === 0 ? (
              <LoginForm onSuccess={handleLoginSuccess} />
            ) : (
              <RegisterForm onRegistered={handleRegistered} />
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
