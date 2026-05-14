import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1a1a1a',
      light: '#3d3d3d',
      contrastText: '#f5f0e8',
    },
    secondary: {
      main: '#c8a96e',
      light: '#d9c49a',
      dark: '#9e7d45',
      contrastText: '#1a1a1a',
    },
    background: {
      default: '#f5f0e8',
      paper: '#faf7f2',
    },
    text: {
      primary: '#1a1a1a',
      secondary: '#6b6560',
    },
    divider: 'rgba(26,26,26,0.1)',
    error: { main: '#b85c4a' },
    success: { main: '#4a7c59' },
  },
  typography: {
    fontFamily: '"DM Sans", sans-serif',
    h1: {
      fontFamily: '"Cormorant Garamond", serif',
      fontWeight: 300,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontFamily: '"Cormorant Garamond", serif',
      fontWeight: 400,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontFamily: '"Cormorant Garamond", serif',
      fontWeight: 400,
    },
    h4: {
      fontFamily: '"Cormorant Garamond", serif',
      fontWeight: 500,
    },
    h5: {
      fontFamily: '"Cormorant Garamond", serif',
      fontWeight: 500,
    },
    h6: {
      fontFamily: '"DM Sans", sans-serif',
      fontWeight: 500,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      fontSize: '0.75rem',
    },
    body1: {
      fontFamily: '"DM Sans", sans-serif',
      fontWeight: 300,
      lineHeight: 1.7,
    },
    body2: {
      fontFamily: '"DM Sans", sans-serif',
      fontWeight: 300,
      fontSize: '0.8rem',
    },
    button: {
      fontFamily: '"DM Sans", sans-serif',
      fontWeight: 400,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      fontSize: '0.7rem',
    },
    overline: {
      fontFamily: '"DM Sans", sans-serif',
      fontWeight: 400,
      letterSpacing: '0.15em',
    },
  },
  shape: { borderRadius: 2 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 1,
          padding: '10px 24px',
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        containedPrimary: {
          background: '#1a1a1a',
          '&:hover': { background: '#3d3d3d' },
        },
        outlinedPrimary: {
          borderColor: '#1a1a1a',
          '&:hover': { background: 'rgba(26,26,26,0.04)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          border: '1px solid rgba(26,26,26,0.08)',
          background: '#faf7f2',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 40px rgba(26,26,26,0.1)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          fontFamily: '"DM Sans", sans-serif',
          fontWeight: 400,
          letterSpacing: '0.05em',
          fontSize: '0.7rem',
          textTransform: 'uppercase',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: 'rgba(26,26,26,0.2)' },
            '&:hover fieldset': { borderColor: 'rgba(26,26,26,0.5)' },
          },
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: { color: '#1a1a1a' },
        thumb: {
          width: 14,
          height: 14,
          '&:hover': { boxShadow: '0 0 0 8px rgba(26,26,26,0.1)' },
        },
        track: { height: 2 },
        rail: { height: 2, opacity: 0.2 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: '1px solid rgba(26,26,26,0.1)',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: 'rgba(26,26,26,0.08)' },
      },
    },
  },
})

export default theme
