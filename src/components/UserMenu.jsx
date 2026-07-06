import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Typography, Avatar, Menu, MenuItem,
  IconButton, Tooltip, ListItemIcon, ListItemText, Divider,
} from '@mui/material'
import {
  LogoutRounded, ManageAccountsOutlined,
  ShoppingBagOutlined, FavoriteBorderOutlined,
} from '@mui/icons-material'
import { useAuth } from '../context/AuthContext'

export default function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState(null)
  const open = Boolean(anchorEl)

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '?'

  const handleOpen = (e) => setAnchorEl(e.currentTarget)
  const handleClose = () => setAnchorEl(null)

  const handleNavigate = (path) => {
    handleClose()
    navigate(path)
  }

  const handleLogout = () => {
    handleClose()
    logout()
    navigate('/')
  }

  const menuItemSx = {
    px: 2.5,
    py: 1.25,
    gap: 1.5,
    borderRadius: 1,
    mx: 0.5,
    '&:hover': { bgcolor: 'rgba(26,26,26,0.05)' },
  }

  return (
    <>
      <Tooltip title="My Account" arrow>
        <IconButton
          size="small"
          onClick={handleOpen}
          sx={{
            p: 0.25,
            border: '1.5px solid',
            borderColor: open ? 'secondary.main' : 'divider',
            transition: 'border-color 0.2s',
            borderRadius: '50%',
          }}
        >
          <Avatar
            src={user?.image}
            alt={user?.firstName}
            sx={{
              width: 28,
              height: 28,
              fontSize: '0.65rem',
              fontWeight: 600,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            }}
          >
            {!user?.image && initials}
          </Avatar>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 0,
          sx: {
            mt: 1.5,
            minWidth: 248,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'visible',
            boxShadow: '0 8px 32px rgba(26,26,26,0.12)',
            pb: 0.5,
            '&::before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: -6,
              right: 18,
              width: 12,
              height: 12,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderBottom: 'none',
              borderRight: 'none',
              transform: 'rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
      >
        {/* ── User identity header ── */}
        <Box
          onClick={() => handleNavigate('/account')}
          sx={{
            px: 2.5,
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            cursor: 'pointer',
            transition: 'background 0.15s',
            '&:hover': { bgcolor: 'rgba(26,26,26,0.03)' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              src={user?.image}
              sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontSize: '0.82rem', fontWeight: 600 }}
            >
              {!user?.image && initials}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 500, fontSize: '0.88rem', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.firstName} {user?.lastName}
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                @{user?.username}
              </Typography>
              {user?.email && (
                <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', opacity: 0.75, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.email}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>

        {/* ── Navigation actions ── */}
        <Box sx={{ pt: 0.75 }}>
          <MenuItem onClick={() => handleNavigate('/account')} sx={menuItemSx}>
            <ListItemIcon sx={{ minWidth: 'auto' }}>
              <ManageAccountsOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
            </ListItemIcon>
            <ListItemText
              primary="My Account"
              primaryTypographyProps={{ fontSize: '0.82rem', fontFamily: '"DM Sans", sans-serif' }}
            />
          </MenuItem>

          <MenuItem onClick={() => handleNavigate('/account?tab=history')} sx={menuItemSx}>
            <ListItemIcon sx={{ minWidth: 'auto' }}>
              <ShoppingBagOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
            </ListItemIcon>
            <ListItemText
              primary="Purchase History"
              primaryTypographyProps={{ fontSize: '0.82rem', fontFamily: '"DM Sans", sans-serif' }}
            />
          </MenuItem>

          <MenuItem onClick={() => handleNavigate('/account?tab=wishlist')} sx={menuItemSx}>
            <ListItemIcon sx={{ minWidth: 'auto' }}>
              <FavoriteBorderOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
            </ListItemIcon>
            <ListItemText
              primary="Wishlist"
              primaryTypographyProps={{ fontSize: '0.82rem', fontFamily: '"DM Sans", sans-serif' }}
            />
          </MenuItem>
        </Box>

        <Divider sx={{ my: 0.5, mx: 1 }} />

        {/* ── Sign out ── */}
        <Box sx={{ pb: 0.5 }}>
          <MenuItem onClick={handleLogout} sx={{ ...menuItemSx, '&:hover': { bgcolor: 'rgba(184,92,74,0.06)' } }}>
            <ListItemIcon sx={{ minWidth: 'auto' }}>
              <LogoutRounded sx={{ fontSize: 18, color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText
              primary="Sign Out"
              primaryTypographyProps={{ fontSize: '0.82rem', color: 'error.main', fontFamily: '"DM Sans", sans-serif' }}
            />
          </MenuItem>
        </Box>
      </Menu>
    </>
  )
}
