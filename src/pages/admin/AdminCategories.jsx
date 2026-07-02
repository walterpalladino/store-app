import { useState, useEffect, useCallback } from 'react'
import {
  Box, Typography, Divider, TextField, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Alert, Button, Fade, Drawer, IconButton, Tooltip,
  Grid, CircularProgress, Snackbar,
} from '@mui/material'
import {
  RefreshOutlined, CloseOutlined, CategoryOutlined,
  AddOutlined, EditOutlined, SaveOutlined, LockOutlined,
} from '@mui/icons-material'
import API from '../../config/api'
import { unwrap } from '../../utils/apiUtils'
import { useMerchantAuth } from '../../context/MerchantAuthContext'

const fieldSx = {
  '& .MuiInputLabel-root': { fontFamily: '"DM Sans", sans-serif', fontSize: '0.82rem' },
  '& .MuiOutlinedInput-root': {
    fontFamily: '"DM Sans", sans-serif', fontSize: '0.85rem',
    '& fieldset': { borderColor: 'rgba(26,26,26,0.2)', transition: 'border-color 0.2s' },
    '&:hover fieldset': { borderColor: 'rgba(26,26,26,0.45)' },
    '&.Mui-focused fieldset': { borderColor: 'primary.main' },
  },
}

// Mirror the server-side slug normalization (lowercase, trimmed, hyphenated).
function slugify(s) {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

const EMPTY_FORM = { slug: '', name: '' }

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color = 'secondary.dark' }) {
  return (
    <Box sx={{ flex: 1, minWidth: 140, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
        <Box sx={{ color, display: 'flex' }}>{icon}</Box>
        <Typography sx={{ fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary' }}>{label}</Typography>
      </Box>
      <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.6rem', fontWeight: 500, lineHeight: 1 }}>{value}</Typography>
    </Box>
  )
}

// ── Category form drawer (Add + Edit) ────────────────────────────────────────
function CategoryFormDrawer({ category, isNew, onClose, onSaved, merchantFetch }) {
  const isOpen = isNew || !!category
  const [form,       setForm]       = useState(() => isNew ? { ...EMPTY_FORM } : { slug: category?.slug ?? '', name: category?.name ?? '' })
  const [slugEdited, setSlugEdited] = useState(false)
  const [errors,     setErrors]     = useState({})
  const [saving,     setSaving]     = useState(false)
  const [apiError,   setApiError]   = useState('')

  useEffect(() => {
    if (isNew) setForm({ ...EMPTY_FORM })
    else if (category) setForm({ slug: category.slug ?? '', name: category.name ?? '' })
    setSlugEdited(false); setErrors({}); setApiError('')
    // Intentionally keyed on the category slug — reset only when a *different*
    // category is opened, not on every re-render that yields a new object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category?.slug, isNew])

  const handleNameChange = (e) => {
    const name = e.target.value
    // Auto-derive the slug from the name until the user edits the slug directly.
    setForm((p) => ({ ...p, name, slug: isNew && !slugEdited ? slugify(name) : p.slug }))
    setApiError('')
  }

  const handleSlugChange = (e) => {
    setSlugEdited(true)
    setForm((p) => ({ ...p, slug: e.target.value }))
    setErrors((p) => ({ ...p, slug: undefined }))
    setApiError('')
  }

  const handleSubmit = async () => {
    const slug = slugify(form.slug)
    const errs = {}
    if (!slug) errs.slug = 'Slug is required'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true); setApiError('')
    try {
      const body   = { slug, name: form.name.trim() || undefined }
      const url     = isNew ? API.products.categories : API.products.categoryBySlug(category.slug)
      const method  = isNew ? 'POST' : 'PATCH'
      const res     = await merchantFetch(url, { method, body: JSON.stringify(body) })
      const saved   = await unwrap(res)   // { slug, name } (throws on success:false)
      onSaved(
        { slug: saved.slug ?? slug, name: saved.name ?? body.name ?? slug },
        isNew,
        category?.slug,
      )
    } catch (err) {
      setApiError(err.message || 'Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer anchor="right" open={isOpen} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 440 }, bgcolor: 'background.paper', display: 'flex', flexDirection: 'column' } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.1rem', fontWeight: 400 }}>
            {isNew ? 'Add New Category' : 'Edit Category'}
          </Typography>
          {isNew
            ? <Chip label="New" size="small" sx={{ height: 18, fontSize: '0.58rem', bgcolor: 'rgba(74,124,89,0.1)', color: 'success.main', letterSpacing: '0.06em' }} />
            : <Chip label={category?.slug} size="small" icon={<LockOutlined sx={{ fontSize: '12px !important', color: 'text.secondary !important' }} />} sx={{ height: 18, fontSize: '0.58rem', bgcolor: 'rgba(26,26,26,0.06)', letterSpacing: '0.06em' }} />}
        </Box>
        <IconButton size="small" onClick={onClose}><CloseOutlined sx={{ fontSize: 18 }} /></IconButton>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        {apiError && (
          <Alert severity="error" sx={{ mb: 2.5, fontSize: '0.78rem' }} onClose={() => setApiError('')}>{apiError}</Alert>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth size="small" name="name" label="Display Name"
              value={form.name} onChange={handleNameChange}
              placeholder="Home Decoration"
              helperText="Optional — derived from the slug when left blank."
              sx={fieldSx}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth size="small" name="slug" label="Slug *"
              value={form.slug} onChange={handleSlugChange}
              error={!!errors.slug}
              helperText={errors.slug ?? 'Lowercase, URL-friendly identifier (e.g. home-decoration).'}
              placeholder="home-decoration"
              sx={fieldSx}
            />
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ px: 3, py: 2.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 1.5, flexShrink: 0, bgcolor: 'background.paper' }}>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}
          startIcon={saving ? <CircularProgress size={15} sx={{ color: 'inherit' }} /> : <SaveOutlined sx={{ fontSize: 16 }} />}
          sx={{ fontSize: '0.72rem', letterSpacing: '0.08em', py: 1.1, flex: 1 }}>
          {saving ? 'Saving…' : isNew ? 'Create Category' : 'Save Changes'}
        </Button>
        <Button variant="outlined" onClick={onClose} disabled={saving}
          sx={{ fontSize: '0.72rem', letterSpacing: '0.08em', py: 1.1 }}>Cancel</Button>
      </Box>
    </Drawer>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function AdminCategories() {
  const { merchantFetch } = useMerchantAuth()
  const [categories, setCategories] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [selected,   setSelected]   = useState(null)
  const [addOpen,    setAddOpen]    = useState(false)
  const [toast,      setToast]      = useState({ open: false, message: '', severity: 'success' })

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity })

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res  = await fetch(API.products.categories)
      const data = await unwrap(res)   // [{ slug, name, url }] or ["slug", …]
      const list = (Array.isArray(data) ? data : []).map((c) =>
        typeof c === 'string' ? { slug: c, name: c } : c
      )
      setCategories(list)
    } catch (err) {
      setError(err.message || 'Could not load categories.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSaved = (saved, isNew, originalSlug) => {
    if (isNew) {
      setCategories((prev) => [saved, ...prev])
      showToast(`Category "${saved.name}" created successfully.`)
      setAddOpen(false)
    } else {
      setCategories((prev) => prev.map((c) => c.slug === originalSlug ? { ...c, ...saved } : c))
      showToast(`Category "${saved.name}" updated successfully.`)
      setSelected(null)
    }
  }

  return (
    <Fade in>
      <Box>
        {/* ── Title + action ── */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.35rem', fontWeight: 400, lineHeight: 1.2, mb: 0.4 }}>Categories</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>Create and edit the categories used across your catalogue.</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddOutlined sx={{ fontSize: 17 }} />}
            onClick={() => { setAddOpen(true); setSelected(null) }}
            sx={{ fontSize: '0.72rem', letterSpacing: '0.08em', py: 1, bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.light' } }}
          >
            Add New Category
          </Button>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* ── Stats ── */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
          <StatCard icon={<CategoryOutlined sx={{ fontSize: 16 }} />} label="Total Categories" value={loading ? '…' : categories.length} />
        </Box>

        {/* ── Toolbar ── */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
            {loading ? 'Loading…' : `${categories.length} ${categories.length === 1 ? 'category' : 'categories'}`}
          </Typography>
          <Tooltip title="Refresh" arrow>
            <IconButton size="small" onClick={load} disabled={loading} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <RefreshOutlined sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3, fontSize: '0.78rem' }} action={<Button size="small" onClick={load}>Retry</Button>}>{error}</Alert>}

        {/* ── Table ── */}
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', mb: 3 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Name', 'Slug', ''].map((h, i) => (
                    <TableCell key={h || i} align={i === 2 ? 'right' : 'left'} sx={{ py: 1.5, px: 2, fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.secondary', fontWeight: 500, bgcolor: 'rgba(26,26,26,0.02)', borderBottom: '1px solid', borderColor: 'divider', whiteSpace: 'nowrap' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 3 }).map((_, j) => (
                          <TableCell key={j} sx={{ py: 1.5, px: 2 }}>
                            <Box sx={{ height: 16, borderRadius: 1, bgcolor: 'rgba(26,26,26,0.06)', width: j === 0 ? 160 : 90 }} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : categories.length === 0
                    ? (
                        <TableRow>
                          <TableCell colSpan={3} sx={{ py: 5, textAlign: 'center' }}>
                            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>No categories yet. Create your first one.</Typography>
                          </TableCell>
                        </TableRow>
                      )
                    : categories.map((c, idx) => (
                        <TableRow key={c.slug} onClick={() => { setSelected(c); setAddOpen(false) }}
                          sx={{
                            cursor: 'pointer',
                            bgcolor: idx % 2 === 0 ? 'transparent' : 'rgba(26,26,26,0.012)',
                            '&:last-child td': { border: 0 },
                            '&:hover': { bgcolor: 'rgba(200,169,110,0.05)' },
                            transition: 'background 0.15s',
                          }}>
                          <TableCell sx={{ py: 1.5, px: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: 'rgba(200,169,110,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <CategoryOutlined sx={{ fontSize: 16, color: 'secondary.dark' }} />
                              </Box>
                              <Typography sx={{ fontSize: '0.9rem', fontFamily: '"Cormorant Garamond", serif', fontWeight: 400, textTransform: 'capitalize' }}>{c.name || c.slug}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ py: 1.5, px: 2 }}>
                            <Chip label={c.slug} size="small" sx={{ height: 18, fontSize: '0.62rem', fontFamily: 'monospace', bgcolor: 'rgba(26,26,26,0.05)' }} />
                          </TableCell>
                          <TableCell align="right" sx={{ py: 1.5, px: 2 }}>
                            <Tooltip title="Edit category" arrow>
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); setSelected(c); setAddOpen(false) }}
                                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                <EditOutlined sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* ── Edit drawer ── */}
        {selected && (
          <CategoryFormDrawer
            category={selected}
            isNew={false}
            merchantFetch={merchantFetch}
            onClose={() => setSelected(null)}
            onSaved={handleSaved}
          />
        )}

        {/* ── Add drawer ── */}
        {addOpen && (
          <CategoryFormDrawer
            category={null}
            isNew={true}
            merchantFetch={merchantFetch}
            onClose={() => setAddOpen(false)}
            onSaved={handleSaved}
          />
        )}

        {/* ── Toast ── */}
        <Snackbar open={toast.open} autoHideDuration={3500} onClose={() => setToast((t) => ({ ...t, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert severity={toast.severity} onClose={() => setToast((t) => ({ ...t, open: false }))}
            sx={{ fontSize: '0.82rem', boxShadow: '0 4px 20px rgba(26,26,26,0.15)' }}>
            {toast.message}
          </Alert>
        </Snackbar>
      </Box>
    </Fade>
  )
}
