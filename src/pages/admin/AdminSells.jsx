import { useState, useEffect, useCallback } from 'react'
import {
  Box, Typography, Divider, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Alert, Button, Fade,
  CircularProgress, Tooltip, IconButton, Snackbar, TextField,
  InputAdornment,
} from '@mui/material'
import {
  ReceiptLongOutlined, RefreshOutlined, TrendingUpOutlined,
  ShoppingBagOutlined, LocalOfferOutlined, PaidOutlined,
  CurrencyExchangeOutlined, SearchOutlined, ClearOutlined,
} from '@mui/icons-material'
import API from '../../config/api'
import { unwrap } from '../../utils/apiUtils'
import { orderFromCents } from '../../utils/money'
import { normalizeOrder } from '../../utils/orders'
import { useMerchantAuth } from '../../context/MerchantAuthContext'
import { startRefund } from '../../services/refundService'

// Reuse the same safe fetch + fallback from PurchaseHistoryPanel
const FALLBACK = [{
  id: 1,
  products: [
    { id: 162, sku: 'TOP-BRD-BLU-162', title: 'Blue Frock',         price: 29.99,   quantity: 4, total: 119.96,   discountPercentage: 12.13, discountedTotal: 105.41   },
    { id: 113, sku: 'MOT-GEN-GEN-113', title: 'Generic Motorcycle', price: 3999.99, quantity: 3, total: 11999.97, discountPercentage: 12.1,  discountedTotal: 10547.97 },
    { id: 122, sku: 'SMA-APP-IPH-122', title: 'iPhone 6',           price: 299.99,  quantity: 3, total: 899.97,   discountPercentage: 6.69,  discountedTotal: 839.76   },
    { id: 138, sku: 'SPO-BRD-BAS-138', title: 'Baseball Ball',      price: 8.99,    quantity: 2, total: 17.98,    discountPercentage: 1.71,  discountedTotal: 17.67    },
  ],
  total: 13037.88, discountedTotal: 11510.81,
  userId: 1, totalProducts: 4, totalQuantity: 12,
  status: 'Delivered',
  payment: { cardExpire: '01/30', cardNumber: '3530633803003665', cardType: 'JCB', currency: 'USD' },
}]

const STATUS_STYLES = {
  'delivered':         { color: '#4a7c59', bg: 'rgba(74,124,89,0.1)'    },
  'payment completed': { color: '#4a7c59', bg: 'rgba(74,124,89,0.1)'    },
  'completed':         { color: '#4a7c59', bg: 'rgba(74,124,89,0.1)'    },
  'paid':              { color: '#4a7c59', bg: 'rgba(74,124,89,0.1)'    },
  'fulfilled':         { color: '#4a7c59', bg: 'rgba(74,124,89,0.1)'    },
  'shipped':           { color: '#5a8fa3', bg: 'rgba(90,143,163,0.12)'  },
  'processing':        { color: '#c8a96e', bg: 'rgba(200,169,110,0.12)' },
  'pending':           { color: '#c8a96e', bg: 'rgba(200,169,110,0.12)' },
  'pending_payment':   { color: '#c8a96e', bg: 'rgba(200,169,110,0.12)' },
  'refunded':          { color: '#7a6aa8', bg: 'rgba(122,106,168,0.12)' },
  'error':             { color: '#b85c4a', bg: 'rgba(184,92,74,0.1)'    },
  'payment could not be processed': { color: '#b85c4a', bg: 'rgba(184,92,74,0.1)' },
  'payment_failed':    { color: '#b85c4a', bg: 'rgba(184,92,74,0.1)'    },
  'cancelled':         { color: '#b85c4a', bg: 'rgba(184,92,74,0.1)'    },
}

function getStatus(s) {
  return STATUS_STYLES[(s ?? '').toLowerCase()] ?? { color: '#6b6560', bg: 'rgba(107,101,96,0.1)' }
}

const fmt = (n) => Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

// Public order id shown to users: the first segment of the UUID (#018f9a2c),
// falling back to the padded numeric id for demo/legacy orders without one.
const shortOrderId = (tx) =>
  tx?.orderId ? `#${String(tx.orderId).split('-')[0]}` : `#${String(tx?.id).padStart(5, '0')}`

