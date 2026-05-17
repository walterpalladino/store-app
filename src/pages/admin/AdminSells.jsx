import { useState, useEffect, useCallback } from 'react'
import {
  Box, Typography, Divider, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Alert, Button, Fade,
  CircularProgress, Tooltip, IconButton,
} from '@mui/material'
import {
  ReceiptLongOutlined, RefreshOutlined, TrendingUpOutlined,
  ShoppingBagOutlined, LocalOfferOutlined, PaidOutlined,
} from '@mui/icons-material'
import API from '../../config/api'

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
  'shipped':           { color: '#5a8fa3', bg: 'rgba(90,143,163,0.12)'  },
  'processing':        { color: '#c8a96e', bg: 'rgba(200,169,110,0.12)' },
  'pending':           { color: '#c8a96e', bg: 'rgba(200,169,110,0.12)' },
  'error':             { color: '#b85c4a', bg: 'rgba(184,92,74,0.1)'    },
  'payment could not be processed': { color: '#b85c4a', bg: 'rgba(184,92,74,0.1)' },
  'cancelled':         { color: '#b85c4a', bg: 'rgba(184,92,74,0.1)'    },
}

function getStatus(s) {
  return STATUS_STYLES[(s ?? '').toLowerCase()] ?? { color: '#6b6560', bg: 'rgba(107,101,96,0.1)' }
}

const fmt = (n) => Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

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
  const [transactions,  setTransactions]  = useState([])
  const [thumbnails,    setThumbnails]    = useState({})
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')
  const [usingFallback, setUsingFallback] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(''); setUsingFallback(false)
    try {
      const res = await fetch(API.transactions.list)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const list = Array.isArray(data.transactions) ? data.transactions : Array.isArray(data) ? data : [data]
      setTransactions(list)
      // Load thumbnails in background
      const ids = [...new Set(list.flatMap((tx) => tx.products.map((p) => p.id)))]
      Promise.all(ids.map((id) =>
        fetch(API.products.byId(id)).then((r) => r.json()).then((d) => [id, d.thumbnail]).catch(() => null)
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
  }, [])

  useEffect(() => { load() }, [load])

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
            action={<Button size="small" color="inherit" onClick={load} startIcon={<RefreshOutlined sx={{ fontSize: 13 }} />} sx={{ fontSize: '0.68rem' }}>Retry</Button>}
            onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Toolbar */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
            {totalOrders} {totalOrders === 1 ? 'order' : 'orders'} found
          </Typography>
          <Tooltip title="Refresh" arrow>
            <IconButton size="small" onClick={load} disabled={loading}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <RefreshOutlined sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Orders table */}
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', mb: 4 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Order', 'Date', 'Products', 'Units', 'Payment', 'Total', 'Status'].map((h) => (
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
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j} sx={{ py: 1.5, px: 2 }}>
                            <Box sx={{ height: 14, borderRadius: 1, bgcolor: 'rgba(26,26,26,0.06)', width: j === 0 ? 60 : 80 }} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : transactions.map((tx, idx) => {
                      const st = getStatus(tx.status)
                      const savings = tx.total - tx.discountedTotal
                      return (
                        <TableRow key={tx.id} sx={{ bgcolor: idx % 2 === 0 ? 'transparent' : 'rgba(26,26,26,0.012)', '&:last-child td': { border: 0 }, '&:hover': { bgcolor: 'rgba(200,169,110,0.03)' }, transition: 'background 0.15s' }}>
                          {/* Order # */}
                          <TableCell sx={{ py: 1.75, px: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              <ReceiptLongOutlined sx={{ fontSize: 14, color: 'secondary.dark' }} />
                              <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                                #{String(tx.id).padStart(5, '0')}
                              </Typography>
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
                                <Tooltip key={p.id} title={`${p.title} × ${p.quantity}`} arrow>
                                  <Box sx={{ width: 28, height: 28, borderRadius: 0.75, bgcolor: '#f0ece3', border: '1px solid rgba(26,26,26,0.07)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0.25, flexShrink: 0 }}>
                                    {thumbnails[p.id]
                                      ? <Box component="img" src={thumbnails[p.id]} alt={p.title} sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
                        if (!acc[p.id]) acc[p.id] = { ...p, _qty: 0, _rev: 0 }
                        acc[p.id]._qty += p.quantity
                        acc[p.id]._rev += p.discountedTotal
                        return acc
                      }, {})
                    ).sort((a, b) => b._rev - a._rev).map((p, idx) => (
                      <TableRow key={p.id} sx={{ bgcolor: idx % 2 === 0 ? 'transparent' : 'rgba(26,26,26,0.012)', '&:last-child td': { border: 0 } }}>
                        <TableCell sx={{ py: 1.75, px: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 32, height: 32, bgcolor: '#f0ece3', borderRadius: 0.75, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0.25, border: '1px solid rgba(26,26,26,0.07)', flexShrink: 0 }}>
                              {thumbnails[p.id]
                                ? <Box component="img" src={thumbnails[p.id]} alt={p.title} sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
                          <Chip label={`-${p.discountPercentage.toFixed(1)}%`} size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(200,169,110,0.1)', color: 'secondary.dark', fontWeight: 500 }} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Box>
        )}
      </Box>
    </Fade>
  )
}
