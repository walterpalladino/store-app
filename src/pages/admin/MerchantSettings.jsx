import { useState } from 'react'
import {
  Box, Typography, Divider, Grid, TextField, Button, Avatar,
  InputAdornment, Alert, Collapse, CircularProgress, Chip, Fade,
} from '@mui/material'
import {
  StorefrontOutlined, EmailOutlined, PhoneOutlined,
  LanguageOutlined, EditOutlined, SaveOutlined, CheckRounded,
} from '@mui/icons-material'
import { useMerchantAuth } from '../../context/MerchantAuthContext'
import API from '../../config/api'
import { unwrap } from '../../utils/apiUtils'

const fieldSx = {
  '& .MuiInputLabel-root': { fontFamily: '"DM Sans", sans-serif', fontSize: '0.82rem' },
  '& .MuiOutlinedInput-root': {
    fontFamily: '"DM Sans", sans-serif', fontSize: '0.88rem',
    '& fieldset': { borderColor: 'rgba(26,26,26,0.2)', transition: 'border-color 0.2s' },
    '&:hover fieldset': { borderColor: 'rgba(26,26,26,0.45)' },
    '&.Mui-focused fieldset': { borderColor: 'primary.main' },
  },
  '& .Mui-disabled': {
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(26,26,26,0.1) !important' },
    '-webkit-text-fill-color': '#6b6560 !important',
  },
}

function Section({ title, subtitle, children }) {
  return (
    <Box sx={{ mb: 5 }}>
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.35rem', fontWeight: 400, lineHeight: 1.2, mb: 0.4 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>{subtitle}</Typography>
        )}
      </Box>
      <Divider sx={{ mb: 3 }} />
      {children}
    </Box>
  )
}

export default function MerchantSettings() {
  const { user, updateMerchant, merchantFetch } = useMerchantAuth()
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState('')

  const [form, setForm] = useState({
    firstName:   user?.firstName   ?? '',
    lastName:    user?.lastName    ?? '',
    email:       user?.email       ?? '',
    phone:       user?.phone       ?? '',
    storeName:   user?.company?.name  ?? 'My Store',
    storeUrl:    user?.company?.address?.city ?? '',
    department:  user?.company?.department ?? '',
  })

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      const res = await fetch(API.users.byId(user.id), {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone }),
      })
      await unwrap(res)
      updateMerchant({ firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone })
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { setError('Could not save. Please try again.') }
    finally { setSaving(false) }
  }

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase()

  return (
    <Fade in>
      <Box>
        {/* Profile section */}
        <Section title="Merchant Profile" subtitle="Your personal details and store information.">
          {/* Avatar row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 3.5 }}>
            <Avatar src={user?.image} sx={{ width: 64, height: 64, bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: '1.2rem', fontWeight: 600, border: '3px solid', borderColor: 'background.default', boxShadow: '0 0 0 1px rgba(26,26,26,0.12)' }}>
              {!user?.image && initials}
            </Avatar>
            <Box>
              <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.1rem', fontWeight: 400 }}>
                {user?.firstName} {user?.lastName}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>@{user?.username}</Typography>
                <Chip label="Merchant" size="small" sx={{ height: 18, fontSize: '0.58rem', letterSpacing: '0.08em', bgcolor: 'rgba(200,169,110,0.12)', color: 'secondary.dark', borderRadius: 1 }} />
              </Box>
            </Box>
          </Box>

          <Collapse in={!!error}>
            <Alert severity="error" sx={{ mb: 2.5, fontSize: '0.78rem' }}>{error}</Alert>
          </Collapse>
          <Collapse in={saved}>
            <Alert severity="success" icon={<CheckRounded fontSize="small" />} sx={{ mb: 2.5, fontSize: '0.78rem' }}>Profile updated successfully.</Alert>
          </Collapse>

          <Grid container spacing={2.5}>
            {[
              { name: 'firstName', label: 'First Name',    xs: 12, sm: 6, icon: null },
              { name: 'lastName',  label: 'Last Name',     xs: 12, sm: 6, icon: null },
              { name: 'email',     label: 'Email Address', xs: 12, sm: 6, icon: <EmailOutlined sx={{ fontSize: 16 }} /> },
              { name: 'phone',     label: 'Phone (optional)', xs: 12, sm: 6, icon: <PhoneOutlined sx={{ fontSize: 16 }} /> },
            ].map(({ name, label, xs, sm, icon }) => (
              <Grid item xs={xs} sm={sm} key={name}>
                <TextField
                  fullWidth size="small" name={name} label={label}
                  value={form[name]} onChange={handleChange} disabled={!editing}
                  InputProps={icon ? { startAdornment: <InputAdornment position="start"><Box sx={{ color: 'text.secondary', display: 'flex' }}>{icon}</Box></InputAdornment> } : undefined}
                  sx={fieldSx}
                />
              </Grid>
            ))}
          </Grid>

          <Box sx={{ display: 'flex', gap: 1.5, mt: 3 }}>
            {editing ? (
              <>
                <Button variant="contained" onClick={handleSave} disabled={saving}
                  startIcon={saving ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : <SaveOutlined sx={{ fontSize: 16 }} />}
                  sx={{ fontSize: '0.7rem', letterSpacing: '0.08em', py: 1 }}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
                <Button variant="outlined" onClick={() => setEditing(false)} disabled={saving}
                  sx={{ fontSize: '0.7rem', letterSpacing: '0.08em', py: 1 }}>Cancel</Button>
              </>
            ) : (
              <Button variant="outlined" onClick={() => setEditing(true)}
                startIcon={<EditOutlined sx={{ fontSize: 16 }} />}
                sx={{ fontSize: '0.7rem', letterSpacing: '0.08em', py: 1 }}>Edit Profile</Button>
            )}
          </Box>
        </Section>

        {/* Store info section */}
        <Section title="Store Information" subtitle="Details about your merchant account and store.">
          <Grid container spacing={2.5}>
            {[
              { name: 'storeName',  label: 'Store Name',   icon: <StorefrontOutlined sx={{ fontSize: 16 }} /> },
              { name: 'department', label: 'Department',   icon: null },
              { name: 'storeUrl',   label: 'City / Region', icon: <LanguageOutlined sx={{ fontSize: 16 }} /> },
            ].map(({ name, label, icon }) => (
              <Grid item xs={12} sm={6} key={name}>
                <TextField
                  fullWidth size="small" name={name} label={label}
                  value={form[name]} onChange={handleChange} disabled
                  InputProps={icon ? { startAdornment: <InputAdornment position="start"><Box sx={{ color: 'text.secondary', display: 'flex' }}>{icon}</Box></InputAdornment> } : undefined}
                  sx={fieldSx}
                />
              </Grid>
            ))}
          </Grid>
          <Alert severity="info" sx={{ mt: 2.5, fontSize: '0.75rem' }}>
            Store details are managed by your account administrator. Contact support to make changes.
          </Alert>
        </Section>

        {/* Session info */}
        <Section title="Active Session" subtitle="Your current merchant session details.">
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {[
              { label: 'User ID',  value: user?.id },
              { label: 'Username', value: `@${user?.username}` },
              { label: 'Role',     value: user?.role ?? 'merchant' },
              { label: 'Gender',   value: user?.gender ?? '—' },
            ].map(({ label, value }) => (
              <Box key={label}>
                <Typography sx={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.25 }}>{label}</Typography>
                <Typography sx={{ fontSize: '0.88rem', fontWeight: 400 }}>{value}</Typography>
              </Box>
            ))}
          </Box>
        </Section>
      </Box>
    </Fade>
  )
}
