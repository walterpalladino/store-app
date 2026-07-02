import { useState, useEffect, useCallback } from 'react'
import {
  Box, Typography, Divider, TextField, InputAdornment, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Avatar, Rating, Select, MenuItem, FormControl, InputLabel,
  Alert, Button, Pagination, Fade, Drawer, IconButton, Tooltip,
  Switch, Grid, CircularProgress, Snackbar,
} from '@mui/material'
import {
  SearchOutlined, RefreshOutlined, CloseOutlined,
  InventoryOutlined, TrendingUpOutlined, StarOutlined,
  AddOutlined, EditOutlined, SaveOutlined, LockOutlined,
  ImageOutlined, DriveFileRenameOutlineOutlined,
} from '@mui/icons-material'
import API from '../../config/api'
import { unwrap } from '../../utils/apiUtils'

const PAGE_SIZE = 15

const fieldSx = {
  '& .MuiInputLabel-root': { fontFamily: '"DM Sans", sans-serif', fontSize: '0.82rem' },
  '& .MuiOutlinedInput-root': {
    fontFamily: '"DM Sans", sans-serif', fontSize: '0.85rem',
    '& fieldset': { borderColor: 'rgba(26,26,26,0.2)', transition: 'border-color 0.2s' },
    '&:hover fieldset': { borderColor: 'rgba(26,26,26,0.45)' },
    '&.Mui-focused fieldset': { borderColor: 'primary.main' },
  },
  '& .Mui-disabled .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(26,26,26,0.1) !important' },
  '& .Mui-disabled': { '-webkit-text-fill-color': '#6b6560 !important' },
}

const EMPTY_FORM = {
  title: '', description: '', price: '', discountPercentage: '',
  stock: '', category: '', brand: '', sku: '', thumbnail: '',
  weight: '', warrantyInformation: '', returnPolicy: '',
  minimumOrderQuantity: '', availabilityStatus: 'In Stock',
}

const AVAILABILITY_OPTIONS = ['In Stock', 'Low Stock', 'Out of Stock', 'Discontinued', 'Pre-order']

function formFromProduct(p) {
  return {
    title:                p.title                ?? '',
    description:          p.description          ?? '',
    price:                p.price                ?? '',
    discountPercentage:   p.discountPercentage    ?? '',
    stock:                p.stock                ?? '',
    category:             p.category             ?? '',
    brand:                p.brand                ?? '',
    sku:                  p.sku                  ?? '',
    thumbnail:            p.thumbnail            ?? '',
    weight:               p.weight               ?? '',
    warrantyInformation:  p.warrantyInformation  ?? '',
    returnPolicy:         p.returnPolicy         ?? '',
    minimumOrderQuantity: p.minimumOrderQuantity ?? '',
    availabilityStatus:   p.availabilityStatus   ?? 'In Stock',
  }
}

function validateForm(form) {
  const errs = {}
  if (!form.title.trim()) errs.title = 'Title is required'
  if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) errs.price = 'Valid price required'
  if (form.discountPercentage !== '' && (isNaN(Number(form.discountPercentage)) || Number(form.discountPercentage) < 0 || Number(form.discountPercentage) > 100)) errs.discountPercentage = '0–100'
  if (form.stock !== '' && (isNaN(Number(form.stock)) || Number(form.stock) < 0)) errs.stock = 'Must be 0 or more'
  if (!form.category.trim()) errs.category = 'Category is required'
  return errs
}

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

// ── Shared drawer header ─────────────────────────────────────────────────────
function DrawerHeader({ title, badge, onClose }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h6" sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.1rem', fontWeight: 400 }}>{title}</Typography>
        {badge}
      </Box>
      <IconButton size="small" onClick={onClose}><CloseOutlined sx={{ fontSize: 18 }} /></IconButton>
    </Box>
  )
}

