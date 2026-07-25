import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Box, Typography, Divider, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Alert, Button, Fade,
  Tooltip, IconButton, TextField, InputAdornment, Skeleton,
} from '@mui/material'
import {
  AccountBalanceWalletOutlined, RefreshOutlined, SearchOutlined,
  ClearOutlined, PaidOutlined, CurrencyExchangeOutlined,
  HourglassEmptyOutlined, ArrowBackRounded, ReceiptLongOutlined,
} from '@mui/icons-material'
import { useMerchantAuth } from '../../context/MerchantAuthContext'
import { fetchPayments, fetchPayment } from '../../services/paymentsService'
import { prettyStatus, statusStyle, shortOrderId } from '../../utils/orders'

// ---------------------------------------------------------------------------
// AdminPayments — the Payments resource, split out of the order object.
//
// A payment is one checkout attempt on an order: it owns the processor
// lifecycle (`pending` → `paid` / `payment_failed`, then `refunded` /
// `partially_refunded`) and the settlement fields that used to hang off the
// order (`paidOn`, `amountRefunded`, `refundStatus`, `refundedOn`). The order
// only keeps a rolled-up `paymentStatus`.
//
// The API has **no list-all payments route** — the list below is composed from
// the visible orders, one payments request each (see paymentsService). The
// order-id filter narrows that scan through `GET /api/orders/search`, so
// filtering is also what makes the list cheap.
// ---------------------------------------------------------------------------

const fmt = (n, currency) => {
  const code = String(currency || 'USD').toUpperCase()
  try {
    return Number(n ?? 0).toLocaleString('en-US', { style: 'currency', currency: code, minimumFractionDigits: 2 })
  } catch {
    return `${Number(n ?? 0).toFixed(2)} ${code}`   // unknown ISO code
  }
}

const fmtDate = (iso) => (iso
  ? new Date(iso).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—')

// The order a payment belongs to, as shown in the list: `orderId` on a payment
// is the order's public UUID (the list also carries an `order` summary).
const paymentOrderLabel = (p) =>
  shortOrderId({ orderId: p.orderId ?? p.order?.orderId, id: p.order?.id })

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

// ---------------------------------------------------------------------------
// Payment detail — GET /api/payments/:id, the authoritative single payment.
// ---------------------------------------------------------------------------
function PaymentDetail({ paymentId, summary, onBack, onFilterOrder }) {
  const { merchantFetch } = useMerchantAuth()
  const [payment, setPayment] = useState(summary ?? null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      setPayment(await fetchPayment(merchantFetch, paymentId))
    } catch (err) {
      // Fall back to the row we already have so the view still says something.
      setError(err.message || 'Could not load this payment.')
    } finally { setLoading(false) }
  }, [merchantFetch, paymentId])

  useEffect(() => { load() }, [load])

  const st = statusStyle(payment?.status)
  const orderUuid = payment?.orderId ?? summary?.orderId ?? summary?.order?.orderId

  const fields = payment ? [
    { label: 'Payment id',    value: `#${payment.id}` },
    { label: 'Status',        value: prettyStatus(payment.status) },
    { label: 'Amount',        value: fmt(payment.amount, payment.currency) },
    { label: 'Currency',      value: String(payment.currency ?? '—').toUpperCase() },
    { label: 'Paid on',       value: fmtDate(payment.paidOn) },
    { label: 'Refund status', value: prettyStatus(payment.refundStatus ?? 'none') },
    { label: 'Refunded',      value: payment.amountRefunded > 0 ? fmt(payment.amountRefunded, payment.currency) : '—' },
    { label: 'Refunded on',   value: fmtDate(payment.refundedOn) },
    { label: 'Created',       value: fmtDate(payment.createdAt) },
    { label: 'Updated',       value: fmtDate(payment.updatedAt) },
  ] : []

  return (
    <Fade in>
      <Box>
        <Button
          size="small"
          startIcon={<ArrowBackRounded sx={{ fontSize: 15 }} />}
          onClick={onBack}
          sx={{ mb: 3, color: 'text.secondary', textTransform: 'none', fontWeight: 300, fontSize: '0.82rem', '&:hover': { color: 'text.primary', bgcolor: 'transparent' } }}
        >
          Back to payments
        </Button>

        {error && (
          <Alert severity="error" sx={{ mb: 3, fontSize: '0.78rem' }} onClose={() => setError('')}
            action={<Button size="small" color="inherit" onClick={load} sx={{ fontSize: '0.68rem' }}>Retry</Button>}>
            {error}
          </Alert>
        )}

        {loading && !payment ? (
          <>
            <Skeleton variant="rounded" height={120} sx={{ borderRadius: 2, mb: 3 }} />
            <Skeleton variant="rounded" height={240} sx={{ borderRadius: 2 }} />
          </>
        ) : payment ? (
          <>
            {/* Header card */}
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', mb: 3 }}>
              <Box sx={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)', px: 3, py: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,169,110,0.7)', mb: 0.5 }}>Payment</Typography>
                  <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.5rem', fontWeight: 300, color: '#f5f0e8', lineHeight: 1 }}>
                    #{payment.id}
                  </Typography>
                  {orderUuid && (
                    <Typography sx={{ fontFamily: 'monospace', fontSize: '0.62rem', color: 'rgba(245,240,232,0.5)', mt: 0.6, wordBreak: 'break-all' }}>
                      order {orderUuid}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Chip label={prettyStatus(payment.status)} size="small" sx={{ height: 22, fontSize: '0.62rem', letterSpacing: '0.08em', bgcolor: st.bg, color: st.color, fontWeight: 500, borderRadius: 1, mb: 1 }} />
                  <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.8rem', fontWeight: 500, color: '#f5f0e8', lineHeight: 1 }}>
                    {fmt(payment.amount, payment.currency)}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ height: '2px', background: 'linear-gradient(90deg, transparent, #c8a96e, transparent)' }} />
            </Box>

            {/* Field grid */}
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', mb: 3 }}>
              <Box sx={{ px: 3, py: 1.75, bgcolor: 'rgba(26,26,26,0.02)', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontSize: '0.7rem' }}>Details</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', p: 1.5 }}>
                {fields.map(({ label, value }) => (
                  <Box key={label} sx={{ flex: '1 1 200px', minWidth: 180, px: 1.5, py: 1.25 }}>
                    <Typography sx={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.4 }}>{label}</Typography>
                    <Typography sx={{ fontSize: '0.85rem' }}>{value}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mb: 2 }}>
              Processor identifiers (session id, payment intent, refund id) are stored server-side
              and are never returned by the API.
            </Typography>

            {orderUuid && (
              <Button
                size="small" variant="outlined"
                startIcon={<ReceiptLongOutlined sx={{ fontSize: 15 }} />}
                onClick={() => onFilterOrder(orderUuid)}
                sx={{ textTransform: 'none', fontSize: '0.72rem' }}
              >
                All payments for this order
              </Button>
            )}
          </>
        ) : null}
      </Box>
    </Fade>
  )
}

