import { useState, useEffect, useCallback, useRef } from 'react'
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
  ImageOutlined, DriveFileRenameOutlineOutlined, AutoFixHighOutlined,
  CloudUploadOutlined, DeleteOutlineOutlined, AddPhotoAlternateOutlined,
} from '@mui/icons-material'
import API from '../../config/api'
import { unwrap } from '../../utils/apiUtils'
import { productFromCents, unitsToCents } from '../../utils/money'
import logger from '../../utils/logger'
import { useMerchantAuth } from '../../context/MerchantAuthContext'
import {
  IMAGE_TYPES, fetchProductImages, uploadProductImage, deleteProductImage,
} from '../../services/productImageService'

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

// Images (`thumbnail`, `primaryImage`, `images`) are read-only, derived fields
// on the product — they are NOT part of the editable form and never written on
// product create/update. They are managed through the image endpoints (see
// ImageManager below and productImageService).
const EMPTY_FORM = {
  title: '', description: '', price: '', discountPercentage: '',
  stock: '', category: '', brand: '', sku: '',
  weight: '', warrantyInformation: '', returnPolicy: '',
  minimumOrderQuantity: '', availabilityStatus: 'In Stock',
  size: '', color: '', attr1: '', attr2: '', attr3: '', attr4: '',
}

// Attributes fed to POST /api/products/sku/generate (only non-empty ones are sent).
const SKU_ATTR_KEYS = ['category', 'brand', 'size', 'color', 'attr1', 'attr2', 'attr3', 'attr4']

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
    weight:               p.weight               ?? '',
    warrantyInformation:  p.warrantyInformation  ?? '',
    returnPolicy:         p.returnPolicy         ?? '',
    minimumOrderQuantity: p.minimumOrderQuantity ?? '',
    availabilityStatus:   p.availabilityStatus   ?? 'In Stock',
    size:                 p.size                 ?? '',
    color:                p.color                ?? '',
    attr1:                p.attr1                ?? '',
    attr2:                p.attr2                ?? '',
    attr3:                p.attr3                ?? '',
    attr4:                p.attr4                ?? '',
  }
}

