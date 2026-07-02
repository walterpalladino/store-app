import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Box, Container, Typography, Grid, Divider, Button,
  IconButton, Tooltip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow,
  Fade, Collapse, Alert, useMediaQuery, useTheme,
} from '@mui/material'
import {
  ArrowBack, DeleteOutlineRounded, AddRounded, RemoveRounded,
  ShoppingBagOutlined, LockOutlined, LocalShippingOutlined,
  ReceiptLongOutlined,
} from '@mui/icons-material'
import { useCart } from '../context/CartContext'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fmt = (n) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

const SHIPPING_THRESHOLD = 75
const SHIPPING_COST = 9.99
const TAX_RATE = 0.08

// ---------------------------------------------------------------------------
// Quantity stepper
// ---------------------------------------------------------------------------
function QtyControl({ value, onDecrement, onIncrement, onRemove, max = 99 }) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
        height: 32,
      }}
    >
      <IconButton
        size="small"
        onClick={value === 1 ? onRemove : onDecrement}
        sx={{
          borderRadius: 0,
          width: 30,
          height: 30,
          color: value === 1 ? 'error.main' : 'text.primary',
          '&:hover': {
            bgcolor: value === 1 ? 'rgba(184,92,74,0.08)' : 'rgba(26,26,26,0.06)',
          },
        }}
      >
        {value === 1 ? (
          <DeleteOutlineRounded sx={{ fontSize: 15 }} />
        ) : (
          <RemoveRounded sx={{ fontSize: 15 }} />
        )}
      </IconButton>

      <Box
        sx={{
          width: 36,
          height: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderLeft: '1px solid',
          borderRight: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, lineHeight: 1 }}>
          {value}
        </Typography>
      </Box>

      <IconButton
        size="small"
        onClick={onIncrement}
        disabled={value >= max}
        sx={{
          borderRadius: 0,
          width: 30,
          height: 30,
          '&:hover': { bgcolor: 'rgba(26,26,26,0.06)' },
        }}
      >
        <AddRounded sx={{ fontSize: 15 }} />
      </IconButton>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Desktop table row
// ---------------------------------------------------------------------------
function CartRow({ item, onRemove, onDecrement, onIncrement }) {
  const { product, quantity } = item
  const unitPrice = product.price * (1 - (product.discountPercentage ?? 0) / 100)
  const lineTotal = unitPrice * quantity
  // Products rebuilt from the SKU-only endpoint have no `id` → no detail link.
  const linkProps = product.id ? { component: Link, to: `/product/${product.id}` } : {}

  return (
    <TableRow
      sx={{
        '&:last-child td': { border: 0 },
        transition: 'background 0.15s',
        '&:hover': { bgcolor: 'rgba(26,26,26,0.015)' },
      }}
    >
      {/* Thumbnail + name */}
      <TableCell sx={{ py: 2.5, pl: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            {...linkProps}
            sx={{
              width: 72,
              height: 72,
              flexShrink: 0,
              bgcolor: '#f0ece3',
              borderRadius: 1.5,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 0.75,
              textDecoration: 'none',
              transition: 'opacity 0.2s',
              '&:hover': { opacity: 0.8 },
            }}
          >
            <Box
              component="img"
              src={product.thumbnail}
              alt={product.title}
              sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          </Box>
          <Box>
            <Typography
              variant="overline"
              sx={{ color: 'secondary.dark', fontSize: '0.58rem', letterSpacing: '0.12em', display: 'block' }}
            >
              {product.category}
            </Typography>
            <Typography
              {...linkProps}
              sx={{
                fontFamily: '"Cormorant Garamond", serif',
                fontSize: '1rem',
                fontWeight: 400,
                color: 'text.primary',
                textDecoration: 'none',
                lineHeight: 1.3,
                display: 'block',
                '&:hover': { color: 'secondary.dark' },
                transition: 'color 0.2s',
              }}
            >
              {product.title}
            </Typography>
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 0.25 }}>
              SKU: {product.sku}
            </Typography>
          </Box>
        </Box>
      </TableCell>

      {/* Unit price */}
      <TableCell align="right" sx={{ py: 2.5 }}>
        <Box>
          <Typography
            sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.05rem', fontWeight: 500 }}
          >
            {fmt(unitPrice)}
          </Typography>
          {product.discountPercentage > 1 && (
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', textDecoration: 'line-through' }}>
              {fmt(product.price)}
            </Typography>
          )}
        </Box>
      </TableCell>

      {/* Qty stepper */}
      <TableCell align="center" sx={{ py: 2.5 }}>
        <QtyControl
          value={quantity}
          max={product.stock}
          onDecrement={() => onDecrement(product.sku)}
          onIncrement={() => onIncrement(product.sku)}
          onRemove={() => onRemove(product.sku)}
        />
      </TableCell>

      {/* Line total */}
      <TableCell align="right" sx={{ py: 2.5, pr: 0 }}>
        <Typography
          sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.15rem', fontWeight: 500 }}
        >
          {fmt(lineTotal)}
        </Typography>
      </TableCell>
    </TableRow>
  )
}