// ── Read-only drawer ─────────────────────────────────────────────────────────
function ReadOnlyDrawer({ product, onClose, onEditClick }) {
  if (!product) return null
  const discounted = (product.price * (1 - product.discountPercentage / 100)).toFixed(2)
  return (
    <Drawer anchor="right" open={!!product} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 460 }, bgcolor: 'background.paper', display: 'flex', flexDirection: 'column' } }}>
      <DrawerHeader
        title="Product Detail"
        badge={<Chip label="Read only" size="small" sx={{ height: 18, fontSize: '0.58rem', bgcolor: 'rgba(26,26,26,0.06)', letterSpacing: '0.06em' }} />}
        onClose={onClose}
      />
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        <Box sx={{ bgcolor: '#f0ece3', borderRadius: 2, p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3, height: 200 }}>
          {product.thumbnail
            ? <Box component="img" src={product.thumbnail} alt={product.title} sx={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
            : <ImageOutlined sx={{ fontSize: 48, color: 'rgba(26,26,26,0.2)' }} />}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Chip label={product.category} size="small" sx={{ textTransform: 'capitalize', bgcolor: 'rgba(200,169,110,0.1)', color: 'secondary.dark' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
            <LockOutlined sx={{ fontSize: 12, color: 'text.secondary' }} />
            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.68rem', color: 'text.secondary' }}>ID: {product.id}</Typography>
          </Box>
        </Box>
        <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.4rem', fontWeight: 400, mb: 0.5, lineHeight: 1.25 }}>{product.title}</Typography>
        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', letterSpacing: '0.08em', mb: 2 }}>SKU: {product.sku || `PROD-${product.id}`}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
          <Rating value={product.rating} precision={0.1} size="small" readOnly />
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>({product.rating})</Typography>
        </Box>
        <Divider sx={{ mb: 2.5 }} />
        <Box sx={{ display: 'flex', gap: 3, mb: 2.5 }}>
          {[
            { label: 'Sale Price',  val: `$${discounted}`,                           color: 'text.primary'   },
            { label: 'List Price',  val: `$${product.price.toFixed(2)}`,             color: 'text.secondary', strike: true },
            { label: 'Discount',    val: `-${product.discountPercentage.toFixed(1)}%`, color: 'success.main' },
          ].map(({ label, val, color, strike }) => (
            <Box key={label}>
              <Typography sx={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.25 }}>{label}</Typography>
              <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.4rem', fontWeight: 500, color, textDecoration: strike ? 'line-through' : 'none' }}>{val}</Typography>
            </Box>
          ))}
        </Box>
        <Divider sx={{ mb: 2.5 }} />
        {[
          { label: 'Brand',         value: product.brand || '—' },
          { label: 'Stock',         value: product.stock },
          { label: 'Availability',  value: product.availabilityStatus },
          { label: 'Weight',        value: product.weight ? `${product.weight}g` : '—' },
          { label: 'Min Order',     value: product.minimumOrderQuantity ?? 1 },
          { label: 'Warranty',      value: product.warrantyInformation || '—' },
          { label: 'Return Policy', value: product.returnPolicy || '—' },
        ].map(({ label, value }) => (
          <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}>{label}</Typography>
            <Typography sx={{ fontSize: '0.85rem' }}>{value}</Typography>
          </Box>
        ))}
        {product.description && (
          <Box sx={{ mt: 2.5 }}>
            <Typography sx={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary', mb: 1 }}>Description</Typography>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', lineHeight: 1.7 }}>{product.description}</Typography>
          </Box>
        )}
      </Box>
      <Box sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'rgba(26,26,26,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
          Enable <strong>Allow Edit</strong> to modify this product.
        </Typography>
        <Button size="small" startIcon={<EditOutlined sx={{ fontSize: 14 }} />} onClick={onEditClick}
          sx={{ fontSize: '0.68rem', letterSpacing: '0.06em', color: 'secondary.dark', border: '1px solid rgba(200,169,110,0.35)', '&:hover': { bgcolor: 'rgba(200,169,110,0.08)' } }}>
          Edit
        </Button>
      </Box>
    </Drawer>
  )
}