// Rebuild the product's read-only image fields from a list of image objects,
// mirroring how the backend derives them, so the table/detail views can update
// immediately after an upload or delete without a full reload.
function deriveImageFields(images) {
  const list = Array.isArray(images) ? images : []
  const primary = list.find((i) => i.imageType === 'PRIMARY')
  const thumb   = list.find((i) => i.imageType === 'THUMBNAIL')
  const others  = list.filter((i) => i.imageType === 'OTHER')
  return {
    primaryImage: primary?.url ?? '',
    thumbnail:    thumb?.url ?? primary?.url ?? '',
    images:       others.map((i) => i.url),
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

// ── Image manager ────────────────────────────────────────────────────────────
// Manages a product's images through the dedicated image endpoints. One reusable
// upload form covers all three slots — the admin picks the type (Primary /
// Thumbnail / Other) per image.
//   • Edit mode (productId set): reads the live image list and uploads/deletes
//     against the server immediately.
//   • New mode (no productId yet): stages files locally; the parent uploads them
//     once the product has been created and has an id.
const IMAGE_TYPE_COLORS = {
  PRIMARY:   { bg: 'rgba(74,124,89,0.12)',  fg: 'success.main'   },
  THUMBNAIL: { bg: 'rgba(200,169,110,0.14)', fg: 'secondary.dark' },
  OTHER:     { bg: 'rgba(26,26,26,0.06)',    fg: 'text.secondary' },
}

function ImageTile({ src, imageType, altText, onDelete, disabled }) {
  const c = IMAGE_TYPE_COLORS[imageType] ?? IMAGE_TYPE_COLORS.OTHER
  return (
    <Box sx={{ position: 'relative', borderRadius: 1.5, overflow: 'hidden', border: '1px solid', borderColor: 'divider', bgcolor: '#f0ece3', aspectRatio: '1' }}>
      <Box component="img" src={src} alt={altText || imageType}
        sx={{ width: '100%', height: '100%', objectFit: 'contain', p: 0.5 }}
        onError={(e) => { e.target.style.visibility = 'hidden' }} />
      <Chip label={imageType} size="small"
        sx={{ position: 'absolute', top: 4, left: 4, height: 16, fontSize: '0.52rem', letterSpacing: '0.05em', bgcolor: c.bg, color: c.fg }} />
      <Tooltip title="Remove image" arrow>
        <span style={{ position: 'absolute', top: 2, right: 2 }}>
          <IconButton size="small" onClick={onDelete} disabled={disabled}
            sx={{ bgcolor: 'rgba(250,247,242,0.9)', '&:hover': { bgcolor: '#fff' } }}>
            <DeleteOutlineOutlined sx={{ fontSize: 15, color: 'error.main' }} />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  )
}

function ImageManager({ productId, merchantFetch, staged, setStaged, onDerivedChange }) {
  const isNew = !productId
  const [images,  setImages]  = useState([])
  const [loading, setLoading] = useState(!isNew)
  const [busy,    setBusy]    = useState(false)
  const [err,     setErr]     = useState('')
  const [draft,   setDraft]   = useState(null)   // { file, preview, altText, imageType }
  const fileRef = useRef(null)

  const count = isNew ? staged.length : images.length

  // Load the live image list in edit mode.
  useEffect(() => {
    if (isNew) return
    let alive = true
    setLoading(true)
    fetchProductImages(productId)
      .then((imgs) => { if (alive) setImages(imgs) })
      .catch((e) => { if (alive) setErr(e.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [productId, isNew])

  const pickFile = () => { setErr(''); fileRef.current?.click() }

  const onFileChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''   // allow re-picking the same file
    if (!file) return
    // Match the backend default: the first image is PRIMARY, the rest OTHER.
    const defaultType = count === 0 ? 'PRIMARY' : 'OTHER'
    setDraft({ file, preview: URL.createObjectURL(file), altText: '', imageType: defaultType })
  }

  const clearDraft = () => {
    if (draft?.preview) URL.revokeObjectURL(draft.preview)
    setDraft(null)
  }

  const confirmDraft = async () => {
    if (!draft) return
    if (isNew) {
      // Keep the object URL alive for the staged thumbnail — revoked when removed
      // or when the drawer closes.
      setStaged((prev) => [...prev, { ...draft, key: `${Date.now()}-${Math.random()}` }])
      setDraft(null)
      return
    }
    setBusy(true); setErr('')
    try {
      await uploadProductImage(merchantFetch, productId, {
        file: draft.file, altText: draft.altText, imageType: draft.imageType,
      })
      // A new PRIMARY/THUMBNAIL demotes the previous one, so refetch the list.
      const fresh = await fetchProductImages(productId)
      setImages(fresh)
      onDerivedChange?.(deriveImageFields(fresh))
      clearDraft()
    } catch (e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  const removeStaged = (key) => {
    setStaged((prev) => {
      const gone = prev.find((s) => s.key === key)
      if (gone?.preview) URL.revokeObjectURL(gone.preview)
      return prev.filter((s) => s.key !== key)
    })
  }

  const removeServer = async (imageId) => {
    setBusy(true); setErr('')
    try {
      await deleteProductImage(merchantFetch, productId, imageId)
      const fresh = await fetchProductImages(productId)
      setImages(fresh)
      onDerivedChange?.(deriveImageFields(fresh))
    } catch (e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  // Hero preview: the primary/first image (staged or live).
  const hero = isNew
    ? staged[0]?.preview
    : (images.find((i) => i.imageType === 'PRIMARY') ?? images[0])?.url

  return (
    <Box sx={{ mb: 3 }}>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFileChange} />

      {/* Clickable hero — click to add/replace an image */}
      <Box
        onClick={draft ? undefined : pickFile}
        sx={{
          bgcolor: '#f0ece3', borderRadius: 2, height: 160, mb: 1.5, overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: draft ? 'default' : 'pointer', position: 'relative',
          border: '1px dashed', borderColor: 'rgba(26,26,26,0.18)',
          transition: 'border-color 0.2s, background 0.2s',
          '&:hover': draft ? {} : { borderColor: 'secondary.main', bgcolor: '#ece7dc' },
        }}
      >
        {hero
          ? <Box component="img" src={hero} alt="preview" sx={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none' }} />
          : <Box sx={{ textAlign: 'center', px: 2 }}>
              <AddPhotoAlternateOutlined sx={{ fontSize: 40, color: 'rgba(26,26,26,0.25)', mb: 1 }} />
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Click to upload a product image</Typography>
            </Box>}
      </Box>

      {err && <Alert severity="error" sx={{ mb: 1.5, fontSize: '0.76rem' }} onClose={() => setErr('')}>{err}</Alert>}

      {/* Upload sub-form — shown once a file is picked. Reused for every type. */}
      {draft && (
        <Box sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'rgba(200,169,110,0.4)', borderRadius: 2, bgcolor: 'rgba(200,169,110,0.05)' }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box component="img" src={draft.preview} alt="to upload"
              sx={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 1, bgcolor: '#f0ece3', flexShrink: 0 }} />
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField
                fullWidth size="small" label="Alt text" value={draft.altText}
                onChange={(e) => setDraft((d) => ({ ...d, altText: e.target.value }))}
                sx={fieldSx}
              />
              <FormControl fullWidth size="small" sx={fieldSx}>
                <InputLabel sx={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.82rem' }}>Image Type</InputLabel>
                <Select label="Image Type" value={draft.imageType}
                  onChange={(e) => setDraft((d) => ({ ...d, imageType: e.target.value }))}
                  sx={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.85rem' }}>
                  {IMAGE_TYPES.map((t) => (
                    <MenuItem key={t} value={t} sx={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.85rem' }}>
                      {t === 'PRIMARY' ? 'Primary Image' : t === 'THUMBNAIL' ? 'Thumbnail Image' : 'Other Image'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, mt: 1.5, justifyContent: 'flex-end' }}>
            <Button size="small" onClick={clearDraft} disabled={busy}
              sx={{ fontSize: '0.68rem', letterSpacing: '0.05em' }}>Cancel</Button>
            <Button size="small" variant="contained" onClick={confirmDraft} disabled={busy}
              startIcon={busy ? <CircularProgress size={13} sx={{ color: 'inherit' }} /> : <CloudUploadOutlined sx={{ fontSize: 15 }} />}
              sx={{ fontSize: '0.68rem', letterSpacing: '0.05em' }}>
              {busy ? 'Uploading…' : isNew ? 'Add Image' : 'Upload'}
            </Button>
          </Box>
        </Box>
      )}

      {/* Existing / staged images */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={20} /></Box>
      ) : count > 0 ? (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary' }}>
              {isNew ? 'Images to upload' : 'Product Images'} ({count})
            </Typography>
            <Button size="small" startIcon={<AddOutlined sx={{ fontSize: 15 }} />} onClick={pickFile} disabled={busy || !!draft}
              sx={{ fontSize: '0.66rem', letterSpacing: '0.05em', color: 'secondary.dark' }}>Add image</Button>
          </Box>
          <Grid container spacing={1}>
            {isNew
              ? staged.map((s) => (
                  <Grid item xs={4} sm={3} key={s.key}>
                    <ImageTile src={s.preview} imageType={s.imageType} altText={s.altText} onDelete={() => removeStaged(s.key)} disabled={busy} />
                  </Grid>
                ))
              : images.map((img) => (
                  <Grid item xs={4} sm={3} key={img.id}>
                    <ImageTile src={img.url} imageType={img.imageType} altText={img.altText} onDelete={() => removeServer(img.id)} disabled={busy} />
                  </Grid>
                ))}
          </Grid>
        </>
      ) : null}

      {isNew && (
        <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', mt: 1.5, fontStyle: 'italic' }}>
          Images are uploaded when the product is created.
        </Typography>
      )}
    </Box>
  )
}

// ── Product form drawer (Add + Edit) ─────────────────────────────────────────
function ProductFormDrawer({ product, isNew, onClose, onSaved, onImagesChanged }) {
  const { merchantFetch } = useMerchantAuth()
  const isOpen = isNew || !!product
  const [form,    setForm]     = useState(() => isNew ? { ...EMPTY_FORM } : formFromProduct(product ?? {}))
  const [errors,  setErrors]   = useState({})
  const [saving,  setSaving]   = useState(false)
  const [apiError, setApiError] = useState('')
  const [genSku,  setGenSku]   = useState(false)
  // Images staged locally for a *new* product — uploaded once it has an id.
  const [staged,  setStaged]   = useState([])
  const stagedRef = useRef(staged)
  stagedRef.current = staged

  useEffect(() => {
    if (isNew)          setForm({ ...EMPTY_FORM })
    else if (product)   setForm(formFromProduct(product))
    setErrors({}); setApiError('')
    // Drop any locally-staged previews when a different product is opened.
    setStaged((prev) => { prev.forEach((s) => s.preview && URL.revokeObjectURL(s.preview)); return [] })
    // Intentionally keyed on product identity — reset only when a *different*
    // product is opened, not on every re-render that yields a new object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, isNew])

  // Revoke any still-staged object URLs when the drawer unmounts (closes).
  useEffect(() => () => { stagedRef.current.forEach((s) => s.preview && URL.revokeObjectURL(s.preview)) }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
    setErrors((p) => ({ ...p, [name]: undefined }))
    setApiError('')
  }

  const handleGenerateSku = async () => {
    setApiError('')
    // Collect only the non-empty attributes for the payload.
    const payload = SKU_ATTR_KEYS.reduce((acc, key) => {
      const val = typeof form[key] === 'string' ? form[key].trim() : form[key]
      if (val !== '' && val != null) acc[key] = val
      return acc
    }, {})
    setGenSku(true)
    try {
      const res  = await fetch(API.products.skuGenerate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await unwrap(res)                       // { sku } (throws on success:false)
      const sku  = data?.sku ?? data?.code ?? data?.generatedSku
      if (!sku) throw new Error('No SKU was returned by the server.')
      setForm((p) => ({ ...p, sku }))
      setErrors((p) => ({ ...p, sku: undefined }))
    } catch (err) {
      setApiError(err.message || 'SKU generation failed. Please try again.')
    } finally {
      setGenSku(false)
    }
  }

  const handleSubmit = async () => {
    const errs = validateForm(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true); setApiError('')
    try {
      const body = {
        title:                form.title.trim(),
        description:          form.description.trim(),
        price:                unitsToCents(form.price),   // form is in dollars; API wants integer cents
        discountPercentage:   form.discountPercentage !== '' ? Number(form.discountPercentage) : 0,
        stock:                form.stock !== '' ? Number(form.stock) : 0,
        category:             form.category.trim(),
        brand:                form.brand.trim(),
        sku:                  form.sku.trim(),
        // Image fields are read-only/derived — never sent on create/update.
        weight:               form.weight !== '' ? Number(form.weight) : undefined,
        warrantyInformation:  form.warrantyInformation.trim(),
        returnPolicy:         form.returnPolicy.trim(),
        minimumOrderQuantity: form.minimumOrderQuantity !== '' ? Number(form.minimumOrderQuantity) : 1,
        availabilityStatus:   form.availabilityStatus,
        size:                 form.size.trim(),
        color:                form.color.trim(),
        attr1:                form.attr1.trim(),
        attr2:                form.attr2.trim(),
        attr3:                form.attr3.trim(),
        attr4:                form.attr4.trim(),
      }
      const url    = isNew ? API.products.add : API.products.byId(product.id)
      const method = isNew ? 'POST' : 'PATCH'
      // These are ADMIN endpoints — go through merchantFetch so the Bearer token
      // is attached (a 401 signs the admin out and redirects to admin login).
      const res   = await merchantFetch(url, { method, body: JSON.stringify(body) })
      const saved = await unwrap(res)  // { id, title, price, ... } in cents (throws on success:false)
      const productId = saved.id ?? product?.id

      // A new product's images were staged locally — upload them now that we have
      // an id, then derive the read-only image fields for the merged row.
      let derived = {}
      if (isNew && staged.length && productId) {
        const uploaded = []
        for (const s of staged) {
          try {
            uploaded.push(await uploadProductImage(merchantFetch, productId, {
              file: s.file, altText: s.altText, imageType: s.imageType,
            }))
          } catch (e) {
            setApiError(`Product created, but "${s.file.name}" failed to upload: ${e.message}`)
          }
        }
        derived = deriveImageFields(uploaded)
      }

      // Both `body` and the API response carry price in cents; convert the
      // merged result back to units so it matches the rest of the table state.
      onSaved(productFromCents({ ...body, id: productId ?? Date.now(), rating: product?.rating ?? 0, ...saved, ...derived }))
    } catch (err) { setApiError(err.message || 'Save failed. Please try again.') }
    finally { setSaving(false) }
  }

  const FIELDS = [
    { name: 'title',                label: 'Product Title *',    type: 'text',   xs: 12, sm: 12 },
    { name: 'category',             label: 'Category *',         type: 'text',   xs: 12, sm: 6  },
    { name: 'brand',                label: 'Brand',              type: 'text',   xs: 12, sm: 6  },
    { name: 'size',                 label: 'Size',               type: 'text',   xs: 12, sm: 6  },
    { name: 'color',                label: 'Color',              type: 'text',   xs: 12, sm: 6  },
    { name: 'attr1',                label: 'Attribute 1',        type: 'text',   xs: 12, sm: 6  },
    { name: 'attr2',                label: 'Attribute 2',        type: 'text',   xs: 12, sm: 6  },
    { name: 'attr3',                label: 'Attribute 3',        type: 'text',   xs: 12, sm: 6  },
    { name: 'attr4',                label: 'Attribute 4',        type: 'text',   xs: 12, sm: 6  },
    { name: 'price',                label: 'List Price ($) *',   type: 'number', xs: 12, sm: 6  },
    { name: 'discountPercentage',   label: 'Discount (%)',       type: 'number', xs: 12, sm: 6, hint: '0–100' },
    { name: 'stock',                label: 'Stock Quantity',     type: 'number', xs: 12, sm: 6  },
    { name: 'minimumOrderQuantity', label: 'Min. Order Qty',     type: 'number', xs: 12, sm: 6  },
    { name: 'weight',               label: 'Weight (g)',         type: 'number', xs: 12, sm: 6  },
    { name: 'warrantyInformation',  label: 'Warranty',           type: 'text',   xs: 12, sm: 6  },
    { name: 'returnPolicy',         label: 'Return Policy',      type: 'text',   xs: 12, sm: 12 },
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
        {/* Images — Primary / Thumbnail / Other, managed via the image endpoints */}
        <ImageManager
          productId={isNew ? null : product?.id}
          merchantFetch={merchantFetch}
          staged={staged}
          setStaged={setStaged}
          onDerivedChange={isNew ? undefined : (derived) => onImagesChanged?.(product.id, derived)}
        />

        {apiError && (
          <Alert severity="error" sx={{ mb: 2.5, fontSize: '0.78rem' }} onClose={() => setApiError('')}>{apiError}</Alert>
        )}

        <Grid container spacing={2}>
          {/* SKU — always manually editable, with a one-click generator */}
          <Grid item xs={12}>
            <TextField
              fullWidth size="small" name="sku" label="SKU"
              value={form.sku} onChange={handleChange}
              error={!!errors.sku} helperText={errors.sku ?? 'Edit manually or generate from the attributes below'}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      size="small" onClick={handleGenerateSku} disabled={genSku}
                      startIcon={genSku ? <CircularProgress size={13} sx={{ color: 'inherit' }} /> : <AutoFixHighOutlined sx={{ fontSize: 15 }} />}
                      sx={{ fontSize: '0.66rem', letterSpacing: '0.05em', whiteSpace: 'nowrap', color: 'secondary.dark', '&:hover': { bgcolor: 'rgba(200,169,110,0.08)' } }}
                    >
                      {genSku ? 'Generating…' : 'Generate SKU'}
                    </Button>
                  </InputAdornment>
                ),
              }}
              sx={fieldSx}
            />
          </Grid>

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
      .catch((err) => logger.error('Failed to load categories:', err.message ?? err))
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
      // Prices arrive as integer cents — convert to units for the table + form.
      setProducts((data.products ?? []).map(productFromCents)); setTotal(data.total ?? 0)
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

  // An image was uploaded/deleted for a product — refresh its derived image
  // fields in the table (and the open drawer's selection) immediately.
  const handleImagesChanged = (id, derived) => {
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, ...derived } : p))
    setSelected((sel) => sel && sel.id === id ? { ...sel, ...derived } : sel)
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
            onImagesChanged={handleImagesChanged}
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
