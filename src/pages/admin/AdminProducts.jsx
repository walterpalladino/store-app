import { useState, useEffect, useCallback } from 'react'
import {
  Box, Typography, Divider, TextField, InputAdornment, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Avatar, Rating, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Alert, Button, Pagination, Fade, Drawer,
  IconButton, Tooltip,
} from '@mui/material'
import {
  SearchOutlined, RefreshOutlined, CloseOutlined,
  InventoryOutlined, TrendingUpOutlined, StarOutlined,
} from '@mui/icons-material'
import API from '../../config/api'

const PAGE_SIZE = 15

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

function ProductDrawer({ product, onClose }) {
  if (!product) return null
  const discounted = (product.price * (1 - product.discountPercentage / 100)).toFixed(2)
  return (
    <Drawer anchor="right" open={!!product} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, bgcolor: 'background.paper', display: 'flex', flexDirection: 'column' } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.1rem', fontWeight: 400 }}>Product Detail</Typography>
        <IconButton size="small" onClick={onClose}><CloseOutlined sx={{ fontSize: 18 }} /></IconButton>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        {/* Image */}
        <Box sx={{ bgcolor: '#f0ece3', borderRadius: 2, p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3, height: 200 }}>
          <Box component="img" src={product.thumbnail} alt={product.title} sx={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
        </Box>

        {/* Header */}
        <Chip label={product.category} size="small" sx={{ mb: 1, textTransform: 'capitalize', bgcolor: 'rgba(200,169,110,0.1)', color: 'secondary.dark' }} />
        <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.4rem', fontWeight: 400, mb: 0.5, lineHeight: 1.25 }}>{product.title}</Typography>
        <Typography sx={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.7rem', color: 'text.secondary', letterSpacing: '0.08em', mb: 2 }}>SKU: {product.sku || `PROD-${product.id}`}</Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
          <Rating value={product.rating} precision={0.1} size="small" readOnly />
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>({product.rating})</Typography>
        </Box>

        <Divider sx={{ mb: 2.5 }} />

        {/* Pricing */}
        <Box sx={{ display: 'flex', gap: 3, mb: 2.5 }}>
          <Box>
            <Typography sx={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.25 }}>Sale Price</Typography>
            <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.5rem', fontWeight: 500 }}>${discounted}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.25 }}>List Price</Typography>
            <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.5rem', fontWeight: 500, color: 'text.secondary', textDecoration: 'line-through' }}>${product.price.toFixed(2)}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.25 }}>Discount</Typography>
            <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.5rem', fontWeight: 500, color: 'success.main' }}>-{product.discountPercentage.toFixed(1)}%</Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 2.5 }} />

        {/* Specs */}
        {[
          { label: 'Stock',        value: product.stock },
          { label: 'Availability', value: product.availabilityStatus },
          { label: 'Brand',        value: product.brand || '—' },
          { label: 'Weight',       value: product.weight ? `${product.weight}g` : '—' },
          { label: 'Min Order',    value: product.minimumOrderQuantity ?? 1 },
          { label: 'Warranty',     value: product.warrantyInformation || '—' },
          { label: 'Return Policy',value: product.returnPolicy || '—' },
        ].map(({ label, value }) => (
          <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}>{label}</Typography>
            <Typography sx={{ fontSize: '0.85rem' }}>{value}</Typography>
          </Box>
        ))}

        {/* Description */}
        {product.description && (
          <Box sx={{ mt: 2.5 }}>
            <Typography sx={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary', mb: 1 }}>Description</Typography>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', lineHeight: 1.7 }}>{product.description}</Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  )
}

