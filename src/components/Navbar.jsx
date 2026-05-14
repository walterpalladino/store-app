import { useState, useRef, useEffect, useCallback } from 'react'
import {
  AppBar, Toolbar, Typography, Box, Container, IconButton,
  Badge, Button, InputBase, Tooltip,
} from '@mui/material'
import {
  ShoppingBag, Search, PersonOutline, Close, FavoriteBorder, Favorite,
} from '@mui/icons-material'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import UserMenu from './UserMenu'

export default function Navbar() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isLoggedIn } = useAuth()
  const { totalQuantity } = useCart()
  const { count: wishlistCount } = useWishlist()

  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState(searchParams.get('search') || '')
  const inputRef = useRef(null)

  // Sync field value when the URL search param changes externally
  useEffect(() => {
    if (!searchOpen) setQuery(searchParams.get('search') || '')
  }, [searchParams, searchOpen])

  // Focus the input as soon as the bar becomes visible
  useEffect(() => {
    if (searchOpen) {
      // rAF ensures the element is fully painted before we focus
      const id = requestAnimationFrame(() => inputRef.current?.focus())
      return () => cancelAnimationFrame(id)
    }
  }, [searchOpen])

  const openSearch = () => setSearchOpen(true)

  const closeSearch = () => {
    setSearchOpen(false)
    setQuery(searchParams.get('search') || '')
  }

  const commitSearch = useCallback((q) => {
    const trimmed = q.trim()
    const next = new URLSearchParams(searchParams)
    if (trimmed) next.set('search', trimmed)
    else next.delete('search')
    next.delete('page')
    navigate(`/?${next.toString()}`)
    setSearchOpen(false)
  }, [navigate, searchParams])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') commitSearch(query)
    if (e.key === 'Escape') closeSearch()
  }

  const handleCartClick = () => {
    navigate(isLoggedIn ? '/cart' : '/login', {
      state: isLoggedIn ? undefined : { from: '/cart' },
    })
  }

  return (
    <AppBar position="sticky" color="inherit" sx={{ bgcolor: 'background.paper' }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ py: 1, justifyContent: 'space-between', gap: 1 }}>

          {/* ── Left: search icon / expanded search bar ── */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              // Expand to fill available width when open
              flex: searchOpen ? 1 : '0 0 auto',
              minWidth: 0,
              transition: 'flex 0.22s ease',
            }}
          >
            {/* Collapsed: just the icon */}
            {!searchOpen && (
              <Tooltip title="Search products" arrow>
                <IconButton
                  size="small"
                  onClick={openSearch}
                  sx={{ color: 'text.primary', '&:hover': { color: 'secondary.dark' } }}
                >
                  <Search sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
            )}

            {/* Expanded: inline input bar — rendered in the DOM immediately (no Fade wrapper) */}
            {searchOpen && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  maxWidth: 500,
                  height: 36,
                  border: '1.5px solid',
                  borderColor: 'primary.main',
                  borderRadius: 1.5,
                  px: 1.5,
                  gap: 1,
                  bgcolor: 'background.default',
                  // CSS-only fade-in — no MUI Fade needed
                  animation: 'navSearchIn 0.18s ease forwards',
                  '@keyframes navSearchIn': {
                    from: { opacity: 0, transform: 'scaleX(0.92)', transformOrigin: 'left' },
                    to:   { opacity: 1, transform: 'scaleX(1)',    transformOrigin: 'left' },
                  },
                }}
              >
                <Search sx={{ fontSize: 17, color: 'text.secondary', flexShrink: 0 }} />

                <InputBase
                  inputRef={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search products…"
                  fullWidth
                  inputProps={{ 'aria-label': 'search products' }}
                  sx={{
                    fontFamily: '"DM Sans", sans-serif',
                    fontSize: '0.85rem',
                    fontWeight: 300,
                    flex: 1,
                    minWidth: 0,
                    // Critical: remove any pointer-events or visibility overrides
                    pointerEvents: 'auto',
                    '& input': {
                      p: 0,
                      outline: 'none',
                    },
                  }}
                />

                {/* Clear query */}
                {query.length > 0 && (
                  <IconButton
                    size="small"
                    tabIndex={-1}
                    onMouseDown={(e) => {
                      // Prevent input blur when clicking clear
                      e.preventDefault()
                      setQuery('')
                      inputRef.current?.focus()
                    }}
                    sx={{ p: 0.25, flexShrink: 0 }}
                  >
                    <Close sx={{ fontSize: 14, color: 'text.secondary' }} />
                  </IconButton>
                )}

                {/* Divider */}
                <Box sx={{ width: '1px', height: 18, bgcolor: 'divider', flexShrink: 0 }} />

                {/* Search button */}
                <Button
                  size="small"
                  tabIndex={0}
                  onClick={() => commitSearch(query)}
                  sx={{
                    minWidth: 'auto',
                    px: 1.25, py: 0.4,
                    fontSize: '0.68rem',
                    letterSpacing: '0.08em',
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    borderRadius: 1,
                    flexShrink: 0,
                    '&:hover': { bgcolor: 'primary.light' },
                  }}
                >
                  Search
                </Button>

                {/* Close bar */}
                <IconButton
                  size="small"
                  tabIndex={-1}
                  onClick={closeSearch}
                  sx={{ p: 0.4, flexShrink: 0 }}
                >
                  <Close sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            )}
          </Box>

          {/* ── Center: logo — hidden when search is open on small screens ── */}
          {!searchOpen && (
            <Box
              component={Link}
              to="/"
              sx={{
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <Typography
                variant="h4"
                sx={{
                  fontFamily: '"Cormorant Garamond", serif',
                  fontWeight: 300,
                  letterSpacing: '0.2em',
                  color: 'text.primary',
                  lineHeight: 1,
                  fontSize: { xs: '1.6rem', md: '2rem' },
                }}
              >
                SHŌP
              </Typography>
              <Typography
                variant="overline"
                sx={{ fontSize: '0.55rem', letterSpacing: '0.3em', color: 'text.secondary', lineHeight: 1.5 }}
              >
                curated goods
              </Typography>
            </Box>
          )}

          {/* ── Right: wishlist + bag + auth ── */}
          <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'flex-end', alignItems: 'center', flexShrink: 0 }}>

            {isLoggedIn && (
              <Tooltip title="Wishlist" arrow>
                <IconButton
                  size="small"
                  onClick={() => navigate('/account?tab=wishlist')}
                  sx={{ color: wishlistCount > 0 ? '#b85c4a' : 'text.primary', transition: 'color 0.2s', '&:hover': { color: '#b85c4a' } }}
                >
                  <Badge
                    badgeContent={wishlistCount || null}
                    sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 16, height: 16, bgcolor: '#b85c4a', color: '#fff' } }}
                  >
                    {wishlistCount > 0
                      ? <Favorite    sx={{ fontSize: 20 }} />
                      : <FavoriteBorder sx={{ fontSize: 20 }} />
                    }
                  </Badge>
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title="Shopping bag" arrow>
              <IconButton
                size="small"
                onClick={handleCartClick}
                sx={{ color: 'text.primary', transition: 'color 0.2s', '&:hover': { color: 'secondary.dark' } }}
              >
                <Badge
                  badgeContent={totalQuantity}
                  color="secondary"
                  sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 16, height: 16, fontFamily: '"DM Sans", sans-serif', fontWeight: 500 } }}
                >
                  <ShoppingBag sx={{ fontSize: 20 }} />
                </Badge>
              </IconButton>
            </Tooltip>

            {isLoggedIn ? (
              <UserMenu />
            ) : (
              <Button
                size="small"
                onClick={() => navigate('/login')}
                startIcon={<PersonOutline sx={{ fontSize: 17 }} />}
                sx={{
                  color: 'text.primary', textTransform: 'none',
                  fontFamily: '"DM Sans", sans-serif', fontWeight: 400,
                  fontSize: '0.72rem', letterSpacing: '0.06em',
                  px: 1.25, py: 0.6,
                  border: '1px solid', borderColor: 'divider', borderRadius: 1,
                  whiteSpace: 'nowrap', minWidth: 'auto',
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'transparent' },
                }}
              >
                Sign in
              </Button>
            )}
          </Box>

        </Toolbar>
      </Container>

      <Box sx={{ height: '2px', background: 'linear-gradient(90deg, transparent, #c8a96e, transparent)' }} />
    </AppBar>
  )
}
