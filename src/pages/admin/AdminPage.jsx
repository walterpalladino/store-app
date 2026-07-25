import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Box, Typography, Avatar, Grid, Divider,
  List, ListItemButton, ListItemIcon, ListItemText,
  useMediaQuery, useTheme, Drawer, IconButton, Chip, Tooltip,
  Menu, MenuItem,
} from '@mui/material'
import {
  StorefrontOutlined, InventoryOutlined, PointOfSaleOutlined,
  LogoutRounded, ChevronRight, MenuRounded, Close,
  HomeOutlined, KeyRounded, KeyboardArrowDownRounded, CategoryOutlined,
  SellOutlined, AccountBalanceWalletOutlined,
} from '@mui/icons-material'
import { useMerchantAuth } from '../../context/MerchantAuthContext'
import MerchantSettings from './MerchantSettings'
import AdminProducts   from './AdminProducts'
import AdminCategories from './AdminCategories'
import AdminTags       from './AdminTags'
import AdminSells      from './AdminSells'
import AdminPayments   from './AdminPayments'

// ---------------------------------------------------------------------------
// Nav config
// ---------------------------------------------------------------------------
const NAV_ITEMS = [
  {
    id:        'settings',
    label:     'Merchant Settings',
    icon:      <StorefrontOutlined sx={{ fontSize: 19 }} />,
    component: MerchantSettings,
  },
  {
    id:        'products',
    label:     'Products',
    icon:      <InventoryOutlined sx={{ fontSize: 19 }} />,
    component: AdminProducts,
  },
  {
    id:        'categories',
    label:     'Categories',
    icon:      <CategoryOutlined sx={{ fontSize: 19 }} />,
    component: AdminCategories,
  },
  {
    id:        'tags',
    label:     'Tags',
    icon:      <SellOutlined sx={{ fontSize: 19 }} />,
    component: AdminTags,
  },
  {
    id:        'sells',
    label:     'Sales',
    icon:      <PointOfSaleOutlined sx={{ fontSize: 19 }} />,
    component: AdminSells,
  },
  {
    id:        'payments',
    label:     'Payments',
    icon:      <AccountBalanceWalletOutlined sx={{ fontSize: 19 }} />,
    component: AdminPayments,
  },
]

const SIDEBAR_W = 268