export default function AdminProducts() {
  const [products,    setProducts]    = useState([])
  const [total,       setTotal]       = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [search,      setSearch]      = useState('')
  const [category,    setCategory]    = useState('all')
  const [categories,  setCategories]  = useState([])
  const [page,        setPage]        = useState(1)
  const [selected,    setSelected]    = useState(null)

  // Load categories once
  useEffect(() => {
    fetch(API.products.categories)
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const loadProducts = useCallback(async () => {
    setLoading(true); setError('')
    try {
      let url
      const skip = (page - 1) * PAGE_SIZE
      if (search.trim()) {
        url = `${API.products.search}?q=${encodeURIComponent(search.trim())}&limit=${PAGE_SIZE}&skip=${skip}`
      } else if (category !== 'all') {
        url = `${API.products.byCategory(category)}?limit=${PAGE_SIZE}&skip=${skip}`
      } else {
        url = `${API.products.list}?limit=${PAGE_SIZE}&skip=${skip}`
      }
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to load products')
      const data = await res.json()
      setProducts(data.products ?? [])
      setTotal(data.total ?? 0)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [search, category, page])

  useEffect(() => { loadProducts() }, [loadProducts])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [search, category])

  const totalPages    = Math.ceil(total / PAGE_SIZE)
  const inStock       = products.filter((p) => p.stock > 0).length
  const avgRating     = products.length ? (products.reduce((s, p) => s + p.rating, 0) / products.length).toFixed(1) : '—'
  const avgPrice      = products.length ? (products.reduce((s, p) => s + p.price, 0) / products.length).toFixed(2) : '—'

  return (
    <Fade in>
      <Box>
        {/* Page title */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.35rem', fontWeight: 400, lineHeight: 1.2, mb: 0.4 }}>Products</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>Browse and manage your product catalogue.</Typography>
        </Box>
        <Divider sx={{ mb: 3 }} />

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
          <StatCard icon={<InventoryOutlined sx={{ fontSize: 16 }} />} label="Total Products" value={loading ? '…' : total} />
          <StatCard icon={<InventoryOutlined sx={{ fontSize: 16 }} />} label="In Stock" value={loading ? '…' : inStock} color="success.main" />
          <StatCard icon={<TrendingUpOutlined sx={{ fontSize: 16 }} />} label="Avg Price" value={loading ? '…' : `$${avgPrice}`} />
          <StatCard icon={<StarOutlined sx={{ fontSize: 16 }} />} label="Avg Rating" value={loading ? '…' : avgRating} color="#c8a96e" />
        </Box>

        {/* Toolbar */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small" placeholder="Search products…"
            value={search} onChange={(e) => setSearch(e.target.value)}
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
            <IconButton size="small" onClick={loadProducts} disabled={loading}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <RefreshOutlined sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3, fontSize: '0.78rem' }} action={<Button size="small" onClick={loadProducts}>Retry</Button>}>{error}</Alert>}

        {/* Table */}
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
                      <TableRow
                        key={p.id}
                        onClick={() => setSelected(p)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: idx % 2 === 0 ? 'transparent' : 'rgba(26,26,26,0.012)',
                          '&:last-child td': { border: 0 },
                          '&:hover': { bgcolor: 'rgba(200,169,110,0.04)' },
                          transition: 'background 0.15s',
                        }}
                      >
                        {/* Product */}
                        <TableCell sx={{ py: 1.5, px: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar src={p.thumbnail} alt={p.title} variant="rounded" sx={{ width: 36, height: 36, bgcolor: '#f0ece3' }}>
                              <Box component="img" src={p.thumbnail} sx={{ width: '100%', height: '100%', objectFit: 'contain', p: 0.5 }} />
                            </Avatar>
                            <Typography sx={{ fontSize: '0.82rem', fontFamily: '"Cormorant Garamond", serif', fontWeight: 400, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</Typography>
                          </Box>
                        </TableCell>
                        {/* SKU */}
                        <TableCell sx={{ py: 1.5, px: 2 }}>
                          <Typography sx={{ fontSize: '0.68rem', fontFamily: 'monospace', color: 'text.secondary', whiteSpace: 'nowrap' }}>{p.sku || `PROD-${p.id}`}</Typography>
                        </TableCell>
                        {/* Category */}
                        <TableCell sx={{ py: 1.5, px: 2 }}>
                          <Chip label={p.category} size="small" sx={{ height: 18, fontSize: '0.6rem', textTransform: 'capitalize', bgcolor: 'rgba(26,26,26,0.05)' }} />
                        </TableCell>
                        {/* Price */}
                        <TableCell sx={{ py: 1.5, px: 2, whiteSpace: 'nowrap' }}>
                          <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '0.95rem', fontWeight: 500 }}>${p.price.toFixed(2)}</Typography>
                        </TableCell>
                        {/* Discount */}
                        <TableCell sx={{ py: 1.5, px: 2, whiteSpace: 'nowrap' }}>
                          {p.discountPercentage > 0
                            ? <Chip label={`-${p.discountPercentage.toFixed(1)}%`} size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(200,169,110,0.1)', color: 'secondary.dark', fontWeight: 500 }} />
                            : <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>—</Typography>
                          }
                        </TableCell>
                        {/* Stock */}
                        <TableCell sx={{ py: 1.5, px: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: p.stock > 10 ? 'success.main' : p.stock > 0 ? 'secondary.main' : 'error.main', flexShrink: 0 }} />
                            <Typography sx={{ fontSize: '0.8rem' }}>{p.stock}</Typography>
                          </Box>
                        </TableCell>
                        {/* Rating */}
                        <TableCell sx={{ py: 1.5, px: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <StarOutlined sx={{ fontSize: 13, color: '#c8a96e' }} />
                            <Typography sx={{ fontSize: '0.8rem' }}>{p.rating}</Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                }
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </Typography>
            <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} size="small" shape="rounded"
              sx={{ '& .MuiPaginationItem-root': { fontFamily: '"DM Sans", sans-serif', fontSize: '0.75rem' } }} />
          </Box>
        )}

        <ProductDrawer product={selected} onClose={() => setSelected(null)} />
      </Box>
    </Fade>
  )
}
