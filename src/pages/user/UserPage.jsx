import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Box, Container, Typography, Avatar, Grid, Divider,
  List, ListItemButton, ListItemIcon, ListItemText,
  useMediaQuery, useTheme, Drawer, IconButton, Fade,
} from '@mui/material'
import {
  ManageAccountsOutlined, HomeOutlined, CreditCardOutlined,
  ReceiptLongOutlined, FavoriteBorderOutlined, LogoutRounded, ChevronRight, MenuRounded, Close,
} from '@mui/icons-material'
import { useAuth } from '../../context/AuthContext'
import UserSettings from './UserSettings'
import AddressPanel from './AddressPanel'
import PaymentMethodsPanel from './PaymentMethodsPanel'
import { PurchaseHistoryPanel } from './PurchaseHistoryPanel'
import WishlistPanel from './WishlistPanel'

// ---------------------------------------------------------------------------
// Nav config
// ---------------------------------------------------------------------------
const NAV_ITEMS = [
  {
    id: 'settings',
    label: 'User Settings',
    icon: <ManageAccountsOutlined sx={{ fontSize: 19 }} />,
    component: UserSettings,
  },
  {
    id: 'addresses',
    label: 'Addresses',
    icon: <HomeOutlined sx={{ fontSize: 19 }} />,
    component: AddressPanel,
  },
  {
    id: 'payment',
    label: 'Payment Methods',
    icon: <CreditCardOutlined sx={{ fontSize: 19 }} />,
    component: PaymentMethodsPanel,
  },
  {
    id: 'history',
    label: 'Purchase History',
    icon: <ReceiptLongOutlined sx={{ fontSize: 19 }} />,
    component: PurchaseHistoryPanel,
  },
  {
    id: 'wishlist',
    label: 'Wishlist',
    icon: <FavoriteBorderOutlined sx={{ fontSize: 19 }} />,
    component: WishlistPanel,
  },
]

