import { useState } from 'react'
import { Card, CardMedia, CardContent, Typography, Box, Rating, IconButton, Tooltip, Fade } from '@mui/material'
import { AddShoppingCart, CheckRounded, FavoriteBorder, Favorite } from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useWishlist } from '../context/WishlistContext'

export default function ProductCard({ product }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { isLoggedIn } = useAuth()
  const { addItem, isInCart } = useCart()
  const { isWishlisted, toggleWishlist } = useWishlist()
  const [justAdded, setJustAdded] = useState(false)

  const discountedPrice = (product.price * (1 - product.discountPercentage / 100)).toFixed(2)
  const inCart      = isInCart(product.sku)
  const wishlisted  = isWishlisted(product.sku)

  const handleCardClick = () => {
    navigate(`/product/${product.id}`, {
      state: { from: location.pathname + location.search },
    })
  }

  const handleAddToCart = (e) => {
    e.stopPropagation()
    if (!isLoggedIn) {
      navigate('/login', { state: { from: location.pathname + location.search } })
      return
    }
    addItem(product, 1)
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1800)
  }

  const handleWishlist = (e) => {
    e.stopPropagation()
    if (!isLoggedIn) {
      navigate('/login', { state: { from: location.pathname + location.search } })
      return
    }
    toggleWishlist(product)
  }

  return (
    <Card
      onClick={handleCardClick}
      sx={{
        cursor: 'pointer',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Discount badge */}
      {product.discountPercentage > 5 && (
        <Box sx={{
          position: 'absolute', top: 12, left: 12, zIndex: 2,
          bgcolor: 'secondary.main', color: 'secondary.contrastText',
          px: 1, py: 0.25, borderRadius: 1,
        }}>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 500, letterSpacing: '0.05em' }}>
            -{Math.round(product.discountPercentage)}%
          </Typography>
        </Box>
      )}

      {/* Image area */}
      <Box sx={{ position: 'relative', overflow: 'hidden', bgcolor: '#f0ece3', height: 220 }}>
        <CardMedia
          component="img"
          image={product.thumbnail}
          alt={product.title}
          sx={{
            height: '100%', objectFit: 'contain', p: 2,
            transition: 'transform 0.5s ease',
            '&:hover': { transform: 'scale(1.06)' },
          }}
        />

        {/* Wishlist button — top right */}
        <Tooltip title={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'} placement="top" arrow>
          <Box
            onClick={handleWishlist}
            sx={{
              position: 'absolute', top: 8, right: 8, zIndex: 2,
              width: 30, height: 30, borderRadius: '50%',
              bgcolor: 'rgba(250,247,242,0.92)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
              transition: 'transform 0.15s, background-color 0.2s',
              '&:hover': { transform: 'scale(1.15)', bgcolor: '#fff' },
              '&:active': { transform: 'scale(0.9)' },
            }}
          >
            {wishlisted
              ? <Favorite    sx={{ fontSize: 15, color: '#b85c4a' }} />
              : <FavoriteBorder sx={{ fontSize: 15, color: 'rgba(26,26,26,0.5)' }} />
            }
          </Box>
        </Tooltip>

        {/* Add-to-cart button — bottom right */}
        <Tooltip title={inCart ? 'Already in bag' : 'Add to bag'} placement="top" arrow>
          <Box
            onClick={handleAddToCart}
            sx={{ position: 'absolute', bottom: 10, right: 10, zIndex: 2 }}
          >
            <Box sx={{
              width: 34, height: 34, borderRadius: '50%',
              bgcolor: justAdded || inCart ? 'success.main' : 'primary.main',
              color: '#f5f0e8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              transition: 'background-color 0.3s, transform 0.15s',
              '&:hover': { transform: 'scale(1.1)' },
              '&:active': { transform: 'scale(0.95)' },
            }}>
              <Fade in={justAdded || inCart} timeout={200}>
                <CheckRounded sx={{ fontSize: 16, position: 'absolute' }} />
              </Fade>
              <Fade in={!justAdded && !inCart} timeout={200}>
                <AddShoppingCart sx={{ fontSize: 16, position: 'absolute' }} />
              </Fade>
            </Box>
          </Box>
        </Tooltip>
      </Box>

      <CardContent sx={{ flexGrow: 1, p: 2, pb: '16px !important' }}>
        <Typography variant="overline" sx={{ color: 'secondary.dark', fontSize: '0.6rem', letterSpacing: '0.15em' }}>
          {product.category}
        </Typography>
        <Typography variant="h5" sx={{
          fontSize: '0.95rem', fontWeight: 400, lineHeight: 1.3,
          mt: 0.25, mb: 1, fontFamily: '"Cormorant Garamond", serif',
        }}>
          {product.title}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
          <Rating value={product.rating} precision={0.1} size="small" readOnly sx={{ fontSize: '0.75rem' }} />
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
            ({product.rating})
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Typography sx={{
            fontFamily: '"Cormorant Garamond", serif',
            fontSize: '1.3rem', fontWeight: 500, color: 'text.primary',
          }}>
            ${discountedPrice}
          </Typography>
          {product.discountPercentage > 1 && (
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', textDecoration: 'line-through' }}>
              ${product.price.toFixed(2)}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}
