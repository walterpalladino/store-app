import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Typography, Divider, Grid, Card, CardMedia, CardContent,
  IconButton, Button, Tooltip, Fade, Chip, Rating,
} from '@mui/material'
import {
  FavoriteOutlined, DeleteOutlineRounded, AddShoppingCart,
  CheckRounded, OpenInNew,
} from '@mui/icons-material'
import { useWishlist } from '../../context/WishlistContext'
import { useCart } from '../../context/CartContext'

// ---------------------------------------------------------------------------
// Section wrapper — same pattern as other panels
// ---------------------------------------------------------------------------
function Section({ title, subtitle, children }) {
  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.35rem', fontWeight: 400, lineHeight: 1.2, mb: 0.4 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      <Divider sx={{ mb: 3 }} />
      {children}
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Single wishlist product card
// ---------------------------------------------------------------------------
function WishlistCard({ item }) {
  const navigate = useNavigate()
  const { removeFromWishlist } = useWishlist()
  const { addItem, isInCart } = useCart()
  const [justAdded, setJustAdded] = useState(false)

  const inCart = isInCart(item.id)
  const discountedPrice = item.price * (1 - (item.discountPercentage ?? 0) / 100)

  const handleAddToCart = () => {
    addItem(item, 1)
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1800)
  }

  return (
    <Fade in>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 'none',
          transition: 'box-shadow 0.2s, border-color 0.2s',
          '&:hover': {
            boxShadow: '0 4px 20px rgba(26,26,26,0.08)',
            borderColor: 'rgba(200,169,110,0.35)',
          },
        }}
      >
        {/* Image */}
        <Box
          sx={{ position: 'relative', bgcolor: '#f0ece3', height: 180, overflow: 'hidden', cursor: 'pointer' }}
          onClick={() => navigate(`/product/${item.id}`)}
        >
          <CardMedia
            component="img"
            image={item.thumbnail}
            alt={item.title}
            sx={{
              height: '100%', objectFit: 'contain', p: 2,
              transition: 'transform 0.45s ease',
              '&:hover': { transform: 'scale(1.06)' },
            }}
          />
          {/* Remove from wishlist */}
          <Tooltip title="Remove from wishlist" placement="top" arrow>
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); removeFromWishlist(item.id) }}
              sx={{
                position: 'absolute', top: 8, right: 8,
                width: 28, height: 28,
                bgcolor: 'rgba(250,247,242,0.92)',
                boxShadow: '0 1px 6px rgba(0,0,0,0.1)',
                '&:hover': { bgcolor: '#fff', color: '#b85c4a' },
              }}
            >
              <DeleteOutlineRounded sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          {item.discountPercentage > 5 && (
            <Box sx={{
              position: 'absolute', top: 8, left: 8,
              bgcolor: 'secondary.main', color: 'secondary.contrastText',
              px: 0.75, py: 0.2, borderRadius: 0.75,
            }}>
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 500 }}>
                -{Math.round(item.discountPercentage)}%
              </Typography>
            </Box>
          )}
        </Box>

        <CardContent sx={{ flexGrow: 1, p: 2, pb: '0 !important' }}>
          <Typography variant="overline" sx={{ color: 'secondary.dark', fontSize: '0.58rem', letterSpacing: '0.12em' }}>
            {item.category}
          </Typography>
          <Typography
            onClick={() => navigate(`/product/${item.id}`)}
            sx={{
              fontFamily: '"Cormorant Garamond", serif',
              fontSize: '0.95rem', fontWeight: 400, lineHeight: 1.3,
              mt: 0.25, mb: 1, cursor: 'pointer',
              '&:hover': { color: 'secondary.dark' },
              transition: 'color 0.2s',
            }}
          >
            {item.title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 2 }}>
            <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.2rem', fontWeight: 500 }}>
              ${discountedPrice.toFixed(2)}
            </Typography>
            {item.discountPercentage > 1 && (
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', textDecoration: 'line-through' }}>
                ${item.price.toFixed(2)}
              </Typography>
            )}
          </Box>
        </CardContent>

        {/* Action row */}
        <Box sx={{ px: 2, pb: 2, pt: 1, display: 'flex', gap: 1 }}>
          <Button
            fullWidth
            size="small"
            variant={inCart || justAdded ? 'outlined' : 'contained'}
            onClick={handleAddToCart}
            startIcon={
              justAdded || inCart
                ? <CheckRounded sx={{ fontSize: 15 }} />
                : <AddShoppingCart sx={{ fontSize: 15 }} />
            }
            sx={{
              fontSize: '0.65rem',
              letterSpacing: '0.07em',
              py: 0.8,
              bgcolor: justAdded || inCart ? 'transparent' : undefined,
              borderColor: justAdded || inCart ? 'success.main' : undefined,
              color: justAdded || inCart ? 'success.main' : undefined,
              transition: 'all 0.25s',
            }}
          >
            {justAdded ? 'Added!' : inCart ? 'In Bag' : 'Add to Bag'}
          </Button>
          <Tooltip title="View product" arrow>
            <IconButton
              size="small"
              onClick={() => navigate(`/product/${item.id}`)}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1 }}
            >
              <OpenInNew sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Card>
    </Fade>
  )
}

// ---------------------------------------------------------------------------
// WishlistPanel export
// ---------------------------------------------------------------------------
export default function WishlistPanel() {
  const navigate = useNavigate()
  const { items, clearWishlist, count } = useWishlist()

  return (
    <Fade in>
      <Box>
        <Section
          title="Wishlist"
          subtitle={
            count > 0
              ? `${count} saved ${count === 1 ? 'item' : 'items'}`
              : 'Products you have saved for later.'
          }
        >
          {items.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <FavoriteOutlined sx={{ fontSize: 40, color: 'rgba(184,92,74,0.2)', mb: 2 }} />
              <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.4rem', fontWeight: 300, mb: 0.5 }}>
                Your wishlist is empty
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.78rem', mb: 3 }}>
                Tap the heart icon on any product to save it here.
              </Typography>
              <Button
                variant="outlined"
                onClick={() => navigate('/')}
                sx={{ fontSize: '0.7rem', letterSpacing: '0.08em', py: 1, px: 3 }}
              >
                Browse Products
              </Button>
            </Box>
          ) : (
            <>
              {/* Clear all */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button
                  size="small"
                  onClick={clearWishlist}
                  sx={{
                    color: 'text.secondary', fontSize: '0.68rem', letterSpacing: '0.05em',
                    textDecoration: 'underline', textUnderlineOffset: '3px',
                    '&:hover': { color: 'error.main', bgcolor: 'transparent', textDecoration: 'underline' },
                  }}
                >
                  Clear all
                </Button>
              </Box>

              <Grid container spacing={2.5}>
                {items.map((item) => (
                  <Grid item xs={12} sm={6} lg={4} key={item.id}>
                    <WishlistCard item={item} />
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </Section>
      </Box>
    </Fade>
  )
}
