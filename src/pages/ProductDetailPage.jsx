import { useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  Container, Grid, Box, Typography, Button, Chip, Rating,
  Skeleton, Alert, Divider, IconButton, Tooltip,
  Tabs, Tab, Paper, Snackbar, Fade,
} from '@mui/material'
import {
  ArrowBack, ShoppingBag, Favorite, FavoriteBorder,
  LocalShipping, Shield, Cached, CheckRounded,
} from '@mui/icons-material'
import { useProduct } from '../hooks/useProducts'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useWishlist } from '../context/WishlistContext'

function DetailSkeleton() {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12} md={6}>
        <Skeleton variant="rectangular" height={500} sx={{ borderRadius: 2 }} />
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" width={80} height={80} sx={{ borderRadius: 1 }} />
          ))}
        </Box>
      </Grid>
      <Grid item xs={12} md={6}>
        <Skeleton width="40%" height={16} sx={{ mb: 1 }} />
        <Skeleton width="80%" height={48} sx={{ mb: 2 }} />
        <Skeleton width="30%" height={32} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" height={100} sx={{ mb: 3, borderRadius: 1 }} />
        <Skeleton variant="rectangular" height={50} sx={{ borderRadius: 1 }} />
      </Grid>
    </Grid>
  )
}

export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { product, loading, error } = useProduct(id)

  const [selectedImage, setSelectedImage] = useState(0)
  const [tabValue, setTabValue] = useState(0)
  const [snackOpen, setSnackOpen] = useState(false)

  const { isLoggedIn } = useAuth()
  const { addItem, isInCart, getQuantity } = useCart()
  const { isWishlisted, toggleWishlist } = useWishlist()
  const wishlisted = product ? isWishlisted(product.sku) : false

  // Navigate back preserving filters
  const backPath = location.state?.from || '/'

  const handleWishlist = () => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: location.pathname } })
      return
    }
    if (product) toggleWishlist(product)
  }

  const handleAddToCart = () => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: location.pathname } })
      return
    }
    if (product) {
      addItem(product, 1)
      setSnackOpen(true)
    }
  }

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 5 }}>
        <DetailSkeleton />
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 5 }}>
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(backPath)}>
          Back to shop
        </Button>
      </Container>
    )
  }

  if (!product) return null

  const discountedPrice = (product.price * (1 - product.discountPercentage / 100)).toFixed(2)
  // Gallery: primary first, then the other images, with the thumbnail as a
  // fallback. `primaryImage`/`images`/`thumbnail` are read-only derived fields
  // on the product (built from the product's images — see API_CONTRACT Images).
  const images = [product.primaryImage, ...(product.images ?? []), product.thumbnail]
    .filter(Boolean)
    .filter((url, i, arr) => arr.indexOf(url) === i)

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>

        {/* Back navigation */}
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBack sx={{ fontSize: 16 }} />}
            onClick={() => navigate(backPath)}
            sx={{
              color: 'text.secondary',
              textTransform: 'none',
              fontFamily: '"DM Sans", sans-serif',
              fontWeight: 300,
              letterSpacing: '0.03em',
              fontSize: '0.85rem',
              '&:hover': { color: 'text.primary', bgcolor: 'transparent' },
            }}
          >
            Back to shop
          </Button>
        </Box>

        <Grid container spacing={{ xs: 4, md: 7 }}>
          {/* Images column */}
          <Grid item xs={12} md={6}>
            {/* Main image */}
            <Box
              sx={{
                bgcolor: '#f0ece3',
                borderRadius: 2,
                overflow: 'hidden',
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1.5,
                p: 4,
              }}
            >
              <Box
                component="img"
                src={images[selectedImage] || product.thumbnail}
                alt={product.title}
                sx={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  transition: 'opacity 0.3s ease',
                }}
              />
            </Box>

            {/* Thumbnails */}
            {images.length > 1 && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {images.map((img, i) => (
                  <Box
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: 1,
                      overflow: 'hidden',
                      bgcolor: '#f0ece3',
                      cursor: 'pointer',
                      border: '2px solid',
                      borderColor: selectedImage === i ? 'primary.main' : 'transparent',
                      transition: 'border-color 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: 0.5,
                    }}
                  >
                    <Box
                      component="img"
                      src={img}
                      alt={`View ${i + 1}`}
                      sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </Grid>

          {/* Product info column */}
          <Grid item xs={12} md={6}>
            {/* Category & Brand */}
            <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
              <Chip
                label={product.category?.replace(/-/g, ' ')}
                size="small"
                sx={{
                  bgcolor: 'rgba(200,169,110,0.15)',
                  color: 'secondary.dark',
                  textTransform: 'capitalize',
                }}
              />
              {product.brand && (
                <Chip
                  label={product.brand}
                  size="small"
                  variant="outlined"
                  sx={{ textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '0.1em' }}
                />
              )}
            </Box>

            {/* Title */}
            <Typography
              variant="h2"
              sx={{
                fontFamily: '"Cormorant Garamond", serif',
                fontWeight: 400,
                fontSize: { xs: '1.8rem', md: '2.5rem' },
                lineHeight: 1.2,
                mb: 2,
              }}
            >
              {product.title}
            </Typography>

            {/* Rating */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
              <Rating value={product.rating} precision={0.1} readOnly size="small" />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {product.rating} · {product.reviews?.length || 0} reviews
              </Typography>
            </Box>

            {/* Price */}
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 3 }}>
              <Typography
                sx={{
                  fontFamily: '"Cormorant Garamond", serif',
                  fontSize: '2.2rem',
                  fontWeight: 500,
                  lineHeight: 1,
                }}
              >
                ${discountedPrice}
              </Typography>
              {product.discountPercentage > 1 && (
                <>
                  <Typography
                    sx={{ fontSize: '1.1rem', color: 'text.secondary', textDecoration: 'line-through' }}
                  >
                    ${product.price.toFixed(2)}
                  </Typography>
                  <Chip
                    label={`Save ${Math.round(product.discountPercentage)}%`}
                    size="small"
                    sx={{ bgcolor: 'rgba(74,124,89,0.12)', color: 'success.main' }}
                  />
                </>
              )}
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Description */}
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.8 }}>
              {product.description}
            </Typography>

            {/* Tags */}
            {product.tags?.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                {product.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontSize: '0.68rem',
                      letterSpacing: '0.04em',
                      color: 'text.secondary',
                      borderColor: 'divider',
                      bgcolor: 'rgba(26,26,26,0.02)',
                    }}
                  />
                ))}
              </Box>
            )}

            {/* Stock */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <Box
                sx={{
                  width: 8, height: 8, borderRadius: '50%',
                  bgcolor: product.stock > 10 ? '#4a7c59' : product.stock > 0 ? '#c8a96e' : '#b85c4a',
                }}
              />
              <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                {product.stock > 10
                  ? 'In stock'
                  : product.stock > 0
                    ? `Only ${product.stock} left`
                    : 'Out of stock'}
              </Typography>
            </Box>

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
              <Button
                variant="contained"
                onClick={handleAddToCart}
                startIcon={
                  isInCart(product.sku)
                    ? <CheckRounded sx={{ fontSize: 18 }} />
                    : <ShoppingBag sx={{ fontSize: 18 }} />
                }
                disabled={product.stock === 0}
                fullWidth
                sx={{
                  py: 1.5,
                  fontSize: '0.75rem',
                  bgcolor: isInCart(product.sku) ? 'success.main' : undefined,
                  '&:hover': {
                    bgcolor: isInCart(product.sku) ? '#3a6b48' : undefined,
                  },
                  transition: 'background-color 0.3s',
                }}
              >
                {product.stock === 0
                  ? 'Out of Stock'
                  : isInCart(product.sku)
                    ? `In Bag (${getQuantity(product.sku)})`
                    : 'Add to Bag'}
              </Button>
              <Tooltip title={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'} arrow>
                <IconButton
                  onClick={handleWishlist}
                  sx={{
                    border: '1px solid',
                    borderColor: wishlisted ? 'rgba(184,92,74,0.4)' : 'divider',
                    borderRadius: 1,
                    px: 2,
                    bgcolor: wishlisted ? 'rgba(184,92,74,0.04)' : 'transparent',
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: 'rgba(184,92,74,0.08)', borderColor: 'rgba(184,92,74,0.5)' },
                  }}
                >
                  {wishlisted
                    ? <Favorite sx={{ color: '#b85c4a', fontSize: 20 }} />
                    : <FavoriteBorder sx={{ fontSize: 20 }} />
                  }
                </IconButton>
              </Tooltip>
            </Box>

            {/* Trust badges */}
            <Grid container spacing={2}>
              {[
                { icon: <LocalShipping sx={{ fontSize: 18 }} />, label: 'Free Shipping', sub: 'On orders over $50' },
                { icon: <Shield sx={{ fontSize: 18 }} />, label: 'Warranty', sub: product.warrantyInformation || '1 Year' },
                { icon: <Cached sx={{ fontSize: 18 }} />, label: 'Easy Returns', sub: product.returnPolicy || '30-day policy' },
              ].map(({ icon, label, sub }) => (
                <Grid item xs={4} key={label}>
                  <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'rgba(26,26,26,0.02)', borderRadius: 1 }}>
                    <Box sx={{ color: 'secondary.dark', mb: 0.5 }}>{icon}</Box>
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.65rem', color: 'text.secondary', mt: 0.25 }}>
                      {sub}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>

        {/* Tabs: Specs & Reviews */}
        <Box sx={{ mt: 8 }}>
          <Divider sx={{ mb: 4 }} />
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            sx={{
              mb: 4,
              '& .MuiTab-root': {
                fontFamily: '"DM Sans", sans-serif',
                fontSize: '0.7rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              },
            }}
          >
            <Tab label="Details" />
            <Tab label={`Reviews (${product.reviews?.length || 0})`} />
          </Tabs>

          {tabValue === 0 && (
            <Grid container spacing={2}>
              {[
                { label: 'SKU', value: product.sku },
                { label: 'Weight', value: product.weight ? `${product.weight}g` : '—' },
                { label: 'Dimensions', value: product.dimensions ? `${product.dimensions.width} × ${product.dimensions.height} × ${product.dimensions.depth} cm` : '—' },
                { label: 'Availability', value: product.availabilityStatus },
                { label: 'Minimum Order', value: product.minimumOrderQuantity ? `${product.minimumOrderQuantity} units` : '1 unit' },
                { label: 'Barcode', value: product.meta?.barcode || '—' },
              ].filter(d => d.value && d.value !== '—').map(({ label, value }) => (
                <Grid item xs={12} sm={6} md={4} key={label}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem' }}>
                      {label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 400, fontSize: '0.8rem' }}>
                      {value}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}

          {tabValue === 1 && (
            <Grid container spacing={3}>
              {product.reviews?.length > 0 ? (
                product.reviews.map((review, i) => (
                  <Grid item xs={12} sm={6} md={4} key={i}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        bgcolor: 'background.paper',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                        <Typography sx={{ fontWeight: 500, fontSize: '0.85rem' }}>
                          {review.reviewerName}
                        </Typography>
                        <Rating value={review.rating} size="small" readOnly sx={{ fontSize: '0.75rem' }} />
                      </Box>
                      <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6, mb: 1.5 }}>
                        {review.comment}
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.7rem', color: 'text.secondary', opacity: 0.6 }}>
                        {new Date(review.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </Typography>
                    </Paper>
                  </Grid>
                ))
              ) : (
                <Grid item xs={12}>
                  <Typography variant="body1" sx={{ color: 'text.secondary', textAlign: 'center', py: 6 }}>
                    No reviews yet
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </Box>
      </Container>

      {/* Add-to-bag confirmation snackbar */}
      <Snackbar
        open={snackOpen}
        autoHideDuration={2800}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        TransitionComponent={Fade}
      >
        <Box
          sx={{
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            px: 3,
            py: 1.5,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            boxShadow: '0 8px 24px rgba(26,26,26,0.25)',
          }}
        >
          <CheckRounded sx={{ fontSize: 17, color: 'secondary.main' }} />
          <Typography sx={{ fontSize: '0.82rem', fontFamily: '"DM Sans", sans-serif' }}>
            <Box component="span" sx={{ fontWeight: 500 }}>{product?.title}</Box>
            {' '}added to your bag
          </Typography>
          <Button
            size="small"
            onClick={() => { setSnackOpen(false); navigate('/cart') }}
            sx={{
              color: 'secondary.main',
              fontSize: '0.68rem',
              letterSpacing: '0.08em',
              ml: 0.5,
              px: 1,
              py: 0.25,
              minWidth: 'auto',
              textTransform: 'uppercase',
              '&:hover': { bgcolor: 'rgba(200,169,110,0.12)' },
            }}
          >
            View Bag
          </Button>
        </Box>
      </Snackbar>
    </Box>
  )
}