// ---------------------------------------------------------------------------
// Sidebar content
// ---------------------------------------------------------------------------
function SidebarContent({ activeId, onSelect, user, onLogout, onGoToStore }) {
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Identity header ── */}
      <Box
        sx={{
          px: 2.5, pt: 3, pb: 2.5,
          background: 'linear-gradient(160deg, #0d0d0d 0%, #1a1a1a 100%)',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {/* Decorative grid dot */}
        <Box sx={{
          position: 'absolute', bottom: -30, right: -30,
          width: 120, height: 120, borderRadius: '50%',
          border: '1px solid rgba(200,169,110,0.12)',
          pointerEvents: 'none',
        }} />

        {/* Logo mark */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
          <Box sx={{
            width: 26, height: 26,
            bgcolor: '#c8a96e',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <StorefrontOutlined sx={{ fontSize: 14, color: '#0d0d0d' }} />
          </Box>
          <Box>
            <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: '0.9rem', letterSpacing: '0.2em', color: '#f5f0e8', lineHeight: 1 }}>
              SHŌP
            </Typography>
            <Typography sx={{ fontSize: '0.55rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(200,169,110,0.6)', lineHeight: 1.4 }}>
              Merchant Admin
            </Typography>
          </Box>
        </Box>

        {/* User avatar */}
        <Avatar
          src={user?.image}
          sx={{
            width: 46, height: 46,
            bgcolor: 'rgba(200,169,110,0.2)',
            color: '#c8a96e',
            fontSize: '0.95rem',
            fontWeight: 600,
            mb: 1.25,
            border: '2px solid rgba(200,169,110,0.3)',
          }}
        >
          {!user?.image && initials}
        </Avatar>

        <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1rem', fontWeight: 400, color: '#f5f0e8', lineHeight: 1.2 }}>
          {user?.firstName} {user?.lastName}
        </Typography>
        <Typography sx={{ fontSize: '0.68rem', color: 'rgba(245,240,232,0.45)', mt: 0.25 }}>
          @{user?.username}
        </Typography>
        {user?.email && (
          <Typography sx={{ fontSize: '0.65rem', color: 'rgba(245,240,232,0.3)', mt: 0.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email}
          </Typography>
        )}
      </Box>

      {/* Gold accent line */}
      <Box sx={{ height: '2px', background: 'linear-gradient(90deg, transparent, #c8a96e, transparent)', flexShrink: 0 }} />

      {/* ── Nav items ── */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1.5 }}>
        {/* Section label */}
        <Typography sx={{ px: 3, mb: 0.5, fontSize: '0.58rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'text.secondary', fontFamily: '"DM Sans", sans-serif' }}>
          Navigation
        </Typography>

        <List disablePadding>
          {NAV_ITEMS.map((item) => {
            const active = activeId === item.id
            return (
              <ListItemButton
                key={item.id}
                selected={active}
                onClick={() => onSelect(item.id)}
                sx={{
                  px: 2.5, py: 1.35, mb: 0.25, mx: 1,
                  borderRadius: 1.5,
                  transition: 'background 0.15s',
                  '&.Mui-selected': {
                    bgcolor: 'rgba(200,169,110,0.1)',
                    '&:hover': { bgcolor: 'rgba(200,169,110,0.14)' },
                  },
                  '&:hover': { bgcolor: 'rgba(26,26,26,0.04)' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 34, color: active ? 'secondary.dark' : 'text.secondary', transition: 'color 0.15s' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontFamily: '"DM Sans", sans-serif',
                    fontSize: '0.82rem',
                    fontWeight: active ? 500 : 400,
                    color: active ? 'text.primary' : 'text.secondary',
                    transition: 'color 0.15s',
                  }}
                />
                {active && <ChevronRight sx={{ fontSize: 15, color: 'secondary.main', ml: 0.5 }} />}
              </ListItemButton>
            )
          })}
        </List>
      </Box>

      {/* ── Bottom actions ── */}
      <Box sx={{ flexShrink: 0, px: 1, pb: 2 }}>
        <Divider sx={{ mb: 1 }} />

        {/* Go to storefront */}
        <ListItemButton
          onClick={onGoToStore}
          sx={{ px: 2.5, py: 1.1, borderRadius: 1.5, mb: 0.25, '&:hover': { bgcolor: 'rgba(26,26,26,0.04)' } }}
        >
          <ListItemIcon sx={{ minWidth: 34, color: 'text.secondary' }}>
            <HomeOutlined sx={{ fontSize: 18 }} />
          </ListItemIcon>
          <ListItemText
            primary="Back to Store"
            primaryTypographyProps={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.8rem', color: 'text.secondary' }}
          />
        </ListItemButton>

        {/* Sign out */}
        <ListItemButton
          onClick={onLogout}
          sx={{ px: 2.5, py: 1.1, borderRadius: 1.5, '&:hover': { bgcolor: 'rgba(184,92,74,0.06)' } }}
        >
          <ListItemIcon sx={{ minWidth: 34, color: 'error.main' }}>
            <LogoutRounded sx={{ fontSize: 18 }} />
          </ListItemIcon>
          <ListItemText
            primary="Sign Out"
            primaryTypographyProps={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.8rem', color: 'error.main' }}
          />
        </ListItemButton>
      </Box>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// AdminPage
// ---------------------------------------------------------------------------
export default function AdminPage() {
  const { user, isLoggedIn, logout, tokenPayload } = useMerchantAuth()
  const navigate   = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const theme      = useTheme()
  const isMobile   = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState(null)

  const activeId = searchParams.get('tab') || 'settings'
  const setActiveId = (id) => {
    // Only `tab` survives a sidebar click — panel-specific params (e.g. the
    // Payments panel's `orderId` filter) are deliberately dropped so picking a
    // section from the nav always lands on its unfiltered view.
    setSearchParams({ tab: id }, { replace: true })
    setMobileOpen(false)
  }

  useEffect(() => {
    if (!isLoggedIn) navigate('/admin/login', { replace: true })
  }, [isLoggedIn, navigate])

  const handleLogout = () => { logout(); navigate('/admin/login') }
  const handleGoToStore = () => navigate('/')

  const ActivePanel = NAV_ITEMS.find((i) => i.id === activeId)?.component ?? MerchantSettings
  const activeLabel = NAV_ITEMS.find((i) => i.id === activeId)?.label ?? 'Admin'

  const sidebarProps = {
    activeId,
    onSelect: setActiveId,
    user,
    onLogout: handleLogout,
    onGoToStore: handleGoToStore,
  }

  const expiryLabel = tokenPayload?.exp
    ? new Date(tokenPayload.exp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top bar ── */}
      <Box
        sx={{
          bgcolor: '#0d0d0d',
          borderBottom: '1px solid rgba(245,240,232,0.06)',
          py: 1.5,
          px: { xs: 2, md: 3 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {isMobile && (
            <IconButton
              size="small"
              onClick={() => setMobileOpen(true)}
              sx={{ color: '#f5f0e8', border: '1px solid rgba(245,240,232,0.15)', borderRadius: 1 }}
            >
              <MenuRounded sx={{ fontSize: 18 }} />
            </IconButton>
          )}
          <Box>
            <Typography sx={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,169,110,0.7)', lineHeight: 1, mb: 0.25 }}>
              Merchant Admin
            </Typography>
            <Typography sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '1.15rem', fontWeight: 300, letterSpacing: '0.05em', color: '#f5f0e8', lineHeight: 1 }}>
              {activeLabel}
            </Typography>
          </Box>
        </Box>

        {/* Top-right: token badge + user chip */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {expiryLabel && !isMobile && (
            <Tooltip title={`Session token expires at ${expiryLabel}`} arrow>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5, bgcolor: 'rgba(200,169,110,0.08)', border: '1px solid rgba(200,169,110,0.2)', borderRadius: 1 }}>
                <KeyRounded sx={{ fontSize: 12, color: 'rgba(200,169,110,0.7)' }} />
                <Typography sx={{ fontFamily: 'monospace', fontSize: '0.62rem', color: 'rgba(200,169,110,0.7)' }}>
                  exp {expiryLabel}
                </Typography>
              </Box>
            </Tooltip>
          )}
          <Chip
            avatar={<Avatar src={user?.image} sx={{ bgcolor: 'rgba(200,169,110,0.2)', color: '#c8a96e', fontSize: '0.65rem' }}>{!user?.image && `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`}</Avatar>}
            label={`@${user?.username ?? '…'}`}
            size="small"
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            deleteIcon={<KeyboardArrowDownRounded sx={{ fontSize: 16 }} />}
            onDelete={(e) => setMenuAnchor(e.currentTarget)}
            aria-label="Account menu"
            sx={{
              bgcolor: 'rgba(245,240,232,0.06)', color: 'rgba(245,240,232,0.6)',
              fontFamily: '"DM Sans", sans-serif', fontSize: '0.68rem',
              border: '1px solid rgba(245,240,232,0.1)', height: 28, cursor: 'pointer',
              '& .MuiChip-deleteIcon': { color: 'rgba(245,240,232,0.5)', '&:hover': { color: 'rgba(245,240,232,0.8)' } },
              '&:hover': { bgcolor: 'rgba(245,240,232,0.1)' },
            }}
          />

          {/* Account dropdown — always-visible sign out */}
          <Menu
            anchorEl={menuAnchor}
            open={!!menuAnchor}
            onClose={() => setMenuAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{ paper: { sx: { mt: 1, minWidth: 180, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' } } }}
          >
            <MenuItem
              onClick={() => { setMenuAnchor(null); handleGoToStore() }}
              sx={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.82rem', py: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}><HomeOutlined sx={{ fontSize: 18 }} /></ListItemIcon>
              Back to Store
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => { setMenuAnchor(null); handleLogout() }}
              sx={{ fontFamily: '"DM Sans", sans-serif', fontSize: '0.82rem', py: 1, color: 'error.main' }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}><LogoutRounded sx={{ fontSize: 18, color: 'error.main' }} /></ListItemIcon>
              Sign Out
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* ── Body: sidebar + content ── */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Desktop sidebar */}
        {!isMobile && (
          <Box
            sx={{
              width: SIDEBAR_W,
              flexShrink: 0,
              bgcolor: 'background.paper',
              borderRight: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              height: 'calc(100vh - 56px)',
              position: 'sticky',
              top: 56,
              overflowY: 'auto',
            }}
          >
            <SidebarContent {...sidebarProps} />
          </Box>
        )}

        {/* Main content */}
        <Box sx={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
          <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 3, md: 4.5 } }}>
            <Box
              sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: { xs: 2.5, md: 4 },
                minHeight: 520,
              }}
            >
              <ActivePanel />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Mobile drawer */}
      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{
          sx: {
            width: SIDEBAR_W,
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
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