// ---------------------------------------------------------------------------
// Mobile card row
// ---------------------------------------------------------------------------
function CartCard({ item, onRemove, onDecrement, onIncrement }) {
  const { product, quantity } = item
  const unitPrice = product.price * (1 - (product.discountPercentage ?? 0) / 100)
  const lineTotal = unitPrice * quantity
  const linkProps = product.id ? { component: Link, to: `/product/${product.id}` } : {}

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        py: 2.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      {/* Image */}
      <Box
        {...linkProps}
        sx={{
          width: 80,
          height: 80,
          flexShrink: 0,
          bgcolor: '#f0ece3',
          borderRadius: 1.5,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 0.75,
          textDecoration: 'none',
        }}
      >
        <Box
          component="img"
          src={product.thumbnail}
          alt={product.title}
          sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
      </Box>

      {/* Details */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="overline"
          sx={{ color: 'secondary.dark', fontSize: '0.58rem', letterSpacing: '0.12em' }}
        >
          {product.category}
        </Typography>
        <Typography
          sx={{
            fontFamily: '"Cormorant Garamond", serif',
            fontSize: '0.95rem',
            lineHeight: 1.3,
            mb: 0.25,
          }}
        >
          {product.title}
        </Typography>
        <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', mb: 1 }}>
          SKU: {product.sku}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <QtyControl
            value={quantity}
            max={product.stock}
            onDecrement={() => onDecrement(product.id)}
            onIncrement={() => onIncrement(product.id)}
            onRemove={() => onRemove(product.id)}
          />
          <Box sx={{ textAlign: 'right' }}>
            <Typography
              sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.1rem', fontWeight: 500 }}
            >
              {fmt(lineTotal)}
            </Typography>
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
              {fmt(unitPrice)} each
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyCart() {
  const navigate = useNavigate()
  return (
    <Fade in>
      <Box
        sx={{
          textAlign: 'center',
          py: { xs: 8, md: 12 },
          px: 2,
        }}
      >
        <Box
          sx={{
            width: 88,
            height: 88,
            borderRadius: '50%',
            bgcolor: 'rgba(200,169,110,0.1)',
            border: '1px solid rgba(200,169,110,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <ShoppingBagOutlined sx={{ fontSize: 36, color: 'secondary.main' }} />
        </Box>
        <Typography
          variant="h3"
          sx={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, mb: 1 }}
        >
          Your bag is empty
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4, maxWidth: 320, mx: 'auto' }}>
          Looks like you haven’t added anything yet. Explore our collection to find something you’ll love.
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            onClick={() => navigate('/')}
            sx={{ px: 4, py: 1.4, fontSize: '0.72rem', letterSpacing: '0.1em' }}
          >
            Continue Shopping
          </Button>
        </Box>
      </Box>
    </Fade>
  )
}

// ---------------------------------------------------------------------------
// Order summary panel
// ---------------------------------------------------------------------------
function OrderSummary({ subtotal, itemCount, productCount }) {
  const navigate = useNavigate()
  const freeShippingRemaining = SHIPPING_THRESHOLD - subtotal
  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  const tax = subtotal * TAX_RATE
  const total = subtotal + shipping + tax

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        position: 'sticky',
        top: 88,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          px: 3,
          py: 2.5,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{
          position: 'absolute', top: '50%', right: -20,
          transform: 'translateY(-50%)',
          width: 100, height: 100, borderRadius: '50%',
          border: '1px solid rgba(200,169,110,0.15)',
          pointerEvents: 'none',
        }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptLongOutlined sx={{ fontSize: 18, color: 'rgba(200,169,110,0.8)' }} />
          <Typography
            sx={{
              fontFamily: '"Cormorant Garamond", serif',
              fontSize: '1.15rem',
              fontWeight: 400,
              color: '#f5f0e8',
              letterSpacing: '0.05em',
            }}
          >
            Order Summary
          </Typography>
        </Box>
      </Box>
      <Box sx={{ height: '2px', background: 'linear-gradient(90deg, transparent, #c8a96e, transparent)' }} />

      {/* Free shipping progress */}
      {freeShippingRemaining > 0 && (
        <Box sx={{ px: 3, pt: 2.5, pb: 0 }}>
          <Box
            sx={{
              bgcolor: 'rgba(200,169,110,0.08)',
              border: '1px solid rgba(200,169,110,0.2)',
              borderRadius: 1.5,
              px: 2,
              py: 1.25,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <LocalShippingOutlined sx={{ fontSize: 16, color: 'secondary.dark', flexShrink: 0 }} />
            <Typography sx={{ fontSize: '0.73rem', color: 'text.secondary', lineHeight: 1.4 }}>
              Add{' '}
              <Box component="span" sx={{ fontWeight: 500, color: 'secondary.dark' }}>
                {fmt(freeShippingRemaining)}
              </Box>{' '}
              more for free shipping
            </Typography>
          </Box>
        </Box>
      )}
      {subtotal >= SHIPPING_THRESHOLD && (
        <Box sx={{ px: 3, pt: 2.5, pb: 0 }}>
          <Box
            sx={{
              bgcolor: 'rgba(74,124,89,0.08)',
              border: '1px solid rgba(74,124,89,0.2)',
              borderRadius: 1.5,
              px: 2,
              py: 1.25,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <LocalShippingOutlined sx={{ fontSize: 16, color: 'success.main', flexShrink: 0 }} />
            <Typography sx={{ fontSize: '0.73rem', color: 'success.main', fontWeight: 500 }}>
              You qualify for free shipping!
            </Typography>
          </Box>
        </Box>
      )}

      {/* Line items */}
      <Box sx={{ px: 3, pt: 2.5, pb: 1 }}>
        {[
          {
            label: `Subtotal (${productCount} ${productCount === 1 ? 'product' : 'products'} · ${itemCount} ${itemCount === 1 ? 'unit' : 'units'})`,
            value: fmt(subtotal),
          },
          {
            label: 'Shipping',
            value: shipping === 0 ? 'Free' : fmt(shipping),
            valueColor: shipping === 0 ? 'success.main' : undefined,
          },
          {
            label: `Tax (${(TAX_RATE * 100).toFixed(0)}%)`,
            value: fmt(tax),
          },
        ].map(({ label, value, valueColor }) => (
          <Box
            key={label}
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.75 }}
          >
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{label}</Typography>
            <Typography
              sx={{ fontSize: '0.88rem', fontWeight: 400, color: valueColor || 'text.primary' }}
            >
              {value}
            </Typography>
          </Box>
        ))}

        <Divider sx={{ my: 2 }} />

        {/* Order total */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 3 }}>
          <Typography sx={{ fontSize: '0.78rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Total
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Cormorant Garamond", serif',
              fontSize: '1.7rem',
              fontWeight: 500,
              lineHeight: 1,
            }}
          >
            {fmt(total)}
          </Typography>
        </Box>

        {/* Checkout CTA */}
        <Button
          variant="contained"
          fullWidth
          onClick={() => navigate('/checkout')}
          startIcon={<LockOutlined sx={{ fontSize: 15 }} />}
          sx={{ py: 1.5, fontSize: '0.72rem', letterSpacing: '0.1em' }}
        >
          Proceed to Checkout
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75, mt: 1.5 }}>
          <LockOutlined sx={{ fontSize: 11, color: 'text.secondary' }} />
          <Typography sx={{ textAlign: 'center', fontSize: '0.65rem', color: 'text.secondary', letterSpacing: '0.04em' }}>
            Secure checkout
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// CartPage
// ---------------------------------------------------------------------------
export default function CartPage() {
  const navigate = useNavigate()
  const { items, totalQuantity, subtotal, addItem, setQuantity, removeItem, clearCart } = useCart()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const [removedItem, setRemovedItem] = useState(null)

  const handleRemove = (sku) => {
    const item = items.find((i) => i.product.sku === sku)
    if (item) setRemovedItem(item)
    removeItem(sku)
  }

  const handleUndo = () => {
    if (removedItem) {
      addItem(removedItem.product, removedItem.quantity)
      setRemovedItem(null)
    }
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Page header */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: { xs: 3, md: 4 },
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography
                variant="overline"
                sx={{ color: 'secondary.dark', letterSpacing: '0.2em', display: 'block', mb: 0.5 }}
              >
                Your Selection
              </Typography>
              <Typography
                variant="h2"
                sx={{
                  fontFamily: '"Cormorant Garamond", serif',
                  fontWeight: 300,
                  fontSize: { xs: '2rem', md: '2.8rem' },
                  lineHeight: 1,
                }}
              >
                Shopping Bag
                {items.length > 0 && (
                  <Box
                    component="span"
                    sx={{
                      ml: 1.5,
                      fontFamily: '"DM Sans", sans-serif',
                      fontSize: '1rem',
                      fontWeight: 300,
                      color: 'text.secondary',
                      verticalAlign: 'middle',
                    }}
                  >
                    ({items.length} {items.length === 1 ? 'product' : 'products'} &middot; {totalQuantity} {totalQuantity === 1 ? 'unit' : 'units'})
                  </Box>
                )}
              </Typography>
            </Box>

            <Button
              startIcon={<ArrowBack sx={{ fontSize: 15 }} />}
              onClick={() => navigate('/')}
              sx={{
                color: 'text.secondary',
                textTransform: 'none',
                fontWeight: 300,
                fontSize: '0.82rem',
                letterSpacing: '0.03em',
                '&:hover': { color: 'text.primary', bgcolor: 'transparent' },
              }}
            >
              Continue shopping
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        {/* Undo snackbar */}
        <Collapse in={!!removedItem}>
          <Alert
            severity="info"
            action={
              <Button size="small" color="inherit" onClick={handleUndo}
                sx={{ fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.05em' }}>
                Undo
              </Button>
            }
            sx={{ mb: 3, fontSize: '0.8rem' }}
            onClose={() => setRemovedItem(null)}
          >
            <strong>{removedItem?.product?.title}</strong> removed from your bag.
          </Alert>
        </Collapse>

        {items.length === 0 ? (
          <EmptyCart />
        ) : (
          <Grid container spacing={{ xs: 3, md: 5 }}>
            {/* ── Left: item list ── */}
            <Grid item xs={12} md={8} lg={8.5}>
              <Box
                sx={{
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                {/* Toolbar */}
                <Box
                  sx={{
                    px: { xs: 2.5, md: 3 },
                    py: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 1,
                  }}
                >
                  <Typography variant="h6" sx={{ color: 'text.primary' }}>
                    Items
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Button
                      size="small"
                      onClick={() => { clearCart(); setRemovedItem(null) }}
                      sx={{
                        color: 'text.secondary',
                        fontSize: '0.68rem',
                        letterSpacing: '0.05em',
                        textDecoration: 'underline',
                        textUnderlineOffset: '3px',
                        '&:hover': { color: 'error.main', bgcolor: 'transparent', textDecoration: 'underline' },
                      }}
                    >
                      Remove all
                    </Button>
                  </Box>
                </Box>

                {/* Desktop table */}
                {!isMobile ? (
                  <TableContainer sx={{ px: 3 }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          {['Product', 'Unit Price', 'Quantity', 'Total'].map((h, idx) => (
                            <TableCell
                              key={h}
                              align={idx === 0 ? 'left' : idx === 2 ? 'center' : 'right'}
                              sx={{
                                pl: idx === 0 ? 0 : undefined,
                                pr: idx === 3 ? 0 : undefined,
                                py: 1.5,
                                fontSize: '0.65rem',
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                                color: 'text.secondary',
                                fontWeight: 500,
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                              }}
                            >
                              {h}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {items.map((item) => (
                          <CartRow
                            key={item.product.sku}
                            item={item}
                            onRemove={handleRemove}
                            onDecrement={(id) => setQuantity(id, item.quantity - 1)}
                            onIncrement={(id) => setQuantity(id, item.quantity + 1)}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  /* Mobile cards */
                  <Box sx={{ px: 2.5 }}>
                    {items.map((item) => (
                      <CartCard
                        key={item.product.sku}
                        item={item}
                        onRemove={handleRemove}
                        onDecrement={(id) => setQuantity(id, item.quantity - 1)}
                        onIncrement={(id) => setQuantity(id, item.quantity + 1)}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            </Grid>

            {/* ── Right: order summary ── */}
            <Grid item xs={12} md={4} lg={3.5}>
              <OrderSummary subtotal={subtotal} itemCount={totalQuantity} productCount={items.length} />
            </Grid>
          </Grid>
        )}
      </Container>
    </Box>
  )
}