// Order line-items may arrive in the lean API shape ({ productId, quantity, price })
// or the richer legacy/demo shape ({ id, title, discountedTotal, discountPercentage }).
const pid     = (p) => p.productId ?? p.id
const lineRev = (p) => p.discountedTotal ?? p.total ?? (p.price ?? 0) * (p.quantity ?? 0)

function mockDate(id) {
  const d = new Date('2024-01-15')
  d.setDate(d.getDate() + (id - 1) * 23)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function StatCard({ icon, label, value, sub, color = 'secondary.dark' }) {
  return (
    <Box sx={{ flex: 1, minWidth: 140, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
        <Box sx={{ color, display: 'flex' }}>{icon}</Box>
        <Typography sx={{ fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary' }}>{label}</Typography>
      </Box>
      <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.6rem', fontWeight: 500, lineHeight: 1 }}>{value}</Typography>
      {sub && <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', mt: 0.5 }}>{sub}</Typography>}
    </Box>
  )
}

export default function AdminSells() {
  const { merchantFetch } = useMerchantAuth()
  const [transactions,  setTransactions]  = useState([])
  const [thumbnails,    setThumbnails]    = useState({})
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')
  const [usingFallback, setUsingFallback] = useState(false)
  const [refundingId,   setRefundingId]   = useState(null)   // order id with a refund in flight
  const [toast,         setToast]         = useState({ open: false, message: '', severity: 'success' })
  const [query,         setQuery]         = useState('')     // public order-id search

  const closeToast = () => setToast((t) => ({ ...t, open: false }))

  const load = useCallback(async (q = '') => {
    setLoading(true); setError(''); setUsingFallback(false)
    try {
      // Orders are 🔒 and scoped by role at the backend — go through the
      // authenticated admin fetcher so the caller's ADMIN token is sent.
      // With a query, hit the search endpoint (substring match on the public
      // order id); empty query lists every order.
      const url  = q.trim() ? API.orders.search(q.trim()) : API.orders.list
      const res  = await merchantFetch(url)
      const data = await unwrap(res)  // { orders: [...] }
      const rows = Array.isArray(data.orders) ? data.orders
        : Array.isArray(data.transactions) ? data.transactions
        : Array.isArray(data) ? data : [data]
      // Live orders carry money as integer cents — convert to units, then flatten
      // the denormalised line items (`sku`/`description`/`qty`) to the shape the
      // table renders (`title`/`quantity`/`discountedTotal`/…).
      const list = rows.map(orderFromCents).map(normalizeOrder)
      setTransactions(list)
      // Load thumbnails in background, keyed by sku (order lines carry only a sku).
      const skus = [...new Set(list.flatMap((tx) => tx.products.map((p) => p.sku).filter(Boolean)))]
      Promise.all(skus.map((sku) =>
        fetch(API.products.bySku(sku))
          .then((r) => r.json())
          .then((body) => { const d = body.success ? body.data : body; return [sku, d.thumbnail] })
          .catch(() => null)
      )).then((results) => {
        const map = {}
        results.forEach((r) => { if (r) map[r[0]] = r[1] })
        setThumbnails(map)
      })
    } catch (err) {
      setTransactions(FALLBACK)
      setUsingFallback(true)
      setError(`Live API unavailable — showing demo data. (${err.message})`)
    } finally { setLoading(false) }
  }, [merchantFetch])

  // Debounce searches so we don't fire a request on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => load(query), 350)
    return () => clearTimeout(t)
  }, [query, load])

  // Start a refund for a paid order (admin-only). The refund settles
  // asynchronously via a webhook, so the response reports a *pending* state —
  // we merge the returned refund fields into the row and report the outcome.
  const handleRefund = useCallback(async (tx) => {
    setRefundingId(tx.id)
    try {
      const { order, refund } = await startRefund(merchantFetch, tx.id)
      setTransactions((prev) => prev.map((t) => (t.id === tx.id
        ? { ...t, status: order?.status ?? t.status, refundStatus: order?.refundStatus ?? 'pending' }
        : t)))
      const state = refund?.status ?? order?.refundStatus ?? 'pending'
      setToast({
        open: true,
        severity: state === 'failed' ? 'error' : 'success',
        message: `Refund ${state} for order ${shortOrderId(tx)}.`,
      })
    } catch (err) {
      setToast({ open: true, severity: 'error', message: err.message || 'Refund could not be started.' })
    } finally {
      setRefundingId(null)
    }
  }, [merchantFetch])

  // Computed stats
  const totalRevenue   = transactions.reduce((s, t) => s + t.discountedTotal, 0)
  const totalOrders    = transactions.length
  const totalUnits     = transactions.reduce((s, t) => s + t.totalQuantity, 0)
  const avgOrderValue  = totalOrders ? (totalRevenue / totalOrders).toFixed(2) : '0.00'

  // Top product by revenue
  const productRevMap = {}
  transactions.forEach((tx) => {
    tx.products.forEach((p) => {
      productRevMap[p.title] = (productRevMap[p.title] ?? 0) + p.discountedTotal
    })
  })
  const topProduct = Object.entries(productRevMap).sort((a, b) => b[1] - a[1])[0]

  return (
    <Fade in>
      <Box>
        {/* Title */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.35rem', fontWeight: 400, mb: 0.4 }}>Sales</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>Order history and revenue overview.</Typography>
        </Box>
        <Divider sx={{ mb: 3 }} />

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
          <StatCard icon={<PaidOutlined sx={{ fontSize: 16 }} />}         label="Total Revenue"    value={fmt(totalRevenue)}     color="success.main" />
          <StatCard icon={<ReceiptLongOutlined sx={{ fontSize: 16 }} />}  label="Orders"           value={totalOrders}           />
          <StatCard icon={<ShoppingBagOutlined sx={{ fontSize: 16 }} />}  label="Units Sold"       value={totalUnits}            color="#c8a96e" />
          <StatCard icon={<TrendingUpOutlined sx={{ fontSize: 16 }} />}   label="Avg Order Value"  value={`$${avgOrderValue}`}   />
        </Box>

        {/* Top product */}
        {topProduct && (
          <Box sx={{ mb: 3, bgcolor: 'rgba(200,169,110,0.06)', border: '1px solid rgba(200,169,110,0.2)', borderRadius: 2, px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <LocalOfferOutlined sx={{ fontSize: 18, color: 'secondary.dark' }} />
            <Box>
              <Typography sx={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'secondary.dark', mb: 0.25 }}>Top Product by Revenue</Typography>
              <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1rem', fontWeight: 400 }}>{topProduct[0]}</Typography>
            </Box>
            <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.2rem', fontWeight: 500, ml: 'auto', color: 'secondary.dark' }}>{fmt(topProduct[1])}</Typography>
          </Box>
        )}

        {/* Alerts */}
        {error && (
          <Alert severity={usingFallback ? 'warning' : 'error'} sx={{ mb: 3, fontSize: '0.78rem' }}
            action={<Button size="small" color="inherit" onClick={() => load(query)} startIcon={<RefreshOutlined sx={{ fontSize: 13 }} />} sx={{ fontSize: '0.68rem' }}>Retry</Button>}
            onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Toolbar */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
          <TextField
            size="small"
            placeholder="Search by order id…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ minWidth: 240, flex: '1 1 240px', maxWidth: 360, '& .MuiOutlinedInput-root': { borderRadius: 1, fontSize: '0.8rem' } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlined sx={{ fontSize: 17, color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: query ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setQuery('')} aria-label="Clear search">
                    <ClearOutlined sx={{ fontSize: 15 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 'auto' }}>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
              {totalOrders} {totalOrders === 1 ? 'order' : 'orders'} {query ? 'matched' : 'found'}
            </Typography>
            <Tooltip title="Refresh" arrow>
              <IconButton size="small" onClick={() => load(query)} disabled={loading}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <RefreshOutlined sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Orders table */}
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', mb: 4 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Order', 'Date', 'Products', 'Units', 'Payment', 'Total', 'Status', 'Actions'].map((h) => (
                    <TableCell key={h} sx={{ py: 1.5, px: 2, fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.secondary', fontWeight: 500, bgcolor: 'rgba(26,26,26,0.02)', borderBottom: '1px solid', borderColor: 'divider', whiteSpace: 'nowrap' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j} sx={{ py: 1.5, px: 2 }}>
                            <Box sx={{ height: 14, borderRadius: 1, bgcolor: 'rgba(26,26,26,0.06)', width: j === 0 ? 60 : 80 }} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : transactions.map((tx, idx) => {
                      const st = getStatus(tx.status)
                      const savings = tx.total - tx.discountedTotal
                      const status       = String(tx.status ?? '').toLowerCase()
                      const refundStatus = String(tx.refundStatus ?? 'none').toLowerCase()
                      // A refund can only be started on a paid order that has no
                      // refund yet (the API returns 409 otherwise).
                      const canRefund  = status === 'paid' && (refundStatus === 'none' || refundStatus === '')
                      const isRefunding = refundingId === tx.id
                      return (
                        <TableRow key={tx.id} sx={{ bgcolor: idx % 2 === 0 ? 'transparent' : 'rgba(26,26,26,0.012)', '&:last-child td': { border: 0 }, '&:hover': { bgcolor: 'rgba(200,169,110,0.03)' }, transition: 'background 0.15s' }}>
                          {/* Order # */}
                          <TableCell sx={{ py: 1.75, px: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              <ReceiptLongOutlined sx={{ fontSize: 14, color: 'secondary.dark' }} />
                              <Tooltip title={tx.orderId || ''} arrow disableHoverListener={!tx.orderId}>
                                <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                                  {shortOrderId(tx)}
                                </Typography>
                              </Tooltip>
                            </Box>
                          </TableCell>
                          {/* Date */}
                          <TableCell sx={{ py: 1.75, px: 2, whiteSpace: 'nowrap' }}>
                            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{mockDate(tx.id)}</Typography>
                          </TableCell>
                          {/* Products (thumbnails) */}
                          <TableCell sx={{ py: 1.75, px: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {tx.products.slice(0, 3).map((p) => (
                                <Tooltip key={pid(p)} title={`${p.title ?? `#${pid(p)}`} × ${p.quantity}`} arrow>
                                  <Box sx={{ width: 28, height: 28, borderRadius: 0.75, bgcolor: '#f0ece3', border: '1px solid rgba(26,26,26,0.07)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0.25, flexShrink: 0 }}>
                                    {thumbnails[pid(p)]
                                      ? <Box component="img" src={thumbnails[pid(p)]} alt={p.title} sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                      : <ShoppingBagOutlined sx={{ fontSize: 14, color: 'rgba(26,26,26,0.2)' }} />
                                    }
                                  </Box>
                                </Tooltip>
                              ))}
                              {tx.products.length > 3 && (
                                <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>+{tx.products.length - 3}</Typography>
                              )}
                            </Box>
                          </TableCell>
                          {/* Units */}
                          <TableCell sx={{ py: 1.75, px: 2 }}>
                            <Typography sx={{ fontSize: '0.82rem' }}>{tx.totalQuantity}</Typography>
                          </TableCell>
                          {/* Payment */}
                          <TableCell sx={{ py: 1.75, px: 2, whiteSpace: 'nowrap' }}>
                            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                              {tx.payment?.cardType ?? '—'} ···{String(tx.payment?.cardNumber ?? '').slice(-4)}
                            </Typography>
                          </TableCell>
                          {/* Total */}
                          <TableCell sx={{ py: 1.75, px: 2, whiteSpace: 'nowrap' }}>
                            <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1rem', fontWeight: 500 }}>{fmt(tx.discountedTotal)}</Typography>
                            {savings > 0.01 && (
                              <Typography sx={{ fontSize: '0.65rem', color: 'success.main' }}>-{fmt(savings)}</Typography>
                            )}
                          </TableCell>
                          {/* Status */}
                          <TableCell sx={{ py: 1.75, px: 2 }}>
                            <Chip label={tx.status ?? 'Unknown'} size="small" sx={{ height: 20, fontSize: '0.6rem', letterSpacing: '0.06em', bgcolor: st.bg, color: st.color, fontWeight: 500, borderRadius: 1 }} />
                          </TableCell>
                          {/* Actions — refund (admin only, paid orders) */}
                          <TableCell sx={{ py: 1.75, px: 2, whiteSpace: 'nowrap' }}>
                            {refundStatus === 'pending' ? (
                              <Chip label="Refund pending" size="small" sx={{ height: 20, fontSize: '0.6rem', bgcolor: 'rgba(200,169,110,0.12)', color: '#c8a96e', fontWeight: 500, borderRadius: 1 }} />
                            ) : refundStatus === 'refunded' || status === 'refunded' ? (
                              <Chip label="Refunded" size="small" sx={{ height: 20, fontSize: '0.6rem', bgcolor: 'rgba(122,106,168,0.12)', color: '#7a6aa8', fontWeight: 500, borderRadius: 1 }} />
                            ) : refundStatus === 'failed' ? (
                              <Tooltip title="The last refund attempt failed" arrow>
                                <Chip label="Refund failed" size="small" sx={{ height: 20, fontSize: '0.6rem', bgcolor: 'rgba(184,92,74,0.1)', color: '#b85c4a', fontWeight: 500, borderRadius: 1 }} />
                              </Tooltip>
                            ) : (
                              <Tooltip title={canRefund ? 'Refund this order' : 'Only paid orders can be refunded'} arrow>
                                {/* span keeps the tooltip working while the button is disabled */}
                                <span>
                                  <Button
                                    size="small" variant="outlined" disabled={!canRefund || isRefunding}
                                    onClick={() => handleRefund(tx)}
                                    startIcon={isRefunding
                                      ? <CircularProgress size={13} sx={{ color: 'inherit' }} />
                                      : <CurrencyExchangeOutlined sx={{ fontSize: 14 }} />}
                                    sx={{ fontSize: '0.66rem', letterSpacing: '0.04em', textTransform: 'none', py: 0.4, px: 1.2, borderColor: 'rgba(184,92,74,0.4)', color: '#b85c4a', '&:hover': { borderColor: '#b85c4a', bgcolor: 'rgba(184,92,74,0.06)' } }}
                                  >
                                    {isRefunding ? 'Refunding…' : 'Refund'}
                                  </Button>
                                </span>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                }
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Product breakdown */}
        {transactions.length > 0 && (
          <Box>
            <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.1rem', fontWeight: 400, mb: 2 }}>Product Breakdown</Typography>
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['Product', 'SKU', 'Units Sold', 'Revenue', 'Discount'].map((h) => (
                        <TableCell key={h} sx={{ py: 1.5, px: 2, fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.secondary', fontWeight: 500, bgcolor: 'rgba(26,26,26,0.02)', borderBottom: '1px solid', borderColor: 'divider' }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.values(
                      transactions.flatMap((tx) => tx.products).reduce((acc, p) => {
                        const key = pid(p)
                        if (!acc[key]) acc[key] = { ...p, _qty: 0, _rev: 0 }
                        acc[key]._qty += p.quantity ?? 0
                        acc[key]._rev += lineRev(p)
                        return acc
                      }, {})
                    ).sort((a, b) => b._rev - a._rev).map((p, idx) => (
                      <TableRow key={pid(p)} sx={{ bgcolor: idx % 2 === 0 ? 'transparent' : 'rgba(26,26,26,0.012)', '&:last-child td': { border: 0 } }}>
                        <TableCell sx={{ py: 1.75, px: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 32, height: 32, bgcolor: '#f0ece3', borderRadius: 0.75, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0.25, border: '1px solid rgba(26,26,26,0.07)', flexShrink: 0 }}>
                              {thumbnails[pid(p)]
                                ? <Box component="img" src={thumbnails[pid(p)]} alt={p.title} sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                : <ShoppingBagOutlined sx={{ fontSize: 14, color: 'rgba(26,26,26,0.2)' }} />
                              }
                            </Box>
                            <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '0.9rem', fontWeight: 400 }}>{p.title}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 1.75, px: 2 }}>
                          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.68rem', color: 'text.secondary' }}>{p.sku}</Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1.75, px: 2 }}>
                          <Typography sx={{ fontSize: '0.85rem' }}>{p._qty}</Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1.75, px: 2 }}>
                          <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1rem', fontWeight: 500 }}>{fmt(p._rev)}</Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1.75, px: 2 }}>
                          {p.discountPercentage > 0
                            ? <Chip label={`-${p.discountPercentage.toFixed(1)}%`} size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(200,169,110,0.1)', color: 'secondary.dark', fontWeight: 500 }} />
                            : <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>—</Typography>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Box>
        )}

        {/* Refund outcome / error feedback */}
        <Snackbar open={toast.open} autoHideDuration={4000} onClose={closeToast}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert severity={toast.severity} onClose={closeToast}
            sx={{ fontSize: '0.82rem', boxShadow: '0 4px 20px rgba(26,26,26,0.15)' }}>
            {toast.message}
          </Alert>
        </Snackbar>
      </Box>
    </Fade>
  )
}