// ---------------------------------------------------------------------------
// AdminPayments — list + detail
// ---------------------------------------------------------------------------
export default function AdminPayments() {
  const { merchantFetch } = useMerchantAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const urlOrderId = searchParams.get('orderId') ?? ''

  const [payments,  setPayments]  = useState([])
  const [meta,      setMeta]      = useState({ orderCount: 0, truncated: false, failed: 0 })
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [filter,    setFilter]    = useState(urlOrderId)
  const [selected,  setSelected]  = useState(null)   // the payment row being viewed

  // Arriving from Sales ("view payments for this order") carries ?orderId=… —
  // adopt it as the filter. Deep-linking here is the same as opening Payments
  // and typing the order id in.
  useEffect(() => { setFilter(urlOrderId) }, [urlOrderId])

  const load = useCallback(async (orderId) => {
    setLoading(true); setError('')
    try {
      const res = await fetchPayments(merchantFetch, { orderId })
      setPayments(res.payments)
      setMeta({ orderCount: res.orderCount, truncated: res.truncated, failed: res.failed })
    } catch (err) {
      setPayments([])
      setError(err.message || 'Payments could not be loaded.')
    } finally { setLoading(false) }
  }, [merchantFetch])

  // Debounce so typing an order id doesn't fire a scan per keystroke.
  useEffect(() => {
    const t = setTimeout(() => load(filter), 350)
    return () => clearTimeout(t)
  }, [filter, load])

  // Keep the filter in the URL so the view is shareable and survives a reload.
  const applyFilter = useCallback((value) => {
    setFilter(value)
    const next = { tab: 'payments' }
    if (value.trim()) next.orderId = value.trim()
    setSearchParams(next, { replace: true })
  }, [setSearchParams])

  const stats = useMemo(() => {
    const captured = payments
      .filter((p) => ['paid', 'refunded', 'partially_refunded'].includes(String(p.status).toLowerCase()))
      .reduce((s, p) => s + (p.amount ?? 0), 0)
    const refunded = payments.reduce((s, p) => s + (p.amountRefunded ?? 0), 0)
    const pending  = payments.filter((p) => String(p.status).toLowerCase() === 'pending').length
    return { captured, refunded, pending }
  }, [payments])

  if (selected) {
    return (
      <PaymentDetail
        paymentId={selected.id}
        summary={selected}
        onBack={() => setSelected(null)}
        onFilterOrder={(orderId) => { setSelected(null); applyFilter(orderId) }}
      />
    )
  }

  return (
    <Fade in>
      <Box>
        {/* Title */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.35rem', fontWeight: 400, mb: 0.4 }}>Payments</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>
            Every checkout attempt and its settlement. Filter by order id to see one order&rsquo;s payments.
          </Typography>
        </Box>
        <Divider sx={{ mb: 3 }} />

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
          <StatCard icon={<AccountBalanceWalletOutlined sx={{ fontSize: 16 }} />} label="Payments" value={payments.length} sub={`across ${meta.orderCount} ${meta.orderCount === 1 ? 'order' : 'orders'}`} />
          <StatCard icon={<PaidOutlined sx={{ fontSize: 16 }} />}                 label="Captured" value={fmt(stats.captured)} color="success.main" />
          <StatCard icon={<CurrencyExchangeOutlined sx={{ fontSize: 16 }} />}     label="Refunded" value={fmt(stats.refunded)} color="#7a6aa8" />
          <StatCard icon={<HourglassEmptyOutlined sx={{ fontSize: 16 }} />}       label="Pending"  value={stats.pending} color="#c8a96e" />
        </Box>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, fontSize: '0.78rem' }}
            action={<Button size="small" color="inherit" onClick={() => load(filter)} startIcon={<RefreshOutlined sx={{ fontSize: 13 }} />} sx={{ fontSize: '0.68rem' }}>Retry</Button>}
            onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {!error && (meta.truncated || meta.failed > 0) && (
          <Alert severity="warning" sx={{ mb: 3, fontSize: '0.78rem' }}>
            {meta.truncated && 'Only the most recent orders were scanned — filter by order id for an exact list. '}
            {meta.failed > 0 && `${meta.failed} ${meta.failed === 1 ? 'order' : 'orders'} could not be read.`}
          </Alert>
        )}

        {/* Toolbar */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
          <TextField
            size="small"
            placeholder="Filter by order id…"
            value={filter}
            onChange={(e) => applyFilter(e.target.value)}
            inputProps={{ 'aria-label': 'Filter payments by order id' }}
            sx={{ minWidth: 240, flex: '1 1 240px', maxWidth: 360, '& .MuiOutlinedInput-root': { borderRadius: 1, fontSize: '0.8rem' } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlined sx={{ fontSize: 17, color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: filter ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => applyFilter('')} aria-label="Clear order id filter">
                    <ClearOutlined sx={{ fontSize: 15 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 'auto' }}>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
              {payments.length} {payments.length === 1 ? 'payment' : 'payments'} {filter ? 'matched' : 'found'}
            </Typography>
            <Tooltip title="Refresh" arrow>
              <IconButton size="small" onClick={() => load(filter)} disabled={loading}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <RefreshOutlined sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Payments table */}
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Payment', 'Order', 'Status', 'Amount', 'Paid On', 'Refunded'].map((h) => (
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
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j} sx={{ py: 1.5, px: 2 }}>
                            <Box sx={{ height: 14, borderRadius: 1, bgcolor: 'rgba(26,26,26,0.06)', width: j === 0 ? 60 : 80 }} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : payments.length === 0
                    ? (
                        <TableRow>
                          <TableCell colSpan={6} sx={{ py: 6, textAlign: 'center', border: 0 }}>
                            <AccountBalanceWalletOutlined sx={{ fontSize: 34, color: 'rgba(26,26,26,0.15)', mb: 1.5 }} />
                            <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.2rem', fontWeight: 300, mb: 0.5 }}>
                              No payments
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>
                              {filter ? 'No order matched that id, or it has no payments yet.' : 'Payments appear here once a checkout is started.'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )
                    : payments.map((p, idx) => {
                        const st = statusStyle(p.status)
                        return (
                          <TableRow
                            key={p.id}
                            hover
                            onClick={() => setSelected(p)}
                            sx={{ cursor: 'pointer', bgcolor: idx % 2 === 0 ? 'transparent' : 'rgba(26,26,26,0.012)', '&:last-child td': { border: 0 }, '&:hover': { bgcolor: 'rgba(200,169,110,0.03)' }, transition: 'background 0.15s' }}
                          >
                            <TableCell sx={{ py: 1.75, px: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                <AccountBalanceWalletOutlined sx={{ fontSize: 14, color: 'secondary.dark' }} />
                                <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600 }}>#{p.id}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ py: 1.75, px: 2 }}>
                              <Tooltip title={p.orderId ?? p.order?.orderId ?? ''} arrow disableHoverListener={!(p.orderId ?? p.order?.orderId)}>
                                <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary' }}>
                                  {paymentOrderLabel(p)}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                            <TableCell sx={{ py: 1.75, px: 2 }}>
                              <Chip label={prettyStatus(p.status)} size="small" sx={{ height: 20, fontSize: '0.6rem', letterSpacing: '0.06em', bgcolor: st.bg, color: st.color, fontWeight: 500, borderRadius: 1 }} />
                            </TableCell>
                            <TableCell sx={{ py: 1.75, px: 2, whiteSpace: 'nowrap' }}>
                              <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1rem', fontWeight: 500 }}>{fmt(p.amount, p.currency)}</Typography>
                            </TableCell>
                            <TableCell sx={{ py: 1.75, px: 2, whiteSpace: 'nowrap' }}>
                              <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{fmtDate(p.paidOn)}</Typography>
                            </TableCell>
                            <TableCell sx={{ py: 1.75, px: 2, whiteSpace: 'nowrap' }}>
                              {p.amountRefunded > 0
                                ? <Typography sx={{ fontSize: '0.78rem', color: '#7a6aa8' }}>{fmt(p.amountRefunded, p.currency)}</Typography>
                                : <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>—</Typography>}
                            </TableCell>
                          </TableRow>
                        )
                      })
                }
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
    </Fade>
  )
}
