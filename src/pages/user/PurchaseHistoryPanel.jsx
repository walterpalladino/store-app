import API from '../../config/api'
import { useState, useEffect, useCallback } from 'react'
import {
  Box, Typography, Divider, Button, Fade, Skeleton, Alert,
  Collapse, Chip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Tooltip,
} from '@mui/material'
import {
  ReceiptLongOutlined, ArrowBackRounded, RefreshOutlined,
  CreditCardOutlined, ShoppingBagOutlined, OpenInNewRounded,
  CalendarTodayOutlined, LocalOfferOutlined,
} from '@mui/icons-material'

// ---------------------------------------------------------------------------
// API endpoints
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Static fallback — used if the custom endpoint is unreachable (CORS / network)
// Mirrors the exact shape returned by the live API.
// ---------------------------------------------------------------------------
const FALLBACK_TRANSACTIONS = [
  {
    id: 1,
    products: [
      { id: 162, sku: 'TOP-BRD-BLU-162', title: 'Blue Frock',          price: 29.99,   quantity: 4, total: 119.96,    discountPercentage: 12.13, discountedTotal: 105.41   },
      { id: 113, sku: 'MOT-GEN-GEN-113', title: 'Generic Motorcycle',  price: 3999.99, quantity: 3, total: 11999.97,  discountPercentage: 12.1,  discountedTotal: 10547.97 },
      { id: 122, sku: 'SMA-APP-IPH-122', title: 'iPhone 6',            price: 299.99,  quantity: 3, total: 899.97,    discountPercentage: 6.69,  discountedTotal: 839.76   },
      { id: 138, sku: 'SPO-BRD-BAS-138', title: 'Baseball Ball',       price: 8.99,    quantity: 2, total: 17.98,     discountPercentage: 1.71,  discountedTotal: 17.67    },
    ],
    total: 13037.88,
    discountedTotal: 11510.81,
    userId: 1,
    totalProducts: 4,
    totalQuantity: 12,
    payment: { cardExpire: '01/30', cardNumber: '3530633803003665', cardType: 'JCB', currency: 'USD' },
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fmt = (n) =>
  Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

function mockDate(id) {
  const base = new Date('2024-01-15')
  base.setDate(base.getDate() + (id - 1) * 23)
  return base.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const STATUS_STYLES = {
  'delivered':          { color: '#4a7c59', bg: 'rgba(74,124,89,0.1)'     },
  'payment completed':  { color: '#4a7c59', bg: 'rgba(74,124,89,0.1)'     },
  'completed':          { color: '#4a7c59', bg: 'rgba(74,124,89,0.1)'     },
  'shipped':            { color: '#5a8fa3', bg: 'rgba(90,143,163,0.12)'   },
  'processing':         { color: '#c8a96e', bg: 'rgba(200,169,110,0.12)'  },
  'pending':            { color: '#c8a96e', bg: 'rgba(200,169,110,0.12)'  },
  'error':              { color: '#b85c4a', bg: 'rgba(184,92,74,0.1)'     },
  'payment could not be processed': { color: '#b85c4a', bg: 'rgba(184,92,74,0.1)' },
  'cancelled':          { color: '#b85c4a', bg: 'rgba(184,92,74,0.1)'     },
}

function statusMeta(tx) {
  if (tx.status) {
    const key = tx.status.toLowerCase()
    const style = STATUS_STYLES[key] ?? { color: '#6b6560', bg: 'rgba(107,101,96,0.1)' }
    return { label: tx.status, ...style }
  }
  // Fallback derived from id when status field absent
  const seed = tx.id % 3
  if (seed === 0) return { label: 'Processing', color: '#c8a96e', bg: 'rgba(200,169,110,0.12)' }
  if (seed === 1) return { label: 'Shipped',    color: '#5a8fa3', bg: 'rgba(90,143,163,0.12)'  }
  return              { label: 'Delivered',   color: '#4a7c59', bg: 'rgba(74,124,89,0.1)'    }
}

// Safe fetch — unwraps { success, data } envelope, returns { data, error }, never throws
async function safeFetch(url, options = {}) {
  try {
    const res  = await fetch(url, options)
    const body = await res.json()
    // Handle new envelope: { success, data } or { success, error }
    if (body.success === false) {
      return { data: null, error: body.error?.message || `HTTP ${res.status}` }
    }
    // success:true — data is in body.data
    return { data: body.data ?? body, error: null }
  } catch (err) {
    return { data: null, error: err.message || 'Network error' }
  }
}

// ---------------------------------------------------------------------------
// Shared Section wrapper
// ---------------------------------------------------------------------------
function Section({ title, subtitle, action, children }) {
  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2.5 }}>
        <Box>
          <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.35rem', fontWeight: 400, lineHeight: 1.2, mb: 0.4 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Box>
      <Divider sx={{ mb: 3 }} />
      {children}
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------
function ListSkeleton() {
  return (
    <Box>
      {Array.from({ length: 2 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 2, mb: 2 }} />
      ))}
    </Box>
  )
}