// ---------------------------------------------------------------------------
// Sidebar content — reused for both desktop drawer and mobile drawer
// ---------------------------------------------------------------------------
function SidebarContent({ activeId, onSelect, user, onLogout }) {
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* User identity block */}
      <Box
        sx={{
          px: 2.5,
          pt: 3,
          pb: 2.5,
          background: 'linear-gradient(160deg, #1a1a1a 0%, #2d2d2d 100%)',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {/* Decorative ring */}
        <Box sx={{
          position: 'absolute', bottom: -30, right: -30,
          width: 120, height: 120, borderRadius: '50%',
          border: '1px solid rgba(200,169,110,0.15)',
          pointerEvents: 'none',
        }} />

        <Avatar
          src={user?.image}
          sx={{
            width: 52,
            height: 52,
            bgcolor: 'rgba(200,169,110,0.25)',
            color: '#c8a96e',
            fontSize: '1rem',
            fontWeight: 600,
            mb: 1.5,
            border: '2px solid rgba(200,169,110,0.35)',
          }}
        >
          {!user?.image && initials}
        </Avatar>

        <Typography
          sx={{
            fontFamily: '"Cormorant Garamond", serif',
            fontSize: '1.05rem',
            fontWeight: 400,
            color: '#f5f0e8',
            lineHeight: 1.2,
          }}
        >
          {user?.firstName} {user?.lastName}
        </Typography>
        <Typography sx={{ fontSize: '0.7rem', color: 'rgba(245,240,232,0.5)', mt: 0.25 }}>
          @{user?.username}
        </Typography>
        {user?.email && (
          <Typography sx={{ fontSize: '0.68rem', color: 'rgba(245,240,232,0.4)', mt: 0.2 }}>
            {user.email}
          </Typography>
        )}
      </Box>

      {/* Gold accent */}
      <Box sx={{ height: '2px', background: 'linear-gradient(90deg, transparent, #c8a96e, transparent)', flexShrink: 0 }} />

      {/* Nav list */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        <List disablePadding>
          {NAV_ITEMS.map((item) => {
            const active = activeId === item.id
            return (
              <ListItemButton
                key={item.id}
                selected={active}
                onClick={() => onSelect(item.id)}
                sx={{
                  px: 2.5,
                  py: 1.4,
                  mb: 0.25,
                  mx: 1,
                  borderRadius: 1.5,
                  transition: 'background 0.15s',
                  '&.Mui-selected': {
                    bgcolor: 'rgba(26,26,26,0.06)',
                    '&:hover': { bgcolor: 'rgba(26,26,26,0.08)' },
                  },
                  '&:hover': { bgcolor: 'rgba(26,26,26,0.04)' },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 34,
                    color: active ? 'secondary.dark' : 'text.secondary',
                    transition: 'color 0.15s',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontFamily: '"DM Sans", sans-serif',
                    fontSize: '0.82rem',
                    fontWeight: active ? 500 : 400,
                    color: active ? 'text.primary' : 'text.secondary',
                    transition: 'color 0.15s, font-weight 0.15s',
                  }}
                />
                {active && (
                  <ChevronRight sx={{ fontSize: 16, color: 'secondary.main', ml: 0.5 }} />
                )}
              </ListItemButton>
            )
          })}
        </List>
      </Box>

      {/* Bottom: sign out */}
      <Box sx={{ flexShrink: 0, px: 1, pb: 2 }}>
        <Divider sx={{ mb: 1 }} />
        <ListItemButton
          onClick={onLogout}
          sx={{
            px: 2.5,
            py: 1.25,
            borderRadius: 1.5,
            '&:hover': { bgcolor: 'rgba(184,92,74,0.06)' },
          }}
        >
          <ListItemIcon sx={{ minWidth: 34, color: 'error.main' }}>
            <LogoutRounded sx={{ fontSize: 18 }} />
          </ListItemIcon>
          <ListItemText
            primary="Sign Out"
            primaryTypographyProps={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.82rem',
              color: 'error.main',
            }}
          />
        </ListItemButton>
      </Box>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// UserPage
// ---------------------------------------------------------------------------
export default function UserPage() {
  const { user, isLoggedIn, logout } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)

  // Active tab from URL so browser back/forward works
  const activeId = searchParams.get('tab') || 'settings'
  const setActiveId = (id) => {
    setSearchParams({ tab: id }, { replace: true })
    setMobileOpen(false)
  }

  // Guard — shouldn't be reachable without auth (ProtectedRoute handles it),
  // but just in case.
  useEffect(() => {
    if (!isLoggedIn) navigate('/login', { replace: true })
  }, [isLoggedIn, navigate])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const ActivePanel = NAV_ITEMS.find((i) => i.id === activeId)?.component ?? UserSettings
  const activeLabel = NAV_ITEMS.find((i) => i.id === activeId)?.label ?? 'Account'

  const sidebarProps = { activeId, onSelect: setActiveId, user, onLogout: handleLogout }

  const SIDEBAR_W = 260

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Page header bar */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: { xs: 2.5, md: 3.5 },
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Mobile menu toggle */}
            {isMobile && (
              <IconButton
                size="small"
                onClick={() => setMobileOpen(true)}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
              >
                <MenuRounded sx={{ fontSize: 18 }} />
              </IconButton>
            )}
            <Box>
              <Typography
                variant="overline"
                sx={{ color: 'secondary.dark', letterSpacing: '0.2em', display: 'block', lineHeight: 1, mb: 0.5 }}
              >
                My Account
              </Typography>
              <Typography
                variant="h2"
                sx={{
                  fontFamily: '"Cormorant Garamond", serif',
                  fontWeight: 300,
                  fontSize: { xs: '1.8rem', md: '2.4rem' },
                  lineHeight: 1,
                }}
              >
                {activeLabel}
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Grid container spacing={4}>
          {/* ── Desktop sidebar ── */}
          {!isMobile && (
            <Grid item md={3} lg={2.5}>
              <Box
                sx={{
                  position: 'sticky',
                  top: 88,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  overflow: 'hidden',
                  minHeight: 420,
                }}
              >
                <SidebarContent {...sidebarProps} />
              </Box>
            </Grid>
          )}

          {/* ── Content panel ── */}
          <Grid item xs={12} md={9} lg={9.5}>
            <Box
              sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: { xs: 3, md: 4 },
                minHeight: 480,
              }}
            >
              <ActivePanel />
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* ── Mobile drawer ── */}
      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{
          sx: {
            width: SIDEBAR_W,
            bgcolor: 'background.paper',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1, flexShrink: 0 }}>
          <IconButton size="small" onClick={() => setMobileOpen(false)}>
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <SidebarContent {...sidebarProps} />
        </Box>
      </Drawer>
    </Box>
  )
}