// ── Product form drawer (Add + Edit) ─────────────────────────────────────────
function ProductFormDrawer({ product, isNew, onClose, onSaved }) {
  const isOpen = isNew || !!product
  const [form,    setForm]     = useState(() => isNew ? { ...EMPTY_FORM } : formFromProduct(product ?? {}))
  const [errors,  setErrors]   = useState({})
  const [saving,  setSaving]   = useState(false)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    if (isNew)          setForm({ ...EMPTY_FORM })
    else if (product)   setForm(formFromProduct(product))
    setErrors({}); setApiError('')
    // Intentionally keyed on product identity — reset only when a *different*
    // product is opened, not on every re-render that yields a new object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, isNew])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
    setErrors((p) => ({ ...p, [name]: undefined }))
    setApiError('')
  }

  const handleSubmit = async () => {
    const errs = validateForm(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true); setApiError('')
    try {
      const body = {
        title:                form.title.trim(),
        description:          form.description.trim(),
        price:                Number(form.price),
        discountPercentage:   form.discountPercentage !== '' ? Number(form.discountPercentage) : 0,
        stock:                form.stock !== '' ? Number(form.stock) : 0,
        category:             form.category.trim(),
        brand:                form.brand.trim(),
        sku:                  form.sku.trim(),
        thumbnail:            form.thumbnail.trim(),
        weight:               form.weight !== '' ? Number(form.weight) : undefined,
        warrantyInformation:  form.warrantyInformation.trim(),
        returnPolicy:         form.returnPolicy.trim(),
        minimumOrderQuantity: form.minimumOrderQuantity !== '' ? Number(form.minimumOrderQuantity) : 1,
        availabilityStatus:   form.availabilityStatus,
      }
      const url    = isNew ? API.products.add : API.products.byId(product.id)
      const method = isNew ? 'POST' : 'PATCH'
      const res   = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const saved = await unwrap(res)  // { id, title, price, ... } (throws on success:false)
      onSaved({ ...body, id: saved.id ?? product?.id ?? Date.now(), rating: product?.rating ?? 0, ...saved })
    } catch (err) { setApiError(err.message || 'Save failed. Please try again.') }
    finally { setSaving(false) }
  }

  const FIELDS = [
    { name: 'title',                label: 'Product Title *',    type: 'text',   xs: 12, sm: 12 },
    { name: 'sku',                  label: 'SKU',                type: 'text',   xs: 12, sm: 6  },
    { name: 'category',             label: 'Category *',         type: 'text',   xs: 12, sm: 6  },
    { name: 'brand',                label: 'Brand',              type: 'text',   xs: 12, sm: 6  },
    { name: 'price',                label: 'List Price ($) *',   type: 'number', xs: 12, sm: 6  },
    { name: 'discountPercentage',   label: 'Discount (%)',       type: 'number', xs: 12, sm: 6, hint: '0–100' },
    { name: 'stock',                label: 'Stock Quantity',     type: 'number', xs: 12, sm: 6  },
    { name: 'minimumOrderQuantity', label: 'Min. Order Qty',     type: 'number', xs: 12, sm: 6  },
    { name: 'weight',               label: 'Weight (g)',         type: 'number', xs: 12, sm: 6  },
    { name: 'warrantyInformation',  label: 'Warranty',           type: 'text',   xs: 12, sm: 6  },
    { name: 'returnPolicy',         label: 'Return Policy',      type: 'text',   xs: 12, sm: 12 },
    { name: 'thumbnail',            label: 'Thumbnail URL',      type: 'text',   xs: 12, sm: 12 },
  ]

  return (
    <Drawer anchor="right" open={isOpen} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, bgcolor: 'background.paper', display: 'flex', flexDirection: 'column' } }}>
      <DrawerHeader
        title={isNew ? 'Add New Product' : 'Edit Product'}
        badge={
          isNew
            ? <Chip label="New" size="small" sx={{ height: 18, fontSize: '0.58rem', bgcolor: 'rgba(74,124,89,0.1)', color: 'success.main', letterSpacing: '0.06em' }} />
            : <Chip label={`ID: ${product?.id}`} size="small" icon={<LockOutlined sx={{ fontSize: '12px !important', color: 'text.secondary !important' }} />} sx={{ height: 18, fontSize: '0.58rem', bgcolor: 'rgba(26,26,26,0.06)', letterSpacing: '0.06em' }} />
        }
        onClose={onClose}
      />
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        {/* Thumbnail preview */}
        <Box sx={{ bgcolor: '#f0ece3', borderRadius: 2, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3, overflow: 'hidden' }}>
          {form.thumbnail
            ? <Box component="img" src={form.thumbnail} alt="preview" sx={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none' }} />
            : <Box sx={{ textAlign: 'center' }}>
                <ImageOutlined sx={{ fontSize: 40, color: 'rgba(26,26,26,0.2)', mb: 1 }} />
                <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Enter a thumbnail URL below</Typography>
              </Box>
          }
        </Box>

        {apiError && (
          <Alert severity="error" sx={{ mb: 2.5, fontSize: '0.78rem' }} onClose={() => setApiError('')}>{apiError}</Alert>
        )}

        <Grid container spacing={2}>
          {FIELDS.map(({ name, label, type, xs, sm, hint }) => (
            <Grid item xs={xs} sm={sm} key={name}>
              <TextField
                fullWidth size="small" name={name} label={label}
                type={type === 'number' ? 'number' : 'text'}
                value={form[name]} onChange={handleChange}
                error={!!errors[name]}
                helperText={errors[name] ?? hint ?? undefined}
                inputProps={type === 'number' ? { min: 0, step: ['price', 'discountPercentage', 'weight'].includes(name) ? 0.01 : 1 } : undefined}
                sx={fieldSx}
              />
            </Grid>
          ))}

          {/* Availability select */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" sx={fieldSx}>
              <InputLabel sx={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.82rem' }}>Availability</InputLabel>
              <Select name="availabilityStatus" label="Availability" value={form.availabilityStatus} onChange={handleChange}
                sx={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.85rem' }}>
                {AVAILABILITY_OPTIONS.map((o) => (
                  <MenuItem key={o} value={o} sx={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.85rem' }}>{o}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Description */}
          <Grid item xs={12}>
            <TextField
              fullWidth multiline rows={3} name="description" label="Description"
              value={form.description} onChange={handleChange}
              error={!!errors.description} helperText={errors.description}
              sx={fieldSx}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Footer */}
      <Box sx={{ px: 3, py: 2.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 1.5, flexShrink: 0, bgcolor: 'background.paper' }}>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}
          startIcon={saving ? <CircularProgress size={15} sx={{ color: 'inherit' }} /> : <SaveOutlined sx={{ fontSize: 16 }} />}
          sx={{ fontSize: '0.72rem', letterSpacing: '0.08em', py: 1.1, flex: 1 }}>
          {saving ? 'Saving…' : isNew ? 'Create Product' : 'Save Changes'}
        </Button>
        <Button variant="outlined" onClick={onClose} disabled={saving}
          sx={{ fontSize: '0.72rem', letterSpacing: '0.08em', py: 1.1 }}>Cancel</Button>
      </Box>
    </Drawer>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function AdminProducts() {
  const [products,   setProducts]   = useState([])
  const [total,      setTotal]      = useState(0)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [search,     setSearch]     = useState('')
  const [category,   setCategory]   = useState('all')
  const [categories, setCategories] = useState([])
  const [page,       setPage]       = useState(1)
  const [selected,   setSelected]   = useState(null)
  const [editMode,   setEditMode]   = useState(false)
  const [addOpen,    setAddOpen]    = useState(false)
  const [toast,      setToast]      = useState({ open: false, message: '', severity: 'success' })

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity })

  useEffect(() => {
    fetch(API.products.categories)
      .then((r) => r.json())
      .then((body) => { const d = body.success ? body.data : body; setCategories(Array.isArray(d) ? d : []) })
      .catch(() => {})
  }, [])

  const loadProducts = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const skip = (page - 1) * PAGE_SIZE
      let url
      if (search.trim())        url = `${API.products.search}?q=${encodeURIComponent(search.trim())}&limit=${PAGE_SIZE}&skip=${skip}`
      else if (category !== 'all') url = `${API.products.byCategory(category)}?limit=${PAGE_SIZE}&skip=${skip}`
      else                      url = `${API.products.list}?limit=${PAGE_SIZE}&skip=${skip}`
      const res  = await fetch(url)
      const data = await unwrap(res)  // { products: [...], total, skip, limit }
      setProducts(data.products ?? []); setTotal(data.total ?? 0)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [search, category, page])

  useEffect(() => { loadProducts() }, [loadProducts])
  useEffect(() => { setPage(1) }, [search, category])

  const handleSaved = (saved, isNew) => {
    if (isNew) {
      setProducts((prev) => [saved, ...prev])
      setTotal((t) => t + 1)
      showToast(`"${saved.title}" created successfully.`)
      setAddOpen(false)
    } else {
      setProducts((prev) => prev.map((p) => p.id === saved.id ? { ...p, ...saved } : p))
      showToast(`"${saved.title}" updated successfully.`)
      setSelected(null)
    }
  }

  const handleEditFromReadOnly = () => {
    setEditMode(true)
    // selected stays set — ProductFormDrawer will open with it
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const inStock    = products.filter((p) => p.stock > 0).length
  const avgRating  = products.length ? (products.reduce((s, p) => s + p.rating, 0) / products.length).toFixed(1) : '—'
  const avgPrice   = products.length ? (products.reduce((s, p) => s + p.price, 0) / products.length).toFixed(2) : '—'

  return (
    <Fade in>
      <Box>
        {/* ── Title + action buttons ── */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.35rem', fontWeight: 400, lineHeight: 1.2, mb: 0.4 }}>Products</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>Browse and manage your product catalogue.</Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            {/* Allow Edit toggle */}
            <Tooltip title={editMode ? 'Click any row to edit it' : 'Enable to edit products by clicking rows'} arrow>
              <Box
                onClick={() => setEditMode((v) => !v)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.75,
                  px: 1.5, py: 0.75,
                  border: '1px solid', borderRadius: 1.5,
                  borderColor: editMode ? 'rgba(200,169,110,0.5)' : 'divider',
                  bgcolor: editMode ? 'rgba(200,169,110,0.06)' : 'transparent',
                  transition: 'all 0.2s', cursor: 'pointer',
                }}
              >
                <DriveFileRenameOutlineOutlined sx={{ fontSize: 16, color: editMode ? 'secondary.dark' : 'text.secondary' }} />
                <Typography sx={{ fontSize: '0.72rem', letterSpacing: '0.06em', fontFamily: '"DM Sans", sans-serif', color: editMode ? 'secondary.dark' : 'text.secondary', userSelect: 'none' }}>
                  Allow Edit
                </Typography>
                <Switch
                  size="small" checked={editMode}
                  onChange={(e) => { e.stopPropagation(); setEditMode(e.target.checked) }}
                  sx={{ ml: 0.25, '& .MuiSwitch-switchBase.Mui-checked': { color: '#c8a96e' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#c8a96e' } }}
                />
              </Box>
            </Tooltip>

            {/* Add New Product */}
            <Button
              variant="contained"
              startIcon={<AddOutlined sx={{ fontSize: 17 }} />}
              onClick={() => { setAddOpen(true); setSelected(null) }}
              sx={{ fontSize: '0.72rem', letterSpacing: '0.08em', py: 1, bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.light' } }}
            >
              Add New Product
            </Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* ── Stats ── */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
          <StatCard icon={<InventoryOutlined sx={{ fontSize: 16 }} />} label="Total Products" value={loading ? '…' : total} />
          <StatCard icon={<InventoryOutlined sx={{ fontSize: 16 }} />} label="In Stock" value={loading ? '…' : inStock} color="success.main" />
          <StatCard icon={<TrendingUpOutlined sx={{ fontSize: 16 }} />} label="Avg Price" value={loading ? '…' : `$${avgPrice}`} />
          <StatCard icon={<StarOutlined sx={{ fontSize: 16 }} />} label="Avg Rating" value={loading ? '…' : avgRating} color="#c8a96e" />
        </Box>

        {/* ── Search + category ── */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined sx={{ fontSize: 17, color: 'text.secondary' }} /></InputAdornment> }}
            sx={{ flex: 1, minWidth: 200, '& .MuiOutlinedInput-root': { fontFamily: '"DM Sans", sans-serif', fontSize: '0.85rem' } }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel sx={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.82rem' }}>Category</InputLabel>
            <Select value={category} label="Category" onChange={(e) => setCategory(e.target.value)}
              sx={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.82rem' }}>
              <MenuItem value="all">All Categories</MenuItem>
              {categories.map((c) => {
                const val = typeof c === 'string' ? c : c.slug
                const lbl = typeof c === 'string' ? c : c.name
                return <MenuItem key={val} value={val} sx={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.82rem', textTransform: 'capitalize' }}>{lbl}</MenuItem>
              })}
            </Select>
          </FormControl>
          <Tooltip title="Refresh" arrow>
            <IconButton size="small" onClick={loadProducts} disabled={loading} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <RefreshOutlined sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Edit mode banner */}
        {editMode && (
          <Alert severity="info" icon={<EditOutlined fontSize="small" />}
            sx={{ mb: 2.5, fontSize: '0.78rem', bgcolor: 'rgba(200,169,110,0.06)', color: 'text.primary', border: '1px solid rgba(200,169,110,0.25)', '& .MuiAlert-icon': { color: 'secondary.dark' } }}>
            <strong>Edit mode is on.</strong> Click any row to open it for editing. The product ID is always read-only.
          </Alert>
        )}

        {error && <Alert severity="error" sx={{ mb: 3, fontSize: '0.78rem' }} action={<Button size="small" onClick={loadProducts}>Retry</Button>}>{error}</Alert>}

        {/* ── Table ── */}
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', mb: 3 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Product', 'SKU', 'Category', 'Price', 'Discount', 'Stock', 'Rating'].map((h) => (
                    <TableCell key={h} sx={{ py: 1.5, px: 2, fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.secondary', fontWeight: 500, bgcolor: 'rgba(26,26,26,0.02)', borderBottom: '1px solid', borderColor: 'divider', whiteSpace: 'nowrap' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j} sx={{ py: 1.5, px: 2 }}>
                            <Box sx={{ height: 16, borderRadius: 1, bgcolor: 'rgba(26,26,26,0.06)', width: j === 0 ? 140 : 60 }} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : products.map((p, idx) => (
                      <TableRow key={p.id} onClick={() => { setSelected(p); setAddOpen(false) }}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: idx % 2 === 0 ? 'transparent' : 'rgba(26,26,26,0.012)',
                          '&:last-child td': { border: 0 },
                          '&:hover': { bgcolor: editMode ? 'rgba(200,169,110,0.07)' : 'rgba(200,169,110,0.04)' },
                          transition: 'background 0.15s',
                        }}>
                        {/* Product */}
                        <TableCell sx={{ py: 1.5, px: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar src={p.thumbnail} variant="rounded" sx={{ width: 36, height: 36, bgcolor: '#f0ece3' }}>
                              {p.thumbnail && <Box component="img" src={p.thumbnail} sx={{ width: '100%', height: '100%', objectFit: 'contain', p: 0.5 }} />}
                            </Avatar>
                            <Box>
                              <Typography sx={{ fontSize: '0.82rem', fontFamily: '"Cormorant Garamond", serif', fontWeight: 400, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</Typography>
                              {editMode && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.2 }}>
                                  <EditOutlined sx={{ fontSize: 10, color: 'secondary.dark' }} />
                                  <Typography sx={{ fontSize: '0.58rem', color: 'secondary.dark', letterSpacing: '0.06em' }}>click to edit</Typography>
                                </Box>
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 1.5, px: 2 }}>
                          <Typography sx={{ fontSize: '0.68rem', fontFamily: 'monospace', color: 'text.secondary', whiteSpace: 'nowrap' }}>{p.sku || `PROD-${p.id}`}</Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1.5, px: 2 }}>
                          <Chip label={p.category} size="small" sx={{ height: 18, fontSize: '0.6rem', textTransform: 'capitalize', bgcolor: 'rgba(26,26,26,0.05)' }} />
                        </TableCell>
                        <TableCell sx={{ py: 1.5, px: 2, whiteSpace: 'nowrap' }}>
                          <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '0.95rem', fontWeight: 500 }}>${p.price.toFixed(2)}</Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1.5, px: 2, whiteSpace: 'nowrap' }}>
                          {p.discountPercentage > 0
                            ? <Chip label={`-${p.discountPercentage.toFixed(1)}%`} size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(200,169,110,0.1)', color: 'secondary.dark', fontWeight: 500 }} />
                            : <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>—</Typography>}
                        </TableCell>
                        <TableCell sx={{ py: 1.5, px: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: p.stock > 10 ? 'success.main' : p.stock > 0 ? 'secondary.main' : 'error.main', flexShrink: 0 }} />
                            <Typography sx={{ fontSize: '0.8rem' }}>{p.stock}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 1.5, px: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <StarOutlined sx={{ fontSize: 13, color: '#c8a96e' }} />
                            <Typography sx={{ fontSize: '0.8rem' }}>{p.rating}</Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* ── Pagination ── */}
        {!loading && totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </Typography>
            <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} size="small" shape="rounded"
              sx={{ '& .MuiPaginationItem-root': { fontFamily: '"DM Sans", sans-serif', fontSize: '0.75rem' } }} />
          </Box>
        )}

        {/* ── Read-only drawer (edit mode OFF) ── */}
        {!editMode && (
          <ReadOnlyDrawer
            product={selected}
            onClose={() => setSelected(null)}
            onEditClick={handleEditFromReadOnly}
          />
        )}

        {/* ── Edit form drawer (edit mode ON, row clicked) ── */}
        {editMode && selected && (
          <ProductFormDrawer
            product={selected}
            isNew={false}
            onClose={() => setSelected(null)}
            onSaved={(saved) => handleSaved(saved, false)}
          />
        )}

        {/* ── Add new drawer (always available) ── */}
        {addOpen && (
          <ProductFormDrawer
            product={null}
            isNew={true}
            onClose={() => setAddOpen(false)}
            onSaved={(saved) => handleSaved(saved, true)}
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