function DetailSkeleton() {
  return (
    <Box>
      <Skeleton width="40%" height={18} sx={{ mb: 1 }} />
      <Skeleton width="60%" height={14} sx={{ mb: 3 }} />
      <Skeleton variant="rounded" height={160} sx={{ borderRadius: 2, mb: 3 }} />
      <Skeleton variant="rounded" height={200} sx={{ borderRadius: 2 }} />
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Transaction list card
// ---------------------------------------------------------------------------
function TransactionCard({ tx, thumbnails = {}, onView }) {
  const status  = statusMeta(tx)
  const savings = tx.total - tx.discountedTotal

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        mb: 2,
        transition: 'box-shadow 0.2s, border-color 0.2s',
        '&:hover': {
          boxShadow: '0 4px 20px rgba(26,26,26,0.08)',
          borderColor: 'rgba(200,169,110,0.4)',
        },
      }}
    >
      {/* Header row */}
      <Box
        sx={{
          px: 3, py: 1.75,
          bgcolor: 'rgba(26,26,26,0.02)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <ReceiptLongOutlined sx={{ fontSize: 14, color: 'secondary.dark' }} />
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.06em', fontFamily: 'monospace' }}>
              #{String(tx.id).padStart(5, '0')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarTodayOutlined sx={{ fontSize: 12, color: 'text.secondary' }} />
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
              {mockDate(tx.id)}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Chip
            label={status.label}
            size="small"
            sx={{ height: 20, fontSize: '0.6rem', letterSpacing: '0.07em', bgcolor: status.bg, color: status.color, fontWeight: 500, borderRadius: 1 }}
          />
          <Button
            size="small"
            onClick={() => onView(tx.id)}
            endIcon={<OpenInNewRounded sx={{ fontSize: 12 }} />}
            sx={{
              fontSize: '0.65rem', letterSpacing: '0.07em', color: 'secondary.dark',
              textTransform: 'uppercase', py: 0.4, px: 1.25,
              border: '1px solid rgba(200,169,110,0.35)', borderRadius: 1,
              '&:hover': { bgcolor: 'rgba(200,169,110,0.08)', borderColor: 'secondary.main' },
            }}
          >
            View
          </Button>
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {tx.products.slice(0, 4).map((p) => (
            <Tooltip key={p.id} title={`${p.title} × ${p.quantity}`} arrow>
              <Box sx={{
                width: 42, height: 42, borderRadius: 1.5,
                bgcolor: '#f0ece3', border: '1px solid rgba(26,26,26,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', flexShrink: 0, p: 0.5,
              }}>
                {thumbnails[p.id] ? (
                  <Box
                    component="img"
                    src={thumbnails[p.id]}
                    alt={p.title}
                    sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <ShoppingBagOutlined sx={{ fontSize: 18, color: 'rgba(26,26,26,0.25)' }} />
                )}
              </Box>
            </Tooltip>
          ))}
          {tx.products.length > 4 && (
            <Box sx={{
              width: 42, height: 42, borderRadius: 1.5,
              bgcolor: 'rgba(26,26,26,0.04)', border: '1px solid rgba(26,26,26,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', fontWeight: 500 }}>
                +{tx.products.length - 4}
              </Typography>
            </Box>
          )}
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', ml: 0.5 }}>
            {tx.totalProducts} {tx.totalProducts === 1 ? 'product' : 'products'} · {tx.totalQuantity} {tx.totalQuantity === 1 ? 'unit' : 'units'}
          </Typography>
        </Box>

        <Box sx={{ textAlign: 'right' }}>
          <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.3rem', fontWeight: 500, lineHeight: 1 }}>
            {fmt(tx.discountedTotal)}
          </Typography>
          {savings > 0.01 && (
            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', mt: 0.25 }}>
              Saved{' '}
              <Box component="span" sx={{ color: 'success.main', fontWeight: 500 }}>{fmt(savings)}</Box>
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Transaction detail view
// ---------------------------------------------------------------------------
function TransactionDetail({ txId, onBack }) {
  const [tx, setTx]           = useState(null)
  const [thumbnails, setThumbnails] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [usingFallback, setUsingFallback] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setUsingFallback(false)

    // GET /api/orders/:id — { success, data: { id, products, ... } }
    const { data, error: fetchErr } = await safeFetch(API.orders.byId(txId))

    const txData = (data && typeof data === 'object' && !Array.isArray(data) ? data : null)
      ?? (FALLBACK_TRANSACTIONS.find((t) => t.id === txId) ?? FALLBACK_TRANSACTIONS[0])
    if (!data) {
      setUsingFallback(true)
      if (fetchErr) setError(`Live API unavailable (${fetchErr}) — showing cached data.`)
    }
    setTx(txData)
    setLoading(false)

    // Fetch thumbnails for each product in the detail view
    const ids = txData.products.map((p) => p.productId ?? p.id)
    const results = await Promise.all(
      ids.map((id) =>
        safeFetch(API.products.byId(id))
          .then(({ data: pd }) => pd ? [id, pd.thumbnail] : null)
      )
    )
    const map = {}
    results.forEach((entry) => { if (entry) map[entry[0]] = entry[1] })
    setThumbnails(map)
  }, [txId])

  useEffect(() => { load() }, [load])

  const status  = tx ? statusMeta(tx) : null
  const savings = tx ? tx.total - tx.discountedTotal : 0

  return (
    <Fade in>
      <Box>
        <Button
          size="small"
          startIcon={<ArrowBackRounded sx={{ fontSize: 15 }} />}
          onClick={onBack}
          sx={{
            mb: 3, color: 'text.secondary', textTransform: 'none',
            fontWeight: 300, fontSize: '0.82rem', letterSpacing: '0.03em',
            '&:hover': { color: 'text.primary', bgcolor: 'transparent' },
          }}
        >
          Back to orders
        </Button>

        <Collapse in={!!error}>
          <Alert severity="warning" sx={{ mb: 3, fontSize: '0.78rem' }} onClose={() => setError('')}>
            {error}
          </Alert>
        </Collapse>

        {loading ? <DetailSkeleton /> : tx ? (
          <>
            {/* ── Order header card ── */}
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', mb: 3 }}>
              <Box sx={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)', px: 3, py: 2.5, position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ position: 'absolute', top: '50%', right: -20, transform: 'translateY(-50%)', width: 120, height: 120, borderRadius: '50%', border: '1px solid rgba(200,169,110,0.12)', pointerEvents: 'none' }} />
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Typography sx={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,169,110,0.7)', mb: 0.5 }}>Order</Typography>
                    <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.5rem', fontWeight: 300, color: '#f5f0e8', lineHeight: 1 }}>
                      #{String(tx.id).padStart(5, '0')}
                    </Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: 'rgba(245,240,232,0.45)', mt: 0.4 }}>Placed {mockDate(tx.id)}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Chip label={status.label} size="small" sx={{ height: 22, fontSize: '0.62rem', letterSpacing: '0.08em', bgcolor: status.bg, color: status.color, fontWeight: 500, borderRadius: 1, mb: 1 }} />
                    <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.8rem', fontWeight: 500, color: '#f5f0e8', lineHeight: 1 }}>
                      {fmt(tx.discountedTotal)}
                    </Typography>
                    {savings > 0.01 && (
                      <Typography sx={{ fontSize: '0.68rem', color: 'rgba(74,124,89,0.9)', mt: 0.3 }}>Saved {fmt(savings)}</Typography>
                    )}
                  </Box>
                </Box>
              </Box>

              <Box sx={{ height: '2px', background: 'linear-gradient(90deg, transparent, #c8a96e, transparent)' }} />

              {/* Stats row */}
              <Box sx={{ px: 3, py: 2, display: 'flex', flexWrap: 'wrap', gap: 3, bgcolor: 'rgba(26,26,26,0.01)', borderBottom: '1px solid', borderColor: 'divider' }}>
                {[
                  { label: 'Products',   value: `${tx.totalProducts} ${tx.totalProducts === 1 ? 'item' : 'items'}` },
                  { label: 'Units',      value: tx.totalQuantity },
                  { label: 'Subtotal',   value: fmt(tx.total) },
                  { label: 'Savings',    value: `-${fmt(savings)}`, color: 'success.main' },
                  { label: 'Total Paid', value: fmt(tx.discountedTotal), bold: true },
                ].map(({ label, value, color, bold }) => (
                  <Box key={label}>
                    <Typography sx={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.25 }}>{label}</Typography>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: bold ? 600 : 400, color: color || 'text.primary' }}>{value}</Typography>
                  </Box>
                ))}
              </Box>

              {/* Payment row */}
              {tx.payment && (
                <Box sx={{ px: 3, py: 1.75, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <CreditCardOutlined sx={{ fontSize: 16, color: 'secondary.dark' }} />
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                    Paid with{' '}
                    <Box component="span" sx={{ color: 'text.primary', fontWeight: 500 }}>{tx.payment.cardType}</Box>
                    {' '}ending in{' '}
                    <Box component="span" sx={{ fontFamily: 'monospace', color: 'text.primary', fontWeight: 500 }}>{String(tx.payment.cardNumber ?? '').slice(-4)}</Box>
                    {' '}· Exp <Box component="span" sx={{ fontFamily: 'monospace' }}>{tx.payment.cardExpire}</Box>
                    {' '}· <Box component="span" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tx.payment.currency}</Box>
                  </Typography>
                </Box>
              )}
            </Box>

            {/* ── Line items table ── */}
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ px: 3, py: 1.75, bgcolor: 'rgba(26,26,26,0.02)', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocalOfferOutlined sx={{ fontSize: 15, color: 'secondary.dark' }} />
                <Typography variant="h6" sx={{ fontSize: '0.7rem' }}>Order Items</Typography>
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {[
                        { label: 'Product',    align: 'left'   },
                        { label: 'SKU',        align: 'left'   },
                        { label: 'Unit Price', align: 'right'  },
                        { label: 'Qty',        align: 'center' },
                        { label: 'Discount',   align: 'right'  },
                        { label: 'Line Total', align: 'right'  },
                      ].map(({ label, align }) => (
                        <TableCell key={label} align={align} sx={{ py: 1.25, px: { xs: 1.5, md: 2.5 }, fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.secondary', fontWeight: 500, borderBottom: '1px solid', borderColor: 'divider', whiteSpace: 'nowrap' }}>
                          {label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tx.products.map((p, idx) => (
                      <TableRow key={p.id} sx={{ '&:last-child td': { border: 0 }, bgcolor: idx % 2 === 0 ? 'transparent' : 'rgba(26,26,26,0.012)', '&:hover': { bgcolor: 'rgba(200,169,110,0.04)' } }}>
                        <TableCell sx={{ py: 1.5, px: { xs: 1.5, md: 2.5 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{
                              width: 40, height: 40, flexShrink: 0,
                              bgcolor: '#f0ece3', borderRadius: 1, overflow: 'hidden',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0.5,
                              border: '1px solid rgba(26,26,26,0.07)',
                            }}>
                              {thumbnails[p.id] ? (
                                <Box component="img" src={thumbnails[p.id]} alt={p.title}
                                  sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                              ) : (
                                <ShoppingBagOutlined sx={{ fontSize: 16, color: 'rgba(26,26,26,0.2)' }} />
                              )}
                            </Box>
                            <Typography sx={{ fontSize: '0.85rem', fontFamily: '"Cormorant Garamond", serif', fontWeight: 400 }}>{p.title}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 2, px: { xs: 1.5, md: 2.5 } }}>
                          <Typography sx={{ fontSize: '0.68rem', fontFamily: 'monospace', color: 'text.secondary', whiteSpace: 'nowrap' }}>{p.sku}</Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 2, px: { xs: 1.5, md: 2.5 }, whiteSpace: 'nowrap' }}>
                          <Typography sx={{ fontSize: '0.82rem' }}>{fmt(p.price)}</Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 2, px: { xs: 1.5, md: 2.5 } }}>
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 1, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(26,26,26,0.03)' }}>
                            <Typography sx={{ fontSize: '0.78rem', fontWeight: 500 }}>{p.quantity}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 2, px: { xs: 1.5, md: 2.5 }, whiteSpace: 'nowrap' }}>
                          {p.discountPercentage > 0 ? (
                            <Chip label={`-${p.discountPercentage.toFixed(1)}%`} size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(200,169,110,0.1)', color: 'secondary.dark', borderRadius: 0.5, fontWeight: 500 }} />
                          ) : (
                            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>—</Typography>
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 2, px: { xs: 1.5, md: 2.5 }, whiteSpace: 'nowrap' }}>
                          <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1rem', fontWeight: 500 }}>{fmt(p.discountedTotal ?? p.total ?? (p.price ?? 0) * (p.quantity ?? 0))}</Typography>
                          {p.discountPercentage > 0 && (
                            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', textDecoration: 'line-through' }}>{fmt(p.total)}</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Footer totals */}
              <Box sx={{ px: { xs: 1.5, md: 2.5 }, py: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'rgba(26,26,26,0.02)', display: 'flex', justifyContent: 'flex-end' }}>
                <Box sx={{ minWidth: 210 }}>
                  {[
                    { label: 'Subtotal',   value: fmt(tx.total),           dimmed: true  },
                    { label: 'Savings',    value: `-${fmt(savings)}`,       green: true   },
                    { label: 'Total Paid', value: fmt(tx.discountedTotal),  bold:  true   },
                  ].map(({ label, value, dimmed, green, bold }) => (
                    <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.75 }}>
                      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', letterSpacing: '0.04em', textTransform: 'uppercase', mr: 4 }}>
                        {label}
                      </Typography>
                      <Typography sx={{ fontSize: bold ? '1.1rem' : '0.85rem', fontFamily: bold ? '"Cormorant Garamond", serif' : '"DM Sans", sans-serif', fontWeight: bold ? 500 : 400, color: green ? 'success.main' : dimmed ? 'text.secondary' : 'text.primary' }}>
                        {value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          </>
        ) : null}
      </Box>
    </Fade>
  )
}

// ---------------------------------------------------------------------------
// PurchaseHistoryPanel — top-level export
// ---------------------------------------------------------------------------
export function PurchaseHistoryPanel() {
  const [transactions, setTransactions] = useState([])
  const [thumbnails, setThumbnails]     = useState({})   // { [productId]: url }
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [usingFallback, setUsingFallback] = useState(false)
  const [selectedId, setSelectedId]     = useState(null)

  // Fetch thumbnails for all unique product ids across all transactions
  const loadThumbnails = useCallback(async (txList) => {
    const ids = [...new Set(txList.flatMap((tx) => tx.products.map((p) => p.productId ?? p.id)))]
    const results = await Promise.all(
      ids.map((id) =>
        safeFetch(API.products.byId(id))
          .then(({ data: pd }) => pd?.thumbnail ? [id, pd.thumbnail] : null)
      )
    )
    const map = {}
    results.forEach((entry) => { if (entry) map[entry[0]] = entry[1] })
    setThumbnails(map)
  }, [])

  const loadList = useCallback(async () => {
    setLoading(true)
    setError('')
    setUsingFallback(false)

    const { data, error: fetchErr } = await safeFetch(API.orders.list)

    let list
    if (data) {
      // Response: { success, data: { orders: [...] } }
      list = Array.isArray(data.orders)
        ? data.orders
        : Array.isArray(data.transactions)
          ? data.transactions
          : Array.isArray(data)
            ? data
            : [data]
      setTransactions(list)
    } else {
      list = FALLBACK_TRANSACTIONS
      setTransactions(list)
      setUsingFallback(true)
      setError(`Live API unavailable (${fetchErr || 'unknown error'}) — showing demo data.`)
    }

    setLoading(false)
    // Fetch thumbnails in background after list is shown
    loadThumbnails(list)
  }, [loadThumbnails])

  useEffect(() => { loadList() }, [loadList])

  if (selectedId !== null) {
    return <TransactionDetail txId={selectedId} onBack={() => setSelectedId(null)} />
  }

  return (
    <Fade in>
      <Box>
        <Section
          title="Purchase History"
          subtitle="Your past orders and transaction records."
          action={
            <Tooltip title="Refresh" arrow>
              <IconButton
                size="small"
                onClick={loadList}
                disabled={loading}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, color: 'text.secondary', '&:hover': { borderColor: 'secondary.main', color: 'secondary.dark' } }}
              >
                <RefreshOutlined sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          }
        >
          {/* API warning (non-blocking) */}
          <Collapse in={!!error}>
            <Alert
              severity={usingFallback ? 'warning' : 'error'}
              action={
                <Button size="small" color="inherit" onClick={loadList}
                  startIcon={<RefreshOutlined sx={{ fontSize: 13 }} />}
                  sx={{ fontSize: '0.68rem' }}>
                  Retry
                </Button>
              }
              sx={{ mb: 3, fontSize: '0.78rem' }}
              onClose={() => setError('')}
            >
              {error}
            </Alert>
          </Collapse>

          {loading ? (
            <ListSkeleton />
          ) : transactions.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <ReceiptLongOutlined sx={{ fontSize: 40, color: 'rgba(26,26,26,0.15)', mb: 2 }} />
              <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.4rem', fontWeight: 300, mb: 0.5 }}>
                No orders yet
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>
                Your completed purchases will appear here.
              </Typography>
            </Box>
          ) : (
            <Box>
              {transactions.map((tx) => (
                <TransactionCard key={tx.id} tx={tx} thumbnails={thumbnails} onView={(id) => setSelectedId(id)} />
              ))}
            </Box>
          )}
        </Section>
      </Box>
    </Fade>
  )
}
